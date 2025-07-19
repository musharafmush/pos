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
import CreateFormulaForm from "@/components/CreateFormulaForm";
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
  Zap,
  FlaskConical,
  Droplets,
  Sparkles,
  RefreshCw
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

// Manufacturing Formulas Data (Based on provided screenshots)
const manufacturingFormulas = {
  "GLORY Glass Cleaner": [
    { material: "DM Water", quantity: -31.000 },
    { material: "EDTA Powder", quantity: -0.018 },
    { material: "IPA", quantity: -3.500 },
    { material: "Kathon CG", quantity: -0.018 },
    { material: "Perfume - Shimmer", quantity: -0.105 },
    { material: "SLES Liquid", quantity: -0.245 },
    { material: "Tergitol 15 S-9", quantity: -0.105 },
    { material: "Colour - Lavanya Geniva", quantity: -0.001 },
    { material: "Rhodasurf NP 9M", quantity: 0.000 },
    { material: "Miratin CAPB", quantity: 0.000 },
    { material: "Polyquart Pro A", quantity: 0.000 }
  ],
  "Fabric Conditioner": [
    { material: "DM Water", quantity: -455.000 },
    { material: "Prrapagen TQ", quantity: -30.000 },
    { material: "Kathon CG", quantity: -0.250 },
    { material: "Perfume - Silk musk", quantity: -2.500 },
    { material: "Rosaline Marencaps", quantity: -10.000 },
    { material: "Flosoft", quantity: -2.500 },
    { material: "Colour - Liquimint pink AL", quantity: -0.010 }
  ],
  "MORT Lemon Floor Cleaner": [
    { material: "DM Water", quantity: -91.000, percentage: 91.000 },
    { material: "EDTA Powder", quantity: -0.500, percentage: 0.500 },
    { material: "Kathon CG", quantity: -0.050, percentage: 0.050 },
    { material: "Miratin CAPB", quantity: -1.100, percentage: 1.100 },
    { material: "Perfume - Lemon Mod", quantity: -2.300, percentage: 2.300 },
    { material: "Rhodasurf NP 9M", quantity: -5.000, percentage: 5.000 },
    { material: "SLES Liquid", quantity: -1.000, percentage: 1.000 },
    { material: "Perfume - Lavender", quantity: -0.000, percentage: 0.000 },
    { material: "BKC - 80%", quantity: -0.000, percentage: 0.000 },
    { material: "BKC - 50%", quantity: -0.000, percentage: 0.000 },
    { material: "Tergitol 15 S-9", quantity: -0.000, percentage: 0.000 }
  ],
  "MORT Rose Floor Cleaner": [
    { material: "DM Water", quantity: -91.000, percentage: 91.000 },
    { material: "EDTA Powder", quantity: -0.500, percentage: 0.500 },
    { material: "Kathon CG", quantity: -0.050, percentage: 0.050 },
    { material: "Miratin CAPB", quantity: -1.100, percentage: 1.100 },
    { material: "Perfume - Rose Mod", quantity: -2.300, percentage: 2.300 },
    { material: "Rhodasurf NP 9M", quantity: -5.000, percentage: 5.000 },
    { material: "SLES Liquid", quantity: -1.000, percentage: 1.000 }
  ],
  "HYGRA Toilet Cleaner": [
    { material: "DM Water", quantity: -53.240, percentage: 53.240 },
    { material: "Pentacare", quantity: -1.000, percentage: 1.000 },
    { material: "HCl", quantity: -43.600, percentage: 43.600 },
    { material: "Kathon CG", quantity: -0.050, percentage: 0.050 },
    { material: "Rhodasurf NP 9M", quantity: -2.000, percentage: 2.000 },
    { material: "Tergitol 15 S-9", quantity: -0.060, percentage: 0.060 }
  ],
  "SHCLEAN Tiles & Ceramic Cleaner": [
    { material: "DM Water", quantity: -50.760, percentage: 50.760 },
    { material: "HCl", quantity: -43.600, percentage: 43.600 },
    { material: "Kathon CG", quantity: -0.050, percentage: 0.050 },
    { material: "Perfume - Lemon Mod", quantity: -1.600, percentage: 1.600 },
    { material: "Rhodasurf NP 9M", quantity: -2.000, percentage: 2.000 }
  ]
};

const cleaningProducts = [
  { id: 1, name: "GLORY Glass Cleaner", category: "Glass Cleaners", status: "Active" },
  { id: 2, name: "Fabric Conditioner", category: "Fabric Care", status: "Active" },
  { id: 3, name: "MORT Lemon Floor Cleaner", category: "Floor Cleaners", status: "Active" },
  { id: 4, name: "MORT Rose Floor Cleaner", category: "Floor Cleaners", status: "Active" },
  { id: 5, name: "MORT Lavender Floor Cleaner", category: "Floor Cleaners", status: "Active" },
  { id: 6, name: "MORT Jasmine Floor Cleaner", category: "Floor Cleaners", status: "Active" },
  { id: 7, name: "MORT Herbal Floor Cleaner", category: "Floor Cleaners", status: "Active" },
  { id: 8, name: "HYGRA Toilet Cleaner", category: "Toilet Cleaners", status: "Active" },
  { id: 9, name: "SHCLEAN Tiles & Ceramic Cleaner", category: "Tiles Cleaners", status: "Active" },
  { id: 10, name: "SHCLEAN DL3", category: "Multi-Purpose", status: "Active" },
  { id: 11, name: "SHCLEAN DL3 - Blue", category: "Multi-Purpose", status: "Active" },
  { id: 12, name: "SHCLEAN DL3 - Pink", category: "Multi-Purpose", status: "Active" }
];

export default function ManufacturingDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [orderType, setOrderType] = useState("Domestic");
  const [batchSize, setBatchSize] = useState("");
  const [orderDate, setOrderDate] = useState("07-11-2020");
  const [operation, setOperation] = useState("Standard");
  const [currentFormula, setCurrentFormula] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Filter products based on search and category
  const filteredProducts = cleaningProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productCategories = ["All", ...Array.from(new Set(cleaningProducts.map(p => p.category)))];

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

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products')
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products')
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users')
  });

  // Handle product selection
  const handleProductSelection = (productName: string) => {
    setSelectedProduct(productName);
    const formula = manufacturingFormulas[productName as keyof typeof manufacturingFormulas];
    if (formula) {
      setCurrentFormula(formula);
    } else {
      setCurrentFormula([]);
    }
  };

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
      // Reset form
      setSelectedProduct("");
      setBatchSize("");
      setCurrentFormula([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create manufacturing order",
        variant: "destructive"
      });
    }
  });

  const handleCreateOrder = () => {
    if (!selectedProduct || !batchSize) {
      toast({
        title: "Missing Information",
        description: "Please select a product and enter batch size",
        variant: "destructive"
      });
      return;
    }

    const orderData = {
      orderNumber: `MFG-${Date.now()}`,
      batchNumber: `BATCH-${Date.now()}`,
      productName: selectedProduct,
      batchSize: parseInt(batchSize),
      orderType,
      orderDate,
      operation,
      formula: currentFormula,
      status: "pending",
      priority: "medium"
    };

    createOrderMutation.mutate(orderData);
  };

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
            <Dialog open={isCreateRecipeOpen} onOpenChange={setIsCreateRecipeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Beaker className="h-4 w-4" />
                  Create Product Formula
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-600" />
                    Create Product Formula
                  </DialogTitle>
                </DialogHeader>
                <CreateFormulaForm 
                  onSuccess={() => {
                    setIsCreateRecipeOpen(false);
                    toast({
                      title: "Formula Created",
                      description: "Product formula has been created successfully"
                    });
                  }}
                  products={allProducts || []}
                  rawMaterials={rawMaterials}
                />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4" />
                  Create Manufacturing Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-600" />
                    Create Manufacturing Order
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Order Configuration */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Order Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Order Number</Label>
                            <Input value={`MFG-${Date.now()}`} disabled />
                          </div>
                          <div>
                            <Label>Batch Number</Label>
                            <Input value={`BATCH-${Date.now()}`} disabled />
                          </div>
                        </div>
                        
                        <div>
                          <Label>Select Product</Label>
                          
                          {/* Search and Filter Controls */}
                          <div className="space-y-3 mb-3">
                            <Input
                              placeholder="Search products..."
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {productCategories.map((category) => (
                                <Button
                                  key={category}
                                  variant={selectedCategory === category ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedCategory(category)}
                                  className="text-xs"
                                >
                                  {category}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                            {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                              <div 
                                key={product.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                  selectedProduct === product.name 
                                    ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleProductSelection(product.name)}
                              >
                                <div className="flex-shrink-0">
                                  {product.category === "Glass Cleaners" && <Sparkles className="h-5 w-5 text-purple-500" />}
                                  {product.category === "Floor Cleaners" && <Droplets className="h-5 w-5 text-blue-500" />}
                                  {product.category === "Toilet Cleaners" && <FlaskConical className="h-5 w-5 text-green-500" />}
                                  {product.category === "Tiles Cleaners" && <Zap className="h-5 w-5 text-yellow-500" />}
                                  {product.category === "Fabric Care" && <Package className="h-5 w-5 text-pink-500" />}
                                  {product.category === "Multi-Purpose" && <Beaker className="h-5 w-5 text-orange-500" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{product.name}</span>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        product.category === "Floor Cleaners" ? "bg-blue-100 text-blue-700" :
                                        product.category === "Glass Cleaners" ? "bg-purple-100 text-purple-700" :
                                        product.category === "Toilet Cleaners" ? "bg-green-100 text-green-700" :
                                        product.category === "Tiles Cleaners" ? "bg-yellow-100 text-yellow-700" :
                                        product.category === "Fabric Care" ? "bg-pink-100 text-pink-700" :
                                        "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {product.category}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs text-green-600 border-green-200"
                                    >
                                      {product.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {manufacturingFormulas[product.name as keyof typeof manufacturingFormulas] 
                                      ? `${manufacturingFormulas[product.name as keyof typeof manufacturingFormulas].length} materials` 
                                      : 'Formula not available'}
                                  </div>
                                </div>
                                {selectedProduct === product.name && (
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                            )) : (
                              <div className="text-center py-8 text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>No products found</p>
                                <p className="text-sm">Try adjusting your search or filter</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={orderType === "Domestic" ? "bg-blue-100 border-blue-300" : ""}
                            onClick={() => setOrderType("Domestic")}
                          >
                            Domestic
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={orderType === "Export" ? "bg-blue-100 border-blue-300" : ""}
                            onClick={() => setOrderType("Export")}
                          >
                            Export
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Batch Size</Label>
                            <Input 
                              type="number" 
                              placeholder="500" 
                              value={batchSize}
                              onChange={(e) => setBatchSize(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input 
                              value={orderDate}
                              onChange={(e) => setOrderDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Operation</Label>
                          <Select value={operation} onValueChange={setOperation}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Express">Express</SelectItem>
                              <SelectItem value="Quality Control">Quality Control</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2 pt-3">
                          <Button variant="outline" className="flex-1" size="sm">
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                          </Button>
                          <Button variant="outline" className="flex-1" size="sm">
                            Inflow
                          </Button>
                          <Button variant="outline" className="flex-1" size="sm">
                            Outflow
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Material Formula */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Beaker className="h-4 w-4" />
                          Material Formula
                          {selectedProduct && (
                            <Badge variant="outline" className="ml-2">
                              {selectedProduct}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currentFormula.length > 0 ? (
                          <div className="space-y-3">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 mb-2">
                                <span>Material</span>
                                <span>Standard</span>
                                <span>Actual</span>
                              </div>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {currentFormula.map((item, index) => (
                                  <div key={index} className="grid grid-cols-3 gap-2 py-2 border-b border-gray-200 last:border-b-0">
                                    <div className="text-sm font-medium flex items-center gap-1">
                                      <Sparkles className="h-3 w-3 text-orange-500" />
                                      {item.material}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {item.quantity.toFixed(3)}
                                      {item.percentage && (
                                        <span className="text-xs text-blue-600 ml-1">
                                          ({item.percentage}%)
                                        </span>
                                      )}
                                    </div>
                                    <Input 
                                      className="h-8 text-sm" 
                                      defaultValue={Math.abs(item.quantity).toFixed(3)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FlaskConical className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Select a product to view its formula</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateOrder}
                    disabled={!selectedProduct || !batchSize}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Order
                  </Button>
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