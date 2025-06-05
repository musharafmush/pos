
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
  PercentIcon
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
    const current = parseFloat(currentPrice);
    const adjustment = parseFloat(adjustmentValue || "0");
    let newPrice = current;

    switch (adjustmentType) {
      case "percentage":
        newPrice = current * (1 + adjustment / 100);
        break;
      case "fixed":
        newPrice = current + adjustment;
        break;
      case "manual":
        return adjustmentValue || currentPrice;
    }

    // Apply rounding
    switch (roundingRule) {
      case "nearest":
        return Math.round(newPrice).toString();
      case "up":
        return Math.ceil(newPrice).toString();
      case "down":
        return Math.floor(newPrice).toString();
      default:
        return newPrice.toFixed(2);
    }
  };

  const handlePreviewPrices = (data: PriceUpdateFormValues) => {
    const updates = filteredProducts.map((product: Product) => {
      const currentPrice = data.priceType === "selling" ? product.price : 
                          data.priceType === "cost" ? product.cost || "0" : 
                          product.mrp || "0";
      
      const newPrice = calculateNewPrice(
        currentPrice.toString(),
        data.adjustmentType,
        data.adjustmentValue || "0",
        data.roundingRule
      );

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentPrice: currentPrice.toString(),
        newPrice,
        selected: selectedProducts.includes(product.id),
      };
    });

    setProductUpdates(updates);
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
      
      const updates = [];
      for (const update of selectedUpdates) {
        const product = products.find((p: Product) => p.id === update.id);
        if (product) {
          const updatedData = { ...product };
          
          if (priceType === "selling") {
            updatedData.price = update.newPrice;
          } else if (priceType === "cost") {
            updatedData.cost = update.newPrice;
          } else if (priceType === "mrp") {
            updatedData.mrp = update.newPrice;
          }
          
          updates.push(apiRequest("PUT", `/api/products/${update.id}`, updatedData));
        }
      }
      
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: `Updated prices for ${productUpdates.filter(p => p.selected).length} products`,
      });
      setProductUpdates([]);
      setSelectedProducts([]);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedCount = productUpdates.filter(p => p.selected).length;
  const totalUpdates = productUpdates.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSignIcon className="h-8 w-8 text-green-600" />
              Update Product Prices
            </h1>
            <p className="text-muted-foreground">
              Bulk update prices for multiple products efficiently
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/products")}
          >
            Back to Products
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                  Price Update Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <div className="space-y-4">
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
                              <SelectItem value="selling">Selling Price</SelectItem>
                              <SelectItem value="cost">Cost Price</SelectItem>
                              <SelectItem value="mrp">MRP</SelectItem>
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
                          <FormLabel>Adjustment Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                              <SelectItem value="manual">Manual Entry</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("adjustmentType") !== "manual" && (
                      <FormField
                        control={form.control}
                        name="adjustmentValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {form.watch("adjustmentType") === "percentage" ? "Percentage" : "Amount"}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                  placeholder="0"
                                  className="pr-8"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  {form.watch("adjustmentType") === "percentage" ? "%" : "₹"}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

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

                    <div className="space-y-2">
                      <div className="relative">
                        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by category" />
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

                    <Button
                      type="button"
                      onClick={form.handleSubmit(handlePreviewPrices)}
                      className="w-full"
                      disabled={!form.watch("adjustmentValue") && form.watch("adjustmentType") !== "manual"}
                    >
                      <RefreshCwIcon className="h-4 w-4 mr-2" />
                      Preview Price Changes
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Product List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-5 w-5 text-orange-600" />
                    Products ({filteredProducts.length})
                  </CardTitle>
                  {totalUpdates > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedCount} of {totalUpdates} selected
                      </Badge>
                      <Button
                        onClick={() => bulkUpdateMutation.mutate()}
                        disabled={selectedCount === 0 || bulkUpdateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <SaveIcon className="h-4 w-4 mr-2" />
                        {bulkUpdateMutation.isPending ? "Updating..." : "Update Prices"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {productUpdates.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCount === totalUpdates && totalUpdates > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Current Price</TableHead>
                          <TableHead>New Price</TableHead>
                          <TableHead>Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productUpdates.map((update) => {
                          const currentPrice = parseFloat(update.currentPrice);
                          const newPrice = parseFloat(update.newPrice);
                          const change = newPrice - currentPrice;
                          const changePercent = currentPrice > 0 ? (change / currentPrice) * 100 : 0;
                          
                          return (
                            <TableRow key={update.id}>
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
                              <TableCell>{formatCurrency(currentPrice)}</TableCell>
                              <TableCell>
                                {form.watch("adjustmentType") === "manual" ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={update.newPrice}
                                    onChange={(e) => handleManualPriceChange(update.id, e.target.value)}
                                    className="w-24"
                                  />
                                ) : (
                                  formatCurrency(newPrice)
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={`flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  <span>{change >= 0 ? '+' : ''}{formatCurrency(change)}</span>
                                  <span className="text-xs">
                                    ({change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSignIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Configure price updates and click "Preview Price Changes" to see the results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
