
import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PackageIcon,
  SaveIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
  Calculator,
  SearchIcon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  ScaleIcon,
  DollarSignIcon
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
  profitMargin: z.number().optional(),
});

type RepackingFormValues = z.infer<typeof repackingFormSchema>;

interface RepackEntry {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

interface ProcessingJob {
  id: string;
  productName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export default function RepackingProfessionalParallel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("entry");
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Generate today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch products for bulk selection
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Show bulk products with priority sorting
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
      issueDate: today,
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 1,
      unitWeight: 1000,
      costPrice: 0,
      sellingPrice: 0,
      mrp: 0,
      profitMargin: 0,
    },
  });

  // Watch for changes and auto-calculate
  const bulkProductId = form.watch("bulkProductId");
  const repackQuantity = form.watch("repackQuantity");
  const unitWeight = form.watch("unitWeight");
  const costPrice = form.watch("costPrice");
  const sellingPrice = form.watch("sellingPrice");

  // Auto-calculate profit margin
  const calculateProfitMargin = useCallback(() => {
    if (autoCalculate && costPrice > 0 && sellingPrice > 0) {
      const margin = ((sellingPrice - costPrice) / costPrice) * 100;
      form.setValue("profitMargin", parseFloat(margin.toFixed(2)));
    }
  }, [costPrice, sellingPrice, autoCalculate, form]);

  useEffect(() => {
    calculateProfitMargin();
  }, [calculateProfitMargin]);

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

  // Parallel processing mutation
  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      const jobId = Date.now().toString();
      
      // Add job to processing queue
      const newJob: ProcessingJob = {
        id: jobId,
        productName: selectedProduct?.name || "Unknown Product",
        status: 'processing',
        progress: 0,
      };
      
      setProcessingJobs(prev => [...prev, newJob]);

      try {
        // Update progress
        setProcessingJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, progress: 25 } : job
        ));

        // Generate unique SKU for repacked item
        const timestamp = Date.now();
        const repackedSku = `${selectedProduct?.sku}-REPACK-${data.unitWeight}G-${timestamp}`;
        
        // Create descriptive name for repacked product
        const repackedName = selectedProduct?.name.includes('BULK') 
          ? selectedProduct.name.replace('BULK', `${data.unitWeight}g`) 
          : `${selectedProduct?.name} (${data.unitWeight}g Pack)`;
        
        setProcessingJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, progress: 50 } : job
        ));

        const repackedProduct = {
          name: repackedName,
          description: `Repacked from bulk item: ${selectedProduct?.name}. Original weight: ${selectedProduct?.weight}${selectedProduct?.weightUnit}. Profit margin: ${data.profitMargin || 0}%`,
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

        setProcessingJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, progress: 75 } : job
        ));

        const response = await apiRequest("POST", "/api/products", repackedProduct);
        
        // Update bulk product stock
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

        setProcessingJobs(prev => prev.map(job => 
          job.id === jobId ? { 
            ...job, 
            progress: 100, 
            status: 'completed',
            result: response 
          } : job
        ));

        return response.json();
      } catch (error) {
        setProcessingJobs(prev => prev.map(job => 
          job.id === jobId ? { 
            ...job, 
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          } : job
        ));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product repacked successfully",
      });
      
      // Switch to monitoring tab to show results
      setActiveTab("monitor");
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

  const quickPresetWeights = [250, 500, 1000, 2000, 5000];

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

  const duplicateCurrentForm = () => {
    if (selectedProduct) {
      const currentValues = form.getValues();
      // Create a new form with slightly modified values
      form.setValue("repackQuantity", currentValues.repackQuantity);
      form.setValue("unitWeight", currentValues.unitWeight + 100); // Increase by 100g
      toast({
        title: "Form Duplicated",
        description: "Ready for parallel processing with modified weight",
      });
    }
  };

  const clearProcessingJobs = () => {
    setProcessingJobs([]);
  };

  const currentStock = selectedProduct?.stockQuantity || 0;
  const packedQuantity = repackQuantity;
  const availableForPack = Math.max(0, currentStock - packedQuantity);
  const profitMargin = form.watch("profitMargin") || 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <PackageIcon className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-semibold">Professional Repacking - Parallel Processing</h1>
                <p className="text-blue-100 text-sm">Advanced bulk product repacking with real-time monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-white hover:bg-blue-600" onClick={() => refetchProducts()}>
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-blue-600" onClick={() => setLocation("/")}>
                <XIcon className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entry" className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Repack Entry
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Profit Calculator
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4" />
                Processing Monitor
                {processingJobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {processingJobs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Repack Entry Tab */}
            <TabsContent value="entry" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ScaleIcon className="w-5 h-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button type="button" variant="outline" onClick={duplicateCurrentForm}>
                          <CopyIcon className="w-4 h-4 mr-2" />
                          Duplicate Form
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Auto Calculate:</span>
                          <Button
                            type="button"
                            variant={autoCalculate ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoCalculate(!autoCalculate)}
                          >
                            {autoCalculate ? "ON" : "OFF"}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Quick Weights:</span>
                          {quickPresetWeights.map(weight => (
                            <Button
                              key={weight}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => form.setValue("unitWeight", weight)}
                            >
                              {weight}g
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issue Information */}
                  <div className="grid grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Side - Product Selection */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Bulk Product Selection</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="bulkProductId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Bulk Product</FormLabel>
                                
                                {/* Search Input */}
                                <div className="relative mb-2">
                                  <Input
                                    placeholder="Search bulk products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white"
                                  />
                                  <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                                
                                <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a bulk product to repack" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    {bulkProducts
                                      .filter((product: Product) => {
                                        if (!searchTerm.trim()) return true;
                                        const search = searchTerm.toLowerCase();
                                        return (
                                          product.name.toLowerCase().includes(search) ||
                                          product.sku.toLowerCase().includes(search) ||
                                          (product.description && product.description.toLowerCase().includes(search))
                                        );
                                      })
                                      .map((product: Product) => {
                                        const isBulkItem = product.name.toLowerCase().includes('bulk') || 
                                                         product.name.toLowerCase().includes('bag') ||
                                                         product.name.toLowerCase().includes('container') ||
                                                         (parseFloat(product.weight || "0") >= 1 && product.weightUnit === 'kg');
                                        
                                        return (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            <div className="flex flex-col">
                                              <div className="font-medium flex items-center gap-2">
                                                {product.sku} - {product.name}
                                                {isBulkItem && (
                                                  <Badge className="bg-blue-100 text-blue-800 text-xs">BULK</Badge>
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                Weight: {product.weight || 'N/A'}{product.weightUnit} | Stock: {product.stockQuantity} | Cost: ₹{product.cost}
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {selectedProduct && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Product:</span>
                                  <div className="text-blue-700">{selectedProduct.name}</div>
                                </div>
                                <div>
                                  <span className="font-medium">SKU:</span>
                                  <div className="font-mono text-blue-700">{selectedProduct.sku}</div>
                                </div>
                                <div>
                                  <span className="font-medium">Weight:</span>
                                  <div className="text-blue-700">{selectedProduct.weight}{selectedProduct.weightUnit}</div>
                                </div>
                                <div>
                                  <span className="font-medium">Stock:</span>
                                  <div className="text-blue-700 font-semibold">{selectedProduct.stockQuantity}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Repacking Configuration */}
                      {selectedProduct && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Repacking Configuration</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="repackQuantity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quantity to Pack</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
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

                            {/* Profit Margin Display */}
                            {profitMargin > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-800">Profit Margin:</span>
                                  <span className="text-lg font-bold text-green-700">{profitMargin.toFixed(2)}%</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Right Side - Stock Information */}
                    {selectedProduct && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Stock Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{currentStock}</div>
                              <div className="text-sm text-gray-500">Current Stock</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">{packedQuantity}</div>
                              <div className="text-sm text-gray-500">To Pack</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{availableForPack}</div>
                              <div className="text-sm text-gray-500">Remaining</div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span>Total Weight Output:</span>
                              <span className="font-semibold">{(unitWeight * packedQuantity).toLocaleString()}g</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Cost:</span>
                              <span className="font-semibold">{formatCurrency(costPrice * packedQuantity)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Selling Value:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(sellingPrice * packedQuantity)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Expected Profit:</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency((sellingPrice - costPrice) * packedQuantity)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                      {repackingMutation.isPending ? "Processing..." : "Start Repacking"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Profit Calculator Tab */}
            <TabsContent value="calculator" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Advanced Profit Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Scenario Analysis</h3>
                      {selectedProduct && (
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Different Weight Scenarios</h4>
                            {[250, 500, 1000, 2000].map(weight => {
                              const cost = costPrice;
                              const price = sellingPrice;
                              const margin = cost > 0 ? ((price - cost) / cost) * 100 : 0;
                              return (
                                <div key={weight} className="flex justify-between items-center py-1">
                                  <span>{weight}g pack:</span>
                                  <span className="font-medium">
                                    {formatCurrency(price)} ({margin.toFixed(1)}% margin)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold">Profit Optimization</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Recommended Margin:</span>
                            <span className="font-semibold text-green-600">25-35%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Current Margin:</span>
                            <span className={`font-semibold ${profitMargin >= 25 ? 'text-green-600' : 'text-orange-600'}`}>
                              {profitMargin.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Suggested Price:</span>
                            <span className="font-semibold">
                              {formatCurrency(costPrice * 1.3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Processing Monitor Tab */}
            <TabsContent value="monitor" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Processing Monitor</h2>
                {processingJobs.length > 0 && (
                  <Button variant="outline" onClick={clearProcessingJobs}>
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>

              {processingJobs.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <TrendingUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Processing Jobs</h3>
                    <p className="text-gray-500">Start a repacking process to see real-time monitoring here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {processingJobs.map((job) => (
                    <Card key={job.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              job.status === 'completed' ? 'bg-green-500' :
                              job.status === 'error' ? 'bg-red-500' :
                              job.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                              'bg-gray-300'
                            }`} />
                            <div>
                              <h3 className="font-medium">{job.productName}</h3>
                              <p className="text-sm text-gray-500">Job ID: {job.id}</p>
                            </div>
                          </div>
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'error' ? 'destructive' :
                            job.status === 'processing' ? 'secondary' :
                            'outline'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                        
                        {job.status === 'processing' && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                        
                        {job.status === 'completed' && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckIcon className="w-4 h-4" />
                            <span className="text-sm">Successfully repacked</span>
                          </div>
                        )}
                        
                        {job.status === 'error' && (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircleIcon className="w-4 h-4" />
                            <span className="text-sm">{job.error}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
