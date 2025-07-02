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
  Calculator,
  Eye,
  Edit3
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
    if (!data.adjustmentValue && data.adjustmentType !== "manual") {
      toast({
        title: "Validation Error",
        description: "Please enter an adjustment value",
        variant: "destructive",
      });
      return;
    }

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
        selected: false,
      };
    });

    setProductUpdates(updates);
    setSelectedProducts([]);
    setCurrentStep(2);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = productUpdates.map(p => p.id);
      setSelectedProducts(allIds);
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
        title: "Success!",
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
        title: "Error",
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
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-100 p-4 rounded-full">
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bulk Price Update
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Update prices for multiple products quickly and easily
            </p>
          </div>
          
          {/* Step Indicator */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <CheckCircleIcon className="w-5 h-5" /> : "1"}
              </div>
              <span className="font-medium">Configure</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 2 ? 'bg-blue-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <CheckCircleIcon className="w-5 h-5" /> : "2"}
              </div>
              <span className="font-medium">Review</span>
            </div>
            <div className="w-12 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all duration-300 ${currentStep >= 3 ? 'bg-blue-600 w-full' : 'bg-transparent w-0'}`} />
            </div>
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep >= 3 ? <CheckCircleIcon className="w-5 h-5" /> : "3"}
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <TrendingUpIcon className="h-6 w-6 text-blue-600" />
                Price Update Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePreviewPrices)} className="space-y-6">
                  {/* Price Type Selection */}
                  <FormField
                    control={form.control}
                    name="priceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Type to Update</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="selling">Selling Price</SelectItem>
                            <SelectItem value="cost">Cost Price</SelectItem>
                            <SelectItem value="mrp">MRP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Adjustment Type */}
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
                            <SelectItem value="percentage">Percentage Change (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                            <SelectItem value="manual">Manual Entry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Adjustment Value */}
                  {form.watch("adjustmentType") !== "manual" && (
                    <FormField
                      control={form.control}
                      name="adjustmentValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch("adjustmentType") === "percentage" ? "Percentage" : "Amount"} 
                            {form.watch("adjustmentType") === "percentage" && " (use negative for decrease)"}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                type="number" 
                                step="0.01"
                                placeholder={form.watch("adjustmentType") === "percentage" ? "10" : "50"}
                                className="pr-12"
                              />
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 font-semibold text-gray-600">
                                {form.watch("adjustmentType") === "percentage" ? "%" : "₹"}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Category Filter */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filter by Category (Optional)</FormLabel>
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

                  {/* Rounding Rule */}
                  <FormField
                    control={form.control}
                    name="roundingRule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rounding Rule</FormLabel>
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
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review and Select */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Eye className="h-6 w-6 text-blue-600" />
                    Review Price Changes - {getPriceTypeDisplay()}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {selectedCount} of {totalUpdates} selected
                    </span>
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
                  {/* Search and Filter */}
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
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
                        id="select-all"
                        checked={selectedCount === totalUpdates && totalUpdates > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium">
                        Select All
                      </label>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Current Price</TableHead>
                          <TableHead>New Price</TableHead>
                          <TableHead>Change</TableHead>
                          {form.watch("adjustmentType") === "manual" && (
                            <TableHead>Edit Price</TableHead>
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
                            const currentPrice = parseFloat(product.currentPrice);
                            const newPrice = parseFloat(product.newPrice);
                            const change = newPrice - currentPrice;
                            const changePercent = currentPrice > 0 ? (change / currentPrice) * 100 : 0;
                            
                            return (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={product.selected}
                                    onCheckedChange={(checked) => 
                                      handleSelectProduct(product.id, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>{product.sku}</TableCell>
                                <TableCell>₹{product.currentPrice}</TableCell>
                                <TableCell>₹{product.newPrice}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={change >= 0 ? "default" : "destructive"}>
                                      {change >= 0 ? "+" : ""}₹{change.toFixed(2)}
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                      ({changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%)
                                    </span>
                                  </div>
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
                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                    >
                      Back to Configuration
                    </Button>
                    <Button 
                      onClick={() => bulkUpdateMutation.mutate()}
                      disabled={selectedCount === 0 || bulkUpdateMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {bulkUpdateMutation.isPending ? (
                        <>
                          <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <SaveIcon className="mr-2 h-4 w-4" />
                          Update {selectedCount} Products
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <Card className="max-w-2xl mx-auto text-center">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircleIcon className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Price Update Complete!
                </h2>
                <p className="text-lg text-gray-600">
                  Successfully updated prices for {productUpdates.filter(p => p.selected).length} products
                </p>
                <div className="flex justify-center space-x-4 pt-4">
                  <Button onClick={resetForm} variant="outline">
                    Update More Prices
                  </Button>
                  <Button onClick={() => setLocation("/products")}>
                    View Products
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
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}