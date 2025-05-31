
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  PackageIcon,
  SaveIcon,
  PrinterIcon,
  HelpCircleIcon,
  Settings2Icon,
  X,
  CalendarIcon,
  Plus,
  Minus,
  Search,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const repackingFormSchema = z.object({
  issueDate: z.string().min(1, "Issue date is required"),
  issueNo: z.string().optional(),
  repackNo: z.string().optional(),
  bulkProductId: z.number().min(1, "Please select a bulk product"),
  repackQuantity: z.number().min(1, "Repack quantity must be at least 1"),
  unitWeight: z.number().min(0.01, "Unit weight must be greater than 0"),
  costPrice: z.number().min(0, "Cost price must be non-negative"),
  sellingPrice: z.number().min(0, "Selling price must be non-negative"),
  mrp: z.number().min(0, "MRP must be non-negative"),
  newProductName: z.string().min(1, "New product name is required"),
  newProductSku: z.string().min(1, "New product SKU is required"),
});

type RepackingFormValues = z.infer<typeof repackingFormSchema>;

interface RepackEntry {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

export default function RepackingSystem() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBulkSelector, setShowBulkSelector] = useState(false);

  // Generate today's date in DD/MM/YYYY format
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  // Generate date options for dropdown (last 30 days + next 7 days)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      dates.push(formatted);
    }
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      dates.push(formatted);
    }
    
    return dates;
  };

  const dateOptions = generateDateOptions();

  // Fetch products for bulk selection
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter bulk products with stock > 0 for repacking
  const bulkProducts = products.filter((product: Product) => 
    product.stockQuantity > 0 && 
    product.active && 
    !product.sku.includes("REPACK") &&
    (product.name.toLowerCase().includes('bulk') || 
     product.name.toLowerCase().includes('bag') ||
     product.name.toLowerCase().includes('container') ||
     (parseFloat(product.weight || "0") >= 1 && product.weightUnit === 'kg'))
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter products based on search term
  const filteredBulkProducts = bulkProducts.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    defaultValues: {
      issueDate: formattedDate,
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 8,
      unitWeight: 250,
      costPrice: 0,
      sellingPrice: 0,
      mrp: 0,
      newProductName: "",
      newProductSku: "",
    },
  });

  // Watch for bulk product changes
  const bulkProductId = form.watch("bulkProductId");
  const repackQuantity = form.watch("repackQuantity");
  const unitWeight = form.watch("unitWeight");

  useEffect(() => {
    if (bulkProductId && products.length > 0) {
      const product = products.find((p: Product) => p.id === bulkProductId);
      if (product) {
        setSelectedProduct(product);
        form.setValue("costPrice", parseFloat(product.cost) || 0);
        form.setValue("sellingPrice", parseFloat(product.price) || 0);
        form.setValue("mrp", parseFloat(product.mrp) || 0);
        
        // Auto-generate new product name and SKU
        const timestamp = Date.now();
        const newName = product.name.includes('BULK') 
          ? product.name.replace('BULK', `${unitWeight}g`) 
          : `${product.name} (${unitWeight}g Pack)`;
        const newSku = `${product.sku}-REPACK-${unitWeight}G-${timestamp}`;
        
        form.setValue("newProductName", newName);
        form.setValue("newProductSku", newSku);
      }
    }
  }, [bulkProductId, products, form, unitWeight]);

  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }

      // Create new repacked product
      const repackedProduct = {
        name: data.newProductName,
        description: `Repacked from bulk item: ${selectedProduct.name}. Original weight: ${selectedProduct.weight}${selectedProduct.weightUnit}`,
        sku: data.newProductSku,
        price: data.sellingPrice.toString(),
        mrp: data.mrp.toString(),
        cost: data.costPrice.toString(),
        weight: data.unitWeight.toString(),
        weightUnit: "g",
        categoryId: selectedProduct.categoryId || 1,
        stockQuantity: data.repackQuantity,
        alertThreshold: Math.max(5, Math.floor(data.repackQuantity * 0.2)),
        barcode: "",
        active: true,
      };

      const response = await apiRequest("POST", "/api/products", repackedProduct);
      const newProduct = await response.json();

      // Update source product stock
      const productWeight = parseFloat(selectedProduct.weight) || 0;
      const productWeightUnit = selectedProduct.weightUnit || 'g';

      let productWeightInGrams = productWeight;
      if (productWeightUnit === 'kg') {
        productWeightInGrams = productWeight * 1000;
      }

      const totalRepackedWeight = data.unitWeight * data.repackQuantity;
      const bulkUnitsUsed = totalRepackedWeight / productWeightInGrams;

      const newBulkStock = Math.max(0, selectedProduct.stockQuantity - Math.ceil(bulkUnitsUsed));

      await apiRequest("PATCH", `/api/products/${selectedProduct.id}`, {
        stockQuantity: Math.floor(newBulkStock),
      });

      return { newProduct, sourceProduct: selectedProduct };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: `Repacked ${data.newProduct.name} successfully created from ${data.sourceProduct?.name}`,
      });
      form.reset();
      setSelectedProduct(null);
      setRepackEntries([]);
      setShowBulkSelector(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepackingFormValues) => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a bulk product",
        variant: "destructive",
      });
      return;
    }

    if (data.repackQuantity > selectedProduct.stockQuantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.stockQuantity} units available in bulk`,
        variant: "destructive",
      });
      return;
    }

    repackingMutation.mutate(data);
  };

  const handleProductSelect = (product: Product) => {
    form.setValue("bulkProductId", product.id);
    setShowBulkSelector(false);
    setSearchTerm("");
  };

  const currentStock = selectedProduct?.stockQuantity || 0;
  const packedQuantity = repackQuantity;
  const availableForPack = Math.max(0, currentStock - packedQuantity);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Professional Repacking System</h1>
            <div className="flex items-center gap-4 text-sm">
              <span>User: ADMIN (System Admin)</span>
              <span>Ver: 6.5.9.2 SP-65</span>
              <span>Date: {formattedDate}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
            {/* Top Controls */}
            <div className="bg-white border border-gray-300 p-3 mb-4 rounded">
              <div className="grid grid-cols-5 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Issue Date</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 bg-white border-gray-400">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {dateOptions.map((date) => (
                            <SelectItem key={date} value={date}>
                              {date}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issueNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Issue No</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Auto-generated" className="h-8 bg-white border-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="repackNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Repack No</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Auto-generated" className="h-8 bg-white border-gray-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel className="text-sm font-medium">Select Bulk Product</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-8 justify-start"
                    onClick={() => setShowBulkSelector(true)}
                  >
                    {selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "Choose bulk product"}
                    <Search className="w-4 h-4 ml-auto" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={repackingMutation.isPending || !selectedProduct}
                    className="bg-green-600 hover:bg-green-700 h-8 px-4"
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Save Repack
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => window.print()}
                    className="h-8 px-4"
                  >
                    <PrinterIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bulk Product Selector Modal */}
            {showBulkSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Select Bulk Item to Repackage</h2>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowBulkSelector(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search bulk products by name or SKU..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead>Product Details</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBulkProducts.map((product: Product) => (
                          <TableRow key={product.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                                <div className="text-xs text-gray-400">{product.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.stockQuantity > 10 ? "default" : "destructive"}>
                                {product.stockQuantity} units
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Cost: {formatCurrency(parseFloat(product.cost))}</div>
                                <div>MRP: {formatCurrency(parseFloat(product.mrp))}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.weight} {product.weightUnit}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleProductSelect(product)}
                                disabled={product.stockQuantity === 0}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredBulkProducts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <PackageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No bulk products found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {/* Left Side - Main Repacking Table */}
              <div className="col-span-2 bg-white border border-gray-300 rounded">
                <div className="bg-blue-500 text-white p-2">
                  <h3 className="font-semibold text-center">Repacking Configuration</h3>
                </div>

                <div className="p-4">
                  {selectedProduct ? (
                    <div className="space-y-4">
                      {/* Product Info */}
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium mb-2">Source Product: {selectedProduct.name}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>SKU: {selectedProduct.sku}</div>
                          <div>Available Stock: {selectedProduct.stockQuantity} units</div>
                          <div>Weight: {selectedProduct.weight} {selectedProduct.weightUnit}</div>
                          <div>Cost: {formatCurrency(parseFloat(selectedProduct.cost))}</div>
                        </div>
                      </div>

                      {/* Repacking Configuration */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="repackQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity to Create</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="text-center"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unitWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Weight (grams)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="text-center"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* New Product Details */}
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="newProductName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Product Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="newProductSku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Product SKU</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="costPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cost Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sellingPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selling Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="mrp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MRP</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <PackageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">No Bulk Product Selected</h3>
                      <p className="mb-4">Please select a bulk product to start repacking</p>
                      <Button
                        type="button"
                        onClick={() => setShowBulkSelector(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Select Bulk Product
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Stock Information */}
              <div className="bg-white border border-gray-300 rounded">
                <div className="bg-blue-500 text-white p-2">
                  <h3 className="font-semibold text-center">Stock Information</h3>
                </div>

                {selectedProduct ? (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs font-medium mb-1">Current Stock</div>
                        <div className="bg-blue-100 px-2 py-2 rounded text-sm font-mono">
                          {currentStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">To Pack</div>
                        <div className="bg-orange-100 px-2 py-2 rounded text-sm font-mono">
                          {packedQuantity}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">Remaining</div>
                        <div className="bg-green-100 px-2 py-2 rounded text-sm font-mono">
                          {availableForPack}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span>Total Weight to Create: {(unitWeight * repackQuantity).toLocaleString()}g</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Estimated Value: {formatCurrency((form.watch("sellingPrice") || 0) * repackQuantity)}</span>
                      </div>

                      {availableForPack < 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>Insufficient stock for this quantity</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Product Type: {selectedProduct.categoryId === 1 ? 'General' : 'Specialized'}</div>
                      <div>Barcode: {selectedProduct.barcode || 'Not set'}</div>
                      <div>Alert Threshold: {selectedProduct.alertThreshold}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <div className="text-sm">Select a bulk product to view stock information</div>
                  </div>
                )}
              </div>
            </div>

            {/* Function Keys Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-400 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <HelpCircleIcon className="w-3 h-3 mr-1" />
                    F1 Help
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F2 Select Product
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F3 Search
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F4 Clear
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <SaveIcon className="w-3 h-3 mr-1" />
                    F6 Save
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <PrinterIcon className="w-3 h-3 mr-1" />
                    F10 Print
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <X className="w-3 h-3 mr-1" />
                    F12 Close
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={repackingMutation.isPending || !selectedProduct}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {repackingMutation.isPending ? "Processing..." : "Complete Repacking"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
