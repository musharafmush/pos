import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  PackageIcon, 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  RefreshCwIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  MoreHorizontalIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BarChart3Icon,
  ShoppingCartIcon,
  TagIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  DownloadIcon,
  UploadIcon,
  PrinterIcon
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category } from "@shared/schema";

export default function AddItemDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch products with error handling
  const { data: products = [], isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      console.log('Fetching products...');
      try {
        const response = await fetch("/api/products", {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched products:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}`);
      if (!response.ok) {
        throw new Error("Failed to delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted",
      });
      setDeleteProductId(null);
    },
    onError: (error) => {
      console.error("Delete product error:", error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter products based on search and filters (with safety check)
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || product.categoryId?.toString() === categoryFilter;

    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && product.active) ||
                         (statusFilter === "inactive" && !product.active);

    const stockQuantity = product.stockQuantity || 0;
    const alertThreshold = product.alertThreshold || 10;
    const matchesStock = stockFilter === "all" ||
                        (stockFilter === "in" && stockQuantity > alertThreshold) ||
                        (stockFilter === "low" && stockQuantity > 0 && stockQuantity <= alertThreshold) ||
                        (stockFilter === "out" && stockQuantity === 0);

    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  // Calculate statistics
  const totalProducts = safeProducts.length;
  const activeItems = safeProducts.filter((p: Product) => p.active).length;
  const lowStockItems = safeProducts.filter((p: Product) => {
    const stock = p.stockQuantity || 0;
    const threshold = p.alertThreshold || 10;
    return stock > 0 && stock <= threshold;
  }).length;
  const bulkItems = safeProducts.filter((p: Product) => {
    const weight = parseFloat(p.weight?.toString() || "0");
    return weight >= 1 || (p.stockQuantity || 0) > 10;
  }).length;
  const repackagedItems = safeProducts.filter((p: Product) => 
    p.sku.includes("REPACK") || p.name.toLowerCase().includes("repack")
  ).length;
  const totalValue = safeProducts.reduce((sum: number, p: Product) => {
    const price = parseFloat(p.price?.toString() || "0");
    const stock = p.stockQuantity || 0;
    return sum + (price * stock);
  }, 0);

  const handleEditProduct = (product: Product) => {
    console.log('Editing product:', product);
    setLocation(`/add-item-professional?edit=${product.id}`);
  };

  const handleDeleteProduct = (productId: number) => {
    setDeleteProductId(productId);
  };

  const confirmDelete = () => {
    if (deleteProductId) {
      deleteProductMutation.mutate(deleteProductId);
    }
  };

  const handleViewProduct = (product: Product) => {
    setViewProduct(product);
    setIsViewDialogOpen(true);
  };

  const refreshData = () => {
    refetchProducts();
    toast({
      title: "Data refreshed",
      description: "Product data has been refreshed successfully",
    });
  };

  // Loading state
  if (isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Loading Products...</h2>
            <p className="text-gray-600">Please wait while we fetch your product data.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (productsError) {
    console.error('Products error details:', productsError);
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <AlertTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800">Failed to Load Products</h2>
            <p className="text-gray-600 mb-2">There was an error loading your product data.</p>
            <p className="text-sm text-gray-500 mb-4">
              Error: {productsError?.message || 'Unknown error occurred'}
            </p>
            <div className="space-x-2">
              <Button onClick={refreshData} variant="outline">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => setLocation("/add-item-professional")} variant="default">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Professional Add Item Dashboard</h1>
            <p className="text-gray-600">Manage and overview your product creation activities</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={() => setLocation("/add-item-professional")}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <Badge variant="secondary" className="mt-1">
                All Items
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Items</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeItems}</div>
              <Badge variant="default" className="mt-1 bg-green-100 text-green-700">
                Available
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockItems}</div>
              <Badge variant="destructive" className="mt-1">
                Needs Reorder
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bulk Items</CardTitle>
              <ShoppingCartIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{bulkItems}</div>
              <Badge variant="outline" className="mt-1">
                Wholesale
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repackaged</CardTitle>
              <TagIcon className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{repackagedItems}</div>
              <Badge variant="outline" className="mt-1">
                Repacked
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">₹{totalValue.toFixed(0)}</div>
              <Badge variant="outline" className="mt-1">
                Inventory Value
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="active-items">Active Items</TabsTrigger>
            <TabsTrigger value="inactive-items">Inactive Items</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="bulk-items">Bulk Items</TabsTrigger>
            <TabsTrigger value="repackaged">Repackaged</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                  Active Items
                </CardTitle>
                <CardDescription>Items that are currently active and available for sale.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  {activeItems > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{activeItems} Active Items</h3>
                      <p className="text-gray-600 mb-4">You have {activeItems} items ready for sale.</p>
                      <Button onClick={() => setActiveTab("active-items")}>
                        View All Active Items
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active Items Found</h3>
                      <p className="text-gray-600 mb-4">You haven't added any active items yet.</p>
                      <Button onClick={() => setLocation("/add-item-professional")}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Your First Item
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Items Management Tab */}
          <TabsContent value="active-items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Items Management</CardTitle>
                <CardDescription>
                  <div className="flex items-center justify-between">
                    <span>Items that are currently active and available for sale.</span>
                    <Button variant="outline" size="sm" onClick={() => setLocation("/add-item-professional")}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add New Item
                    </Button>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <SearchIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Search active items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock</SelectItem>
                      <SelectItem value="in">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Table */}
                {filteredProducts.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product: Product) => {
                          const stockQuantity = product.stockQuantity || 0;
                          const alertThreshold = product.alertThreshold || 10;
                          const isLowStock = stockQuantity > 0 && stockQuantity <= alertThreshold;
                          const isOutOfStock = stockQuantity === 0;

                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  {product.description && (
                                    <div className="text-sm text-gray-500">{product.description}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {product.sku}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {(product as any).category?.name || 'Uncategorized'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">₹{parseFloat(product.price?.toString() || "0").toFixed(2)}</div>
                                  {product.mrp && (
                                    <div className="text-gray-500">MRP: ₹{parseFloat(product.mrp?.toString() || "0").toFixed(2)}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stockQuantity}</span>
                                  {isOutOfStock && (
                                    <Badge variant="destructive" className="text-xs">
                                      Out of Stock
                                    </Badge>
                                  )}
                                  {isLowStock && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      Low Stock
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.active ? (
                                  <Badge variant="default" className="bg-green-100 text-green-700">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    Inactive
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewProduct(product)}>
                                      <EyeIcon className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                      <EditIcon className="mr-2 h-4 w-4" />
                                      Edit Product
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="text-red-600"
                                    >
                                      <TrashIcon className="mr-2 h-4 w-4" />
                                      Delete Product
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all"
                        ? "No items match your current filters."
                        : "You haven't added any items yet."
                      }
                    </p>
                    <Button onClick={() => setLocation("/add-item-professional")}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add New Item
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs with similar structure */}
          <TabsContent value="inactive-items">
            <Card>
              <CardHeader>
                <CardTitle>Inactive Items</CardTitle>
                <CardDescription>Items that are currently inactive or discontinued.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <XCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Inactive Items</h3>
                  <p className="text-gray-600">All your items are currently active.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items</CardTitle>
                <CardDescription>Items that need to be restocked soon.</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems > 0 ? (
                  <div className="space-y-4">
                    {products
                      .filter((p: Product) => {
                        const stock = p.stockQuantity || 0;
                        const threshold = p.alertThreshold || 10;
                        return stock > 0 && stock <= threshold;
                      })
                      .map((product: Product) => (
                        <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {product.stockQuantity} left
                            </Badge>
                            <p className="text-sm text-gray-600 mt-1">
                              Threshold: {product.alertThreshold || 10}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Stock Levels Good</h3>
                    <p className="text-gray-600">No items are running low on stock.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-items">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Items</CardTitle>
                <CardDescription>Items suitable for bulk sales or wholesale.</CardDescription>
              </CardHeader>
              <CardContent>
                {bulkItems > 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCartIcon className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{bulkItems} Bulk Items Available</h3>
                    <p className="text-gray-600">Items with high stock or weight suitable for bulk sales.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Bulk Items</h3>
                    <p className="text-gray-600">No items are currently marked for bulk sales.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repackaged">
            <Card>
              <CardHeader>
                <CardTitle>Repackaged Items</CardTitle>
                <CardDescription>Items that have been repackaged from bulk items.</CardDescription>
              </CardHeader>
              <CardContent>
                {repackagedItems > 0 ? (
                  <div className="text-center py-8">
                    <TagIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{repackagedItems} Repackaged Items</h3>
                    <p className="text-gray-600">Items that have been repackaged from bulk stock.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Repackaged Items</h3>
                    <p className="text-gray-600">
                      No items have been repackaged yet. 
                      <Button variant="link" onClick={() => setLocation("/repacking-dashboard")} className="ml-1">
                        Start repackaging
                      </Button>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Product Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <EyeIcon className="w-5 h-5" />
                Product Details
              </DialogTitle>
              <DialogDescription>
                Complete information about the selected product
              </DialogDescription>
            </DialogHeader>
            
            {viewProduct && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product Name</label>
                    <p className="text-lg font-semibold">{viewProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">SKU</label>
                    <p className="font-mono text-sm bg-white px-2 py-1 rounded border">
                      {viewProduct.sku}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-sm">
                      <Badge variant="outline">
                        {categories.find(c => c.id === viewProduct.categoryId)?.name || 'Uncategorized'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-sm">
                      <Badge variant={viewProduct.active ? "default" : "secondary"}>
                        {viewProduct.active ? "Active" : "Inactive"}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Description */}
                {viewProduct.description && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm mt-1">{viewProduct.description}</p>
                  </div>
                )}

                {/* Pricing Information */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <label className="text-sm font-medium text-gray-600">Selling Price</label>
                    <p className="text-xl font-bold text-green-600">
                      ₹{parseFloat(viewProduct.price?.toString() || "0").toFixed(2)}
                    </p>
                  </div>
                  {viewProduct.mrp && (
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-gray-600">MRP</label>
                      <p className="text-xl font-bold text-blue-600">
                        ₹{parseFloat(viewProduct.mrp?.toString() || "0").toFixed(2)}
                      </p>
                    </div>
                  )}
                  {viewProduct.cost && (
                    <div className="p-4 border rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Cost Price</label>
                      <p className="text-xl font-bold text-orange-600">
                        ₹{parseFloat(viewProduct.cost?.toString() || "0").toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Stock Information */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stock Quantity</label>
                    <p className="text-2xl font-bold">{viewProduct.stockQuantity}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Alert Threshold</label>
                    <p className="text-lg">{viewProduct.alertThreshold || 10}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stock Status</label>
                    <p className="text-sm">
                      {(() => {
                        const stock = viewProduct.stockQuantity || 0;
                        const threshold = viewProduct.alertThreshold || 10;
                        if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
                        if (stock <= threshold) return <Badge variant="outline" className="border-orange-300 text-orange-600">Low Stock</Badge>;
                        return <Badge variant="default" className="bg-green-100 text-green-700">In Stock</Badge>;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Physical Properties */}
                {(viewProduct.weight || viewProduct.weightUnit) && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight</label>
                      <p className="text-lg">{viewProduct.weight || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight Unit</label>
                      <p className="text-lg">{viewProduct.weightUnit || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Tax Information */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-red-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">CGST Rate</label>
                    <p className="text-lg">{viewProduct.cgstRate || 0}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">SGST Rate</label>
                    <p className="text-lg">{viewProduct.sgstRate || 0}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">IGST Rate</label>
                    <p className="text-lg">{viewProduct.igstRate || 0}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">CESS Rate</label>
                    <p className="text-lg">{viewProduct.cessRate || 0}%</p>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-2 gap-4">
                  {viewProduct.hsnCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">HSN Code</label>
                      <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {viewProduct.hsnCode}
                      </p>
                    </div>
                  )}
                  {viewProduct.gstCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">GST Code</label>
                      <p className="text-sm">
                        <Badge variant="outline">{viewProduct.gstCode}</Badge>
                      </p>
                    </div>
                  )}
                  {viewProduct.brand && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Brand</label>
                      <p className="text-sm">{viewProduct.brand}</p>
                    </div>
                  )}
                  {viewProduct.manufacturerName && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Manufacturer</label>
                      <p className="text-sm">{viewProduct.manufacturerName}</p>
                    </div>
                  )}
                  {viewProduct.supplierName && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Supplier</label>
                      <p className="text-sm">{viewProduct.supplierName}</p>
                    </div>
                  )}
                  {viewProduct.buyer && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Buyer</label>
                      <p className="text-sm">{viewProduct.buyer}</p>
                    </div>
                  )}
                </div>

                {/* Calculated Values */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stock Value</label>
                    <p className="text-xl font-bold text-green-600">
                      ₹{(parseFloat(viewProduct.price?.toString() || "0") * (viewProduct.stockQuantity || 0)).toFixed(2)}
                    </p>
                  </div>
                  {viewProduct.mrp && viewProduct.price && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Profit Margin</label>
                      <p className="text-xl font-bold text-blue-600">
                        {(((parseFloat(viewProduct.mrp.toString()) - parseFloat(viewProduct.price.toString())) / parseFloat(viewProduct.mrp.toString())) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-100 rounded">
                  <p><strong>Product ID:</strong> {viewProduct.id}</p>
                  {viewProduct.createdAt && (
                    <p><strong>Created:</strong> {new Date(viewProduct.createdAt).toLocaleString()}</p>
                  )}
                  {viewProduct.updatedAt && (
                    <p><strong>Last Updated:</strong> {new Date(viewProduct.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
              {viewProduct && (
                <Button 
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEditProduct(viewProduct);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteProductId !== null} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}