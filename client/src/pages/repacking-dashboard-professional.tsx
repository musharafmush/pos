import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  PackageIcon,
  TrendingUpIcon,
  BarChart3Icon,
  Search,
  Filter,
  Calendar,
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrendingDownIcon,
  ScaleIcon,
  DollarSignIcon,
  TrashIcon,
  SaveIcon,
  Scissors
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

export default function RepackingDashboardProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRepackDialogOpen, setIsRepackDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBulkProduct, setSelectedBulkProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    cost: "",
    stockQuantity: "",
    weight: "",
    weightUnit: "g",
    alertThreshold: ""
  });

  const [repackFormData, setRepackFormData] = useState({
    sourceQuantity: "1",
    targetQuantity: "8",
    unitWeight: "250",
    targetName: "",
    targetSku: "",
    sellingPrice: "",
    costPrice: "",
    mrp: "",
    customWeight: "",
    selectedPresetWeight: ""
  });

  // Preset weight options in grams
  const presetWeights = [
    { value: "100", label: "100g", display: "100g" },
    { value: "200", label: "200g", display: "200g" },
    { value: "250", label: "250g", display: "250g" },
    { value: "300", label: "300g", display: "300g" },
    { value: "400", label: "400g", display: "400g" },
    { value: "500", label: "500g", display: "500g" },
    { value: "600", label: "600g", display: "600g" },
    { value: "700", label: "700g", display: "700g" },
    { value: "800", label: "800g", display: "800g" },
    { value: "900", label: "900g", display: "900g" },
    { value: "1000", label: "1kg", display: "1 kg" },
    { value: "1500", label: "1.5kg", display: "1.5 kg" },
    { value: "2000", label: "2kg", display: "2 kg" },
    { value: "2500", label: "2.5kg", display: "2.5 kg" },
    { value: "5000", label: "5kg", display: "5 kg" },
    { value: "10000", label: "10kg", display: "10 kg" }
  ];

  const handlePresetWeightSelect = (weight: string) => {
    setRepackFormData(prev => ({
      ...prev,
      unitWeight: weight,
      selectedPresetWeight: weight,
      customWeight: ""
    }));
  };

  const handleCustomWeightChange = (value: string) => {
    setRepackFormData(prev => ({
      ...prev,
      customWeight: value,
      unitWeight: value,
      selectedPresetWeight: ""
    }));
  };

  // Calculate suggested quantities based on weight selection
  const calculateSuggestedQuantity = (bulkWeight: number, targetWeight: number) => {
    if (!targetWeight || targetWeight <= 0) return 0;
    return Math.floor((bulkWeight * 1000) / targetWeight); // Convert kg to grams
  };

  // Auto-suggest target quantity when weight changes
  const handleWeightChangeWithCalculation = (weight: string, isPreset: boolean = false) => {
    if (isPreset) {
      handlePresetWeightSelect(weight);
    } else {
      handleCustomWeightChange(weight);
    }

    // Auto-calculate suggested quantity if bulk product weight is available
    if (selectedBulkProduct?.weight && weight) {
      const suggestedQty = calculateSuggestedQuantity(
        parseFloat(selectedBulkProduct.weight.toString()),
        parseInt(weight)
      );
      if (suggestedQty > 0) {
        setRepackFormData(prev => ({
          ...prev,
          targetQuantity: suggestedQty.toString()
        }));
      }
    }
  };

  // Fetch all products to identify repacked items
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productData,
          sku: productData.sku.includes("REPACK") ? productData.sku : `${productData.sku}-REPACK`,
          active: true,
          categoryId: 1
        }),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Repacked product created successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create repacked product", variant: "destructive" });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...productData }: any) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Repacked product updated successfully" });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update repacked product", variant: "destructive" });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Repacked product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete repacked product", variant: "destructive" });
    },
  });

  // Form management functions
  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      price: "",
      cost: "",
      stockQuantity: "",
      weight: "",
      weightUnit: "g",
      alertThreshold: ""
    });
    setSelectedProduct(null);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost.toString(),
      stockQuantity: product.stockQuantity.toString(),
      weight: product.weight?.toString() || "",
      weightUnit: product.weightUnit || "g",
      alertThreshold: product.alertThreshold.toString()
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    createProductMutation.mutate({
      ...formData,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stockQuantity: parseInt(formData.stockQuantity),
      weight: formData.weight ? parseFloat(formData.weight) : null,
      alertThreshold: parseInt(formData.alertThreshold)
    });
  };

  const handleSubmitEdit = () => {
    if (!selectedProduct) return;
    updateProductMutation.mutate({
      id: selectedProduct.id,
      ...formData,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stockQuantity: parseInt(formData.stockQuantity),
      weight: formData.weight ? parseFloat(formData.weight) : null,
      alertThreshold: parseInt(formData.alertThreshold)
    });
  };

  const handleDelete = (id: number) => {
    deleteProductMutation.mutate(id);
  };

  const handleStartRepack = (product: Product) => {
    setSelectedBulkProduct(product);

    // Auto-generate target product details
    const timestamp = Date.now();
    const targetName = product.name.includes('BULK') 
      ? product.name.replace('BULK', '250g Pack') 
      : `${product.name} (250g Pack)`;
    const targetSku = `${product.sku}-REPACK-250G-${timestamp}`;

    setRepackFormData({
      sourceQuantity: "1",
      targetQuantity: "8",
      unitWeight: "250",
      targetName,
      targetSku,
      sellingPrice: (parseFloat(product.price) * 1.2).toFixed(2),
      costPrice: product.cost,
      mrp: (parseFloat(product.price) * 1.5).toFixed(2)
    });

    setIsRepackDialogOpen(true);
  };

  // Repack mutation
  const repackMutation = useMutation({
    mutationFn: async (data: typeof repackFormData) => {
      if (!selectedBulkProduct) throw new Error("No bulk product selected");

      // Create new repacked product
      const repackedProduct = {
        name: data.targetName,
        description: `Repacked from bulk item: ${selectedBulkProduct.name}. Original weight: ${selectedBulkProduct.weight}${selectedBulkProduct.weightUnit}`,
        sku: data.targetSku,
        price: data.sellingPrice,
        mrp: data.mrp,
        cost: data.costPrice,
        weight: data.unitWeight,
        weightUnit: "g",
        categoryId: selectedBulkProduct.categoryId || 1,
        stockQuantity: parseInt(data.targetQuantity),
        alertThreshold: 5,
        barcode: "",
        active: true,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repackedProduct),
      });

      if (!response.ok) throw new Error("Failed to create repacked product");

      // Update bulk product stock
      const bulkUnitsUsed = parseFloat(data.sourceQuantity);
      const newBulkStock = Math.max(0, selectedBulkProduct.stockQuantity - bulkUnitsUsed);

      const updateResponse = await fetch(`/api/products/${selectedBulkProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedBulkProduct,
          stockQuantity: newBulkStock,
          price: selectedBulkProduct.price.toString(),
          cost: selectedBulkProduct.cost.toString(),
          mrp: selectedBulkProduct.mrp.toString()
        }),
      });

      if (!updateResponse.ok) throw new Error("Failed to update bulk product stock");

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Repacking completed successfully!" });
      setIsRepackDialogOpen(false);
      setRepackFormData({
        sourceQuantity: "1",
        targetQuantity: "8",
        unitWeight: "250",
        targetName: "",
        targetSku: "",
        sellingPrice: "",
        costPrice: "",
        mrp: ""
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to complete repacking", variant: "destructive" });
    },
  });

  // Filter repacked products (those with "REPACK" in SKU)
  const repackedProducts = products.filter((product: Product) => 
    product.sku.includes("REPACK")
  );

  // Filter bulk products (those without "REPACK" in SKU)
  const bulkProducts = products.filter((product: Product) => 
    !product.sku.includes("REPACK")
  );

  // Calculate statistics
  const totalRepackedItems = repackedProducts.length;
  const totalBulkItems = bulkProducts.length;
  const totalRepackedValue = repackedProducts.reduce((sum: number, product: Product) => 
    sum + (parseFloat(product.price) * product.stockQuantity), 0
  );
  const averageRepackValue = totalRepackedItems > 0 ? totalRepackedValue / totalRepackedItems : 0;

  // Filter repacked products based on search and filters
  const filteredRepackedProducts = repackedProducts.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && product.active) ||
                         (statusFilter === "inactive" && !product.active);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
            <p className="mt-2 text-gray-500">Loading repacking data...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Professional Repacking Dashboard</h1>
            <p className="text-gray-500">Monitor and analyze your repacking operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <BarChart3Icon className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button onClick={handleCreate}>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Repack Entry
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Repacked Items</p>
                  <p className="text-3xl font-bold text-blue-600">{totalRepackedItems}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUpIcon className="w-3 h-3 mr-1" />
                    Active products
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bulk Products</p>
                  <p className="text-3xl font-bold text-orange-600">{totalBulkItems}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <ScaleIcon className="w-3 h-3 mr-1" />
                    Available for repack
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ScaleIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Repack Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRepackedValue)}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <DollarSignIcon className="w-3 h-3 mr-1" />
                    Current inventory
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Repack Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(averageRepackValue)}</p>
                  <p className="text-xs text-purple-600 flex items-center mt-1">
                    <BarChart3Icon className="w-3 h-3 mr-1" />
                    Per item
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3Icon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="repacked-items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repacked-items">Repacked Items</TabsTrigger>
            <TabsTrigger value="bulk-products">Bulk Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Repacked Items Tab */}
          <TabsContent value="repacked-items" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Repacked Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search repacked items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Repacked Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Repacked Products ({filteredRepackedProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Stock Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepackedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-500">No repacked items found</p>
                          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRepackedProducts.map((product: Product) => (
                        
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-mono text-xs max-w-[60px]">
                              <div className="truncate" title={product.sku}>
                                {product.sku.length > 5 ? `${product.sku.substring(0, 5)}...` : product.sku}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.description && (
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ScaleIcon className="h-4 w-4 text-gray-400" />
                              <span>{product.weight}{product.weightUnit}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              product.stockQuantity <= product.alertThreshold 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {product.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(parseFloat(product.price))}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(parseFloat(product.price) * product.stockQuantity)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.active ? "default" : "secondary"}>
                              {product.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleView(product)}>
                                <EyeIcon className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                                <EditIcon className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Repacked Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(product.id)}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Products Tab */}
          <TabsContent value="bulk-products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Bulk Products ({bulkProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Repack Potential</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkProducts.map((product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {product.sku}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            product.stockQuantity <= product.alertThreshold 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {product.stockQuantity} {product.weightUnit || 'units'}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.cost))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.price))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.mrp))}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {product.stockQuantity > 5 ? (
                              <Badge className="bg-green-100 text-green-700">High</Badge>
                            ) : product.stockQuantity > 1 ? (
                              <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">Low</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleStartRepack(product)}
                          >
                            <PackageIcon className="h-4 w-4 mr-1" />
                            Repack
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Repacking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Total Bulk Products:</span>
                      <span className="font-semibold">{totalBulkItems}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Total Repacked Items:</span>
                      <span className="font-semibold">{totalRepackedItems}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Repack Conversion Rate:</span>
                      <span className="font-semibold">
                        {totalBulkItems > 0 ? ((totalRepackedItems / totalBulkItems) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Average Value per Repack:</span>
                      <span className="font-semibold">{formatCurrency(averageRepackValue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repackedProducts.slice(0, 5).map((product: Product) => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <PackageIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Stock: {product.stockQuantity} units • {formatCurrency(parseFloat(product.price))} each
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Recent'}
                        </Badge>
                      </div>
                    ))}
                    {repackedProducts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <PackageIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p>No repacking activity yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Product Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Repacked Product</DialogTitle>
              <DialogDescription>
                Add a new repacked product to your inventory
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU (REPACK will be added)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Unit Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Unit Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Alert Threshold *</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Select value={formData.weightUnit} onValueChange={(value) => setFormData({ ...formData, weightUnit: value })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCreate} disabled={createProductMutation.isPending}>
                <SaveIcon className="w-4 h-4 mr-2" />
                {createProductMutation.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Repacked Product</DialogTitle>
              <DialogDescription>
                Update the details of this repacked product
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU *</Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Unit Price *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Unit Cost *</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stockQuantity">Stock Quantity *</Label>
                <Input
                  id="edit-stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-alertThreshold">Alert Threshold *</Label>
                <Input
                  id="edit-alertThreshold"
                  type="number"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Select value={formData.weightUnit} onValueChange={(value) => setFormData({ ...formData, weightUnit: value })}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={updateProductMutation.isPending}>
                <SaveIcon className="w-4 h-4 mr-2" />
                {updateProductMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Product Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>
                View details of this repacked product
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Product Name</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">SKU</Label>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedProduct.sku}</code>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Unit Price</Label>
                    <p className="text-sm text-gray-600">{formatCurrency(parseFloat(selectedProduct.price))}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Unit Cost</Label>
                    <p className="text-sm text-gray-600">{formatCurrency(parseFloat(selectedProduct.cost))}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Stock Quantity</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.stockQuantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Alert Threshold</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.alertThreshold}</p>
                  </div>
                  {selectedProduct.weight && (
                    <div>
                      <Label className="text-sm font-medium">Weight</Label>
                      <p className="text-sm text-gray-600">{selectedProduct.weight}{selectedProduct.weightUnit}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedProduct.active ? "default" : "secondary"}>
                      {selectedProduct.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {selectedProduct.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Total Value</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(parseFloat(selectedProduct.price) * selectedProduct.stockQuantity)}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              {selectedProduct && (
                <Button onClick={() => handleEdit(selectedProduct)}>
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Repack Dialog */}
        <Dialog open={isRepackDialogOpen} onOpenChange={setIsRepackDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Repack Bulk Product</DialogTitle>
              <DialogDescription>
                Create smaller units from bulk product: {selectedBulkProduct?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedBulkProduct && (
              <div className="space-y-6">
                {/* Source Product Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Source Product</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{selectedBulkProduct.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">SKU:</span>
                      <p className="font-mono text-xs">{selectedBulkProduct.sku}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Stock:</span>
                      <p className="font-medium">{selectedBulkProduct.stockQuantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Price:</span>
                      <p className="font-medium">{formatCurrency(parseFloat(selectedBulkProduct.price))}</p>
                    </div>
                  </div>
                </div>

                {/* Repack Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repack-sourceQuantity">Bulk Units to Use</Label>
                    <Input
                      id="repack-sourceQuantity"
                      type="number"
                      min="1"
                      max={selectedBulkProduct.stockQuantity}
                      value={repackFormData.sourceQuantity}
                      onChange={(e) => setRepackFormData({ ...repackFormData, sourceQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-targetQuantity">Units to Create</Label>
                    <Input
                      id="repack-targetQuantity"
                      type="number"
                      min="1"
                      value={repackFormData.targetQuantity}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 col-span-2">
                    <Label>Unit Weight Selection</Label>
                    
                    {/* Preset Weight Buttons */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">Quick Select:</div>
                      <div className="grid grid-cols-4 gap-2">
                        {presetWeights.map((preset) => (
                          <Button
                            key={preset.value}
                            type="button"
                            variant={repackFormData.selectedPresetWeight === preset.value ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => handleWeightChangeWithCalculation(preset.value, true)}
                          >
                            {preset.display}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Weight Input */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Custom Weight (grams):</div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter custom weight"
                          value={repackFormData.customWeight}
                          onChange={(e) => handleWeightChangeWithCalculation(e.target.value, false)}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-500">grams</span>
                      </div>
                    </div>

                    {/* Current Selection Display */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium text-blue-900">Selected Weight: </span>
                        <span className="text-blue-700">
                          {repackFormData.unitWeight ? `${repackFormData.unitWeight}g` : 'None selected'}
                          {repackFormData.unitWeight && parseInt(repackFormData.unitWeight) >= 1000 && 
                            ` (${(parseInt(repackFormData.unitWeight) / 1000).toFixed(1)}kg)`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-targetName">New Product Name</Label>
                    <Input
                      id="repack-targetName"
                      value={repackFormData.targetName}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-targetSku">New SKU</Label>
                    <Input
                      id="repack-targetSku"
                      value={repackFormData.targetSku}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetSku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-sellingPrice">Selling Price</Label>
                    <Input
                      id="repack-sellingPrice"
                      type="number"
                      step="0.01"
                      value={repackFormData.sellingPrice}
                      onChange={(e) => setRepackFormData({ ...repackFormData, sellingPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-costPrice">Cost Price</Label>
                    <Input
                      id="repack-costPrice"
                      type="number"
                      step="0.01"
                      value={repackFormData.costPrice}
                      onChange={(e) => setRepackFormData({ ...repackFormData, costPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repack-mrp">MRP</Label>
                    <Input
                      id="repack-mrp"
                      type="number"
                      step="0.01"
                      value={repackFormData.mrp}
                      onChange={(e) => setRepackFormData({ ...repackFormData, mrp: e.target.value })}
                    />
                  </div>
                </div>

                {/* Enhanced Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Repack Summary & Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="text-green-800">
                        <span className="font-medium">Source Usage:</span>
                        <p>• {repackFormData.sourceQuantity} bulk unit(s) of {selectedBulkProduct.name}</p>
                        <p>• Remaining stock: {selectedBulkProduct.stockQuantity - parseInt(repackFormData.sourceQuantity || "0")}</p>
                      </div>
                      <div className="text-blue-800">
                        <span className="font-medium">Output:</span>
                        <p>• {repackFormData.targetQuantity} units of {repackFormData.unitWeight}g each</p>
                        <p>• Total weight: {parseInt(repackFormData.targetQuantity || "0") * parseInt(repackFormData.unitWeight || "0")}g</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-purple-800">
                        <span className="font-medium">Pricing:</span>
                        <p>• Unit price: {formatCurrency(parseFloat(repackFormData.sellingPrice || "0"))}</p>
                        <p>• Total value: {formatCurrency(parseFloat(repackFormData.sellingPrice || "0") * parseInt(repackFormData.targetQuantity || "0"))}</p>
                      </div>
                      {repackFormData.unitWeight && repackFormData.targetQuantity && (
                        <div className="text-orange-800">
                          <span className="font-medium">Efficiency:</span>
                          <p>• Per gram cost: {formatCurrency(parseFloat(repackFormData.sellingPrice || "0") / parseInt(repackFormData.unitWeight || "1"))}</p>
                          <p>• Weight category: {parseInt(repackFormData.unitWeight) >= 1000 ? "Bulk" : parseInt(repackFormData.unitWeight) >= 500 ? "Medium" : "Small"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar for Stock Usage */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Stock Usage</span>
                      <span>{((parseInt(repackFormData.sourceQuantity || "0") / selectedBulkProduct.stockQuantity) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (parseInt(repackFormData.sourceQuantity || "0") / selectedBulkProduct.stockQuantity) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRepackDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => repackMutation.mutate(repackFormData)}
                disabled={repackMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Scissors className="w-4 h-4 mr-2" />
                {repackMutation.isPending ? "Processing..." : "Complete Repack"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}