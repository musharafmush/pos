import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusIcon, 
  SearchIcon, 
  MoreHorizontalIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  PackageIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  CopyIcon,
  TagIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import type { Product, Category } from "@shared/schema";

const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  cost: z.string().optional(),
  categoryId: z.number(),
  stockQuantity: z.string().min(1, "Stock quantity is required"),
  alertThreshold: z.string().optional(),
  barcode: z.string().optional(),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductsEnhanced() {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentTab, setCurrentTab] = useState("overview");

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Add form
  const addForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      price: "",
      cost: "",
      categoryId: categories[0]?.id || 1,
      stockQuantity: "",
      alertThreshold: "",
      barcode: "",
      active: true,
    },
  });

  // Edit form
  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      price: "",
      cost: "",
      categoryId: 1,
      stockQuantity: "",
      alertThreshold: "",
      barcode: "",
      active: true,
    },
  });

  // Bulk edit form
  const bulkEditForm = useForm({
    defaultValues: {
      categoryId: "",
      priceAdjustment: "",
      adjustmentType: "percentage", // percentage or fixed
      stockAdjustment: "",
      status: "",
    },
  });

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = 
        categoryFilter === "all" || product.categoryId.toString() === categoryFilter;

      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active);

      const matchesStock = 
        stockFilter === "all" ||
        (stockFilter === "low" && product.stockQuantity <= (product.alertThreshold || 5)) ||
        (stockFilter === "out" && product.stockQuantity === 0) ||
        (stockFilter === "in" && product.stockQuantity > 0);

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: parseFloat(data.price),
        cost: data.cost ? parseFloat(data.cost) : 0,
        stockQuantity: parseInt(data.stockQuantity),
        alertThreshold: data.alertThreshold ? parseInt(data.alertThreshold) : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormValues }) => {
      const res = await apiRequest("PUT", `/api/products/${id}`, {
        ...data,
        price: parseFloat(data.price),
        cost: data.cost ? parseFloat(data.cost) : 0,
        stockQuantity: parseInt(data.stockQuantity),
        alertThreshold: data.alertThreshold ? parseInt(data.alertThreshold) : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const updates = [];
      for (const productId of selectedProducts) {
        const product = products.find((p: Product) => p.id === productId);
        if (product) {
          let updatedData = { ...product };
          
          if (data.categoryId) {
            updatedData.categoryId = parseInt(data.categoryId);
          }
          
          if (data.priceAdjustment) {
            const adjustment = parseFloat(data.priceAdjustment);
            if (data.adjustmentType === "percentage") {
              updatedData.price = (parseFloat(product.price.toString()) * (1 + adjustment / 100)).toString();
            } else {
              updatedData.price = (parseFloat(product.price.toString()) + adjustment).toString();
            }
          }
          
          if (data.stockAdjustment) {
            updatedData.stockQuantity = Math.max(0, product.stockQuantity + parseInt(data.stockAdjustment));
          }
          
          if (data.status !== "") {
            updatedData.active = data.status === "active";
          }
          
          updates.push(apiRequest("PUT", `/api/products/${productId}`, updatedData));
        }
      }
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsBulkEditDialogOpen(false);
      setSelectedProducts([]);
      bulkEditForm.reset();
      toast({
        title: "Success",
        description: `Updated ${selectedProducts.length} products successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle functions
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity.toString(),
      alertThreshold: product.alertThreshold?.toString() || "",
      barcode: product.barcode || "",
      active: product.active,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p: Product) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const getStockStatus = (product: Product) => {
    if (product.stockQuantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (product.stockQuantity <= (product.alertThreshold || 5)) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enhanced Product Management</h1>
            <p className="text-muted-foreground">
              Comprehensive product management with advanced features
            </p>
          </div>
          <div className="flex gap-2">
            {selectedProducts.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setIsBulkEditDialogOpen(true)}
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Bulk Edit ({selectedProducts.length})
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p: Product) => p.active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p: Product) => p.stockQuantity <= (p.alertThreshold || 5)).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <XCircleIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p: Product) => p.stockQuantity === 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Manage your product inventory with advanced controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: Product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <PackageIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.description?.substring(0, 50)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{product.sku}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.price.toString()))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.cost?.toString() || "0"))}</TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-semibold">{product.stockQuantity}</div>
                            {product.alertThreshold && (
                              <div className="text-xs text-muted-foreground">
                                Alert: {product.alertThreshold}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(product)}>
                                <EyeIcon className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <PencilIcon className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.sku)}>
                                <CopyIcon className="mr-2 h-4 w-4" />
                                Copy SKU
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(product)}
                                className="text-red-600"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product in your inventory
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter product name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter SKU" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter product description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: Category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="alertThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Threshold</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter barcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Product</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make this product available for sale
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProductMutation.isPending}>
                    {createProductMutation.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product information
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateProductMutation.mutate({ id: selectedProduct!.id, data }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter product name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter SKU" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter product description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: Category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="alertThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Threshold</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter barcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Product</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make this product available for sale
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProductMutation.isPending}>
                    {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Product Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>
                Complete information about {selectedProduct?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product Name</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SKU</label>
                      <p className="text-sm text-muted-foreground font-mono">{selectedProduct.sku}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <p className="text-sm text-muted-foreground">{getCategoryName(selectedProduct.categoryId)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Badge variant={selectedProduct.active ? "default" : "secondary"}>
                        {selectedProduct.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Selling Price</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedProduct.price.toString()))}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cost Price</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedProduct.cost?.toString() || "0"))}</p>
                    </div>
                  </div>
                  
                  {selectedProduct.description && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                    </div>
                  )}
                  
                  {selectedProduct.barcode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Barcode</label>
                      <p className="text-sm text-muted-foreground font-mono">{selectedProduct.barcode}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="inventory" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedProduct.stockQuantity}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Alert Threshold</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedProduct.alertThreshold || "Not set"}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Stock Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={getStockStatus(selectedProduct).variant}>
                          {getStockStatus(selectedProduct).label}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock Value</label>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedProduct.stockQuantity * parseFloat(selectedProduct.cost?.toString() || "0"))}
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <PackageIcon className="w-12 h-12 mx-auto mb-4" />
                    <p>Transaction history will be displayed here</p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Dialog */}
        <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit Products</DialogTitle>
              <DialogDescription>
                Update {selectedProducts.length} selected products
              </DialogDescription>
            </DialogHeader>
            <Form {...bulkEditForm}>
              <form onSubmit={bulkEditForm.handleSubmit((data) => bulkUpdateMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={bulkEditForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No change</SelectItem>
                          {categories.map((category: Category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bulkEditForm.control}
                    name="priceAdjustment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Adjustment</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkEditForm.control}
                    name="adjustmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adjustment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={bulkEditForm.control}
                  name="stockAdjustment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Adjustment</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bulkEditForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Status (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No change</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkUpdateMutation.isPending}>
                    {bulkUpdateMutation.isPending ? "Updating..." : "Update Products"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedProduct && deleteProductMutation.mutate(selectedProduct.id)}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}