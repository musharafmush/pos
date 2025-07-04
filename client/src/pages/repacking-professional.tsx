import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";
import {
  PackageIcon,
  BarChart3Icon,
  DollarSignIcon,
  ClipboardIcon,
  SaveIcon,
  HelpCircleIcon,
  PrinterIcon,
  X,
  Search,
  Mic,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

// Types
type Product = {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  mrp?: number;
  weight?: number;
  weightUnit?: string;
  stockQuantity: number;
  active: boolean;
};

const repackingFormSchema = z.object({
  issueDate: z.string().min(1, "Issue date is required"),
  issueNo: z.string().optional(),
  repackNo: z.string().optional(),
  bulkProductId: z.number().min(1, "Please select a bulk product"),
  repackQuantity: z.number().min(1, "Number of packs must be at least 1"),
  unitWeight: z.number().min(0.01, "Weight per pack must be at least 0.01"),
  weightUnit: z.enum(["g", "kg"]),
  costPrice: z.number().min(0, "Cost price must be non-negative"),
  sellingPrice: z.number().min(0, "Selling price must be non-negative"),
  mrp: z.number().min(0, "MRP must be non-negative"),
  newProductName: z.string().min(1, "Product name is required"),
  newProductSku: z.string().min(1, "SKU is required"),
  newProductBarcode: z.string().optional(),
});

type RepackingFormValues = z.infer<typeof repackingFormSchema>;

export default function RepackingProfessional() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse integration data from URL parameters
  const [integrationData, setIntegrationData] = useState<any>(null);
  
  // Bulk product search functionality
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.product-search-container')) {
        setIsProductSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setIntegrationData(parsedData);
      } catch (error) {
        console.error('Failed to parse integration data:', error);
      }
    }
  }, []);

  // Generate date options for the last 30 days
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      repackQuantity: 1,
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

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  // Filter bulk products with search functionality
  const bulkProducts = products.filter((product: Product) => 
    product.stockQuantity > 0 && 
    product.active
  );

  // Advanced product search with multiple criteria
  const filteredBulkProducts = bulkProducts.filter((product: Product) => {
    if (!productSearchTerm) return true;
    
    const searchLower = productSearchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchLower)) ||
      product.price.toString().includes(searchLower) ||
      product.stockQuantity.toString().includes(searchLower)
    );
  });

  // Voice search functionality
  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Voice Search Active",
          description: "Speak the product name you're looking for...",
        });
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setProductSearchTerm(transcript);
        setIsListening(false);
        
        toast({
          title: "Voice Search Complete",
          description: `Searching for: ${transcript}`,
        });
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice Search Error",
          description: "Please try again or use text search",
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "Voice Search Unavailable",
        description: "Please use text search instead",
        variant: "destructive",
      });
    }
  };

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
        
        // Generate child SKU based on parent SKU + repack suffix (consistent format)
        const childSku = `${selectedBulkProduct.sku}_${unitWeight}${weightUnit}`;
        
        // Generate child barcode based on parent barcode + weight info (consistent format)
        const childBarcode = selectedBulkProduct.barcode ? 
          `${selectedBulkProduct.barcode}_${unitWeight}${weightUnit}` : 
          `${selectedBulkProduct.sku}_${unitWeight}${weightUnit}`;
        
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

  // Calculate values for conversion summary
  const selectedProduct = bulkProducts.find((p: Product) => p.id === form.watch("bulkProductId"));
  const repackQuantity = form.watch("repackQuantity") || 0;
  const unitWeight = form.watch("unitWeight") || 0;
  const weightUnit = form.watch("weightUnit");

  // Calculate total repack weight in grams
  const totalRepackWeightInGrams = weightUnit === "kg" ? unitWeight * repackQuantity * 1000 : unitWeight * repackQuantity;
  
  // Calculate bulk weight in grams
  const bulkWeight = selectedProduct ? parseFloat(selectedProduct.weight || "1") : 1;
  const bulkWeightUnit = selectedProduct?.weightUnit || "kg";
  const bulkWeightInGrams = bulkWeightUnit === "kg" ? bulkWeight * 1000 : bulkWeight;
  
  // Calculate how many bulk units needed
  const bulkUnitsNeeded = Math.ceil(totalRepackWeightInGrams / bulkWeightInGrams);
  const currentStock = selectedProduct?.stockQuantity || 0;

  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      const response = await fetch("/api/repacking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          totalRepackWeight: totalRepackWeightInGrams,
          bulkUnitsNeeded,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Repack Created", description: "Product repack has been created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setLocation("/repacking-dashboard-professional");
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
                  Integration Active: {integrationData.bulkProduct?.name}
                </Badge>
              )}
            </div>
            <div className="text-xs opacity-90">User: AYSANAN | System Admin | Ver. 4.9.27.29.60 | Customer Id: 1596131254</div>
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
                        <Input {...field} className="h-9 bg-white border-gray-300" />
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
                        <Input {...field} className="h-9 bg-white border-gray-300" />
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
                      <div className="relative product-search-container">
                        {/* Combined Search and Selection Interface */}
                        <div className="flex gap-2 mb-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search by name, SKU, barcode, or price..."
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              className="pl-10 h-9 bg-white border-gray-300"
                              onFocus={() => setIsProductSearchOpen(true)}
                            />
                            {productSearchTerm && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProductSearchTerm("");
                                  setIsProductSearchOpen(false);
                                }}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={startVoiceSearch}
                            disabled={isListening}
                            className={`h-9 px-3 ${isListening ? 'bg-red-100 border-red-300 text-red-600' : 'hover:bg-blue-50'}`}
                          >
                            <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
                          </Button>
                        </div>

                        {/* Product Results Dropdown */}
                        {(isProductSearchOpen || productSearchTerm) && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                            {filteredBulkProducts.length > 0 ? (
                              <>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b sticky top-0">
                                  <div className="flex items-center gap-2">
                                    <Warehouse className="h-3 w-3" />
                                    Found {filteredBulkProducts.length} bulk products
                                    {productSearchTerm && (
                                      <span className="text-blue-600">
                                        matching "{productSearchTerm}"
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {filteredBulkProducts.map((product: Product) => (
                                  <div
                                    key={product.id}
                                    className="px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => {
                                      field.onChange(product.id);
                                      setIsProductSearchOpen(false);
                                      setProductSearchTerm("");
                                      toast({
                                        title: "Product Selected",
                                        description: `Selected ${product.name}`,
                                      });
                                    }}
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center justify-between w-full">
                                        <div className="font-medium text-gray-900">
                                          {product.name}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            Stock: {product.stockQuantity}
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            ₹{product.price}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                        <span>SKU: {product.sku}</span>
                                        <span>Weight: {product.weight || 1}{product.weightUnit || 'kg'}</span>
                                        {product.barcode && <span>Barcode: {product.barcode}</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : productSearchTerm ? (
                              <div className="px-3 py-8 text-center">
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                  <Search className="h-8 w-8 text-gray-300" />
                                  <div className="text-sm font-medium">No products found</div>
                                  <div className="text-xs">
                                    Try searching with different keywords or clear the search
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setProductSearchTerm("")}
                                    className="mt-2"
                                  >
                                    Clear Search
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-6 text-center">
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                  <ShoppingCart className="h-8 w-8 text-gray-300" />
                                  <div className="text-sm font-medium">Click above to search products</div>
                                  <div className="text-xs">
                                    Type product name, SKU, or use voice search
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Selected Product Display */}
                        {field.value && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            {(() => {
                              const selected = bulkProducts.find(p => p.id === field.value);
                              return selected ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-green-800">{selected.name}</div>
                                    <div className="text-xs text-green-600">
                                      SKU: {selected.sku} • Stock: {selected.stockQuantity} • ₹{selected.price}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => field.onChange(0)}
                                    className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Item Preparations Status */}
            <div className="bg-gray-100 border border-gray-300 p-4 mb-6 rounded">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Item Preparations Status</h3>
              <p className="text-xs text-gray-600">Repackage - Bought in bulk, repackaged into smaller units</p>
            </div>

            {/* Main Configuration Panels */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Left Panel - Repack Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <PackageIcon className="w-4 h-4" />
                  Repack Configuration
                </h4>
                
                <div className="space-y-4">
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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              className="h-10 text-center font-semibold text-lg bg-white border-2 border-blue-300"
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
                      { label: "Total Repack Weight", value: `${(totalRepackWeightInGrams / 1000).toFixed(2)} kg` },
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
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="h-9 bg-white border-purple-300 font-semibold"
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
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="h-9 bg-white border-purple-300 font-semibold"
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
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-9 bg-white border-purple-300 font-semibold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Live Price Display */}
              <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded">
                <h5 className="text-sm font-semibold text-purple-800 mb-2">Live Price Configuration</h5>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-purple-600 font-medium">Cost Price</div>
                    <div className="text-lg font-bold text-purple-900">₹{form.watch("costPrice")?.toFixed(2) || "0.00"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-600 font-medium">Selling Price</div>
                    <div className="text-lg font-bold text-purple-900">₹{form.watch("sellingPrice")?.toFixed(2) || "0.00"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-600 font-medium">MRP</div>
                    <div className="text-lg font-bold text-purple-900">₹{form.watch("mrp")?.toFixed(2) || "0.00"}</div>
                  </div>
                </div>
                
                {/* Profit Margin Display */}
                {form.watch("costPrice") && form.watch("sellingPrice") && (
                  <div className="mt-3 pt-3 border-t border-purple-300">
                    <div className="text-center">
                      <div className="text-purple-600 font-medium text-xs">Profit Margin</div>
                      <div className="text-lg font-bold text-green-700">
                        {((form.watch("sellingPrice") - form.watch("costPrice")) / form.watch("costPrice") * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
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