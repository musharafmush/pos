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
  SettingsIcon,
  BarChart3Icon,
  DollarSignIcon,
  ClipboardIcon
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

export default function RepackingProfessional() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Generate date options (last 30 days)
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  });

  // Check for integration data from add-item-professional
  const [integrationData, setIntegrationData] = useState<any>(null);

  useEffect(() => {
    const storedData = localStorage.getItem('repackingIntegrationData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setIntegrationData(data);
        // Clear the stored data after using it
        localStorage.removeItem('repackingIntegrationData');
      } catch (error) {
        console.error('Error parsing integration data:', error);
      }
    }
  }, []);

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    defaultValues: {
      issueDate: dateOptions[0],
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 6,
      unitWeight: 250,
      weightUnit: "g",
      costPrice: 0,
      sellingPrice: 0,
      mrp: 0,
      newProductName: "",
      newProductSku: "",
      newProductBarcode: "",
    },
  });

  // Fetch products for bulk selection
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter bulk products (exclude already repacked items)
  const bulkProducts = products.filter((product: Product) => 
    !product.sku.includes("REPACK") && 
    product.stockQuantity > 0 && 
    product.active
  );

  // Auto-populate form when integration data is available
  useEffect(() => {
    if (integrationData && products.length > 0) {
      const bulkProduct = integrationData.bulkProduct;
      const newProduct = integrationData.newProduct;
      
      // Find the bulk product in the loaded products
      const foundProduct = products.find((p: Product) => p.id === bulkProduct.id);
      
      if (foundProduct) {
        // Pre-fill form with integration data
        form.setValue("bulkProductId", foundProduct.id);
        form.setValue("costPrice", parseFloat(bulkProduct.price || "0"));
        form.setValue("mrp", parseFloat(bulkProduct.mrp || "0"));
        
        if (newProduct.itemName) {
          form.setValue("newProductName", newProduct.itemName);
        }
        if (newProduct.itemCode) {
          form.setValue("newProductSku", newProduct.itemCode);
        }
        
        // Show success toast
        toast({
          title: "Integration Successful",
          description: `Pre-filled repacking details for ${bulkProduct.name}`,
        });
      }
    }
  }, [integrationData, products, form, toast]);

  // Auto-generate child product details when bulk product is selected
  useEffect(() => {
    const bulkProductId = form.watch("bulkProductId");
    const unitWeight = form.watch("unitWeight");
    const weightUnit = form.watch("weightUnit");
    
    if (bulkProductId && unitWeight && weightUnit && products.length > 0) {
      const selectedBulkProduct = products.find((p: Product) => p.id === bulkProductId);
      
      if (selectedBulkProduct) {
        // Generate child product name based on parent + weight
        const childProductName = `${selectedBulkProduct.name} (${unitWeight}${weightUnit} Pack)`;
        
        // Generate child SKU based on parent SKU + repack suffix
        const timestamp = Date.now().toString().slice(-6);
        const childSku = `${selectedBulkProduct.sku}_REPACK_${unitWeight}${weightUnit}_${timestamp}`;
        
        // Generate child barcode based on parent barcode + weight info
        const childBarcode = selectedBulkProduct.barcode ? 
          `${selectedBulkProduct.barcode}${unitWeight}${weightUnit}` : 
          `${timestamp}${unitWeight}${weightUnit}`;
        
        // Auto-populate child product details
        form.setValue("newProductName", childProductName);
        form.setValue("newProductSku", childSku);
        form.setValue("newProductBarcode", childBarcode);
        
        // Auto-populate pricing based on weight ratio
        const bulkWeight = parseFloat(selectedBulkProduct.weight || "1");
        const bulkWeightUnit = selectedBulkProduct.weightUnit || "kg";
        
        // Convert to same unit for calculation
        let bulkWeightInGrams = bulkWeight;
        if (bulkWeightUnit === "kg") {
          bulkWeightInGrams = bulkWeight * 1000;
        }
        
        let childWeightInGrams = unitWeight;
        if (weightUnit === "kg") {
          childWeightInGrams = unitWeight * 1000;
        }
        
        // Calculate proportional pricing
        const weightRatio = childWeightInGrams / bulkWeightInGrams;
        const childCostPrice = parseFloat(selectedBulkProduct.price || "0") * weightRatio;
        const childMRP = parseFloat(selectedBulkProduct.mrp || "0") * weightRatio;
        const childSellingPrice = childCostPrice * 1.2; // 20% markup
        
        form.setValue("costPrice", Math.round(childCostPrice * 100) / 100);
        form.setValue("sellingPrice", Math.round(childSellingPrice * 100) / 100);
        form.setValue("mrp", Math.round(childMRP * 100) / 100);
      }
    }
  }, [form.watch("bulkProductId"), form.watch("unitWeight"), form.watch("weightUnit"), products, form]);

  // Watch form values for calculations
  const watchedValues = form.watch();
  const { bulkProductId, repackQuantity, unitWeight, weightUnit } = watchedValues;

  const selectedProduct = bulkProducts.find((p: Product) => p.id === bulkProductId);
  const currentStock = selectedProduct?.stockQuantity || 0;

  // Auto-generate product details when bulk product is selected
  useEffect(() => {
    if (selectedProduct) {
      const newProductName = `${selectedProduct.name} (${unitWeight}${weightUnit} Pack)`;
      const newSku = `${selectedProduct.sku}_REPACK_${unitWeight}${weightUnit}_${Date.now()}`;
      const newBarcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      form.setValue("newProductName", newProductName);
      form.setValue("newProductSku", newSku);
      form.setValue("newProductBarcode", newBarcode);

      // Auto-calculate cost based on bulk product
      if (selectedProduct.cost && selectedProduct.weight) {
        const bulkWeightInGrams = selectedProduct.weightUnit === 'kg' ? 
          parseFloat(selectedProduct.weight) * 1000 : 
          parseFloat(selectedProduct.weight);
        
        const unitWeightInGrams = weightUnit === 'kg' ? unitWeight * 1000 : unitWeight;
        const costPerGram = parseFloat(selectedProduct.cost) / bulkWeightInGrams;
        const unitCost = costPerGram * unitWeightInGrams;
        
        form.setValue("costPrice", Math.round(unitCost * 100) / 100);
        form.setValue("sellingPrice", Math.round(unitCost * 1.3 * 100) / 100); // 30% markup
        form.setValue("mrp", Math.round(unitCost * 1.5 * 100) / 100); // 50% markup for MRP
      }
    }
  }, [selectedProduct, unitWeight, weightUnit, form]);

  // Calculate bulk units needed and other metrics
  const bulkWeight = parseFloat(selectedProduct?.weight || "1");
  const bulkWeightInGrams = selectedProduct?.weightUnit === 'kg' ? 
    bulkWeight * 1000 : 
    bulkWeight || 1000;

  const unitWeightInGrams = weightUnit === 'kg' ? unitWeight * 1000 : unitWeight;
  const totalRepackWeight = unitWeightInGrams * repackQuantity;
  const bulkUnitsNeeded = bulkWeightInGrams > 0 ? Math.ceil(totalRepackWeight / bulkWeightInGrams) : 1;

  // Mutation for creating repack
  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      if (!selectedProduct) {
        throw new Error("No bulk product selected");
      }

      if (currentStock < bulkUnitsNeeded) {
        throw new Error(`Insufficient stock. Need ${bulkUnitsNeeded} units, only ${currentStock} available.`);
      }

      // Create the repacked product
      const repackedProduct = {
        name: data.newProductName,
        sku: data.newProductSku,
        description: `Repacked from ${selectedProduct.name}`,
        price: data.sellingPrice.toString(),
        cost: data.costPrice.toString(),
        mrp: data.mrp.toString(),
        weight: data.unitWeight.toString(),
        weightUnit: data.weightUnit,
        categoryId: selectedProduct.categoryId,
        stockQuantity: data.repackQuantity,
        alertThreshold: 5,
        barcode: data.newProductBarcode || "",
        hsnCode: selectedProduct.hsnCode || "",
        cgstRate: selectedProduct.cgstRate || "0",
        sgstRate: selectedProduct.sgstRate || "0",
        igstRate: selectedProduct.igstRate || "0",
        cessRate: selectedProduct.cessRate || "0",
        taxCalculationMethod: selectedProduct.taxCalculationMethod || "exclusive",
        manufacturerName: selectedProduct.manufacturerName || "",
        supplierName: selectedProduct.supplierName || "",
        manufacturerId: selectedProduct.manufacturerId,
        supplierId: selectedProduct.supplierId,
        active: true,
      };

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

      return { repackedProduct, updatedStock: newBulkStock };
    },
    onSuccess: (data) => {
      toast({
        title: "Repack Created Successfully",
        description: `Created ${repackQuantity} units of ${data.repackedProduct.name}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset();
      setLocation("/products/repacking-dashboard-professional");
    },
    onError: (error) => {
      toast({
        title: "Repack Creation Failed", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepackingFormValues) => {
    repackingMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Professional Repack Entry</h1>
              {integrationData && (
                <Badge className="bg-green-500 text-white px-3 py-1 text-xs font-medium">
                  <PackageIcon className="w-3 h-3 mr-1" />
                  Integrated from Item Preparation
                </Badge>
              )}
            </div>
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
                            <SelectValue placeholder="Choose bulk item..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {isLoadingProducts ? (
                            <SelectItem value="loading" disabled>Loading products...</SelectItem>
                          ) : bulkProducts.length === 0 ? (
                            <SelectItem value="no-products" disabled>No bulk products available</SelectItem>
                          ) : (
                            bulkProducts.map((product: Product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - Stock: {product.stockQuantity} - ₹{product.price}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Integration Data Display Panel */}
            {integrationData && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg mb-6 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                    <PackageIcon className="w-5 h-5" />
                    Integrated Item Preparation Data
                  </h3>
                  <Badge className="bg-green-600 text-white">Auto-Filled</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Source Bulk Product */}
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Settings2Icon className="w-4 h-4" />
                      Source Bulk Product
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product Name:</span>
                        <span className="font-medium text-gray-800">{integrationData.bulkProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-mono text-gray-800">{integrationData.bulkProduct.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Stock:</span>
                        <span className="font-semibold text-green-600">{integrationData.bulkProduct.stockQuantity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="font-semibold text-blue-600">₹{parseFloat(integrationData.bulkProduct.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Target New Product */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <ClipboardIcon className="w-4 h-4" />
                      Target New Product
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product Name:</span>
                        <span className="font-medium text-gray-800">{integrationData.newProduct.itemName || 'Pre-filled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item Code:</span>
                        <span className="font-mono text-gray-800">{integrationData.newProduct.itemCode || 'Pre-filled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="text-gray-800">{integrationData.newProduct.manufacturerName || 'From bulk item'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Ready for Repackaging</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-green-100 rounded text-center">
                  <p className="text-sm text-green-800">
                    <strong>Integration Complete:</strong> Form fields have been automatically populated. Review and adjust as needed.
                  </p>
                </div>
              </div>
            )}

            {/* Item Preparations Status - Enhanced Professional Display */}
            <div className="bg-white border border-gray-300 rounded-lg mb-6">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <PackageIcon className="w-5 h-5" />
                  Item Preparations Status
                </h3>
                <p className="text-sm text-gray-600 mt-1">Repackage - Bought in bulk, repackaged into smaller units</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  
                  {/* Left Panel - Repack Configuration */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4" />
                      Repack Configuration
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-blue-700 mb-2 block">Number of Packs</label>
                        <FormField
                          control={form.control}
                          name="repackQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  className="h-12 text-center font-bold text-2xl bg-white border-2 border-blue-300"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          {[4, 6, 8, 10].map((qty) => (
                            <Button 
                              key={qty}
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => form.setValue("repackQuantity", qty)}
                              className="text-xs h-8 bg-white hover:bg-blue-100"
                            >
                              {qty} Packs
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-blue-700 mb-2 block">Weight per Pack</label>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name="unitWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.01)}
                                    className="h-10 text-center font-semibold text-lg bg-white border-2 border-blue-300"
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-10 bg-white border-2 border-blue-300 font-semibold">
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
                        
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          {[
                            { weight: 250, unit: "g", label: "250g" },
                            { weight: 500, unit: "g", label: "500g" },
                            { weight: 1, unit: "kg", label: "1kg" },
                            { weight: 2, unit: "kg", label: "2kg" }
                          ].map((preset) => (
                            <Button 
                              key={preset.label}
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                form.setValue("unitWeight", preset.weight);
                                form.setValue("weightUnit", preset.unit as "g" | "kg");
                              }}
                              className="text-xs h-8 bg-white hover:bg-blue-100"
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Panel - Conversion Summary */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <BarChart3Icon className="w-4 h-4" />
                      Conversion Summary
                    </h4>
                    
                    {selectedProduct ? (
                      <div className="space-y-3">
                        {[
                          { label: "Source Product", value: selectedProduct.name.toUpperCase() },
                          { label: "Bulk Weight", value: `${bulkWeight} ${selectedProduct.weightUnit}` },
                          { label: "Total Repack Weight", value: `${(totalRepackWeight / 1000).toFixed(2)} kg` },
                          { label: "Bulk Units Needed", value: `${bulkUnitsNeeded} units`, highlight: "orange" },
                          { 
                            label: "Available Stock", 
                            value: `${currentStock} units`, 
                            highlight: currentStock >= bulkUnitsNeeded ? "green" : "red" 
                          }
                        ].map((item, index) => (
                          <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                            <span className="font-medium text-green-700">{item.label}:</span>
                            <span className={`px-2 py-1 rounded font-semibold text-xs ${
                              item.highlight === "orange" ? "bg-yellow-100 text-orange-800" :
                              item.highlight === "green" ? "bg-green-100 text-green-800" :
                              item.highlight === "red" ? "bg-red-100 text-red-800" :
                              "bg-white"
                            }`}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Select a bulk product to see conversion details</p>
                    )}
                  </div>

                  {/* Right Panel - Auto-Generated Product Details */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <PackageIcon className="w-4 h-4" />
                      Auto-Generated Product Details
                    </h4>
                    
                    {form.watch("bulkProductId") && form.watch("unitWeight") && form.watch("weightUnit") ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs font-medium text-orange-700 block mb-1">Product Name</label>
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-sm font-medium text-orange-900">
                              {form.watch("newProductName") || "Auto-generating..."}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-orange-700 block mb-1">SKU</label>
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs font-mono text-orange-900">
                              {form.watch("newProductSku") || "Auto-generating..."}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-orange-700 block mb-1">Barcode</label>
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs font-mono text-orange-900">
                              {form.watch("newProductBarcode") || "Auto-generating..."}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-orange-300">
                          <h5 className="text-sm font-semibold text-orange-800 mb-2">Auto-Calculated Pricing</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-orange-600 font-medium">Cost Price:</span>
                              <div className="font-semibold text-orange-900">₹{form.watch("costPrice")?.toFixed(2) || "0.00"}</div>
                            </div>
                            <div>
                              <span className="text-orange-600 font-medium">MRP:</span>
                              <div className="font-semibold text-orange-900">₹{form.watch("mrp")?.toFixed(2) || "0.00"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-orange-600 py-6">
                        <PackageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select bulk product and weight to see auto-generated details</p>
                      </div>
                    )}
                  </div>
                </div>

          {/* Pricing Configuration Panel */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <DollarSignIcon className="w-4 h-4" />
              Pricing Configuration
            </h4>
            
            <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-purple-700">Cost Price (₹)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="h-9 bg-white border-purple-300"
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
                              <FormLabel className="text-sm font-medium text-purple-700">Selling Price (₹)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="h-9 bg-white border-purple-300"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-purple-700">MRP (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-9 bg-white border-purple-300"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Profit Analysis */}
                      {form.watch("sellingPrice") > 0 && form.watch("costPrice") > 0 && (
                        <div className="mt-3 p-2 bg-white rounded border border-purple-200">
                          <div className="text-xs text-purple-700">
                            <div className="flex justify-between">
                              <span>Margin:</span>
                              <span className="font-semibold">₹{(form.watch("sellingPrice") - form.watch("costPrice")).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Profit %:</span>
                              <span className="font-semibold">{((form.watch("sellingPrice") - form.watch("costPrice")) / form.watch("costPrice") * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-Generated Product Details */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
              <ClipboardIcon className="w-4 h-4" />
              Auto-Generated Product Details
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="newProductName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-orange-700">Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 bg-gray-100 border-orange-300 font-medium" />
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
                      <FormLabel className="text-sm font-medium text-orange-700">SKU</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 bg-gray-100 border-orange-300 font-mono text-xs" />
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
                      <FormLabel className="text-sm font-medium text-orange-700">Barcode</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 bg-gray-100 border-orange-300 font-mono text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Function Keys Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-400 px-6 py-3 z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[
                    { key: "F1", label: "Help", icon: HelpCircleIcon },
                    { key: "F2", label: "ItemCode" },
                    { key: "F3", label: "ItemName" },
                    { key: "F4", label: "AliasName" },
                    { key: "F5", label: "Pur.Prc" },
                    { key: "F6", label: "Save", icon: SaveIcon },
                    { key: "F7", label: "Clear" },
                    { key: "F8", label: "Key Settings" },
                    { key: "F9", label: "Edit" },
                    { key: "F10", label: "Print", icon: PrinterIcon },
                    { key: "F12", label: "Close", icon: X }
                  ].map((item) => (
                    <Button 
                      key={item.key}
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs bg-gray-100 hover:bg-gray-200"
                    >
                      {item.icon && <item.icon className="w-3 h-3 mr-1" />}
                      {item.key} {item.label}
                    </Button>
                  ))}
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