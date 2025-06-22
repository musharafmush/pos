
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Calculator
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const priceUpdateSchema = z.object({
  adjustmentType: z.enum(["percentage", "fixed", "manual"]),
  adjustmentValue: z.string().optional(),
  category: z.string().optional(),
  priceType: z.enum(["selling", "cost", "mrp"]),
  roundingRule: z.enum(["none", "nearest", "up", "down"]),
});

type PriceUpdateFormValues = z.infer<typeof priceUpdateSchema>;

interface ProductPriceUpdate {
  id: number;
  name: string;
  sku: string;
  currentPrice: string;
  newPrice: string;
  selected: boolean;
}

export default function ProductsUpdatePrice() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productUpdates, setProductUpdates] = useState<ProductPriceUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch products
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

  const form = useForm<PriceUpdateFormValues>({
    resolver: zodResolver(priceUpdateSchema),
    defaultValues: {
      adjustmentType: "percentage",
      adjustmentValue: "",
      category: "",
      priceType: "selling",
      roundingRule: "nearest",
    },
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || filterCategory === "all" || product.categoryId.toString() === filterCategory;
    return matchesSearch && matchesCategory && product.active;
  });

  // Apply price calculations
  const calculateNewPrice = (currentPrice: string, adjustmentType: string, adjustmentValue: string, roundingRule: string) => {
    const current = parseFloat(currentPrice) || 0;
    const adjustment = parseFloat(adjustmentValue || "0") || 0;
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
      default:
        return newPrice.toFixed(2);
    }
  };

  const handlePreviewPrices = (data: PriceUpdateFormValues) => {
    const updates = filteredProducts.map((product: Product) => {
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
        data.roundingRule
      );

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentPrice: parseFloat(currentPrice).toFixed(2),
        newPrice: parseFloat(newPrice).toFixed(2),
        selected: selectedProducts.includes(product.id),
      };
    });

    setProductUpdates(updates);
    setCurrentStep(2);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(productUpdates.map(p => p.id));
      setProductUpdates(updates => updates.map(p => ({ ...p, selected: true })));
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
      updates.map(p => 
        p.id === productId ? { ...p, newPrice } : p
      )
    );
  };

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const selectedUpdates = productUpdates.filter(p => p.selected);
      const priceType = form.watch("priceType");
      
      if (selectedUpdates.length === 0) {
        throw new Error("Please select at least one product to update");
      }
      
      console.log(`Starting bulk price update for ${selectedUpdates.length} products`);
      
      const updates = [];
      for (const update of selectedUpdates) {
        const product = products.find((p: Product) => p.id === update.id);
        if (product) {
          // Validate the new price
          const newPriceValue = parseFloat(update.newPrice);
          if (isNaN(newPriceValue) || newPriceValue < 0) {
            throw new Error(`Invalid price for product ${product.name}: ${update.newPrice}`);
          }
          
          // Create update payload with only necessary fields
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
          
          // Set all three price fields to ensure consistency
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
          
          // Add optional fields if they exist
          if (product.weight) updatePayload.weight = parseFloat(product.weight.toString());
          if (product.weightUnit) updatePayload.weightUnit = product.weightUnit;
          
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
        title: "🎉 Success!",
        description: `Updated prices for ${productUpdates.filter(p => p.selected).length} products`,
      });
      setCurrentStep(3);
    },
    onError: (error: any) => {
      console.error("Price update error:", error);
      let errorMessage = "Failed to update prices";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const selectedCount = productUpdates.filter(p => p.selected).length;
  const totalUpdates = productUpdates.length;

  const resetForm = () => {
    setCurrentStep(1);
    setProductUpdates([]);
    setSelectedProducts([]);
    form.reset();
  };

  // Helper function to get price type display name
  const getPriceTypeDisplay = () => {
    const priceType = form.watch("priceType");
    switch (priceType) {
      case "selling": return "Selling Price";
      case "cost": return "Cost Price";
      case "mrp": return "MRP";
      default: return "Price";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Friendly Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-full">
              <Calculator className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Bulk Price Update
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Update prices for multiple products quickly and easily
            </p>
          </div>
          
          {/* Step Indicator */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <CheckCircleIcon className="w-5 h-5" /> : "1"}
              </div>
              <span className="font-medium">Configure</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 2 ? 'bg-green-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <CheckCircleIcon className="w-5 h-5" /> : "2"}
              </div>
              <span className="font-medium">Review</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 3 ? 'bg-green-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {currentStep >= 3 ? <CheckCircleIcon className="w-5 h-5" /> : "3"}
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-2 border-green-100">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <TrendingUpIcon className="h-6 w-6 text-green-600" />
                  Price Update Configuration
                </CardTitle>
                <p className="text-muted-foreground">
                  Choose how you want to update your product prices
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <div className="space-y-6">
                    {/* Price Type Selection */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="priceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Which price do you want to update?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="selling">💰 Selling Price (Customer Price)</SelectItem>
                                <SelectItem value="cost">📦 Cost Price (Purchase Price)</SelectItem>
                                <SelectItem value="mrp">🏷️ MRP (Maximum Retail Price)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Adjustment Type */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="adjustmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">How do you want to adjust prices?</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">📊 Percentage Increase/Decrease (%)</SelectItem>
                                <SelectItem value="fixed">💵 Fixed Amount Add/Subtract (₹)</SelectItem>
                                <SelectItem value="manual">✏️ Manual Entry (Set Each Price)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Adjustment Value */}
                    {form.watch("adjustmentType") !== "manual" && (
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="adjustmentValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">
                                {form.watch("adjustmentType") === "percentage" ? "Percentage Amount" : "Fixed Amount"}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    placeholder={form.watch("adjustmentType") === "percentage" ? "10" : "50"}
                                    className="h-12 text-lg pr-12"
                                  />
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-lg font-semibold text-gray-600">
                                    {form.watch("adjustmentType") === "percentage" ? "%" : "₹"}
                                  </div>
                                </div>
                              </FormControl>
                              <p className="text-sm text-muted-foreground">
                                {form.watch("adjustmentType") === "percentage" 
                                  ? "Use positive numbers to increase prices, negative to decrease (e.g., 10 for 10% increase, -5 for 5% decrease)"
                                  : "Use positive numbers to add amount, negative to subtract (e.g., 50 to add ₹50, -20 to subtract ₹20)"
                                }
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Rounding Rule */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="roundingRule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Rounding Preference</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="nearest">🎯 Round to Nearest Rupee (₹99.60 → ₹100)</SelectItem>
                                <SelectItem value="up">⬆️ Round Up (₹99.20 → ₹100)</SelectItem>
                                <SelectItem value="down">⬇️ Round Down (₹99.80 → ₹99)</SelectItem>
                                <SelectItem value="none">🔢 No Rounding (Keep Decimals)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Filter Options */}
                    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FilterIcon className="h-5 w-5" />
                        Filter Products (Optional)
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Search Products</label>
                          <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or SKU..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Category</label>
                          <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {categories.map((category: any) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <div className="pt-4">
                      <Button
                        type="button"
                        onClick={form.handleSubmit(handlePreviewPrices)}
                        className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        disabled={!form.watch("adjustmentValue") && form.watch("adjustmentType") !== "manual"}
                      >
                        <RefreshCwIcon className="h-5 w-5 mr-2" />
                        Preview Price Changes ({filteredProducts.length} products)
                      </Button>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Review Changes */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Configuration
              </Button>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {selectedCount} of {totalUpdates} selected
                </Badge>
                <Button
                  onClick={() => bulkUpdateMutation.mutate()}
                  disabled={selectedCount === 0 || bulkUpdateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 h-12 px-6 text-lg"
                >
                  <SaveIcon className="h-5 w-5 mr-2" />
                  {bulkUpdateMutation.isPending ? "Updating..." : `Update ${selectedCount} Products`}
                </Button>
              </div>
            </div>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <PackageIcon className="h-6 w-6 text-green-600" />
                  Review {getPriceTypeDisplay()} Changes
                </CardTitle>
                <p className="text-muted-foreground">
                  Review and select which products to update
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCount === totalUpdates && totalUpdates > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">SKU</TableHead>
                        <TableHead className="font-semibold">Current {getPriceTypeDisplay()}</TableHead>
                        <TableHead className="font-semibold">New {getPriceTypeDisplay()}</TableHead>
                        <TableHead className="font-semibold">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productUpdates.map((update) => {
                        const currentPrice = parseFloat(update.currentPrice);
                        const newPrice = parseFloat(update.newPrice);
                        const change = newPrice - currentPrice;
                        const changePercent = currentPrice > 0 ? (change / currentPrice) * 100 : 0;
                        
                        return (
                          <TableRow key={update.id} className={update.selected ? "bg-green-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={update.selected}
                                onCheckedChange={(checked) => handleSelectProduct(update.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{update.name}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{update.sku}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(currentPrice)}</TableCell>
                            <TableCell>
                              {form.watch("adjustmentType") === "manual" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={update.newPrice}
                                  onChange={(e) => handleManualPriceChange(update.id, e.target.value)}
                                  className="w-28"
                                />
                              ) : (
                                <span className="font-semibold">{formatCurrency(newPrice)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <span>{change >= 0 ? '+' : ''}{formatCurrency(change)}</span>
                                <Badge variant={change >= 0 ? "default" : "destructive"} className="text-xs">
                                  {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6 max-w-lg mx-auto">
            <div className="flex justify-center">
              <div className="bg-green-100 p-6 rounded-full">
                <CheckCircleIcon className="h-16 w-16 text-green-600" />
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                Prices Updated Successfully! 🎉
              </h2>
              <p className="text-lg text-muted-foreground">
                {selectedCount} product prices have been updated
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={resetForm}
                className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Update More Prices
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/products")}
                className="w-full h-12 text-lg"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </div>
        )}

        {/* Info Card */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-900">💡 Quick Tips</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Use percentage updates for market-wide price changes</li>
                      <li>• Fixed amount works great for uniform price adjustments</li>
                      <li>• Manual entry gives you complete control over each price</li>
                      <li>• You can preview changes before applying them</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
