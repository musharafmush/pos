import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  PlusIcon,
  PackageIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  RefreshCcwIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  DollarSignIcon,
  WeightIcon,
  TagIcon,
  CalendarIcon,
  XIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import { Link } from "wouter";

export default function AddItemDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    mrp: "",
    stockQuantity: "",
    active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest(`/api/products/${productId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Product> }) => {
      const response = await apiRequest(`/api/products/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.updates),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      mrp: product.mrp?.toString() || product.price.toString(),
      stockQuantity: product.stockQuantity.toString(),
      active: product.active,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    deleteProductMutation.mutate(productId);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    const updates = {
      name: editForm.name,
      description: editForm.description,
      price: parseFloat(editForm.price),
      mrp: parseFloat(editForm.mrp),
      stockQuantity: parseInt(editForm.stockQuantity),
      active: editForm.active,
    };

    updateProductMutation.mutate({ id: selectedProduct.id, updates });
  };

  // Calculate statistics
  const totalProducts = products.length;
  const activeProducts = products.filter((p: Product) => p.active).length;
  const lowStockProducts = products.filter((p: Product) => p.stockQuantity <= 5).length;
  const totalInventoryValue = products.reduce((sum: number, p: Product) => {
    return sum + (parseFloat(p.price.toString()) * p.stockQuantity);
  }, 0);

  // Filter products based on search
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Recent products (last 10)
  const recentProducts = products.slice(-10).reverse();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Professional Add Item Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage and overview your product creation activities</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCcwIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/add-item-professional">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {activeProducts} Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInventoryValue)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Total Stock Value
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                  <p className="text-2xl font-bold text-red-600">{lowStockProducts}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  Needs Attention
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                  <p className="text-2xl font-bold text-green-600">+12.5%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  This Month
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recent">Recent Items</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/add-item-professional">
                    <Button className="w-full justify-start" variant="outline">
                      <PackageIcon className="w-4 h-4 mr-3" />
                      Add New Product
                    </Button>
                  </Link>
                  <Button className="w-full justify-start" variant="outline">
                    <TagIcon className="w-4 h-4 mr-3" />
                    Bulk Import Products
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3Icon className="w-4 h-4 mr-3" />
                    Generate Barcodes
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <WeightIcon className="w-4 h-4 mr-3" />
                    Update Pricing
                  </Button>
                </CardContent>
              </Card>

              {/* Product Categories Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Electronics</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">75%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Clothing</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">50%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Food & Beverages</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/3 h-2 bg-orange-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">33%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Home & Garden</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/4 h-2 bg-purple-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">25%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangleIcon className="w-5 h-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 mb-4">
                    {lowStockProducts} products are running low on stock and need immediate attention.
                  </p>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    View Low Stock Items
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recent Items Tab */}
          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Products</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <FilterIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.slice(0, 10).map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <PackageIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {product.sku}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(product.price.toString()))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(product.mrp?.toString() || product.price.toString()))}</TableCell>
                          <TableCell>
                            <Badge variant={product.stockQuantity <= 5 ? "destructive" : "secondary"}>
                              {product.stockQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.active ? "default" : "secondary"}>
                              {product.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewProduct(product)}
                                title="View Product"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                title="Edit Product"
                              >
                                <EditIcon className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="Delete Product">
                                    <TrashIcon className="w-4 h-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Creation Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Analytics Chart Coming Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Electronics</span>
                      <Badge className="bg-blue-600">{formatCurrency(45000)}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Clothing</span>
                      <Badge className="bg-green-600">{formatCurrency(32000)}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium">Food & Beverages</span>
                      <Badge className="bg-orange-600">{formatCurrency(28000)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Electronics Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Pre-configured for electronic products with GST and warranty</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Clothing Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Optimized for apparel with size and color variations</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <WeightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Food & Beverage Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Includes expiry dates and nutritional information</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* View Product Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5" />
                Product Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this product
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product Name</label>
                    <p className="text-lg font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-800">{selectedProduct.description || "No description"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">SKU</label>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-800">{selectedProduct.categoryId}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Price</label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(parseFloat(selectedProduct.price.toString()))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">MRP</label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(parseFloat(selectedProduct.mrp?.toString() || selectedProduct.price.toString()))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stock Quantity</label>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{selectedProduct.stockQuantity}</p>
                      <Badge variant={selectedProduct.stockQuantity <= 5 ? "destructive" : "secondary"}>
                        {selectedProduct.stockQuantity <= 5 ? "Low Stock" : "In Stock"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge variant={selectedProduct.active ? "default" : "secondary"}>
                      {selectedProduct.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {selectedProduct.weight && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight</label>
                      <p className="text-gray-800">{selectedProduct.weight} {selectedProduct.weightUnit}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              {selectedProduct && (
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditProduct(selectedProduct);
                }}>
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <EditIcon className="w-5 h-5" />
                Edit Product
              </DialogTitle>
              <DialogDescription>
                Update product information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">MRP</label>
                <Input
                  type="number"
                  value={editForm.mrp}
                  onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                  placeholder="Enter MRP"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  value={editForm.stockQuantity}
                  onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                  placeholder="Enter stock quantity"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter product description"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Product is active
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateProduct}
                disabled={updateProductMutation.isPending}
              >
                {updateProductMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}