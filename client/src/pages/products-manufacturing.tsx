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

// Manufacturing Formulas Database - Auto-Select System
const manufacturingFormulas = {
  "mort-lemon-floor-cleaner": {
    name: "MORT Lemon Floor Cleaner",
    type: "Domestic",
    category: "Floor Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Texakaline", standard: 15.000, unit: "gm" },
      { name: "EDTA Powder", standard: 0.500, unit: "gm" },
      { name: "Kathon CG", standard: 1.000, unit: "gm" },
      { name: "Miralan CXP8", standard: 1.000, unit: "gm" },
      { name: "Perfume - Lemon Mist", standard: 2.200, unit: "ml" },
      { name: "Rhodiasurf HP", standard: 5.000, unit: "ml" },
      { name: "SLES Liquid", standard: 5.000, unit: "ml" },
      { name: "Perfume - Lemon", standard: 1.000, unit: "ml" },
      { name: "BRC - 80%", standard: 0.000, unit: "ml" },
      { name: "BRC - 50%", standard: 0.000, unit: "ml" },
      { name: "Tergitol 15-S-9", standard: 0.000, unit: "ml" }
    ]
  },
  "mort-rose-floor-cleaner": {
    name: "MORT Rose Floor Cleaner",
    type: "Domestic", 
    category: "Floor Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Colour - Carmine", standard: 15.000, unit: "gm" },
      { name: "EDTA Powder", standard: 0.500, unit: "gm" },
      { name: "Kathon CG", standard: 1.000, unit: "gm" },
      { name: "Miralan CXP8", standard: 1.000, unit: "gm" },
      { name: "Perfume - Rose Mist", standard: 2.200, unit: "ml" },
      { name: "Rhodiasurf HP", standard: 5.000, unit: "ml" },
      { name: "SLES Liquid", standard: 5.000, unit: "ml" },
      { name: "Perfume - Rose", standard: 1.000, unit: "ml" },
      { name: "BRC - 80%", standard: 0.000, unit: "ml" },
      { name: "BRC - 50%", standard: 0.000, unit: "ml" },
      { name: "Tergitol 15-S-9", standard: 0.000, unit: "ml" }
    ]
  },
  "mort-lavender-floor-cleaner": {
    name: "MORT Lavender Floor Cleaner",
    type: "Domestic",
    category: "Floor Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Colour - Purple", standard: 15.000, unit: "gm" },
      { name: "EDTA Powder", standard: 0.500, unit: "gm" },
      { name: "Kathon CG", standard: 1.000, unit: "gm" },
      { name: "Water Soluble", standard: 1.000, unit: "gm" },
      { name: "Miralan CXP8", standard: 1.000, unit: "gm" },
      { name: "Perfume - Lavender", standard: 2.200, unit: "ml" },
      { name: "Rhodiasurf HP", standard: 5.000, unit: "ml" },
      { name: "SLES Liquid", standard: 5.000, unit: "ml" }
    ]
  },
  "mort-jasmine-floor-cleaner": {
    name: "MORT Jasmine Floor Cleaner",
    type: "Domestic",
    category: "Floor Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Colour - Pink Green", standard: 15.000, unit: "gm" },
      { name: "EDTA Powder", standard: 0.500, unit: "gm" },
      { name: "Kathon CG", standard: 1.000, unit: "gm" },
      { name: "Miralan CXP8", standard: 1.000, unit: "gm" },
      { name: "Perfume - Indian Jasmine SM", standard: 2.200, unit: "ml" },
      { name: "Rhodiasurf HP", standard: 5.000, unit: "ml" },
      { name: "SLES Liquid", standard: 5.000, unit: "ml" },
      { name: "Perfume - Jasmine Mist", standard: 1.000, unit: "ml" }
    ]
  },
  "glory-glass-cleaner": {
    name: "GLORY Glass Cleaner",
    type: "Export",
    category: "Glass Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "EDTA Powder", standard: 10.000, unit: "gm" },
      { name: "IPA", standard: 0.050, unit: "gm" },
      { name: "Kathon CG", standard: 0.300, unit: "gm" },
      { name: "Colour - Shimmer", standard: 0.700, unit: "ml" },
      { name: "SLES Liquid", standard: 0.300, unit: "ml" },
      { name: "Tergitol 15-S-9", standard: 0.0015, unit: "ml" }
    ]
  },
  "hygra-toilet-cleaner": {
    name: "HYGRA Toilet Cleaner",
    type: "Domestic",
    category: "Toilet Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Colour - Lavender Apple", standard: 53.240, unit: "gm" },
      { name: "Forticarbe", standard: 1.000, unit: "gm" },
      { name: "HCl", standard: 48.600, unit: "gm" },
      { name: "Rhodiasolvn ST", standard: 2.400, unit: "ml" }
    ]
  },
  "sriclean-tiles-ceramic": {
    name: "SRICLEAN Tiles & Ceramic Cleaner",
    type: "Premium",
    category: "Tiles Cleaner",
    materials: [
      { name: "DM Water", standard: 455.000, unit: "L" },
      { name: "Colour - Carmaline", standard: 50.720, unit: "gm" },
      { name: "HCl", standard: 45.600, unit: "gm" },
      { name: "Perfume - Squeeze Lime", standard: 0.300, unit: "ml" },
      { name: "Rhodiasolvn HTE", standard: 2.000, unit: "ml" },
      { name: "Tergitol 15-S-9", standard: 1.600, unit: "ml" }
    ]
  }
};

interface User {
  id: number;
  username: string;
  name: string;
}

export default function ProductsManufacturing() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<any[]>([]);
  const [batchSize, setBatchSize] = useState<number>(500);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-select formula and populate materials
  const handleFormulaSelection = (formulaKey: string) => {
    setSelectedFormula(formulaKey);
    const formula = manufacturingFormulas[formulaKey as keyof typeof manufacturingFormulas];
    if (formula) {
      setSelectedMaterials(formula.materials.map(material => ({
        ...material,
        actualQty: material.standard
      })));
      toast({
        title: "Formula Auto-Loaded",
        description: `${formula.name} formula with ${formula.materials.length} materials loaded successfully`,
      });
    }
  };

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

        {/* Enhanced Navigation Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex flex-wrap bg-gradient-to-r from-blue-50 to-indigo-50">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 min-w-fit py-4 px-6 font-medium text-sm transition-all duration-200 ${
                  activeTab === "overview"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span>Overview</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 min-w-fit py-4 px-6 font-medium text-sm transition-all duration-200 ${
                  activeTab === "orders"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🏭</span>
                  <span>Production Orders</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("bom")}
                className={`flex-1 min-w-fit py-4 px-6 font-medium text-sm transition-all duration-200 ${
                  activeTab === "bom"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:text-blue-600 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">⚙️</span>
                  <span>Manufacturing Control</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

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
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-800">Manufacturing Control System</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Complete manufacturing management with batch tracking, quality control, and inventory automation
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50" onClick={() => setActiveTab("batch-records")}>
                <CardHeader className="text-center pb-4">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🧪</div>
                  <CardTitle className="text-xl font-bold text-gray-800">Batch Manufacturing</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-700 mb-6 leading-relaxed">Complete batch production records with materials tracking and approval workflow</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Active Batches:</span>
                      <Badge className="bg-blue-500 text-white">{manufacturingOrders.filter(o => o.status === 'in_progress').length}</Badge>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Pending Approval:</span>
                      <Badge className="bg-yellow-500 text-white">{manufacturingOrders.filter(o => o.status === 'pending').length}</Badge>
                    </div>
                  </div>
                  <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                    Start New Batch
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-green-300 bg-gradient-to-br from-green-50 to-emerald-50" onClick={() => setActiveTab("quality-control")}>
                <CardHeader className="text-center pb-4">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🧬</div>
                  <CardTitle className="text-xl font-bold text-gray-800">Quality Control</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-700 mb-6 leading-relaxed">Quality testing, parameters tracking, and chemist approval system</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Tests Today:</span>
                      <Badge className="bg-green-500 text-white">0</Badge>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Pass Rate:</span>
                      <Badge className="bg-green-600 text-white">100%</Badge>
                    </div>
                  </div>
                  <Button className="mt-4 w-full bg-green-600 hover:bg-green-700">
                    Run Quality Test
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-violet-50" onClick={() => setActiveTab("inventory-tracking")}>
                <CardHeader className="text-center pb-4">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">📊</div>
                  <CardTitle className="text-xl font-bold text-gray-800">Inventory Control</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-700 mb-6 leading-relaxed">Raw material consumption tracking and automatic stock deduction</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Low Stock Items:</span>
                      <Badge className="bg-red-500 text-white">42</Badge>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                      <span className="font-medium">Auto Updates:</span>
                      <Badge className="bg-green-500 text-white">Enabled</Badge>
                    </div>
                  </div>
                  <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
                    View Inventory
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Enhanced Batch Records Tab */}
        {activeTab === "batch-records" && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center space-x-3">
                <div className="text-4xl">🧪</div>
                <h2 className="text-3xl font-bold text-gray-800">Batch Manufacturing Records</h2>
              </div>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Complete production tracking with materials management, quality control, and digital approval workflow
              </p>
              <Button 
                onClick={() => setIsCreateOrderOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Batch Record
              </Button>
            </div>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-2xl">
                  <span className="text-3xl mr-3">📋</span>
                  Manufacturing Batch Form
                </CardTitle>
                <p className="text-blue-100 mt-2">Fill in all required information for complete batch tracking and compliance</p>
              </CardHeader>
              <CardContent className="p-8">
                <form className="space-y-8">
                  {/* Enhanced Product Selection */}
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🏷️</span>
                      Product Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-gray-700 flex items-center">
                          Product Name & Type
                          <Badge className="ml-2 bg-green-500 text-white">Auto-Formula</Badge>
                        </Label>
                        <Select onValueChange={handleFormulaSelection} value={selectedFormula}>
                          <SelectTrigger className="h-12 text-lg bg-white border-2 border-blue-300 focus:border-blue-500">
                            <SelectValue placeholder="Select product formula (Auto-loads materials)" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(manufacturingFormulas).map(([key, formula]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <span className={formula.type === 'Domestic' ? '🏠' : formula.type === 'Export' ? '🌍' : '✨'}>
                                    {formula.type === 'Domestic' ? '🏠' : formula.type === 'Export' ? '🌍' : '✨'}
                                  </span>
                                  <span className="font-medium">{formula.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {formula.type}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    ({formula.materials.length} materials)
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedFormula && (
                          <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600 font-medium">✅ Formula Loaded:</span>
                              <span className="text-green-800 font-semibold">
                                {manufacturingFormulas[selectedFormula as keyof typeof manufacturingFormulas]?.name}
                              </span>
                              <Badge className="bg-green-500 text-white">
                                {manufacturingFormulas[selectedFormula as keyof typeof manufacturingFormulas]?.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-green-600 mt-1">
                              Materials automatically populated in Raw Materials section below
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-gray-700">Manufacturing Date</Label>
                        <Input 
                          type="date" 
                          defaultValue={new Date().toISOString().split('T')[0]} 
                          className="h-12 text-lg bg-white border-2 border-blue-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Batch Information */}
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">📊</span>
                      Batch Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-gray-700">Batch Size</Label>
                        <Input 
                          placeholder="500" 
                          className="h-12 text-lg bg-white border-2 border-green-300 focus:border-green-500"
                        />
                        <span className="text-sm text-green-600 font-medium">Enter quantity in units</span>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-gray-700">Operation Type</Label>
                        <Select>
                          <SelectTrigger className="h-12 text-lg bg-white border-2 border-green-300 focus:border-green-500">
                            <SelectValue placeholder="Select operation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">⚙️ Standard</SelectItem>
                            <SelectItem value="premium">✨ Premium</SelectItem>
                            <SelectItem value="custom">🔧 Custom Blend</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold text-gray-700">Document Number</Label>
                        <Input 
                          placeholder="SRI/PMO-001" 
                          className="h-12 text-lg bg-white border-2 border-green-300 focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Raw Materials Section with Auto-Population */}
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🧪</span>
                      Raw Materials
                      {selectedMaterials.length > 0 && (
                        <Badge className="ml-2 bg-purple-500 text-white">
                          Auto-Populated ({selectedMaterials.length} materials)
                        </Badge>
                      )}
                    </h3>
                    
                    {selectedMaterials.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔬</div>
                        <p className="text-gray-600 mb-2">No formula selected</p>
                        <p className="text-sm text-gray-500">
                          Select a product formula above to automatically populate raw materials
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-2 border-purple-300 text-sm bg-white rounded-lg">
                          <thead className="bg-purple-100">
                            <tr>
                              <th className="border border-purple-300 p-3 text-left font-semibold">Material</th>
                              <th className="border border-purple-300 p-3 text-left font-semibold">Standard Qty</th>
                              <th className="border border-purple-300 p-3 text-left font-semibold">Actual Qty</th>
                              <th className="border border-purple-300 p-3 text-left font-semibold">Unit</th>
                              <th className="border border-purple-300 p-3 text-left font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedMaterials.map((material, index) => (
                              <tr key={index} className="hover:bg-purple-50">
                                <td className="border border-purple-300 p-3 font-medium">{material.name}</td>
                                <td className="border border-purple-300 p-3 text-blue-600 font-semibold">
                                  {material.standard.toFixed(3)}
                                </td>
                                <td className="border border-purple-300 p-3">
                                  <Input 
                                    className="h-10 border-2 border-purple-200 focus:border-purple-400" 
                                    value={material.actualQty?.toFixed(3) || material.standard.toFixed(3)}
                                    onChange={(e) => {
                                      const newMaterials = [...selectedMaterials];
                                      newMaterials[index].actualQty = parseFloat(e.target.value) || 0;
                                      setSelectedMaterials(newMaterials);
                                    }}
                                  />
                                </td>
                                <td className="border border-purple-300 p-3">
                                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                                    {material.unit}
                                  </Badge>
                                </td>
                                <td className="border border-purple-300 p-3">
                                  <Badge className="bg-green-500 text-white">
                                    ✅ Ready
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600 font-semibold">📊 Formula Summary:</span>
                            <span className="text-green-800">
                              {selectedMaterials.length} materials loaded from {manufacturingFormulas[selectedFormula as keyof typeof manufacturingFormulas]?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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

                  {/* Enhanced Submit Actions */}
                  <div className="bg-gray-50 p-6 rounded-xl border-t-4 border-blue-500">
                    <div className="flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="flex-1 h-12 text-lg border-2 border-gray-300 hover:border-gray-400"
                      >
                        💾 Save as Draft
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="flex-1 h-12 text-lg border-2 border-yellow-300 hover:border-yellow-400 text-yellow-700 hover:text-yellow-800"
                      >
                        📋 Submit for Review
                      </Button>
                      <Button 
                        type="submit" 
                        size="lg"
                        className="flex-1 h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        ✅ Complete Batch & Update Inventory
                      </Button>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-4">
                      Completing the batch will automatically update inventory levels and generate quality reports
                    </p>
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