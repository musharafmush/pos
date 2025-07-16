import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFormatCurrency } from "@/lib/currency";
import {
  Factory,
  Package,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Eye,
  Calendar,
  BarChart3,
  Settings,
  ShoppingCart,
  Beaker,
  Zap
} from "lucide-react";
import type { 
  ManufacturingOrder, 
  ManufacturingBatch, 
  QualityControlCheck, 
  RawMaterial,
  ManufacturingRecipe,
  Product,
  User
} from "@shared/schema";

interface ManufacturingStats {
  totalOrders: number;
  ordersInProgress: number;
  completedToday: number;
  qualityIssues: number;
  rawMaterialsLow: number;
  totalBatches: number;
  avgProductionTime: number;
  qualityPassRate: number;
}

export default function ManufacturingDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Fetch manufacturing data
  const { data: manufacturingStats, isLoading: statsLoading } = useQuery<ManufacturingStats>({
    queryKey: ['/api/manufacturing/stats'],
    queryFn: () => apiRequest('/api/manufacturing/stats')
  });

  const { data: manufacturingOrders = [], isLoading: ordersLoading } = useQuery<ManufacturingOrder[]>({
    queryKey: ['/api/manufacturing/orders'],
    queryFn: () => apiRequest('/api/manufacturing/orders')
  });

  const { data: manufacturingBatches = [], isLoading: batchesLoading } = useQuery<ManufacturingBatch[]>({
    queryKey: ['/api/manufacturing/batches'],
    queryFn: () => apiRequest('/api/manufacturing/batches')
  });

  const { data: qualityChecks = [], isLoading: qualityLoading } = useQuery<QualityControlCheck[]>({
    queryKey: ['/api/manufacturing/quality-checks'],
    queryFn: () => apiRequest('/api/manufacturing/quality-checks')
  });

  const { data: rawMaterials = [], isLoading: materialsLoading } = useQuery<RawMaterial[]>({
    queryKey: ['/api/manufacturing/raw-materials'],
    queryFn: () => apiRequest('/api/manufacturing/raw-materials')
  });

  const { data: recipes = [], isLoading: recipesLoading } = useQuery<ManufacturingRecipe[]>({
    queryKey: ['/api/manufacturing/recipes'],
    queryFn: () => apiRequest('/api/manufacturing/recipes')
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products')
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users')
  });

  // Create manufacturing order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/manufacturing/orders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Manufacturing Order Created",
        description: "New manufacturing order has been created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/stats'] });
      setIsCreateOrderOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create manufacturing order",
        variant: "destructive"
      });
    }
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return apiRequest(`/api/manufacturing/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      toast({
        title: "Order Status Updated",
        description: "Manufacturing order status has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { color: "bg-blue-100 text-blue-800", label: "Planned" },
      in_progress: { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: "bg-gray-100 text-gray-800", label: "Low" },
      medium: { color: "bg-blue-100 text-blue-800", label: "Medium" },
      high: { color: "bg-orange-100 text-orange-800", label: "High" },
      urgent: { color: "bg-red-100 text-red-800", label: "Urgent" }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getQualityBadge = (result: string) => {
    const qualityConfig = {
      pass: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      fail: { color: "bg-red-100 text-red-800", icon: XCircle },
      conditional_pass: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle }
    };
    const config = qualityConfig[result as keyof typeof qualityConfig];
    if (!config) return <Badge>Unknown</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {result.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manufacturing Dashboard</h1>
            <p className="text-muted-foreground">
              Manage production orders, track quality, and monitor manufacturing operations
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Manufacturing Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orderNumber">Order Number</Label>
                      <Input
                        id="orderNumber"
                        placeholder="MFG-001"
                        defaultValue={`MFG-${Date.now()}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="batchNumber">Batch Number</Label>
                      <Input
                        id="batchNumber"
                        placeholder="BATCH-001"
                        defaultValue={`BATCH-${Date.now()}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="productId">Product</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="targetQuantity">Target Quantity</Label>
                      <Input
                        id="targetQuantity"
                        type="number"
                        placeholder="100"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
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
                      <Label htmlFor="assignedUser">Assigned User</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes or instructions..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => createOrderMutation.mutate({})}>
                      Create Order
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{manufacturingStats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {manufacturingStats?.ordersInProgress || 0} in progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{manufacturingStats?.completedToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                Quality pass rate: {manufacturingStats?.qualityPassRate || 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{manufacturingStats?.qualityIssues || 0}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials Low</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{manufacturingStats?.rawMaterialsLow || 0}</div>
              <p className="text-xs text-muted-foreground">
                Need restocking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {manufacturingOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className="text-sm text-gray-600">{order.batchNumber}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {getPriorityBadge(order.priority)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Beaker className="h-5 w-5" />
                    Quality Control Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {qualityChecks.slice(0, 5).map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{check.checkType}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(check.checkDate).toLocaleDateString()}
                          </div>
                        </div>
                        {getQualityBadge(check.checkResult)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Target Qty</TableHead>
                      <TableHead>Current Qty</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manufacturingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.batchNumber}</TableCell>
                        <TableCell>{order.productId}</TableCell>
                        <TableCell>{order.targetQuantity}</TableCell>
                        <TableCell>{order.currentQuantity}</TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatusMutation.mutate({
                                orderId: order.id,
                                status: order.status === 'planned' ? 'in_progress' : 'completed'
                              })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Manufacturing Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Quality Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manufacturingBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                        <TableCell>{batch.productId}</TableCell>
                        <TableCell>{batch.quantity}</TableCell>
                        <TableCell>{new Date(batch.manufacturingDate).toLocaleDateString()}</TableCell>
                        <TableCell>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={batch.qualityGrade === 'A' ? 'default' : batch.qualityGrade === 'B' ? 'secondary' : 'destructive'}>
                            {batch.qualityGrade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Control Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check Type</TableHead>
                      <TableHead>Check Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Re-check Required</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qualityChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="font-medium">{check.checkType}</TableCell>
                        <TableCell>{new Date(check.checkDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getQualityBadge(check.checkResult)}</TableCell>
                        <TableCell>{check.inspectorUserId}</TableCell>
                        <TableCell>
                          <Badge variant={check.reCheckRequired ? 'destructive' : 'default'}>
                            {check.reCheckRequired ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Raw Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock Level</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Storage Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell>{material.currentStock} {material.unit}</TableCell>
                        <TableCell>{material.minStockLevel} {material.unit}</TableCell>
                        <TableCell>{formatCurrency(Number(material.unitCost))}</TableCell>
                        <TableCell>{material.storageLocation || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={Number(material.currentStock) <= Number(material.minStockLevel) ? 'destructive' : 'default'}>
                            {Number(material.currentStock) <= Number(material.minStockLevel) ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Recipes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipe Name</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Output Quantity</TableHead>
                      <TableHead>Estimated Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell className="font-medium">{recipe.name}</TableCell>
                        <TableCell>{recipe.productId}</TableCell>
                        <TableCell>{recipe.outputQuantity}</TableCell>
                        <TableCell>{recipe.estimatedTime ? `${recipe.estimatedTime} mins` : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={recipe.active ? 'default' : 'secondary'}>
                            {recipe.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}