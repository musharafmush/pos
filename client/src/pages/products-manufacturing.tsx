import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Factory, Clock, Target, AlertCircle, CheckCircle, Plus, Play, Edit, MoreVertical, Trash2, Eye, Settings, FileText, Minus } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  costPrice: string;
  stock: number;
  minStock: number;
  description?: string;
}

interface ManufacturingOrder {
  id: number;
  orderNumber: string;
  productId: number;
  targetQuantity: number;
  currentQuantity: number;
  status: string;
  priority: string;
  manufacturingDate: string;
  expiryDate: string;
  estimatedCost: string;
  notes: string;
  createdAt: string;
}

interface BOM {
  id: number;
  productId: number;
  name: string;
  description?: string;
  version?: string;
  outputQuantity: number;
  outputUnit: string;
  totalCost: string;
  estimatedTimeMinutes?: number;
  instructions?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items?: BOMItem[];
  product?: Product;
}

interface BOMItem {
  id: number;
  bomId: number;
  materialId: number;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
  wastagePercentage?: string;
  notes?: string;
  createdAt: string;
  material?: Product;
}

export default function ProductsManufacturing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ManufacturingOrder | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ManufacturingOrder | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  
  // BOM management states
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [showCreateBOMDialog, setShowCreateBOMDialog] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [currentBOMItems, setCurrentBOMItems] = useState<BOMItem[]>([]);
  const [newBOMItem, setNewBOMItem] = useState({
    materialId: 0,
    quantity: "",
    unit: "pieces",
    unitCost: "",
    wastagePercentage: "",
    notes: ""
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json();
    }
  });

  // Fetch manufacturing orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/manufacturing/orders'],
    queryFn: async () => {
      const response = await fetch('/api/manufacturing/orders');
      return response.json();
    }
  });

  // Fetch BOMs
  const { data: boms = [], isLoading: bomsLoading } = useQuery({
    queryKey: ['/api/manufacturing/boms'],
    queryFn: async () => {
      const response = await fetch('/api/manufacturing/boms');
      return response.json();
    }
  });

  // Create manufacturing order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/manufacturing/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      setShowCreateOrder(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Manufacturing order created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create manufacturing order",
        variant: "destructive"
      });
    }
  });

  // Update manufacturing order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/manufacturing/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      setShowEditDialog(false);
      setEditingOrder(null);
      toast({
        title: "Success",
        description: "Manufacturing order updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update manufacturing order",
        variant: "destructive"
      });
    }
  });

  // Delete manufacturing order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/manufacturing/orders/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      toast({
        title: "Success",
        description: "Manufacturing order deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete manufacturing order",
        variant: "destructive"
      });
    }
  });

  // Create BOM mutation
  const createBomMutation = useMutation({
    mutationFn: async (bomData: { productId: number; items: { rawMaterialId: number; quantity: number }[] }) => {
      return apiRequest('/api/manufacturing/boms', {
        method: 'POST',
        body: JSON.stringify(bomData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/boms'] });
      toast({
        title: "Success",
        description: "BOM created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create BOM",
        variant: "destructive"
      });
    }
  });

  // Update BOM mutation
  const updateBomMutation = useMutation({
    mutationFn: async ({ id, bomData }: { id: number; bomData: { items: { rawMaterialId: number; quantity: number }[] } }) => {
      return apiRequest(`/api/manufacturing/boms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bomData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/boms'] });
      toast({
        title: "Success",
        description: "BOM updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update BOM",
        variant: "destructive"
      });
    }
  });

  // Delete BOM mutation
  const deleteBomMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/manufacturing/boms/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/boms'] });
      toast({
        title: "Success",
        description: "BOM deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete BOM",
        variant: "destructive"
      });
    }
  });

  // Filter products based on search
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get orders for a specific product
  const getProductOrders = (productId: number) => {
    return orders.filter((order: ManufacturingOrder) => order.productId === productId);
  };

  // Start manufacturing for a product
  const startManufacturing = (product: Product) => {
    setSelectedProduct(product);
    setShowCreateOrder(true);
  };

  // Edit manufacturing order
  const editOrder = (order: ManufacturingOrder) => {
    setEditingOrder(order);
    setShowEditDialog(true);
  };

  // View manufacturing order
  const viewOrder = (order: ManufacturingOrder) => {
    setViewingOrder(order);
    setShowViewDialog(true);
  };

  // Delete manufacturing order
  const deleteOrder = (id: number) => {
    if (confirm("Are you sure you want to delete this manufacturing order?")) {
      deleteOrderMutation.mutate(id);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'planned': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const orderData = {
      orderNumber: `MO-${Date.now()}`,
      productId: selectedProduct.id,
      targetQuantity: parseInt(formData.get('targetQuantity') as string),
      currentQuantity: 0,
      batchNumber: formData.get('batchNumber') as string,
      manufacturingDate: formData.get('manufacturingDate') as string,
      expiryDate: formData.get('expiryDate') as string,
      status: 'planned',
      priority: formData.get('priority') as string,
      estimatedCost: formData.get('estimatedCost') as string,
      notes: formData.get('notes') as string,
      assignedUserId: 1 // Current user
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products Manufacturing</h1>
          <p className="text-gray-600 mt-2">Manage manufacturing orders for your products</p>
        </div>
        <Button onClick={() => setShowCreateOrder(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Manufacturing Order
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Products</Label>
          <Input
            id="search"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Manufacturing Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {productsLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product: Product) => {
                const productOrders = getProductOrders(product.id);
                const activeOrders = productOrders.filter((order: ManufacturingOrder) => 
                  order.status === 'in_progress' || order.status === 'planned'
                );

                return (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <Badge variant="outline">{product.sku}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Stock:</span>
                          <p className="font-medium">{product.stock}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Stock:</span>
                          <p className="font-medium">{product.minStock}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <p className="font-medium">₹{product.price}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <p className="font-medium">₹{product.costPrice}</p>
                        </div>
                      </div>

                      {/* Stock Status */}
                      <div className="flex items-center space-x-2">
                        {product.stock <= product.minStock ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <span className={`text-sm ${product.stock <= product.minStock ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stock <= product.minStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      {/* Active Orders */}
                      {activeOrders.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Active Orders:</p>
                          {activeOrders.slice(0, 2).map((order: ManufacturingOrder) => (
                            <div key={order.id} className="flex items-center justify-between text-xs">
                              <span>{order.orderNumber}</span>
                              <Badge size="sm" className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </div>
                          ))}
                          {activeOrders.length > 2 && (
                            <p className="text-xs text-gray-500">+{activeOrders.length - 2} more</p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={() => startManufacturing(product)}
                        className="w-full"
                        variant={product.stock <= product.minStock ? "default" : "outline"}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Manufacturing
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order: ManufacturingOrder) => {
                const product = products.find((p: Product) => p.id === order.productId);
                
                return (
                  <Card key={order.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editOrder(order)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteOrder(order.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Product</p>
                        <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Target Qty:</span>
                          <p className="font-medium">{order.targetQuantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Qty:</span>
                          <p className="font-medium">{order.currentQuantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge size="sm" className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                          <span className="text-sm text-gray-500">priority</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(order.manufacturingDate).toLocaleDateString()}
                        </span>
                      </div>

                      {order.notes && (
                        <div>
                          <p className="text-sm text-gray-500">Notes</p>
                          <p className="text-sm">{order.notes}</p>
                        </div>
                      )}

                      {order.estimatedCost && (
                        <div>
                          <p className="text-sm text-gray-500">Estimated Cost</p>
                          <p className="font-medium">₹{order.estimatedCost}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Order Dialog */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Manufacturing Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            {selectedProduct && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
                <p className="text-sm text-gray-600">Current Stock: {selectedProduct.stock}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetQuantity">Target Quantity</Label>
                <Input
                  id="targetQuantity"
                  name="targetQuantity"
                  type="number"
                  required
                  min="1"
                  defaultValue={selectedProduct?.minStock || 100}
                />
              </div>
              <div>
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  name="batchNumber"
                  defaultValue={`B-${Date.now()}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                <Input
                  id="manufacturingDate"
                  name="manufacturingDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                <Input
                  id="estimatedCost"
                  name="estimatedCost"
                  type="number"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateOrder(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Manufacturing Order</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const updateData = {
                targetQuantity: parseInt(formData.get('targetQuantity') as string),
                currentQuantity: parseInt(formData.get('currentQuantity') as string),
                manufacturingDate: formData.get('manufacturingDate') as string,
                expiryDate: formData.get('expiryDate') as string,
                status: formData.get('status') as string,
                priority: formData.get('priority') as string,
                estimatedCost: formData.get('estimatedCost') as string,
                notes: formData.get('notes') as string
              };
              updateOrderMutation.mutate({ id: editingOrder.id, data: updateData });
            }} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">{editingOrder.orderNumber}</h3>
                <p className="text-sm text-gray-600">
                  Product: {products.find(p => p.id === editingOrder.productId)?.name || 'Unknown Product'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetQuantity">Target Quantity</Label>
                  <Input
                    id="targetQuantity"
                    name="targetQuantity"
                    type="number"
                    required
                    min="1"
                    defaultValue={editingOrder.targetQuantity}
                  />
                </div>
                <div>
                  <Label htmlFor="currentQuantity">Current Quantity</Label>
                  <Input
                    id="currentQuantity"
                    name="currentQuantity"
                    type="number"
                    min="0"
                    defaultValue={editingOrder.currentQuantity}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                  <Input
                    id="manufacturingDate"
                    name="manufacturingDate"
                    type="date"
                    required
                    defaultValue={editingOrder.manufacturingDate?.split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    defaultValue={editingOrder.expiryDate?.split('T')[0]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingOrder.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue={editingOrder.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                <Input
                  id="estimatedCost"
                  name="estimatedCost"
                  type="number"
                  step="0.01"
                  defaultValue={editingOrder.estimatedCost}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any additional notes..."
                  rows={3}
                  defaultValue={editingOrder.notes}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateOrderMutation.isPending}>
                  {updateOrderMutation.isPending ? 'Updating...' : 'Update Order'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manufacturing Order Details</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{viewingOrder.orderNumber}</h3>
                  <p className="text-gray-600">
                    Product: {products.find(p => p.id === viewingOrder.productId)?.name || 'Unknown Product'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(viewingOrder.status)}>
                    {viewingOrder.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Production Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target Quantity:</span>
                      <span className="font-medium">{viewingOrder.targetQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Quantity:</span>
                      <span className="font-medium">{viewingOrder.currentQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-medium">
                        {((viewingOrder.currentQuantity / viewingOrder.targetQuantity) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Schedule</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manufacturing Date:</span>
                      <span className="font-medium">
                        {new Date(viewingOrder.manufacturingDate).toLocaleDateString()}
                      </span>
                    </div>
                    {viewingOrder.expiryDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expiry Date:</span>
                        <span className="font-medium">
                          {new Date(viewingOrder.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      <Badge size="sm" className={getPriorityColor(viewingOrder.priority)}>
                        {viewingOrder.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {viewingOrder.estimatedCost && (
                <div>
                  <h4 className="font-medium mb-2">Cost Information</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Cost:</span>
                      <span className="font-medium text-lg">₹{viewingOrder.estimatedCost}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewingOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{viewingOrder.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowViewDialog(false);
                  editOrder(viewingOrder);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
