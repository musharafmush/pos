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
  weightUnit: z.enum(["g", "kg"]).default("g"),
  costPrice: z.number().min(0, "Cost price must be non-negative"),
  sellingPrice: z.number().min(0, "Selling price must be non-negative"),
  mrp: z.number().min(0, "MRP must be non-negative"),
  newProductName: z.string().min(1, "Product name is required"),
  newProductSku: z.string().min(1, "Product SKU is required"),
  newProductBarcode: z.string().optional(),
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
  ).sort((a: Product, b: Product) => {
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
      weightUnit: "g",
      costPrice: 0,
      sellingPrice: 100,
      mrp: 150,
      newProductName: "",
      newProductSku: "",
      newProductBarcode: "",
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
  const weightUnit = form.watch("weightUnit");

  // Auto-generate product details when bulk product or weight changes
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
        
        // Convert unit weight to grams for calculation
        const unitWeightInGrams = weightUnit === 'kg' ? unitWeight * 1000 : unitWeight;
        const newUnitCost = costPerGram * unitWeightInGrams;

        if (newUnitCost > 0) {
          form.setValue("costPrice", Math.round(newUnitCost * 100) / 100);
          form.setValue("sellingPrice", Math.round(newUnitCost * 1.3 * 100) / 100);
          form.setValue("mrp", Math.round(newUnitCost * 1.5 * 100) / 100);
        }

        // Auto-generate product name and SKU
        const weightDisplay = weightUnit === 'kg' && unitWeight < 1 ? 
          `${unitWeight * 1000}g` : 
          `${unitWeight}${weightUnit}`;
        
        const newProductName = `${product.name.replace(/\s*\(.*?\)/g, '')} (${weightDisplay} Pack)`;
        const newSku = `${product.sku}_REPACK_${weightDisplay}_${Date.now().toString().slice(-4)}`;
        
        form.setValue("newProductName", newProductName);
        form.setValue("newProductSku", newSku);
        form.setValue("newProductBarcode", `${(product.barcode || product.sku || '')}_${weightDisplay}`.replace(/[^0-9A-Z]/g, ''));
      }
    }
  }, [bulkProductId, products, form, unitWeight, weightUnit]);

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
    onSuccess: (data, bulkProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      const productWeight = parseFloat(bulkProduct.weight || "1");
      const weightUnit = bulkProduct.weightUnit?.toLowerCase() || "kg";
      let totalWeightInGrams = productWeight;

      if (weightUnit === "kg") {
        totalWeightInGrams = productWeight * 1000;
      } else if (weightUnit === "g") {
        totalWeightInGrams = productWeight;
      }

      const repacksFromBulk = Math.floor(totalWeightInGrams / 250);

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

      // Enhanced validation with comprehensive stock checking
      const productWeight = parseFloat(selectedProduct.weight || "1") || 1;
      const productWeightUnit = selectedProduct.weightUnit || 'kg';
      let productWeightInGrams = productWeight;
      if (productWeightUnit === 'kg') {
        productWeightInGrams = productWeight * 1000;
      }

      // Convert unit weight to grams for precise calculation
      const unitWeightInGrams = data.weightUnit === 'kg' ? data.unitWeight * 1000 : data.unitWeight;
      const totalRepackedWeight = unitWeightInGrams * data.repackQuantity;
      const bulkUnitsNeeded = Math.ceil(totalRepackedWeight / productWeightInGrams);

      // Comprehensive stock validation
      if (selectedProduct.stockQuantity < bulkUnitsNeeded) {
        throw new Error(`Insufficient stock: Need ${bulkUnitsNeeded} units, only ${selectedProduct.stockQuantity} available`);
      }

      // Create the repacked product with enhanced metadata
      const repackedProduct = {
        name: data.newProductName,
        description: `Professional repack from ${selectedProduct.name} - ${data.unitWeight}${data.weightUnit} precision pack`,
        sku: data.newProductSku,
        price: data.sellingPrice.toString(),
        mrp: data.mrp.toString(),
        cost: data.costPrice.toString(),
        weight: data.unitWeight.toString(),
        weightUnit: data.weightUnit,
        categoryId: selectedProduct.categoryId || 1,
        stockQuantity: data.repackQuantity.toString(),
        alertThreshold: Math.max(1, Math.floor(data.repackQuantity * 0.1)),
        barcode: data.newProductBarcode || `RP${Date.now()}${Math.floor(Math.random() * 1000)}`,
        active: true,
        
        // Enhanced repack metadata integration
        itemPreparationsStatus: "Trade As Is",
        bulkItemName: selectedProduct.name,
        repackageUnits: data.repackQuantity.toString(),
        weightInGms: (data.weightUnit === 'kg' ? data.unitWeight * 1000 : data.unitWeight).toString(),
        
        // Inherit tax and supplier information
        manufacturerName: selectedProduct.manufacturerName || "",
        supplierName: selectedProduct.supplierName || "",
        manufacturerId: selectedProduct.manufacturerId || null,
        supplierId: selectedProduct.supplierId || null,
        hsnCode: selectedProduct.hsnCode || "",
        gstCode: selectedProduct.gstCode || "GST 18%",
        cgstRate: selectedProduct.cgstRate || "9",
        sgstRate: selectedProduct.sgstRate || "9", 
        igstRate: selectedProduct.igstRate || "0",
        cessRate: selectedProduct.cessRate || "0",
        taxCalculationMethod: selectedProduct.taxCalculationMethod || "exclusive",
      };

      // Create the repacked product
      const createResponse = await apiRequest("/api/products", "POST", repackedProduct);

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        throw new Error(`Failed to create repacked product: ${errorData}`);
      }

      // Update bulk product stock
      const newBulkStock = Math.max(0, selectedProduct.stockQuantity - bulkUnitsNeeded);
      const updateResponse = await apiRequest(`/api/products/${selectedProduct.id}`, "PUT", {
        ...selectedProduct,
        stockQuantity: newBulkStock,
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update bulk product stock");
      }

      return createResponse.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Repacking Completed Successfully",
        description: `Created ${data.name} with ${form.getValues('repackQuantity')} units`,
        variant: "default",
      });
      
      // Reset form
      form.reset({
        issueDate: formattedDate,
        issueNo: "",
        repackNo: "",
        bulkProductId: 0,
        repackQuantity: 6,
        unitWeight: 250,
        weightUnit: "g",
        costPrice: 0,
        sellingPrice: 100,
        mrp: 150,
        newProductName: "",
        newProductSku: "",
        newProductBarcode: "",
      });
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Repacking Failed",
        description: error.message || "Failed to create repacked product",
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

    if (data.unitWeight < 0.01) {
      toast({
        title: "Error",
        description: "Unit weight must be greater than 0",
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

    // Check stock availability with proper weight conversion
    const bulkWeight = parseFloat(selectedProduct.weight || "1");
    const bulkWeightInGrams = selectedProduct.weightUnit === 'kg' ? 
      bulkWeight * 1000 : bulkWeight || 1000;
    
    // Convert unit weight to grams for calculation
    const unitWeightInGrams = data.weightUnit === 'kg' ? data.unitWeight * 1000 : data.unitWeight;
    const totalRepackWeight = unitWeightInGrams * data.repackQuantity;
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

  // Convert unit weight to grams for calculation
  const unitWeightInGrams = weightUnit === 'kg' ? unitWeight * 1000 : unitWeight;
  const totalRepackWeight = unitWeightInGrams * repackQuantity;
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

            {/* Enhanced Bulk to Repack Conversion Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                <PackageIcon className="w-6 h-6 mr-2" />
                Bulk to Repack Conversion Calculator
              </h3>
              <p className="text-sm text-blue-700 mb-6">Intelligent weight conversion system for kg and gram repacking with automatic pricing calculations.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Repack Configuration */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Repack Configuration</h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="repackQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Number of Packs</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                className="h-10 text-center font-semibold text-lg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quick Pack Options</label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("repackQuantity", 4)}
                            className="text-xs"
                          >
                            4 Packs
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("repackQuantity", 6)}
                            className="text-xs"
                          >
                            6 Packs
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("repackQuantity", 8)}
                            className="text-xs"
                          >
                            8 Packs
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => form.setValue("repackQuantity", 10)}
                            className="text-xs"
                          >
                            10 Packs
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unitWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Weight per Pack</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.01)}
                                className="h-10 text-center font-semibold text-lg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weightUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Weight Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="g">Grams (g)</SelectItem>
                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Quick Weight Presets */}
                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Quick Weight Presets</label>
                      <div className="grid grid-cols-4 gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            form.setValue("unitWeight", 250);
                            form.setValue("weightUnit", "g");
                          }}
                          className="text-xs"
                        >
                          250g
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            form.setValue("unitWeight", 500);
                            form.setValue("weightUnit", "g");
                          }}
                          className="text-xs"
                        >
                          500g
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            form.setValue("unitWeight", 1);
                            form.setValue("weightUnit", "kg");
                          }}
                          className="text-xs"
                        >
                          1kg
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            form.setValue("unitWeight", 2);
                            form.setValue("weightUnit", "kg");
                          }}
                          className="text-xs"
                        >
                          2kg
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Generated Product Details */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Auto-Generated Product Details</h4>
                    
                    <FormField
                      control={form.control}
                      name="newProductName"
                      render={({ field }) => (
                        <FormItem className="mb-3">
                          <FormLabel className="text-sm font-medium">Product Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-9 bg-blue-50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="newProductSku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">SKU</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9 bg-blue-50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newProductBarcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Barcode</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-9 bg-blue-50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Conversion Summary & Pricing */}
                <div className="space-y-4">
                  {selectedProduct && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3">Conversion Summary</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Source Product:</span>
                          <span className="text-sm">{selectedProduct.name}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Bulk Weight:</span>
                          <span className="text-sm font-mono">
                            {selectedProduct.weight || "1"} {selectedProduct.weightUnit || "kg"}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm font-medium">Total Repack Weight:</span>
                          <span className="text-sm font-mono">
                            {(() => {
                              const unitWeightInGrams = weightUnit === 'kg' ? unitWeight * 1000 : unitWeight;
                              const totalGrams = unitWeightInGrams * repackQuantity;
                              return totalGrams >= 1000 
                                ? `${(totalGrams / 1000).toFixed(2)} kg`
                                : `${totalGrams} g`;
                            })()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm font-medium">Bulk Units Needed:</span>
                          <span className="text-sm font-mono">{bulkUnitsNeeded} units</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span className="text-sm font-medium">Available Stock:</span>
                          <span className="text-sm font-mono">{selectedProduct.stockQuantity} units</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing Configuration */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Pricing Configuration</h4>
                    
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Cost Price (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-9 bg-green-50 font-mono"
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
                            <FormLabel className="text-sm font-medium">Selling Price (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-9 bg-blue-50 font-mono"
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
                            <FormLabel className="text-sm font-medium">MRP (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-9 bg-purple-50 font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Profit Margin Display */}
                      {form.watch("costPrice") > 0 && form.watch("sellingPrice") > 0 && (
                        <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-1">Profit Analysis</div>
                          <div className="text-xs text-gray-600">
                            Margin: {(((form.watch("sellingPrice") - form.watch("costPrice")) / form.watch("sellingPrice")) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">
                            Profit per unit: ₹{(form.watch("sellingPrice") - form.watch("costPrice")).toFixed(2)}
                          </div>
                        </div>
                      )}
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