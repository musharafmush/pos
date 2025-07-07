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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUpIcon,
  SaveIcon,
  RefreshCwIcon,
  SearchIcon,
  FilterIcon,
  DollarSignIcon,
  PackageIcon,
  PercentIcon,
  ArrowLeftIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Calculator,
  Eye,
  Edit3,
  Download,
  Upload,
  Settings,
  Zap,
  Target,
  TrendingDown,
  AlertTriangle,
  FileText,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const professionalPriceUpdateSchema = z.object({
  adjustmentType: z.enum(["percentage", "fixed", "manual", "margin", "competition"]),
  adjustmentValue: z.string().optional(),
  category: z.string().optional(),
  priceType: z.enum(["selling", "cost", "mrp"]),
  roundingRule: z.enum(["none", "nearest", "up", "down", "custom"]),
  customRounding: z.string().optional(),
  applyToAllVariants: z.boolean().default(false),
  scheduleUpdate: z.boolean().default(false),
  scheduledDate: z.string().optional(),
  notifyStakeholders: z.boolean().default(false),
  reason: z.string().optional(),
  validationRules: z.object({
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    maxIncrease: z.string().optional(),
    maxDecrease: z.string().optional(),
  }).optional(),
});

type ProfessionalPriceUpdateFormValues = z.infer<typeof professionalPriceUpdateSchema>;

interface ProfessionalProductPriceUpdate {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentPrice: string;
  newPrice: string;
  margin: string;
  changeAmount: string;
  changePercent: string;
  selected: boolean;
  warnings: string[];
  stockQuantity: number;
  lastSoldDate?: string;
}

interface PriceRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  value: string;
  enabled: boolean;
}

export default function UpdatePriceProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productUpdates, setProductUpdates] = useState<ProfessionalProductPriceUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentStep, setCurrentStep] = useState(1);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Fetch products with enhanced data
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const form = useForm<ProfessionalPriceUpdateFormValues>({
    resolver: zodResolver(professionalPriceUpdateSchema),
    defaultValues: {
      adjustmentType: "percentage",
      adjustmentValue: "",
      category: "",
      priceType: "selling",
      roundingRule: "nearest",
      customRounding: "",
      applyToAllVariants: false,
      scheduleUpdate: false,
      scheduledDate: "",
      notifyStakeholders: false,
      reason: "",
      validationRules: {
        minPrice: "",
        maxPrice: "",
        maxIncrease: "",
        maxDecrease: "",
      },
    },
  });

  // Filter products with enhanced filtering
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || filterCategory === "all" || product.categoryId.toString() === filterCategory;
    return matchesSearch && matchesCategory && product.active;
  });

  // Enhanced price calculation with validation
  const calculateNewPrice = (
    currentPrice: string, 
    adjustmentType: string, 
    adjustmentValue: string, 
    roundingRule: string,
    customRounding?: string,
    cost?: string
  ) => {
    const current = parseFloat(currentPrice) || 0;
    const adjustment = parseFloat(adjustmentValue || "0") || 0;
    const productCost = parseFloat(cost || "0") || 0;
    let newPrice = current;

    if (isNaN(current)) {
      return "0.00";
    }

    switch (adjustmentType) {
      case "percentage":
        newPrice = current * (1 + adjustment / 100);
        break;
      case "fixed":
        newPrice = current + adjustment;
        break;
      case "margin":
        // Calculate price based on desired margin percentage over cost
        if (productCost > 0) {
          newPrice = productCost * (1 + adjustment / 100);
        } else {
          newPrice = current * (1 + adjustment / 100);
        }
        break;
      case "competition":
        // Set competitive pricing (adjustment as target price)
        newPrice = adjustment;
        break;
      case "manual":
        const manualPrice = parseFloat(adjustmentValue || "0");
        return isNaN(manualPrice) ? currentPrice : manualPrice.toFixed(2);
    }

    // Ensure newPrice is not negative
    newPrice = Math.max(0, newPrice);

    // Apply rounding
    switch (roundingRule) {
      case "nearest":
        return Math.round(newPrice).toFixed(2);
      case "up":
        return Math.ceil(newPrice).toFixed(2);
      case "down":
        return Math.floor(newPrice).toFixed(2);
      case "custom":
        const customValue = parseFloat(customRounding || "1");
        return (Math.round(newPrice / customValue) * customValue).toFixed(2);
      default:
        return newPrice.toFixed(2);
    }
  };

  // Validate price changes
  const validatePriceChange = (
    currentPrice: string,
    newPrice: string,
    validationRules?: any
  ): string[] => {
    const warnings: string[] = [];
    const current = parseFloat(currentPrice);
    const newVal = parseFloat(newPrice);
    const change = newVal - current;
    const changePercent = current > 0 ? (change / current) * 100 : 0;

    if (validationRules) {
      if (validationRules.minPrice && newVal < parseFloat(validationRules.minPrice)) {
        warnings.push(`Price below minimum threshold of ₹${validationRules.minPrice}`);
      }
      if (validationRules.maxPrice && newVal > parseFloat(validationRules.maxPrice)) {
        warnings.push(`Price above maximum threshold of ₹${validationRules.maxPrice}`);
      }
      if (validationRules.maxIncrease && changePercent > parseFloat(validationRules.maxIncrease)) {
        warnings.push(`Increase exceeds ${validationRules.maxIncrease}% limit`);
      }
      if (validationRules.maxDecrease && changePercent < -parseFloat(validationRules.maxDecrease)) {
        warnings.push(`Decrease exceeds ${validationRules.maxDecrease}% limit`);
      }
    }

    // Standard warnings
    if (changePercent > 50) {
      warnings.push("Large price increase (>50%)");
    }
    if (changePercent < -30) {
      warnings.push("Large price decrease (>30%)");
    }
    if (newVal === 0) {
      warnings.push("Zero price detected");
    }

    return warnings;
  };

  const handlePreviewPrices = (data: ProfessionalPriceUpdateFormValues) => {
    if (!data.adjustmentValue && data.adjustmentType !== "manual") {
      toast({
        title: "Validation Error",
        description: "Please enter an adjustment value",
        variant: "destructive",
      });
      return;
    }

    const updates = filteredProducts.map((product: Product) => {
      // Get category name
      const category = categories.find((cat: any) => cat.id === product.categoryId);
      
      // Safely extract current price based on type
      let currentPrice = "0";
      if (data.priceType === "selling") {
        currentPrice = product.price?.toString() || "0";
      } else if (data.priceType === "cost") {
        currentPrice = product.cost?.toString() || "0";
      } else if (data.priceType === "mrp") {
        currentPrice = product.mrp?.toString() || "0";
      }
      
      const newPrice = calculateNewPrice(
        currentPrice,
        data.adjustmentType,
        data.adjustmentValue || "0",
        data.roundingRule,
        data.customRounding,
        product.cost?.toString()
      );

      const currentVal = parseFloat(currentPrice);
      const newVal = parseFloat(newPrice);
      const changeAmount = newVal - currentVal;
      const changePercent = currentVal > 0 ? (changeAmount / currentVal) * 100 : 0;
      
      // Calculate margin if cost is available
      const cost = parseFloat(product.cost?.toString() || "0");
      const margin = cost > 0 ? ((newVal - cost) / newVal) * 100 : 0;

      // Validate the price change
      const warnings = validatePriceChange(currentPrice, newPrice, data.validationRules);

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: category?.name || "Unknown",
        currentPrice: currentVal.toFixed(2),
        newPrice: newVal.toFixed(2),
        margin: margin.toFixed(1),
        changeAmount: changeAmount.toFixed(2),
        changePercent: changePercent.toFixed(1),
        selected: false,
        warnings,
        stockQuantity: product.stockQuantity || 0,
      };
    });

    setProductUpdates(updates);
    setSelectedProducts([]);
    setCurrentStep(2);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const validProducts = productUpdates.filter(p => p.warnings.length === 0);
      const allIds = validProducts.map(p => p.id);
      setSelectedProducts(allIds);
      setProductUpdates(updates => updates.map(p => ({ 
        ...p, 
        selected: p.warnings.length === 0 ? true : p.selected 
      })));
    } else {
      setSelectedProducts([]);
      setProductUpdates(updates => updates.map(p => ({ ...p, selected: false })));
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
    
    setProductUpdates(updates => 
      updates.map(p => 
        p.id === productId ? { ...p, selected: checked } : p
      )
    );
  };

  const handleManualPriceChange = (productId: number, newPrice: string) => {
    setProductUpdates(updates => 
      updates.map(p => {
        if (p.id === productId) {
          const currentVal = parseFloat(p.currentPrice);
          const newVal = parseFloat(newPrice) || 0;
          const changeAmount = newVal - currentVal;
          const changePercent = currentVal > 0 ? (changeAmount / currentVal) * 100 : 0;
          
          // Recalculate warnings
          const warnings = validatePriceChange(p.currentPrice, newPrice, form.getValues("validationRules"));
          
          return { 
            ...p, 
            newPrice: newVal.toFixed(2),
            changeAmount: changeAmount.toFixed(2),
            changePercent: changePercent.toFixed(1),
            warnings
          };
        }
        return p;
      })
    );
  };

  // Enhanced bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const selectedUpdates = productUpdates.filter(p => p.selected);
      const priceType = form.watch("priceType");
      const formData = form.getValues();
      
      if (selectedUpdates.length === 0) {
        throw new Error("Please select at least one product to update");
      }
      
      // Check for products with warnings
      const productsWithWarnings = selectedUpdates.filter(p => p.warnings.length > 0);
      if (productsWithWarnings.length > 0) {
        const proceed = window.confirm(
          `${productsWithWarnings.length} products have warnings. Continue anyway?`
        );
        if (!proceed) {
          throw new Error("Update cancelled due to warnings");
        }
      }
      
      console.log(`Starting professional bulk price update for ${selectedUpdates.length} products`);
      
      const updates = [];
      for (const update of selectedUpdates) {
        const product = products.find((p: Product) => p.id === update.id);
        if (product) {
          // Validate the new price
          const newPriceValue = parseFloat(update.newPrice);
          if (isNaN(newPriceValue) || newPriceValue < 0) {
            throw new Error(`Invalid price for product ${product.name}: ${update.newPrice}`);
          }
          
          // Create comprehensive update payload
          const updatePayload: any = {
            name: product.name,
            sku: product.sku,
            description: product.description || "",
            categoryId: product.categoryId,
            stockQuantity: product.stockQuantity || 0,
            alertThreshold: product.alertThreshold || 10,
            barcode: product.barcode || "",
            active: product.active !== false
          };
          
          // Set all price fields
          updatePayload.price = parseFloat(product.price?.toString() || "0");
          updatePayload.cost = parseFloat(product.cost?.toString() || "0");
          updatePayload.mrp = parseFloat(product.mrp?.toString() || "0");
          
          // Update the specific price type
          if (priceType === "selling") {
            updatePayload.price = newPriceValue;
          } else if (priceType === "cost") {
            updatePayload.cost = newPriceValue;
          } else if (priceType === "mrp") {
            updatePayload.mrp = newPriceValue;
          }
          
          // Add optional fields
          if (product.weight) updatePayload.weight = parseFloat(product.weight.toString());
          if (product.weightUnit) updatePayload.weightUnit = product.weightUnit;
          
          // Add professional metadata
          updatePayload.lastPriceUpdate = new Date().toISOString();
          updatePayload.priceUpdateReason = formData.reason || "Bulk price update";
          
          console.log(`Updating product ${product.id} (${product.name}) - ${priceType}: ${newPriceValue}`);
          updates.push(apiRequest("PUT", `/api/products/${update.id}`, updatePayload));
        }
      }
      
      const results = await Promise.all(updates);
      console.log(`Successfully updated ${results.length} products`);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Professional Price Update Complete",
        description: `Successfully updated prices for ${productUpdates.filter(p => p.selected).length} products`,
      });
      setCurrentStep(3);
    },
    onError: (error: any) => {
      console.error("Professional price update error:", error);
      let errorMessage = "Failed to update prices";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const selectedCount = productUpdates.filter(p => p.selected).length;
  const totalUpdates = productUpdates.length;
  const warningCount = productUpdates.filter(p => p.warnings.length > 0).length;

  const resetForm = () => {
    setCurrentStep(1);
    setProductUpdates([]);
    setSelectedProducts([]);
    form.reset();
  };

  // Statistics calculations
  const totalValueChange = productUpdates
    .filter(p => p.selected)
    .reduce((sum, p) => sum + parseFloat(p.changeAmount) * p.stockQuantity, 0);

  const averageChange = selectedCount > 0 
    ? productUpdates.filter(p => p.selected).reduce((sum, p) => sum + parseFloat(p.changePercent), 0) / selectedCount 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-full">
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Professional Bulk Price Update
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Advanced pricing management with validation, scheduling, and analytics
            </p>
          </div>
          
          {/* Enhanced Step Indicator */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <CheckCircleIcon className="w-6 h-6" /> : <Settings className="w-5 h-5" />}
              </div>
              <span className="font-medium">Configure</span>
            </div>
            <div className="w-16 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 2 ? 'bg-blue-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <CheckCircleIcon className="w-6 h-6" /> : <Eye className="w-5 h-5" />}
              </div>
              <span className="font-medium">Analyze</span>
            </div>
            <div className="w-16 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 3 ? 'bg-blue-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep >= 3 ? <CheckCircleIcon className="w-6 h-6" /> : <Zap className="w-5 h-5" />}
              </div>
              <span className="font-medium">Execute</span>
            </div>
          </div>
        </div>

        {/* Step 1: Professional Configuration */}
        {currentStep === 1 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-blue-600" />
                Professional Price Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePreviewPrices)} className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
                      <TabsTrigger value="validation">Validation Rules</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="priceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="selling">💰 Selling Price</SelectItem>
                                  <SelectItem value="cost">📦 Cost Price</SelectItem>
                                  <SelectItem value="mrp">🏷️ MRP</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="adjustmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adjustment Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">📊 Percentage Change</SelectItem>
                                  <SelectItem value="fixed">💵 Fixed Amount</SelectItem>
                                  <SelectItem value="margin">🎯 Margin-Based</SelectItem>
                                  <SelectItem value="competition">🏆 Competitive Pricing</SelectItem>
                                  <SelectItem value="manual">✏️ Manual Entry</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch("adjustmentType") !== "manual" && (
                        <FormField
                          control={form.control}
                          name="adjustmentValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {form.watch("adjustmentType") === "percentage" && "Percentage Change"}
                                {form.watch("adjustmentType") === "fixed" && "Amount to Add/Subtract"}
                                {form.watch("adjustmentType") === "margin" && "Target Margin Percentage"}
                                {form.watch("adjustmentType") === "competition" && "Target Price"}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    placeholder={
                                      form.watch("adjustmentType") === "percentage" ? "10" :
                                      form.watch("adjustmentType") === "margin" ? "30" :
                                      form.watch("adjustmentType") === "competition" ? "100" : "50"
                                    }
                                    className="pr-12"
                                  />
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 font-semibold text-gray-600">
                                    {form.watch("adjustmentType") === "percentage" || form.watch("adjustmentType") === "margin" ? "%" : "₹"}
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {form.watch("adjustmentType") === "percentage" && "Use negative values for price decreases"}
                                {form.watch("adjustmentType") === "margin" && "Percentage markup over cost price"}
                                {form.watch("adjustmentType") === "competition" && "Set competitive market price"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Filter</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                setFilterCategory(value);
                              }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {categories.map((category: any) => (
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
                          control={form.control}
                          name="roundingRule"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rounding Strategy</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Rounding</SelectItem>
                                  <SelectItem value="nearest">Round to Nearest</SelectItem>
                                  <SelectItem value="up">Round Up</SelectItem>
                                  <SelectItem value="down">Round Down</SelectItem>
                                  <SelectItem value="custom">Custom Rounding</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch("roundingRule") === "custom" && (
                        <FormField
                          control={form.control}
                          name="customRounding"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom Rounding Value</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                  placeholder="5"
                                />
                              </FormControl>
                              <FormDescription>
                                Round to nearest multiple of this value (e.g., 5 for ₹5, ₹10, ₹15...)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="applyToAllVariants"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Apply to All Product Variants</FormLabel>
                                  <FormDescription>
                                    Update all variants of selected products
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="scheduleUpdate"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Schedule Price Update</FormLabel>
                                  <FormDescription>
                                    Apply changes at a specific date and time
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("scheduleUpdate") && (
                          <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Scheduled Date & Time</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="datetime-local"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="notifyStakeholders"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Notify Stakeholders</FormLabel>
                                  <FormDescription>
                                    Send notifications about price changes
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Update Reason</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Market adjustment, cost increase, promotional pricing..."
                                />
                              </FormControl>
                              <FormDescription>
                                Document the reason for this price update
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="validation" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="validationRules.minPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Price Threshold</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                  placeholder="10.00"
                                />
                              </FormControl>
                              <FormDescription>
                                Warn if price falls below this value
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="validationRules.maxPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Price Threshold</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                  placeholder="1000.00"
                                />
                              </FormControl>
                              <FormDescription>
                                Warn if price exceeds this value
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="validationRules.maxIncrease"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Increase (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.1"
                                  placeholder="50"
                                />
                              </FormControl>
                              <FormDescription>
                                Warn if price increase exceeds this percentage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="validationRules.maxDecrease"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Decrease (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.1"
                                  placeholder="30"
                                />
                              </FormControl>
                              <FormDescription>
                                Warn if price decrease exceeds this percentage
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8">
                      <Eye className="mr-2 h-4 w-4" />
                      Analyze & Preview
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Professional Analysis & Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Products</p>
                      <p className="text-2xl font-bold">{totalUpdates}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Selected</p>
                      <p className="text-2xl font-bold">{selectedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Warnings</p>
                      <p className="text-2xl font-bold">{warningCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Avg Change</p>
                      <p className="text-2xl font-bold">{averageChange.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Eye className="h-6 w-6 text-blue-600" />
                    Professional Price Analysis
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-sm">
                      Total Value Impact: ₹{totalValueChange.toFixed(2)}
                    </Badge>
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeftIcon className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Enhanced Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all-valid"
                          checked={selectedCount === productUpdates.filter(p => p.warnings.length === 0).length && productUpdates.filter(p => p.warnings.length === 0).length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                        <label htmlFor="select-all-valid" className="text-sm font-medium">
                          Select All Valid
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Report
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced Products Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>New Price</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Margin</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                          {form.watch("adjustmentType") === "manual" && (
                            <TableHead>Edit</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productUpdates
                          .filter(product => 
                            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.sku.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((product) => {
                            const changeAmount = parseFloat(product.changeAmount);
                            const changePercent = parseFloat(product.changePercent);
                            const hasWarnings = product.warnings.length > 0;
                            
                            return (
                              <TableRow key={product.id} className={hasWarnings ? "bg-yellow-50" : ""}>
                                <TableCell>
                                  <Checkbox
                                    checked={product.selected}
                                    onCheckedChange={(checked) => 
                                      handleSelectProduct(product.id, checked as boolean)
                                    }
                                    disabled={hasWarnings}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-gray-500">{product.sku}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {product.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>₹{product.currentPrice}</TableCell>
                                <TableCell className="font-medium">₹{product.newPrice}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={changeAmount >= 0 ? "default" : "destructive"}>
                                      {changeAmount >= 0 ? "+" : ""}₹{product.changeAmount}
                                    </Badge>
                                    <span className={`text-sm ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({changePercent >= 0 ? "+" : ""}{product.changePercent}%)
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium">{product.margin}%</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"}>
                                    {product.stockQuantity}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {hasWarnings ? (
                                    <div className="space-y-1">
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Warning
                                      </Badge>
                                      {product.warnings.map((warning, idx) => (
                                        <p key={idx} className="text-xs text-red-600">{warning}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                                      Valid
                                    </Badge>
                                  )}
                                </TableCell>
                                {form.watch("adjustmentType") === "manual" && (
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={product.newPrice}
                                      onChange={(e) => handleManualPriceChange(product.id, e.target.value)}
                                      className="w-24"
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {selectedCount} of {totalUpdates} products selected
                      {warningCount > 0 && (
                        <span className="text-yellow-600 ml-2">
                          ({warningCount} with warnings)
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(1)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        onClick={() => bulkUpdateMutation.mutate()}
                        disabled={selectedCount === 0 || bulkUpdateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {bulkUpdateMutation.isPending ? (
                          <>
                            <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" />
                            Execute Update ({selectedCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Professional Success */}
        {currentStep === 3 && (
          <Card className="max-w-3xl mx-auto text-center">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircleIcon className="h-16 w-16 text-green-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Professional Price Update Complete!
                  </h2>
                  <p className="text-lg text-gray-600 mt-2">
                    Successfully updated prices for {productUpdates.filter(p => p.selected).length} products
                  </p>
                  
                  {/* Success Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600">Products Updated</p>
                      <p className="text-2xl font-bold text-blue-900">{selectedCount}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600">Total Value Impact</p>
                      <p className="text-2xl font-bold text-green-900">₹{totalValueChange.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600">Average Change</p>
                      <p className="text-2xl font-bold text-purple-900">{averageChange.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4 pt-6">
                  <Button onClick={resetForm} variant="outline">
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    Update More Prices
                  </Button>
                  <Button onClick={() => setLocation("/products")}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Products
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-600">Loading professional pricing data...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}