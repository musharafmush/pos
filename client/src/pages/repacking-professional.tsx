
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
  CalendarIcon
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
});

type RepackingFormValues = z.infer<typeof repackingFormSchema>;

interface RepackEntry {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

// Generate date options for dropdown (last 30 days + next 7 days)
const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  
  // Add past 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    dates.push(formatted);
  }
  
  // Add next 7 days
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    dates.push(formatted);
  }
  
  return dates;
};

export default function RepackingProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [useLatestSell, setUseLatestSell] = useState(false);

  // Generate today's date in DD/MM/YYYY format
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
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

  // Show bulk products with stock > 0 for repacking
  const bulkProducts = products.filter((product: Product) => 
    product.stockQuantity > 0 && product.active && !product.sku.includes("REPACK")
  ).sort((a, b) => {
    const aIsBulk = a.name.toLowerCase().includes('bulk') || 
                   a.name.toLowerCase().includes('bag') ||
                   a.name.toLowerCase().includes('container') ||
                   (parseFloat(a.weight || "0") >= 1 && a.weightUnit === 'kg');
    const bIsBulk = b.name.toLowerCase().includes('bulk') || 
                   b.name.toLowerCase().includes('bag') ||
                   b.name.toLowerCase().includes('container') ||
                   (parseFloat(b.weight || "0") >= 1 && b.weightUnit === 'kg');

    if (aIsBulk && !bIsBulk) return -1;
    if (!aIsBulk && bIsBulk) return 1;
    return a.name.localeCompare(b.name);
  });

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
      }
    }
  }, [bulkProductId, products, form]);

  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      const timestamp = Date.now();
      const repackedSku = `${selectedProduct?.sku}-REPACK-${data.unitWeight}G-${timestamp}`;

      const repackedName = selectedProduct?.name.includes('BULK') 
        ? selectedProduct.name.replace('BULK', `${data.unitWeight}g`) 
        : `${selectedProduct?.name} (${data.unitWeight}g Pack)`;

      const repackedProduct = {
        name: repackedName,
        description: `Repacked from bulk item: ${selectedProduct?.name}. Original weight: ${selectedProduct?.weight}${selectedProduct?.weightUnit}`,
        sku: repackedSku,
        price: data.sellingPrice.toString(),
        mrp: data.mrp.toString(),
        cost: data.costPrice.toString(),
        weight: data.unitWeight.toString(),
        weightUnit: "g",
        categoryId: selectedProduct?.categoryId || 1,
        stockQuantity: data.repackQuantity,
        alertThreshold: 5,
        barcode: "",
        active: true,
      };

      const response = await apiRequest("POST", "/api/products", repackedProduct);

      if (selectedProduct) {
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
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product repacked successfully",
      });
      form.reset();
      setSelectedProduct(null);
      setRepackEntries([]);
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

    repackingMutation.mutate(data);
  };

  const currentStock = selectedProduct?.stockQuantity || 0;
  const packedQuantity = repackQuantity;
  const availableForPack = Math.max(0, currentStock - packedQuantity);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header - Desktop Style */}
        <div className="bg-blue-600 text-white px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Repack Entry</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span>User: AYYAPPAN (System Admin)</span>
                <span>Ver: 6.5.9.2 SP-65</span>
                <span>Customer Id: 15983394</span>
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
            {/* Top Controls - Exact Layout Match */}
            <div className="bg-white border border-gray-300 p-3 mb-4">
              <div className="grid grid-cols-4 gap-4 items-end">
                <div>
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
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="issueNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Issue No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="" className="h-8 bg-white border-gray-400" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="repackNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Repack No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="" className="h-8 bg-white border-gray-400" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="bulkProductId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Select Bulk Product</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger className="h-8 bg-white border-gray-400">
                              <SelectValue placeholder="Choose bulk product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {bulkProducts.map((product: Product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                <div className="flex flex-col">
                                  <div className="font-medium">
                                    {product.sku} - {product.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Stock: {product.stockQuantity} | Cost: ₹{product.cost}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Left Side - Main Table (Exact Desktop Layout) */}
              <div className="col-span-2 bg-white border border-gray-300">
                {/* Table Header */}
                <div className="bg-blue-500 text-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-blue-400 hover:bg-blue-500">
                        <TableHead className="text-white font-semibold text-center py-2 border-r border-blue-400 w-16">Code</TableHead>
                        <TableHead className="text-white font-semibold text-center py-2 border-r border-blue-400">Item Name</TableHead>
                        <TableHead className="text-white font-semibold text-center py-2 border-r border-blue-400 w-16">Qty</TableHead>
                        <TableHead className="text-white font-semibold text-center py-2 border-r border-blue-400 w-20">Cost</TableHead>
                        <TableHead className="text-white font-semibold text-center py-2 border-r border-blue-400 w-20">Selling</TableHead>
                        <TableHead className="text-white font-semibold text-center py-2 w-20">MRP</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>

                {/* Table Content */}
                <div className="min-h-96 bg-white">
                  {selectedProduct && (
                    <Table>
                      <TableBody>
                        <TableRow className="border-b border-gray-200">
                          <TableCell className="font-mono text-center py-3 border-r border-gray-200 text-sm">
                            15022
                          </TableCell>
                          <TableCell className="text-left py-3 border-r border-gray-200 text-sm">
                            {unitWeight}G {selectedProduct.name.replace('BULK', '').trim()} SUNBRAND
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200">
                            <FormField
                              control={form.control}
                              name="repackQuantity"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="w-16 h-8 text-center border-gray-400 text-sm"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200">
                            <FormField
                              control={form.control}
                              name="costPrice"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-20 h-8 text-center border-gray-400 text-sm"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200">
                            <FormField
                              control={form.control}
                              name="sellingPrice"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-20 h-8 text-center border-gray-400 text-sm"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <FormField
                              control={form.control}
                              name="mrp"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-20 h-8 text-center border-gray-400 text-sm"
                                />
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Right Side - Bulk Item Details (Exact Desktop Layout) */}
              <div className="bg-white border border-gray-300">
                <div className="bg-blue-500 text-white text-center py-2 font-semibold text-sm">
                  Bulk Item Details
                </div>

                {selectedProduct && (
                  <div className="p-3 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium">Bulk Code</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-center font-mono">
                        13254
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium">Bulk Item</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-center">
                        {selectedProduct.name.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium">Weight</span>
                      <div className="bg-gray-100 px-2 py-1 rounded text-center">
                        <FormField
                          control={form.control}
                          name="unitWeight"
                          render={({ field }) => (
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="w-16 h-6 text-center border-none bg-transparent text-sm"
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium">Cost</span>
                      <div className="flex items-center gap-1">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {formatCurrency(parseFloat(selectedProduct.cost))}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setUseLatestSell(!useLatestSell)}
                        >
                          Latest sel
                        </Button>
                        <span className="bg-yellow-200 px-2 py-1 rounded text-xs">
                          110.00
                        </span>
                      </div>
                    </div>

                    {/* Stock Information - Exact Layout Match */}
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-xs font-medium mb-1">Current Stock</div>
                        <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                          {currentStock.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium mb-1">Packed</div>
                        <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                          {packedQuantity.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium mb-1">Avail for pack</div>
                        <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                          {availableForPack.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Table - Exact Desktop Layout */}
                    <div className="pt-2 border-t">
                      <Table>
                        <TableHeader className="bg-blue-500">
                          <TableRow>
                            <TableHead className="text-white font-semibold text-xs text-center py-1 h-6">Name</TableHead>
                            <TableHead className="text-white font-semibold text-xs text-center py-1 h-6">Perc %</TableHead>
                            <TableHead className="text-white font-semibold text-xs text-center py-1 h-6">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {repackEntries.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-400 py-4 text-xs">
                                No additional entries
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Function Keys Bar - Exact Desktop Layout */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-400 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <HelpCircleIcon className="w-3 h-3 mr-1" />
                    F1 Help
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F2 ItemCode
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F3 ItemName
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F4 AliasName
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F5 Pur.Prc
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    <SaveIcon className="w-3 h-3 mr-1" />
                    F6 Save
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F7 Clear
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F8 Key Settings
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100">
                    F9 Edit
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
                    {repackingMutation.isPending ? "Repacking..." : "Save Repack"}
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
