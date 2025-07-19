import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Factory, Package, Settings, Plus, Eye, Edit, Trash2, Calendar, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  price: number;
  mrp: number;
  cost: number;
  stockQuantity: number;
  alertThreshold: number;
}

interface ManufacturingOrder {
  id: number;
  order_number: string;
  product_id: number;
  target_quantity: number;
  current_quantity: number;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  status: string;
  priority: string;
  estimated_cost: number;
  notes: string;
  assigned_user_id: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  name: string;
}

export default function ProductsManufacturing() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products')
  });

  const { data: manufacturingOrders = [], isLoading: ordersLoading } = useQuery<ManufacturingOrder[]>({
    queryKey: ['/api/manufacturing/orders'],
    queryFn: () => apiRequest('/api/manufacturing/orders')
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users')
  });

  // Create manufacturing order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/manufacturing/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      setIsCreateOrderOpen(false);
      toast({
        title: "Success",
        description: "Manufacturing order created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create manufacturing order",
        variant: "destructive"
      });
    }
  });

  const handleCreateOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const data = {
      order_number: `MFG${Date.now()}`,
      product_id: parseInt(formData.get('product_id') as string),
      target_quantity: parseInt(formData.get('target_quantity') as string),
      current_quantity: 0,
      batch_number: formData.get('batch_number') as string || `BATCH${Date.now()}`,
      manufacturing_date: formData.get('manufacturing_date') as string,
      expiry_date: formData.get('expiry_date') as string,
      status: 'pending',
      priority: formData.get('priority') as string,
      estimated_cost: parseFloat(formData.get('estimated_cost') as string) || 0,
      notes: formData.get('notes') as string,
      assigned_user_id: parseInt(formData.get('assigned_user_id') as string)
    };

    createOrderMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manufacturing</h1>
          <p className="text-gray-600">Manage production orders and bill of materials</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "orders"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Production Orders
            </button>
            <button
              onClick={() => setActiveTab("bom")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bom"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Bill of Materials
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {manufacturingOrders.filter(order => order.status === 'in_progress' || order.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {manufacturingOrders.filter(order => order.status === 'in_progress' || order.status === 'pending').length === 0 
                    ? "No active production orders" 
                    : "Active production orders"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {manufacturingOrders.filter(order => {
                    const today = new Date().toDateString();
                    const orderDate = new Date(order.updated_at).toDateString();
                    return order.status === 'completed' && today === orderDate;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Orders completed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{manufacturingOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total manufacturing orders
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Production Orders</h2>
              <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Manufacturing Order</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product_id">Product</Label>
                        <Select name="product_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} (₹{product.price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target_quantity">Target Quantity</Label>
                        <Input
                          id="target_quantity"
                          name="target_quantity"
                          type="number"
                          min="1"
                          required
                          placeholder="Enter quantity to produce"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batch_number">Batch Number</Label>
                        <Input
                          id="batch_number"
                          name="batch_number"
                          placeholder={`BATCH${Date.now()}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                        <Input
                          id="manufacturing_date"
                          name="manufacturing_date"
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiry_date">Expiry Date</Label>
                        <Input
                          id="expiry_date"
                          name="expiry_date"
                          type="date"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estimated_cost">Estimated Cost (₹)</Label>
                        <Input
                          id="estimated_cost"
                          name="estimated_cost"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assigned_user_id">Assigned User</Label>
                        <Select name="assigned_user_id">
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name || user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Add manufacturing instructions or notes..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createOrderMutation.isPending}>
                        {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {manufacturingOrders.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Factory className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No production orders</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create your first production order to start manufacturing.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setIsCreateOrderOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {manufacturingOrders.map((order) => {
                  const product = products.find(p => p.id === order.product_id);
                  const assignedUser = users.find(u => u.id === order.assigned_user_id);
                  
                  return (
                    <Card key={order.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{order.order_number}</h3>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority} priority
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p><strong>Product:</strong> {product?.name || 'Unknown Product'}</p>
                              <p><strong>Batch:</strong> {order.batch_number}</p>
                              <p><strong>Quantity:</strong> {order.current_quantity} / {order.target_quantity}</p>
                              {order.estimated_cost > 0 && (
                                <p><strong>Estimated Cost:</strong> ₹{order.estimated_cost.toFixed(2)}</p>
                              )}
                              {assignedUser && (
                                <p><strong>Assigned to:</strong> {assignedUser.name || assignedUser.username}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(order.manufacturing_date), 'MMM dd, yyyy')}
                              </span>
                              {order.notes && (
                                <span className="flex items-center">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Notes available
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{Math.round((order.current_quantity / order.target_quantity) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min((order.current_quantity / order.target_quantity) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "bom" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manufacturing Control System</h2>
              <div className="flex space-x-2">
                <Button onClick={() => setActiveTab("batch-records")}>
                  📋 Batch Records
                </Button>
                <Button onClick={() => setActiveTab("quality-control")}>
                  🧪 Quality Control
                </Button>
                <Button onClick={() => setActiveTab("inventory-tracking")}>
                  📦 Inventory Tracking
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("batch-records")}>
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">🧪</div>
                  <CardTitle className="text-lg">Batch Manufacturing</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-gray-600 mb-4">Complete batch production records with materials tracking and approval workflow</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Batches:</span>
                      <span className="font-semibold">{manufacturingOrders.filter(o => o.status === 'in_progress').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Approval:</span>
                      <span className="font-semibold text-yellow-600">{manufacturingOrders.filter(o => o.status === 'pending').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("quality-control")}>
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">🧬</div>
                  <CardTitle className="text-lg">Quality Control</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-gray-600 mb-4">Quality testing, parameters tracking, and chemist approval system</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tests Today:</span>
                      <span className="font-semibold">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pass Rate:</span>
                      <span className="font-semibold text-green-600">100%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("inventory-tracking")}>
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <CardTitle className="text-lg">Inventory Control</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-gray-600 mb-4">Raw material consumption tracking and automatic stock deduction</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Low Stock Items:</span>
                      <span className="font-semibold text-red-600">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto Updates:</span>
                      <span className="font-semibold text-green-600">Enabled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Batch Records Tab */}
        {activeTab === "batch-records" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Batch Manufacturing Records</h2>
                <p className="text-gray-600">Complete production tracking with materials and approval workflow</p>
              </div>
              <Button onClick={() => setIsCreateOrderOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Batch Record
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  📋 Manufacturing Batch Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  {/* Product Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        🏷️ Product Name & Type
                      </Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product (Domestic/Export)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fabric-conditioner-domestic">Fabric Conditioner - Domestic</SelectItem>
                          <SelectItem value="fabric-conditioner-export">Fabric Conditioner - Export</SelectItem>
                          <SelectItem value="liquid-detergent-domestic">Liquid Detergent - Domestic</SelectItem>
                          <SelectItem value="liquid-detergent-export">Liquid Detergent - Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>📅 Manufacturing Date</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>

                  {/* Batch Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>📊 Batch Size</Label>
                      <Input placeholder="500" />
                      <span className="text-xs text-gray-500">Enter quantity in units</span>
                    </div>
                    <div className="space-y-2">
                      <Label>🔧 Operation</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="custom">Custom Blend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>📋 Document No.</Label>
                      <Input placeholder="SRI/PMO-001" />
                    </div>
                  </div>

                  {/* Raw Materials Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">🧪 Raw Materials</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Material</th>
                            <th className="border border-gray-300 p-2 text-left">Standard Qty</th>
                            <th className="border border-gray-300 p-2 text-left">Actual Qty</th>
                            <th className="border border-gray-300 p-2 text-left">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-2">DM Water</td>
                            <td className="border border-gray-300 p-2">455.000</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="455.000" /></td>
                            <td className="border border-gray-300 p-2">L</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Preservatives TQ</td>
                            <td className="border border-gray-300 p-2">30.000</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="30.000" /></td>
                            <td className="border border-gray-300 p-2">ml</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Perfume + Silk mask</td>
                            <td className="border border-gray-300 p-2">-2.500</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="-2.500" /></td>
                            <td className="border border-gray-300 p-2">ml</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Colour Liqua</td>
                            <td className="border border-gray-300 p-2">-2.500</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="-2.500" /></td>
                            <td className="border border-gray-300 p-2">ml</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Florasil</td>
                            <td className="border border-gray-300 p-2">-2.500</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="-2.500" /></td>
                            <td className="border border-gray-300 p-2">ml</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Colour - Liquid pink AL</td>
                            <td className="border border-gray-300 p-2">-0.010</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" defaultValue="-0.010" /></td>
                            <td className="border border-gray-300 p-2">L</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SKU and Packaging Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">📦 SKU Size & Packaging</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Product Size</Label>
                        <Input placeholder="250" />
                        <span className="text-xs text-gray-500">ml/L</span>
                      </div>
                      <div className="space-y-2">
                        <Label>Bottle Glass Count</Label>
                        <Input placeholder="300" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sticker Count</Label>
                        <Input placeholder="300" />
                      </div>
                      <div className="space-y-2">
                        <Label>Cotton Box</Label>
                        <Input placeholder="300" />
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex-1 space-y-2">
                        <Label>Total Quantity (in KG)</Label>
                        <Input placeholder="Calculate automatically" disabled className="bg-gray-50" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Unpacked PG (L)</Label>
                        <Input placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  {/* Quality Parameters Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">🧬 Quality Parameters</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left">Quality Parameters</th>
                            <th className="border border-gray-300 p-2 text-left">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-2">pH Level</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" placeholder="6.5-7.5" /></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Viscosity</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" placeholder="Pass/Fail" /></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Color Consistency</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" placeholder="Pass/Fail" /></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">Fragrance Strength</td>
                            <td className="border border-gray-300 p-2"><Input className="h-8" placeholder="Pass/Fail" /></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Approval Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">✍️ Approval Workflow</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-4">
                        <h4 className="font-medium flex items-center mb-3">👨‍🔬 Signature of the Supervisor</h4>
                        <div className="space-y-2">
                          <Input placeholder="Supervisor Name" />
                          <Input type="date" />
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500">Click to upload signature or draw</p>
                            <Button variant="outline" size="sm" className="mt-2">Upload Signature</Button>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium flex items-center mb-3">🧪 Signature of the Chemist</h4>
                        <div className="space-y-2">
                          <Input placeholder="Chemist Name" />
                          <Input type="date" />
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500">Click to upload signature or draw</p>
                            <Button variant="outline" size="sm" className="mt-2">Upload Signature</Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button variant="outline">Save as Draft</Button>
                    <Button variant="outline">Submit for Review</Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Complete Batch & Update Inventory
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quality Control Tab */}
        {activeTab === "quality-control" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Quality Control Dashboard</h2>
                <p className="text-gray-600">Quality testing, parameters tracking, and approval system</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Quality Check
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tests Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-gray-500">Quality tests performed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pass Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <p className="text-xs text-gray-500">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pending Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <p className="text-xs text-gray-500">Awaiting chemist approval</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Failed Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <p className="text-xs text-gray-500">Require reprocessing</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🧪</div>
                  <h3 className="text-xl font-semibold mb-2">Quality Control System</h3>
                  <p className="text-gray-600 mb-6">
                    Comprehensive quality testing with parameter tracking, chemist approval, and automated reporting
                  </p>
                  <Button size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Start Quality Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Tracking Tab */}
        {activeTab === "inventory-tracking" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Inventory Consumption Tracking</h2>
                <p className="text-gray-600">Raw material usage, automatic deduction, and stock monitoring</p>
              </div>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Configure Auto-Deduction
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Auto Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-600">Enabled</div>
                  <p className="text-xs text-gray-500">Inventory automatically updated</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">42</div>
                  <p className="text-xs text-gray-500">Below threshold</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Batches Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-gray-500">Inventory consumed</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Raw Material Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Material</th>
                        <th className="text-left p-2">Current Stock</th>
                        <th className="text-left p-2">Used Today</th>
                        <th className="text-left p-2">Remaining</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-medium">DM Water</td>
                        <td className="p-2">1000.00 L</td>
                        <td className="p-2">0.00 L</td>
                        <td className="p-2">1000.00 L</td>
                        <td className="p-2"><Badge className="bg-green-100 text-green-800">In Stock</Badge></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Preservatives TQ</td>
                        <td className="p-2">500.00 ml</td>
                        <td className="p-2">0.00 ml</td>
                        <td className="p-2">500.00 ml</td>
                        <td className="p-2"><Badge className="bg-green-100 text-green-800">In Stock</Badge></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Perfume + Silk mask</td>
                        <td className="p-2">50.00 ml</td>
                        <td className="p-2">0.00 ml</td>
                        <td className="p-2">50.00 ml</td>
                        <td className="p-2"><Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">Colour - Liquid pink AL</td>
                        <td className="p-2">2.50 L</td>
                        <td className="p-2">0.00 L</td>
                        <td className="p-2">2.50 L</td>
                        <td className="p-2"><Badge className="bg-green-100 text-green-800">In Stock</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}