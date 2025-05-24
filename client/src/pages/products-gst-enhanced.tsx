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
  XCircleIcon,
  CalculatorIcon,
  PercentIcon,
  IndianRupeeIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";

const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  cost: z.string().optional(),
  mrp: z.string().min(1, "MRP is required"),
  categoryId: z.number(),
  stockQuantity: z.string().min(1, "Stock quantity is required"),
  alertThreshold: z.string().optional(),
  barcode: z.string().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.string().min(1, "GST rate is required"),
  cgstRate: z.string().optional(),
  sgstRate: z.string().optional(),
  igstRate: z.string().optional(),
  cessRate: z.string().optional(),
  taxType: z.string(),
  wholesalePrice: z.string().optional(),
  retailPrice: z.string().optional(),
  marginPercentage: z.string().optional(),
  taxExempted: z.boolean().default(false),
  unitType: z.string(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: string;
  cost?: string;
  mrp?: string;
  categoryId: number;
  stockQuantity: number;
  alertThreshold?: number;
  barcode?: string;
  hsnCode?: string;
  gstRate?: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
  cessRate?: string;
  taxType?: string;
  wholesalePrice?: string;
  retailPrice?: string;
  marginPercentage?: string;
  taxExempted?: boolean;
  unitType?: string;
  weight?: string;
  dimensions?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export default function ProductsGSTEnhanced() {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [taxFilter, setTaxFilter] = useState<string>("all");
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
      mrp: "",
      categoryId: 1,
      stockQuantity: "",
      alertThreshold: "",
      barcode: "",
      hsnCode: "",
      gstRate: "18",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "18",
      cessRate: "0",
      taxType: "inclusive",
      wholesalePrice: "",
      retailPrice: "",
      marginPercentage: "",
      taxExempted: false,
      unitType: "piece",
      weight: "",
      dimensions: "",
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
      mrp: "",
      categoryId: 1,
      stockQuantity: "",
      alertThreshold: "",
      barcode: "",
      hsnCode: "",
      gstRate: "18",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "18",
      cessRate: "0",
      taxType: "inclusive",
      wholesalePrice: "",
      retailPrice: "",
      marginPercentage: "",
      taxExempted: false,
      unitType: "piece",
      weight: "",
      dimensions: "",
      active: true,
    },
  });

  // Calculate tax amounts
  const calculateTaxAmounts = (price: number, gstRate: number, taxType: string) => {
    if (taxType === "inclusive") {
      const baseAmount = price / (1 + gstRate / 100);
      const taxAmount = price - baseAmount;
      return { baseAmount, taxAmount };
    } else {
      const taxAmount = price * (gstRate / 100);
      const totalAmount = price + taxAmount;
      return { baseAmount: price, taxAmount, totalAmount };
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.hsnCode && product.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()));

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

      const matchesTax = 
        taxFilter === "all" ||
        (taxFilter === "exempted" && product.taxExempted) ||
        (taxFilter === "taxable" && !product.taxExempted) ||
        (taxFilter === "gst5" && product.gstRate === "5") ||
        (taxFilter === "gst12" && product.gstRate === "12") ||
        (taxFilter === "gst18" && product.gstRate === "18") ||
        (taxFilter === "gst28" && product.gstRate === "28");

      return matchesSearch && matchesCategory && matchesStatus && matchesStock && matchesTax;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, taxFilter]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const res = await apiRequest("POST", "/api/products", {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: parseFloat(data.price),
        cost: data.cost ? parseFloat(data.cost) : 0,
        mrp: parseFloat(data.mrp),
        categoryId: data.categoryId,
        stockQuantity: parseInt(data.stockQuantity),
        alertThreshold: data.alertThreshold ? parseInt(data.alertThreshold) : null,
        barcode: data.barcode,
        hsnCode: data.hsnCode,
        gstRate: parseFloat(data.gstRate),
        cgstRate: parseFloat(data.cgstRate || "0"),
        sgstRate: parseFloat(data.sgstRate || "0"),
        igstRate: parseFloat(data.igstRate || "0"),
        cessRate: parseFloat(data.cessRate || "0"),
        taxType: data.taxType,
        wholesalePrice: data.wholesalePrice ? parseFloat(data.wholesalePrice) : 0,
        retailPrice: data.retailPrice ? parseFloat(data.retailPrice) : parseFloat(data.price),
        marginPercentage: data.marginPercentage ? parseFloat(data.marginPercentage) : 0,
        taxExempted: data.taxExempted,
        unitType: data.unitType,
        weight: data.weight ? parseFloat(data.weight) : 0,
        dimensions: data.dimensions,
        active: data.active,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Success",
        description: "Product added successfully with GST details",
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
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: parseFloat(data.price),
        cost: data.cost ? parseFloat(data.cost) : 0,
        mrp: parseFloat(data.mrp),
        categoryId: data.categoryId,
        stockQuantity: parseInt(data.stockQuantity),
        alertThreshold: data.alertThreshold ? parseInt(data.alertThreshold) : null,
        barcode: data.barcode,
        hsnCode: data.hsnCode,
        gstRate: parseFloat(data.gstRate),
        cgstRate: parseFloat(data.cgstRate || "0"),
        sgstRate: parseFloat(data.sgstRate || "0"),
        igstRate: parseFloat(data.igstRate || "0"),
        cessRate: parseFloat(data.cessRate || "0"),
        taxType: data.taxType,
        wholesalePrice: data.wholesalePrice ? parseFloat(data.wholesalePrice) : 0,
        retailPrice: data.retailPrice ? parseFloat(data.retailPrice) : parseFloat(data.price),
        marginPercentage: data.marginPercentage ? parseFloat(data.marginPercentage) : 0,
        taxExempted: data.taxExempted,
        unitType: data.unitType,
        weight: data.weight ? parseFloat(data.weight) : 0,
        dimensions: data.dimensions,
        active: data.active,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully with GST details",
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
      mrp: product.mrp?.toString() || "",
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity.toString(),
      alertThreshold: product.alertThreshold?.toString() || "",
      barcode: product.barcode || "",
      hsnCode: product.hsnCode || "",
      gstRate: product.gstRate || "18",
      cgstRate: product.cgstRate || "9",
      sgstRate: product.sgstRate || "9",
      igstRate: product.igstRate || "18",
      cessRate: product.cessRate || "0",
      taxType: product.taxType || "inclusive",
      wholesalePrice: product.wholesalePrice?.toString() || "",
      retailPrice: product.retailPrice?.toString() || "",
      marginPercentage: product.marginPercentage?.toString() || "",
      taxExempted: product.taxExempted || false,
      unitType: product.unitType || "piece",
      weight: product.weight?.toString() || "",
      dimensions: product.dimensions || "",
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

  const getTaxBadge = (product: Product) => {
    if (product.taxExempted) return { label: "Tax Exempt", variant: "outline" as const };
    const gstRate = parseFloat(product.gstRate || "0");
    if (gstRate === 0) return { label: "0% GST", variant: "secondary" as const };
    if (gstRate === 5) return { label: "5% GST", variant: "default" as const };
    if (gstRate === 12) return { label: "12% GST", variant: "default" as const };
    if (gstRate === 18) return { label: "18% GST", variant: "default" as const };
    if (gstRate === 28) return { label: "28% GST", variant: "destructive" as const };
    return { label: `${gstRate}% GST`, variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GST Product Management</h1>
            <p className="text-muted-foreground">
              Complete GST, Tax & MRP management for Indian businesses
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
        <div className="grid gap-4 md:grid-cols-5">
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
              <CardTitle className="text-sm font-medium">Taxable Products</CardTitle>
              <PercentIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p: Product) => !p.taxExempted).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Exempt</CardTitle>
              <XCircleIcon className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter((p: Product) => p.taxExempted).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg GST Rate</CardTitle>
              <CalculatorIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0 
                  ? (products.reduce((sum: number, p: Product) => sum + parseFloat(p.gstRate || "0"), 0) / products.length).toFixed(1)
                  : 0}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total MRP Value</CardTitle>
              <IndianRupeeIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(products.reduce((sum: number, p: Product) => 
                  sum + (parseFloat(p.mrp || "0") * p.stockQuantity), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, SKU, HSN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={taxFilter} onValueChange={setTaxFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tax Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tax Rates</SelectItem>
                  <SelectItem value="exempted">Tax Exempt</SelectItem>
                  <SelectItem value="taxable">Taxable</SelectItem>
                  <SelectItem value="gst5">5% GST</SelectItem>
                  <SelectItem value="gst12">12% GST</SelectItem>
                  <SelectItem value="gst18">18% GST</SelectItem>
                  <SelectItem value="gst28">28% GST</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products with GST Details ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Complete product management with Indian tax compliance
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
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
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
                    const taxBadge = getTaxBadge(product);
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
                              <div className="text-sm text-muted-foreground font-mono">{product.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{product.hsnCode || "N/A"}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.price.toString()))}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(parseFloat(product.mrp?.toString() || "0"))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={taxBadge.variant}>
                            {taxBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.taxType === "inclusive" ? "default" : "outline"}>
                            {product.taxType === "inclusive" ? "Tax Inclusive" : "Tax Exclusive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-semibold">{product.stockQuantity}</div>
                            <Badge variant={stockStatus.variant} className="text-xs">
                              {stockStatus.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Active" : "Inactive"}
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add New Product with GST Details</DialogTitle>
              <DialogDescription>
                Create a comprehensive product with tax information for Indian compliance
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
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
                      <FormField
                        control={addForm.control}
                        name="hsnCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HSN Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter HSN code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pricing" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
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
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MRP (Maximum Retail Price)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="gstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Rate (%)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select GST rate" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0% - Exempt</SelectItem>
                                <SelectItem value="5">5% GST</SelectItem>
                                <SelectItem value="12">12% GST</SelectItem>
                                <SelectItem value="18">18% GST</SelectItem>
                                <SelectItem value="28">28% GST</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="taxType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tax type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                                <SelectItem value="exclusive">Tax Exclusive</SelectItem>
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
                        name="cgstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CGST Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="9.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="sgstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SGST Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="9.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="cessRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CESS Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={addForm.control}
                      name="taxExempted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Tax Exempted Product</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Mark this product as tax exempted
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
                  </TabsContent>
                  
                  <TabsContent value="inventory" className="space-y-4">
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
                        name="unitType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="kg">Kilogram</SelectItem>
                                <SelectItem value="gram">Gram</SelectItem>
                                <SelectItem value="liter">Liter</SelectItem>
                                <SelectItem value="ml">Milliliter</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                                <SelectItem value="pack">Pack</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (in grams)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions (LxWxH)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="10x5x3 cm" />
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
                  </TabsContent>
                </Tabs>
                
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Product with GST Details</DialogTitle>
              <DialogDescription>
                Update product information and tax details
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateProductMutation.mutate({ id: selectedProduct!.id, data }))} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
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
                      <FormField
                        control={editForm.control}
                        name="hsnCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HSN Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter HSN code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pricing" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
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
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MRP (Maximum Retail Price)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="gstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Rate (%)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select GST rate" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0% - Exempt</SelectItem>
                                <SelectItem value="5">5% GST</SelectItem>
                                <SelectItem value="12">12% GST</SelectItem>
                                <SelectItem value="18">18% GST</SelectItem>
                                <SelectItem value="28">28% GST</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="taxType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tax type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                                <SelectItem value="exclusive">Tax Exclusive</SelectItem>
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
                        name="cgstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CGST Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="9.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="sgstRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SGST Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="9.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="cessRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CESS Rate (%)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="taxExempted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Tax Exempted Product</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Mark this product as tax exempted
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
                  </TabsContent>
                  
                  <TabsContent value="inventory" className="space-y-4">
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
                        name="unitType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="kg">Kilogram</SelectItem>
                                <SelectItem value="gram">Gram</SelectItem>
                                <SelectItem value="liter">Liter</SelectItem>
                                <SelectItem value="ml">Milliliter</SelectItem>
                                <SelectItem value="box">Box</SelectItem>
                                <SelectItem value="pack">Pack</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (in grams)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions (LxWxH)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="10x5x3 cm" />
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
                  </TabsContent>
                </Tabs>
                
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>GST Product Details</DialogTitle>
              <DialogDescription>
                Complete tax and pricing information for {selectedProduct?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="tax">GST Details</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
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
                      <label className="text-sm font-medium">HSN Code</label>
                      <p className="text-sm text-muted-foreground font-mono">{selectedProduct.hsnCode || "Not specified"}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <p className="text-sm text-muted-foreground">{getCategoryName(selectedProduct.categoryId)}</p>
                    </div>
                  </div>
                  
                  {selectedProduct.description && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="pricing" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cost Price</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(parseFloat(selectedProduct.cost?.toString() || "0"))}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Selling Price</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(parseFloat(selectedProduct.price.toString()))}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">MRP</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(parseFloat(selectedProduct.mrp?.toString() || "0"))}</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Wholesale Price</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedProduct.wholesalePrice?.toString() || "0"))}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Retail Price</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedProduct.retailPrice?.toString() || "0"))}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tax" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">GST Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedProduct.gstRate || "0"}%</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Tax Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={selectedProduct.taxType === "inclusive" ? "default" : "outline"}>
                          {selectedProduct.taxType === "inclusive" ? "Tax Inclusive" : "Tax Exclusive"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CGST Rate</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.cgstRate || "0"}%</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SGST Rate</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.sgstRate || "0"}%</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CESS Rate</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.cessRate || "0"}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tax Status</label>
                    <Badge variant={selectedProduct.taxExempted ? "outline" : "default"}>
                      {selectedProduct.taxExempted ? "Tax Exempted" : "Taxable"}
                    </Badge>
                  </div>
                </TabsContent>
                
                <TabsContent value="inventory" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedProduct.stockQuantity}</div>
                        <div className="text-sm text-muted-foreground">{selectedProduct.unitType}</div>
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
                        <CardTitle className="text-sm">Stock Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(selectedProduct.stockQuantity * parseFloat(selectedProduct.cost?.toString() || "0"))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {selectedProduct.weight && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Weight</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.weight} grams</p>
                    </div>
                  )}
                  
                  {selectedProduct.dimensions && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dimensions</label>
                      <p className="text-sm text-muted-foreground">{selectedProduct.dimensions}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
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