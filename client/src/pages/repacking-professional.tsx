
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  PackageIcon,
  SaveIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
  Calculator,
  BarChart3Icon,
  SearchIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  ClockIcon,
  CogIcon,
  LayersIcon,
  ScaleIcon,
  PackageCheckIcon,
  ZapIcon,
  RefreshCwIcon
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
  profitMargin: z.number().min(0, "Profit margin must be non-negative"),
  itemStatus: z.enum(["draft", "pending", "processing", "completed", "cancelled"]),
  repackagingType: z.enum(["weight-division", "portion-control", "consumer-size", "sample-size", "custom"]),
  packagingMaterial: z.enum(["plastic-pouch", "glass-jar", "aluminum-can", "paper-bag", "cardboard-box", "custom"]),
  targetPackageWeight: z.number().min(0.01, "Target package weight required"),
  numberOfUnits: z.number().min(1, "Number of units required"),
  notes: z.string().optional(),
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
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

interface QuickTemplate {
  name: string;
  sourceWeight: number;
  targetWeight: number;
  units: number;
  description: string;
}

const quickTemplates: QuickTemplate[] = [
  { name: "1kg → 4×250g", sourceWeight: 1000, targetWeight: 250, units: 4, description: "Quarter kilogram packs" },
  { name: "1kg → 2×500g", sourceWeight: 1000, targetWeight: 500, units: 2, description: "Half kilogram packs" },
  { name: "1kg → 10×100g", sourceWeight: 1000, targetWeight: 100, units: 10, description: "Small consumer packs" },
  { name: "1kg → 20×50g", sourceWeight: 1000, targetWeight: 50, units: 20, description: "Sample size packs" },
  { name: "5kg → 10×500g", sourceWeight: 5000, targetWeight: 500, units: 10, description: "Bulk to retail conversion" },
  { name: "2kg → 8×250g", sourceWeight: 2000, targetWeight: 250, units: 8, description: "Family size packs" },
];

const statusColors = {
  draft: "bg-gray-100 text-gray-800 border-gray-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const statusIcons = {
  draft: InfoIcon,
  pending: ClockIcon,
  processing: RefreshCwIcon,
  completed: CheckCircleIcon,
  cancelled: XIcon,
};

export default function RepackingProfessionalEnhanced() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [isParallelMode, setIsParallelMode] = useState(false);
  const [livePreviews, setLivePreviews] = useState<boolean>(true);

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
      itemStatus: "draft",
      repackagingType: "weight-division",
      packagingMaterial: "plastic-pouch",
      targetPackageWeight: 250,
      numberOfUnits: 4,
      notes: "",
    },
  });

  // Watch for form changes for live updates
  const bulkProductId = form.watch("bulkProductId");
  const repackQuantity = form.watch("repackQuantity");
  const unitWeight = form.watch("unitWeight");
  const targetPackageWeight = form.watch("targetPackageWeight");
  const numberOfUnits = form.watch("numberOfUnits");
  const costPrice = form.watch("costPrice");
  const sellingPrice = form.watch("sellingPrice");
  const itemStatus = form.watch("itemStatus");
  const repackagingType = form.watch("repackagingType");

  useEffect(() => {
    if (bulkProductId && products.length > 0) {
      const product = products.find((p: Product) => p.id === bulkProductId);
      if (product) {
        setSelectedProduct(product);
        form.setValue("costPrice", parseFloat(product.cost) || 0);
        form.setValue("sellingPrice", parseFloat(product.price) || 0);
        form.setValue("mrp", parseFloat(product.mrp) || 0);
        
        // Auto-calculate profit margin
        const cost = parseFloat(product.cost) || 0;
        const price = parseFloat(product.price) || 0;
        if (cost > 0 && price > 0) {
          const margin = ((price - cost) / cost) * 100;
          form.setValue("profitMargin", Math.round(margin * 100) / 100);
        }
      }
    }
  }, [bulkProductId, products, form]);

  // Live calculation effects
  useEffect(() => {
    if (costPrice > 0 && sellingPrice > 0) {
      const margin = ((sellingPrice - costPrice) / costPrice) * 100;
      form.setValue("profitMargin", Math.round(margin * 100) / 100);
    }
  }, [costPrice, sellingPrice, form]);

  // Parallel processing mutation
  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      const jobId = Date.now().toString();
      
      if (isParallelMode) {
        // Add job to processing queue
        const newJob: ProcessingJob = {
          id: jobId,
          productName: selectedProduct?.name || "Unknown Product",
          status: "queued",
          progress: 0,
          startTime: new Date(),
        };
        setProcessingJobs(prev => [...prev, newJob]);
      }

      // Simulate processing steps for better UX
      const updateProgress = (progress: number) => {
        if (isParallelMode) {
          setProcessingJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, status: "processing", progress } : job
          ));
        }
      };

      try {
        updateProgress(10);
        
        // Generate unique SKU for repacked item
        const timestamp = Date.now();
        const repackedSku = `${selectedProduct?.sku}-REPACK-${data.targetPackageWeight}G-${timestamp}`;
        
        updateProgress(25);
        
        // Create descriptive name based on repackaging type
        let repackedName = "";
        switch (data.repackagingType) {
          case "weight-division":
            repackedName = selectedProduct?.name.includes('BULK') 
              ? selectedProduct.name.replace('BULK', `${data.targetPackageWeight}g`) 
              : `${selectedProduct?.name} (${data.targetPackageWeight}g Pack)`;
            break;
          case "portion-control":
            repackedName = `${selectedProduct?.name} - Portion Control (${data.targetPackageWeight}g)`;
            break;
          case "consumer-size":
            repackedName = `${selectedProduct?.name} - Consumer Pack (${data.targetPackageWeight}g)`;
            break;
          case "sample-size":
            repackedName = `${selectedProduct?.name} - Sample Size (${data.targetPackageWeight}g)`;
            break;
          default:
            repackedName = `${selectedProduct?.name} (${data.targetPackageWeight}g)`;
        }

        updateProgress(50);

        const repackedProduct = {
          name: repackedName,
          description: `Repacked from bulk item: ${selectedProduct?.name}. Original weight: ${selectedProduct?.weight}${selectedProduct?.weightUnit}. Repackaging type: ${data.repackagingType}. Packaging: ${data.packagingMaterial}. Notes: ${data.notes || 'N/A'}`,
          sku: repackedSku,
          price: data.sellingPrice.toString(),
          mrp: data.mrp.toString(),
          cost: data.costPrice.toString(),
          weight: data.targetPackageWeight.toString(),
          weightUnit: "g",
          categoryId: selectedProduct?.categoryId || 1,
          stockQuantity: data.numberOfUnits,
          alertThreshold: Math.max(5, Math.floor(data.numberOfUnits * 0.1)),
          barcode: "",
          active: true,
        };

        updateProgress(75);

        const response = await apiRequest("POST", "/api/products", repackedProduct);
        
        // Update bulk product stock
        if (selectedProduct) {
          const totalWeightUsed = data.targetPackageWeight * data.numberOfUnits;
          const productWeightInGrams = selectedProduct.weightUnit === 'kg' 
            ? parseFloat(selectedProduct.weight || "0") * 1000 
            : parseFloat(selectedProduct.weight || "0");
          
          const bulkUnitsUsed = totalWeightUsed / productWeightInGrams;
          const newBulkStock = Math.max(0, selectedProduct.stockQuantity - Math.ceil(bulkUnitsUsed));
          
          await apiRequest("PATCH", `/api/products/${selectedProduct.id}`, {
            stockQuantity: Math.floor(newBulkStock),
          });
        }

        updateProgress(100);

        if (isParallelMode) {
          setProcessingJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, status: "completed", progress: 100, endTime: new Date() } : job
          ));
        }

        return response.json();
      } catch (error) {
        if (isParallelMode) {
          setProcessingJobs(prev => prev.map(job => 
            job.id === jobId ? { 
              ...job, 
              status: "failed", 
              error: error instanceof Error ? error.message : "Unknown error",
              endTime: new Date() 
            } : job
          ));
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: `Product repacked successfully${isParallelMode ? ' (Parallel Processing)' : ''}`,
      });
      
      if (!isParallelMode) {
        form.reset();
        setSelectedProduct(null);
        setRepackEntries([]);
      }
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

  const applyQuickTemplate = (template: QuickTemplate) => {
    form.setValue("targetPackageWeight", template.targetWeight);
    form.setValue("numberOfUnits", template.units);
    form.setValue("unitWeight", template.targetWeight);
    
    toast({
      title: "Template Applied",
      description: template.description,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    form.setValue("itemStatus", newStatus as any);
    
    toast({
      title: "Status Updated",
      description: `Item status changed to ${newStatus}`,
    });
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

  const clearCompletedJobs = () => {
    setProcessingJobs(prev => prev.filter(job => job.status !== "completed"));
  };

  // Live calculations
  const totalWeightNeeded = targetPackageWeight * numberOfUnits;
  const availableWeight = selectedProduct ? 
    (selectedProduct.weightUnit === 'kg' ? 
      parseFloat(selectedProduct.weight || "0") * 1000 : 
      parseFloat(selectedProduct.weight || "0")) * selectedProduct.stockQuantity : 0;
  const canProduce = availableWeight >= totalWeightNeeded;
  const maxUnits = availableWeight > 0 ? Math.floor(availableWeight / targetPackageWeight) : 0;
  const costPerUnit = (costPrice * targetPackageWeight) / 1000; // Assuming cost is per kg
  const totalRevenue = sellingPrice * numberOfUnits;
  const totalCost = costPerUnit * numberOfUnits;
  const totalProfit = totalRevenue - totalCost;

  const StatusIcon = statusIcons[itemStatus];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <PackageCheckIcon className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Enhanced Repack Entry</h1>
                <p className="text-blue-100 text-sm">Professional bulk to retail conversion system</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">Parallel Mode:</label>
                <Button
                  variant={isParallelMode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsParallelMode(!isParallelMode)}
                  className="text-white border-white/30"
                >
                  {isParallelMode ? <ZapIcon className="w-4 h-4 mr-1" /> : <CogIcon className="w-4 h-4 mr-1" />}
                  {isParallelMode ? "ON" : "OFF"}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setLocation("/")}>
                <XIcon className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Parallel Processing Status */}
        {isParallelMode && processingJobs.length > 0 && (
          <div className="bg-white border-b shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Processing Queue</h3>
                <Button variant="outline" size="sm" onClick={clearCompletedJobs}>
                  Clear Completed
                </Button>
              </div>
              <div className="space-y-2">
                {processingJobs.slice(-5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        job.status === "completed" ? "bg-green-500" :
                        job.status === "failed" ? "bg-red-500" :
                        job.status === "processing" ? "bg-blue-500 animate-pulse" :
                        "bg-yellow-500"
                      }`} />
                      <span className="font-medium">{job.productName}</span>
                      <Badge variant="outline" className="text-xs">
                        {job.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === "processing" && (
                        <div className="w-24">
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {job.endTime ? `${Math.round((job.endTime.getTime() - (job.startTime?.getTime() || 0)) / 1000)}s` : 
                         job.startTime ? `${Math.round((Date.now() - job.startTime.getTime()) / 1000)}s` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Enhanced Header Fields */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Issue Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="bg-white border-gray-300" />
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
                        <FormLabel className="text-sm font-semibold text-gray-700">Issue No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-generated" className="bg-white border-gray-300" />
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
                        <FormLabel className="text-sm font-semibold text-gray-700">Repack No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-generated" className="bg-white border-gray-300" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="itemStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">Status</FormLabel>
                        <Select onValueChange={handleStatusChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={`${statusColors[itemStatus]} font-medium`}>
                              <div className="flex items-center gap-2">
                                <StatusIcon className="w-4 h-4" />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Side - Product Selection */}
              <div className="xl:col-span-2 space-y-6">
                {/* Product Selection */}
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <SearchIcon className="w-5 h-5" />
                      Bulk Product Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <FormField
                      control={form.control}
                      name="bulkProductId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Bulk Product</FormLabel>
                          
                          {/* Enhanced Search */}
                          <div className="mb-4">
                            <div className="relative">
                              <Input
                                placeholder="Search bulk products by name, SKU, or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white border-gray-300"
                              />
                              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-white border-gray-300">
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
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <PackageIcon className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">Selected Product Details</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">SKU:</span> {selectedProduct.sku}
                          </div>
                          <div>
                            <span className="font-medium">Weight:</span> {selectedProduct.weight}{selectedProduct.weightUnit}
                          </div>
                          <div>
                            <span className="font-medium">Stock:</span> {selectedProduct.stockQuantity}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Templates */}
                {selectedProduct && (
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <ZapIcon className="w-5 h-5" />
                        Quick Repackaging Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {quickTemplates.map((template, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickTemplate(template)}
                            className="h-auto p-3 text-left hover:bg-green-50 hover:border-green-300"
                          >
                            <div>
                              <div className="font-semibold text-green-700">{template.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Repackaging Configuration */}
                {selectedProduct && (
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <CogIcon className="w-5 h-5" />
                        Repackaging Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Repackaging Type and Material */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="repackagingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Repackaging Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="weight-division">Weight Division</SelectItem>
                                  <SelectItem value="portion-control">Portion Control</SelectItem>
                                  <SelectItem value="consumer-size">Consumer Size</SelectItem>
                                  <SelectItem value="sample-size">Sample Size</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="packagingMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packaging Material</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="plastic-pouch">Plastic Pouch</SelectItem>
                                  <SelectItem value="glass-jar">Glass Jar</SelectItem>
                                  <SelectItem value="aluminum-can">Aluminum Can</SelectItem>
                                  <SelectItem value="paper-bag">Paper Bag</SelectItem>
                                  <SelectItem value="cardboard-box">Cardboard Box</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Target Weight and Units */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="targetPackageWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <ScaleIcon className="w-4 h-4" />
                                Target Package Weight (grams)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="bg-white border-gray-300"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="numberOfUnits"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <LayersIcon className="w-4 h-4" />
                                Number of Units
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="bg-white border-gray-300"
                                />
                              </FormControl>
                              <div className="text-xs text-gray-500 mt-1">
                                Max possible: {maxUnits} units
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Pricing */}
                      <div className="grid grid-cols-3 gap-4">
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
                                  className="bg-white border-gray-300"
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
                              <FormLabel>Selling Price per Unit</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="bg-white border-gray-300"
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
                                  className="bg-white border-gray-300"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Notes */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter any additional notes or special instructions..."
                                className="bg-white border-gray-300"
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Side - Live Preview and Summary */}
              <div className="space-y-6">
                {/* Live Preview Panel */}
                {selectedProduct && livePreviews && (
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-amber-50">
                    <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3Icon className="w-5 h-5" />
                        Live Calculations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-xs text-gray-600">Total Weight Needed</div>
                          <div className="font-bold text-lg text-orange-600">
                            {(totalWeightNeeded / 1000).toFixed(2)} kg
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-xs text-gray-600">Available Weight</div>
                          <div className="font-bold text-lg text-blue-600">
                            {(availableWeight / 1000).toFixed(2)} kg
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border-2 ${canProduce ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {canProduce ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircleIcon className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`font-semibold ${canProduce ? 'text-green-800' : 'text-red-800'}`}>
                            {canProduce ? 'Production Feasible' : 'Insufficient Material'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {canProduce 
                            ? `You can produce ${numberOfUnits} units with ${((availableWeight - totalWeightNeeded) / 1000).toFixed(2)} kg remaining`
                            : `Need ${((totalWeightNeeded - availableWeight) / 1000).toFixed(2)} kg more material`
                          }
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold mb-3 text-gray-800">Financial Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Revenue:</span>
                            <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Cost:</span>
                            <span className="font-semibold text-red-600">{formatCurrency(totalCost)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span>Total Profit:</span>
                            <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(totalProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Profit Margin:</span>
                            <span className="font-semibold text-blue-600">
                              {totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Entries */}
                {selectedProduct && (
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-lg">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlusIcon className="w-5 h-5" />
                          Additional Entries
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addRepackEntry}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {repackEntries.length > 0 ? (
                        <div className="space-y-3">
                          {repackEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <Input
                                value={entry.name}
                                onChange={(e) => updateRepackEntry(entry.id, 'name', e.target.value)}
                                placeholder="Entry name"
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={entry.percentage}
                                onChange={(e) => updateRepackEntry(entry.id, 'percentage', parseFloat(e.target.value) || 0)}
                                placeholder="%"
                                className="w-20"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) => updateRepackEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                                placeholder="Amount"
                                className="w-24"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRepackEntry(entry.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <PlusIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No additional entries</p>
                          <p className="text-sm">Click "Add" to create custom entries</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSelectedProduct(null);
                    setRepackEntries([]);
                  }}
                >
                  Reset Form
                </Button>
              </div>
              
              <div className="flex items-center gap-4">
                {selectedProduct && (
                  <div className="text-sm text-gray-600">
                    {canProduce ? (
                      <span className="text-green-600 font-medium">✓ Ready to process</span>
                    ) : (
                      <span className="text-red-600 font-medium">⚠ Check material availability</span>
                    )}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={repackingMutation.isPending || !selectedProduct || !canProduce}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {repackingMutation.isPending ? "Processing..." : 
                   isParallelMode ? "Queue Repack Job" : "Save Repack Entry"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
