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
  XIcon,
  PlusIcon,
  TrashIcon,
  Calculator,
  BarChart3Icon
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

export default function RepackingProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Generate today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch products for bulk selection
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter for bulk products (items with weight > 1000g)
  const bulkProducts = products.filter((product: Product) => 
    product.weight && parseFloat(product.weight) > 1000
  );

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    defaultValues: {
      issueDate: today,
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 1,
      unitWeight: 1000,
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
      // Generate unique SKU for repacked item
      const timestamp = Date.now();
      const repackedSku = `${selectedProduct?.sku}-REPACK-${timestamp}`;
      
      const repackedProduct = {
        name: `${selectedProduct?.name} (Repacked ${data.unitWeight}g)`,
        description: `Repacked from ${selectedProduct?.name}`,
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
      
      // Update bulk product stock
      if (selectedProduct) {
        const productWeight = parseFloat(selectedProduct.weight) || 0;
        const productWeightUnit = selectedProduct.weightUnit || 'g';
        
        // Convert everything to grams for calculation
        let productWeightInGrams = productWeight;
        if (productWeightUnit === 'kg') {
          productWeightInGrams = productWeight * 1000;
        }
        
        // Calculate how much bulk stock is used per repacked unit
        const totalRepackedWeight = data.unitWeight * data.repackQuantity;
        const bulkUnitsUsed = totalRepackedWeight / productWeightInGrams;
        
        // More conservative stock calculation - only reduce by fraction actually used
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

  const addRepackEntry = () => {
    const newEntry: RepackEntry = {
      id: Date.now().toString(),
      name: `Entry ${repackEntries.length + 1}`,
      percentage: 0,
      amount: 0,
    };
    setRepackEntries([...repackEntries, newEntry]);
  };

  const removeRepackEntry = (id: string) => {
    setRepackEntries(repackEntries.filter(entry => entry.id !== id));
  };

  const updateRepackEntry = (id: string, field: keyof RepackEntry, value: string | number) => {
    setRepackEntries(repackEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const currentStock = selectedProduct?.stockQuantity || 0;
  const packedQuantity = repackQuantity;
  const availableForPack = Math.max(0, currentStock - packedQuantity);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-blue-600 text-white">
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-xl font-semibold">Repack Entry</h1>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={() => setLocation("/")}>
              <XIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Issue Date and Numbers */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white" />
                      </FormControl>
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
                        <Input {...field} placeholder="Auto-generated" className="bg-white" />
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
                        <Input {...field} placeholder="Auto-generated" className="bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Product Selection and Details */}
              <div className="space-y-4">
                {/* Product Selection Table Header */}
                <div className="bg-blue-500 text-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-blue-400">
                        <TableHead className="text-white font-semibold">Code</TableHead>
                        <TableHead className="text-white font-semibold">Item Name</TableHead>
                        <TableHead className="text-white font-semibold">Qty</TableHead>
                        <TableHead className="text-white font-semibold">Cost</TableHead>
                        <TableHead className="text-white font-semibold">Selling</TableHead>
                        <TableHead className="text-white font-semibold">MRP</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>

                {/* Product Selection */}
                <Card>
                  <CardContent className="p-4">
                    <FormField
                      control={form.control}
                      name="bulkProductId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Bulk Product</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a bulk product to repack" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bulkProducts.map((product: Product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.sku} - {product.name} ({product.weight}{product.weightUnit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedProduct && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">{selectedProduct.sku}</TableCell>
                              <TableCell>{selectedProduct.name}</TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name="repackQuantity"
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      className="w-20"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>{formatCurrency(parseFloat(selectedProduct.cost))}</TableCell>
                              <TableCell>{formatCurrency(parseFloat(selectedProduct.price))}</TableCell>
                              <TableCell>{formatCurrency(parseFloat(selectedProduct.mrp))}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Repacking Configuration */}
                {selectedProduct && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Repacking Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost Price per Unit</FormLabel>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="sellingPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selling Price per Unit</FormLabel>
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
                              <FormLabel>MRP per Unit</FormLabel>
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
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Side - Bulk Item Details */}
              {selectedProduct && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="bg-gray-100 border-b px-4 py-2">
                    <h3 className="font-semibold text-lg">Bulk Item Details</h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bulk Code</label>
                        <div className="text-lg font-mono bg-gray-50 p-2 rounded border">
                          {selectedProduct.sku}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Bulk Item</label>
                        <div className="text-lg bg-gray-50 p-2 rounded border">
                          {selectedProduct.name}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Weight</label>
                        <div className="text-lg font-mono bg-gray-50 p-2 rounded border text-center">
                          {selectedProduct.weight}{selectedProduct.weightUnit}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cost</label>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-mono bg-gray-50 p-2 rounded border flex-1 text-center">
                            {formatCurrency(parseFloat(selectedProduct.cost))}
                          </div>
                          <Badge variant="outline" className="text-xs bg-gray-100">Latest sel</Badge>
                          <div className="text-sm bg-yellow-200 px-2 py-1 rounded font-medium">
                            {formatCurrency(parseFloat(selectedProduct.cost))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Stock</label>
                        <div className="text-lg font-mono bg-blue-100 p-3 rounded border text-center">
                          {currentStock.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Packed</label>
                        <div className="text-lg font-mono bg-orange-100 p-3 rounded border text-center">
                          {packedQuantity.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Avail for pack</label>
                        <div className="text-lg font-mono bg-green-100 p-3 rounded border text-center">
                          {availableForPack.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Entries Table */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Additional Entries</h4>
                        <Button type="button" size="sm" onClick={addRepackEntry}>
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Entry
                        </Button>
                      </div>
                      
                      <Table>
                        <TableHeader className="bg-blue-500">
                          <TableRow>
                            <TableHead className="text-white font-semibold">Name</TableHead>
                            <TableHead className="text-white font-semibold">Perc %</TableHead>
                            <TableHead className="text-white font-semibold">Amount</TableHead>
                            <TableHead className="text-white font-semibold w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {repackEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Input
                                  value={entry.name}
                                  onChange={(e) => updateRepackEntry(entry.id, 'name', e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={entry.percentage}
                                  onChange={(e) => updateRepackEntry(entry.id, 'percentage', parseFloat(e.target.value) || 0)}
                                  className="h-8 w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={entry.amount}
                                  onChange={(e) => updateRepackEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                                  className="h-8 w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRepackEntry(entry.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {repackEntries.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                                No additional entries
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={repackingMutation.isPending || !selectedProduct}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <SaveIcon className="w-4 h-4 mr-2" />
                {repackingMutation.isPending ? "Repacking..." : "Save Repack Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}