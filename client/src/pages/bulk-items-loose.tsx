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
import { 
  ScaleIcon,
  ShoppingCartIcon,
  PackageIcon,
  CalculatorIcon,
  WeightIcon,
  PlusIcon,
  MinusIcon,
  Trash2Icon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const bulkSaleSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  weightInKg: z.number().min(0.001, "Weight must be at least 1 gram"),
  pricePerKg: z.number().min(0, "Price per kg must be non-negative"),
  customerId: z.number().optional(),
});

type BulkSaleFormValues = z.infer<typeof bulkSaleSchema>;

interface BulkSaleItem {
  id: string;
  product: Product;
  weightInKg: number;
  pricePerKg: number;
  totalAmount: number;
}

export default function BulkItemsLoose() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [bulkSaleItems, setBulkSaleItems] = useState<BulkSaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch products for bulk sale (only bulk items with weight >= 1kg)
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter bulk products suitable for loose selling
  const bulkProducts = products.filter((product: Product) => {
    const weight = parseFloat(product.weight || "0");
    const unit = product.weightUnit?.toLowerCase() || "kg";
    const weightInKg = unit === "kg" ? weight : weight / 1000;
    
    const isBulkByName = product.name.toLowerCase().includes('bulk') || 
                        product.name.toLowerCase().includes('loose') ||
                        product.name.toLowerCase().includes('bag') ||
                        product.name.toLowerCase().includes('sack') ||
                        product.name.toLowerCase().includes('daal') ||
                        product.name.toLowerCase().includes('rice') ||
                        product.name.toLowerCase().includes('wheat') ||
                        product.name.toLowerCase().includes('sugar');
    
    const isBulkByWeight = weightInKg >= 1; // 1kg or more
    const hasStock = product.stockQuantity > 0 && product.active;

    return (isBulkByName || isBulkByWeight) && hasStock;
  }).sort((a: Product, b: Product) => a.name.localeCompare(b.name));

  const form = useForm<BulkSaleFormValues>({
    resolver: zodResolver(bulkSaleSchema),
    mode: "onChange",
    defaultValues: {
      productId: 0,
      weightInKg: 1.0,
      pricePerKg: 0,
      customerId: undefined,
    },
  });

  const productId = form.watch("productId");
  const weightInKg = form.watch("weightInKg");

  // Auto-select first bulk product and set price
  useEffect(() => {
    if (bulkProducts.length > 0 && form.getValues("productId") === 0) {
      const firstProduct = bulkProducts[0];
      form.setValue("productId", firstProduct.id);
      setSelectedProduct(firstProduct);
      
      // Calculate price per kg from the product cost
      const productCost = parseFloat(firstProduct.cost || "0");
      const productWeight = parseFloat(firstProduct.weight || "1");
      const productWeightUnit = firstProduct.weightUnit?.toLowerCase() || "kg";
      const productWeightInKg = productWeightUnit === "kg" ? productWeight : productWeight / 1000;
      
      const pricePerKg = productWeightInKg > 0 ? (productCost / productWeightInKg) * 1.3 : 0; // 30% markup
      form.setValue("pricePerKg", Math.round(pricePerKg * 100) / 100);
    }
  }, [bulkProducts, form]);

  // Update selected product and price when product changes
  useEffect(() => {
    if (productId && products.length > 0) {
      const product = products.find((p: Product) => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        
        // Calculate price per kg from the product cost
        const productCost = parseFloat(product.cost || "0");
        const productWeight = parseFloat(product.weight || "1");
        const productWeightUnit = product.weightUnit?.toLowerCase() || "kg";
        const productWeightInKg = productWeightUnit === "kg" ? productWeight : productWeight / 1000;
        
        const pricePerKg = productWeightInKg > 0 ? (productCost / productWeightInKg) * 1.3 : 0; // 30% markup
        form.setValue("pricePerKg", Math.round(pricePerKg * 100) / 100);
      }
    }
  }, [productId, products, form]);

  // Add item to bulk sale
  const addToBulkSale = (data: BulkSaleFormValues) => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    if (data.weightInKg <= 0) {
      toast({
        title: "Error",
        description: "Weight must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const newItem: BulkSaleItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      weightInKg: data.weightInKg,
      pricePerKg: data.pricePerKg,
      totalAmount: data.weightInKg * data.pricePerKg,
    };

    setBulkSaleItems(prev => [...prev, newItem]);
    
    // Reset weight for next item
    form.setValue("weightInKg", 1.0);
    
    toast({
      title: "Item Added",
      description: `${data.weightInKg}kg of ${selectedProduct.name} added to sale`,
    });
  };

  // Remove item from bulk sale
  const removeFromBulkSale = (itemId: string) => {
    setBulkSaleItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Update item weight
  const updateItemWeight = (itemId: string, newWeight: number) => {
    setBulkSaleItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, weightInKg: newWeight, totalAmount: newWeight * item.pricePerKg }
        : item
    ));
  };

  // Calculate totals
  const totalWeight = bulkSaleItems.reduce((sum, item) => sum + item.weightInKg, 0);
  const totalAmount = bulkSaleItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // Process bulk sale
  const processBulkSale = useMutation({
    mutationFn: async () => {
      if (bulkSaleItems.length === 0) {
        throw new Error("No items in bulk sale");
      }

      // Create sale record
      const saleData = {
        customerId: form.getValues("customerId") || null,
        items: bulkSaleItems.map(item => ({
          productId: item.product.id,
          quantity: item.weightInKg,
          unitPrice: item.pricePerKg,
          subtotal: item.totalAmount,
        })),
        total: totalAmount,
        paymentMethod: "cash",
        status: "completed",
      };

      const response = await apiRequest("POST", "/api/sales", saleData);
      if (!response.ok) {
        throw new Error("Failed to process bulk sale");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sale Completed",
        description: `Bulk sale of ${totalWeight.toFixed(2)}kg completed successfully`,
      });
      
      setBulkSaleItems([]);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sale Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <ScaleIcon className="w-8 h-8 mr-3" />
                Bulk Items - Loose Selling (Kilogram Wise)
              </h1>
              <p className="text-blue-100 mt-2">Sell bulk items by weight with precise calculations</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
              <div className="text-blue-100">Total Sale Amount</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Product Selection */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center">
                  <PackageIcon className="w-5 h-5 mr-2" />
                  Select Bulk Product
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(addToBulkSale)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bulk Product</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select bulk product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {bulkProducts.map((product: Product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex flex-col">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">
                                      Stock: {product.stockQuantity} units | Cost: {formatCurrency(parseFloat(product.cost || "0"))}
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

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="weightInKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                min="0.001"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-12 text-center font-semibold text-lg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pricePerKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per kg (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="h-12 text-center font-semibold text-lg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Quick Weight Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.25, 0.5, 1, 2].map((weight) => (
                        <Button
                          key={weight}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue("weightInKg", weight)}
                          className="h-10"
                        >
                          {weight}kg
                        </Button>
                      ))}
                    </div>

                    {/* Calculation Display */}
                    {selectedProduct && weightInKg > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">Total Amount:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(weightInKg * form.watch("pricePerKg"))}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {weightInKg}kg × {formatCurrency(form.watch("pricePerKg"))}/kg
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      disabled={!selectedProduct || weightInKg <= 0}
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add to Sale
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Sale Items */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingCartIcon className="w-5 h-5 mr-2" />
                    Bulk Sale Items ({bulkSaleItems.length})
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">Total: {totalWeight.toFixed(2)}kg</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {bulkSaleItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <WeightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No items in sale</p>
                    <p className="text-sm">Add bulk items to start the sale</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkSaleItems.map((item) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{item.product.name}</h3>
                            <div className="text-sm text-gray-600 mt-1">
                              Price: {formatCurrency(item.pricePerKg)}/kg
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemWeight(item.id, Math.max(0.001, item.weightInKg - 0.1))}
                                className="h-8 w-8 p-0"
                              >
                                <MinusIcon className="w-4 h-4" />
                              </Button>
                              
                              <div className="text-center min-w-[80px]">
                                <div className="font-semibold">{item.weightInKg.toFixed(2)}kg</div>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemWeight(item.id, item.weightInKg + 0.1)}
                                className="h-8 w-8 p-0"
                              >
                                <PlusIcon className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="text-right min-w-[100px]">
                              <div className="font-bold text-green-600">
                                {formatCurrency(item.totalAmount)}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromBulkSale(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total Summary */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200 mt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-lg font-semibold text-gray-800">Sale Summary</div>
                          <div className="text-gray-600">Total Weight: {totalWeight.toFixed(2)}kg</div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            {formatCurrency(totalAmount)}
                          </div>
                          <div className="text-gray-600">Total Amount</div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => processBulkSale.mutate()}
                        disabled={processBulkSale.isPending || bulkSaleItems.length === 0}
                        className="w-full mt-4 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg font-semibold"
                      >
                        {processBulkSale.isPending ? (
                          "Processing Sale..."
                        ) : (
                          <>
                            <CalculatorIcon className="w-5 h-5 mr-2" />
                            Complete Bulk Sale
                          </>
                        )}
                      </Button>
                    </div>
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