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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productCode, setProductCode] = useState<string>("");

  // Generate today's date in DD/MM/YYYY format
  const today = new Date();
  const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const dateOptions = generateDateOptions();

  // Generate product code based on selected product
  useEffect(() => {
    if (selectedProduct) {
      const baseCode = selectedProduct.sku.replace(/[^0-9]/g, '').slice(0, 4) || "1000";
      const timestamp = Date.now().toString().slice(-4);
      setProductCode(`${baseCode}${timestamp}`);
    } else {
      setProductCode("15022");
    }
  }, [selectedProduct]);

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
                   a.name.toLowerCase().includes('daal') ||
                   (parseFloat(a.weight || "0") >= 1 && a.weightUnit === 'kg');
    const bIsBulk = b.name.toLowerCase().includes('bulk') || 
                   b.name.toLowerCase().includes('bag') ||
                   b.name.toLowerCase().includes('container') ||
                   b.name.toLowerCase().includes('daal') ||
                   (parseFloat(b.weight || "0") >= 1 && b.weightUnit === 'kg');

    if (aIsBulk && !bIsBulk) return -1;
    if (!aIsBulk && bIsBulk) return 1;
    return a.name.localeCompare(b.name);
  });

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    mode: "onChange",
    defaultValues: {
      issueDate: formattedDate,
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 6,
      unitWeight: 250,
      costPrice: 0,
      sellingPrice: 100,
      mrp: 150,
    },
  });

  // Auto-select first bulk product on mount
  useEffect(() => {
    if (bulkProducts.length > 0 && form.getValues("bulkProductId") === 0) {
      const firstProduct = bulkProducts[0];
      form.setValue("bulkProductId", firstProduct.id);
      setSelectedProduct(firstProduct);
    }
  }, [bulkProducts, form]);

  // Watch for bulk product changes
  const bulkProductId = form.watch("bulkProductId");
  const repackQuantity = form.watch("repackQuantity");
  const unitWeight = form.watch("unitWeight");

  useEffect(() => {
    if (bulkProductId && products.length > 0) {
      const product = products.find((p: Product) => p.id === bulkProductId);
      if (product) {
        setSelectedProduct(product);
        // Calculate cost per gram from bulk item with safety checks
        const bulkWeight = parseFloat(product.weight || "1");
        const bulkWeightInGrams = product.weightUnit === 'kg' ? 
          bulkWeight * 1000 : 
          bulkWeight || 1000;

        const productCost = parseFloat(product.cost || "0");
        const costPerGram = bulkWeightInGrams > 0 ? productCost / bulkWeightInGrams : 0;
        const newUnitCost = costPerGram * unitWeight;

        if (newUnitCost > 0) {
          form.setValue("costPrice", Math.round(newUnitCost * 100) / 100);
          form.setValue("sellingPrice", Math.round(newUnitCost * 1.3 * 100) / 100);
          form.setValue("mrp", Math.round(newUnitCost * 1.5 * 100) / 100);
        }
      }
    }
  }, [bulkProductId, products, form, unitWeight]);

  // Quick Repack: 1kg to 4x250g conversion
  const quickRepackMutation = useMutation({
    mutationFn: async (bulkProduct: Product) => {
      if (!bulkProduct) throw new Error("No bulk product selected");

      if (bulkProduct.stockQuantity < 1) {
        throw new Error(`Insufficient stock. Product "${bulkProduct.name}" has only ${bulkProduct.stockQuantity} units available.`);
      }

      // Validate product weight and calculate repack ratio
      const productWeight = parseFloat(bulkProduct.weight || "1");
      const weightUnit = bulkProduct.weightUnit?.toLowerCase() || "kg";
      let totalWeightInGrams = productWeight;
      
      if (weightUnit === "kg") {
        totalWeightInGrams = productWeight * 1000;
      } else if (weightUnit === "g") {
        totalWeightInGrams = productWeight;
      }
      
      if (totalWeightInGrams < 250) {
        throw new Error("Quick repack requires products with at least 250g total weight");
      }

      const timestamp = Date.now();
      const repackedSku = `${bulkProduct.sku}-REPACK-250G-${timestamp}`;

      // Auto-generate product name for 250g packs
      const repackedName = bulkProduct.name.includes('BULK') 
        ? bulkProduct.name.replace('BULK', '250g Pack') 
        : `${bulkProduct.name} (250g Pack)`;

      // Calculate repack quantities and pricing
      const repacksFromBulk = Math.floor(totalWeightInGrams / 250); // How many 250g packs from one bulk unit
      const bulkCost = parseFloat(bulkProduct.cost || "0");
      const costPer250g = (bulkCost / repacksFromBulk).toFixed(2);
      const sellingPricePer250g = (parseFloat(costPer250g) * 1.3).toFixed(2); // 30% markup
      const mrpPer250g = (parseFloat(costPer250g) * 1.5).toFixed(2); // 50% markup

      const repackedProduct = {
        name: repackedName,
        description: `Repacked from bulk item: ${bulkProduct.name}. Original weight: ${bulkProduct.weight}${bulkProduct.weightUnit}`,
        sku: repackedSku,
        price: sellingPricePer250g,
        mrp: mrpPer250g,
        cost: costPer250g,
        weight: "250",
        weightUnit: "g",
        categoryId: bulkProduct.categoryId || 1,
        stockQuantity: repacksFromBulk, // Dynamic quantity based on bulk size
        alertThreshold: 5,
        barcode: `${timestamp}${Math.floor(Math.random() * 1000)}`, // Auto-generate barcode
        active: true,
      };

      try {
        const response = await apiRequest("POST", "/api/products", repackedProduct);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to create repacked product: ${errorData}`);
        }

        // Reduce bulk stock by 1 unit (1kg used)
        const newBulkStock = Math.max(0, bulkProduct.stockQuantity - 1);
        const updateResponse = await apiRequest("PATCH", `/api/products/${bulkProduct.id}`, {
          stockQuantity: newBulkStock,
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update bulk product stock");
        }

        return response.json();
      } catch (error) {
        console.error('Quick repack error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: `${productWeight}${weightUnit} bulk converted to ${repacksFromBulk} x 250g packs successfully!`,
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

  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      if (!selectedProduct) throw new Error("No bulk product selected");

      // Validate sufficient stock
      const productWeight = parseFloat(selectedProduct.weight) || 1;
      const productWeightUnit = selectedProduct.weightUnit || 'kg';
      let productWeightInGrams = productWeight;
      if (productWeightUnit === 'kg') {
        productWeightInGrams = productWeight * 1000;
      }

      const totalRepackedWeight = data.unitWeight * data.repackQuantity;
      const bulkUnitsNeeded = Math.ceil(totalRepackedWeight / productWeightInGrams);

      if (selectedProduct.stockQuantity < bulkUnitsNeeded) {
        throw new Error(`Insufficient stock. Need ${bulkUnitsNeeded} units but only ${selectedProduct.stockQuantity} available.`);
      }

      const timestamp = Date.now();
      const repackedSku = `${selectedProduct.sku}-REPACK-${data.unitWeight}G-${timestamp}`;

      const repackedName = selectedProduct.name.includes('BULK') 
        ? selectedProduct.name.replace('BULK', `${data.unitWeight}g`) 
        : `${selectedProduct.name} (${data.unitWeight}g Pack)`;

      const repackedProduct = {
        name: repackedName,
        description: `Repacked from bulk item: ${selectedProduct.name}. Original weight: ${selectedProduct.weight}${selectedProduct.weightUnit}`,
        sku: repackedSku,
        price: data.sellingPrice.toString(),
        mrp: data.mrp.toString(),
        cost: data.costPrice.toString(),
        weight: data.unitWeight.toString(),
        weightUnit: "g",
        categoryId: selectedProduct.categoryId || 1,
        stockQuantity: data.repackQuantity,
        alertThreshold: 5,
        barcode: `${timestamp}${Math.floor(Math.random() * 1000)}`,
        active: true,
      };

      try {
        const response = await apiRequest("POST", "/api/products", repackedProduct);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to create repacked product: ${errorData}`);
        }

        // Update bulk stock
        const newBulkStock = Math.max(0, selectedProduct.stockQuantity - bulkUnitsNeeded);
        const updateResponse = await apiRequest("PATCH", `/api/products/${selectedProduct.id}`, {
          stockQuantity: newBulkStock,
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update bulk product stock");
        }

        return response.json();
      } catch (error) {
        console.error('Repacking error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product repacked successfully",
      });
      form.reset();
      setSelectedProduct(null);
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
    console.log("Form submitted with data:", data);

    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a bulk product",
        variant: "destructive",
      });
      return;
    }

    // Additional validation
    if (data.repackQuantity < 1) {
      toast({
        title: "Error",
        description: "Repack quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (data.unitWeight < 1) {
      toast({
        title: "Error",
        description: "Unit weight must be at least 1 gram",
        variant: "destructive",
      });
      return;
    }

    if (data.costPrice < 0 || data.sellingPrice < 0 || data.mrp < 0) {
      toast({
        title: "Error",
        description: "Prices cannot be negative",
        variant: "destructive",
      });
      return;
    }

    // Check stock availability
    const bulkWeight = parseFloat(selectedProduct.weight || "1");
    const bulkWeightInGrams = selectedProduct.weightUnit === 'kg' ? 
      bulkWeight * 1000 : bulkWeight || 1000;
    const totalRepackWeight = data.unitWeight * data.repackQuantity;
    const bulkUnitsNeeded = Math.ceil(totalRepackWeight / bulkWeightInGrams);

    if (selectedProduct.stockQuantity < bulkUnitsNeeded) {
      toast({
        title: "Error",
        description: `Insufficient stock. Need ${bulkUnitsNeeded} units but only ${selectedProduct.stockQuantity} available.`,
        variant: "destructive",
      });
      return;
    }

    if (data.sellingPrice < data.costPrice) {
      toast({
        title: "Warning",
        description: "Selling price is less than cost price. This will result in a loss.",
      });
    }

    console.log("Submitting repack mutation...");
    repackingMutation.mutate(data);
  };

  const currentStock = selectedProduct?.stockQuantity || 0;
  const packedQuantity = repackQuantity;

  // Calculate how many bulk units are needed for this repack with safety checks
  const bulkWeight = parseFloat(selectedProduct?.weight || "1");
  const bulkWeightInGrams = selectedProduct?.weightUnit === 'kg' ? 
    bulkWeight * 1000 : 
    bulkWeight || 1000;

  const totalRepackWeight = unitWeight * repackQuantity;
  const bulkUnitsNeeded = bulkWeightInGrams > 0 ? Math.ceil(totalRepackWeight / bulkWeightInGrams) : 1;

  const availableForPack = Math.max(0, currentStock - bulkUnitsNeeded);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Repack Entry</h1>
            <div className="text-sm">
              <span>User: AYYAPPAN (System Admin) | Ver: 6.5.9.2 SP-65 | Customer Id: 19983394</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
            {/* Top Controls */}
            <div className="bg-white border border-gray-300 p-4 mb-6 rounded">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Issue Date</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 bg-white border-gray-300">
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
                        <FormLabel className="text-sm font-medium text-gray-700">Issue No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="" className="h-9 bg-white border-gray-300" />
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
                        <FormLabel className="text-sm font-medium text-gray-700">Repack No</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="" className="h-9 bg-white border-gray-300" />
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
                        <FormLabel className="text-sm font-medium text-gray-700">Select Bulk Product</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 bg-yellow-50 border-gray-300">
                              <SelectValue placeholder="Select bulk product" />
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

            {/* Quick Repack Section */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                <PackageIcon className="w-5 h-5 mr-2" />
                Quick Bulk to Repack Conversion
              </h3>
              <p className="text-sm text-green-700 mb-4">Convert 1kg bulk products into 4 packs of 250g each with auto-generated pricing and barcodes.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {bulkProducts.filter(product => {
                  const weight = parseFloat(product.weight || "0");
                  const unit = product.weightUnit?.toLowerCase() || "kg";
                  const isBulkByName = product.name.toLowerCase().includes('bulk') || 
                                     product.name.toLowerCase().includes('bag') ||
                                     product.name.toLowerCase().includes('container') ||
                                     product.name.toLowerCase().includes('daal');
                  const isBulkByWeight = (weight >= 0.5 && unit === "kg") || (weight >= 500 && unit === "g");
                  const hasStock = product.stockQuantity > 0;
                  
                  return (isBulkByName || isBulkByWeight) && hasStock;
                }).slice(0, 6).map((product) => {
                  const productWeight = parseFloat(product.weight || "1");
                  const weightUnit = product.weightUnit?.toLowerCase() || "kg";
                  let totalWeightInGrams = productWeight;
                  
                  if (weightUnit === "kg") {
                    totalWeightInGrams = productWeight * 1000;
                  } else if (weightUnit === "g") {
                    totalWeightInGrams = productWeight;
                  }
                  
                  const repacksFromBulk = Math.floor(totalWeightInGrams / 250);
                  const costPer250g = (parseFloat(product.cost || "0") / repacksFromBulk).toFixed(2);
                  const sellingPricePer250g = (parseFloat(costPer250g) * 1.3).toFixed(2);
                  const mrpPer250g = (parseFloat(costPer250g) * 1.5).toFixed(2);
                  const profitPer250g = (parseFloat(sellingPricePer250g) - parseFloat(costPer250g)).toFixed(2);
                  const totalValue = (parseFloat(sellingPricePer250g) * repacksFromBulk).toFixed(2);

                  return (
                    <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200 hover:border-green-300">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-gray-900 truncate" title={product.name}>
                            {product.name}
                          </div>
                          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {product.weight}{product.weightUnit}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Stock: {product.stockQuantity} units | Cost: ₹{product.cost}/kg</div>
                          <div className="text-green-600 font-medium">
                            Creates: {repacksFromBulk} packs × 250g @ ₹{sellingPricePer250g}
                          </div>
                          <div className="text-blue-600">
                            Total Value: ₹{totalValue} | Profit: ₹{(parseFloat(profitPer250g) * repacksFromBulk).toFixed(2)}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-2 rounded text-xs">
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div>
                              <div className="text-gray-500">Cost</div>
                              <div className="font-semibold">₹{costPer250g}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Selling</div>
                              <div className="font-semibold text-green-600">₹{sellingPricePer250g}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">MRP</div>
                              <div className="font-semibold text-blue-600">₹{mrpPer250g}</div>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => quickRepackMutation.mutate(product)}
                          disabled={quickRepackMutation.isPending || product.stockQuantity < 1}
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs py-1 h-9 font-medium shadow-sm"
                        >
                          {quickRepackMutation.isPending ? (
                            <>⏳ Processing...</>
                          ) : (
                            <>🧃 Repack {product.weight}{product.weightUnit} → {repacksFromBulk}×250g</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}</div>

              {bulkProducts.filter(product => {
                const weight = parseFloat(product.weight || "0");
                const unit = product.weightUnit?.toLowerCase() || "kg";
                const isBulkByName = product.name.toLowerCase().includes('bulk') || 
                                   product.name.toLowerCase().includes('bag') ||
                                   product.name.toLowerCase().includes('container') ||
                                   product.name.toLowerCase().includes('daal');
                const isBulkByWeight = (weight >= 0.5 && unit === "kg") || (weight >= 500 && unit === "g");
                const hasStock = product.stockQuantity > 0;
                
                return (isBulkByName || isBulkByWeight) && hasStock;
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <PackageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No bulk products available for repacking</p>
                  <p className="text-sm">Add bulk products (500g or larger) to inventory to enable quick repacking</p>
                  <div className="mt-4 text-xs bg-blue-50 text-blue-700 p-3 rounded">
                    💡 Tip: Products with names containing 'bulk', 'bag', 'container', 'daal' or weight ≥500g will appear here automatically
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-6">
              {/* Left Side - Main Table */}
              <div className="col-span-3">
                <div className="bg-white border border-gray-300 rounded">
                  {/* Table Header */}
                  <div className="bg-blue-500 text-white rounded-t">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-blue-400 hover:bg-blue-500">
                          <TableHead className="text-white font-semibold text-center py-3 border-r border-blue-400 w-20">Code</TableHead>
                          <TableHead className="text-white font-semibold text-center py-3 border-r border-blue-400">Item Name</TableHead>
                          <TableHead className="text-white font-semibold text-center py-3 border-r border-blue-400 w-20">Qty</TableHead>
                          <TableHead className="text-white font-semibold text-center py-3 border-r border-blue-400 w-24">Cost</TableHead>
                          <TableHead className="text-white font-semibold text-center py-3 border-r border-blue-400 w-24">Selling</TableHead>
                          <TableHead className="text-white font-semibold text-center py-3 w-24">MRP</TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                  </div>

                  {/* Table Content */}
                  <div className="min-h-96 bg-white">
                    <Table>
                      <TableBody>
                        <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                          <TableCell className="font-mono text-center py-3 border-r border-gray-200 text-sm bg-gray-50 w-20">
                            {productCode}
                          </TableCell>
                          <TableCell className="text-left py-3 border-r border-gray-200 text-sm px-3">
                            {unitWeight}G {selectedProduct ? selectedProduct.name.replace('BULK', '').trim() : 'daal'} SUNBRAND
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200 w-20">
                            <FormField
                              control={form.control}
                              name="repackQuantity"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={field.value || 6}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 6)}
                                  className="w-full h-7 text-center border border-gray-300 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200 w-24">
                            <FormField
                              control={form.control}
                              name="costPrice"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={field.value || 0}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-full h-7 text-center border border-gray-300 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3 border-r border-gray-200 w-24">
                            <FormField
                              control={form.control}
                              name="sellingPrice"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={field.value || 100}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)}
                                  className="w-full h-7 text-center border border-gray-300 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center py-3 w-24">
                            <FormField
                              control={form.control}
                              name="mrp"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={field.value || 150}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 150)}
                                  className="w-full h-7 text-center border border-gray-300 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Right Side - Bulk Item Details */}
              <div className="col-span-1">
                <div className="bg-white border border-gray-300 rounded">
                  <div className="bg-blue-500 text-white text-center py-3 font-semibold text-sm rounded-t">
                    Bulk Item Details
                  </div>

                  <div className="p-4 space-y-4 text-sm">
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600 text-xs">Bulk Code</span>
                        <div className="bg-gray-100 px-3 py-2 rounded text-center font-mono text-sm mt-1">
                          13254
                        </div>
                      </div>

                      <div>
                                                <span className="text-gray-600 text-xs">Bulk Item</span>
                        <div className="bg-gray-100 px-3 py-2 rounded text-center text-sm mt-1">
                          {selectedProduct ? selectedProduct.name.toUpperCase() : 'DAAL'}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-600 text-xs">Weight</span>
                        <div className="bg-gray-100 px-3 py-2 rounded text-center mt-1">
                          <FormField
                            control={form.control}
                            name="unitWeight"
                            render={({ field }) => (
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={field.value || 250}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 250)}
                                className="w-16 h-6 text-center border-none bg-transparent text-sm p-0 font-medium"
                              />
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-600 text-xs">Cost</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {selectedProduct ? formatCurrency(parseFloat(selectedProduct.cost)) : '₹90'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            Latest sel
                          </Button>
                          <span className="bg-yellow-200 px-2 py-1 rounded text-xs">
                            110.00
                          </span>
                        </div>
                      </div>

                      {/* Stock Information */}
                      <div className="grid grid-cols-3 gap-1 pt-3 border-t">
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Current Stock</div>
                          <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                            {currentStock}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Packed</div>
                          <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                            {bulkUnitsNeeded}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600 mb-1">Avail for pack</div>
                          <div className="bg-gray-100 px-1 py-2 rounded text-xs font-mono">
                            {availableForPack}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Function Keys Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-400 px-6 py-3 z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    <HelpCircleIcon className="w-3 h-3 mr-1" />
                    F1 Help
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F2 ItemCode
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F3 ItemName
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F4 AliasName
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F5 Pur.Prc
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    <SaveIcon className="w-3 h-3 mr-1" />
                    F6 Save
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F7 Clear
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F8 Key Settings
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    F9 Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
                    <PrinterIcon className="w-3 h-3 mr-1" />
                    F10 Print
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-gray-100 hover:bg-gray-200">
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
                    disabled={repackingMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Save Repack
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