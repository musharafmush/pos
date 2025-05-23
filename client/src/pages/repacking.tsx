import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { 
  Package, 
  PackageOpen, 
  ArrowRight, 
  Scissors, 
  Calculator,
  CheckCircle,
  Search,
  RotateCcw,
  Star
} from "lucide-react";
import type { Product } from "@shared/schema";

// Form schema for repacking
const repackingSchema = z.object({
  sourceProductId: z.string().min(1, "Source product is required"),
  sourceQuantity: z.coerce.number().min(1, "Source quantity must be at least 1"),
  targetProductName: z.string().min(3, "Product name must be at least 3 characters"),
  targetProductSku: z.string().min(3, "SKU must be at least 3 characters"),
  targetQuantity: z.coerce.number().min(1, "Target quantity must be at least 1"),
  targetUnitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type RepackingValues = z.infer<typeof repackingSchema>;

export default function Repacking() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSourceProduct, setSelectedSourceProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();

  const form = useForm<RepackingValues>({
    resolver: zodResolver(repackingSchema),
    defaultValues: {
      sourceQuantity: 1,
      targetQuantity: 1,
      targetUnitPrice: 0,
      description: "",
      notes: "",
    },
  });

  // Fetch products for source selection
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch categories for target product
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const repackMutation = useMutation({
    mutationFn: async (data: RepackingValues) => {
      setIsProcessing(true);
      
      // Create new product from repacking
      const newProductData = {
        name: data.targetProductName,
        sku: data.targetProductSku,
        description: data.description || `Repacked from ${selectedSourceProduct?.name}`,
        price: data.targetUnitPrice,
        stockQuantity: data.targetQuantity,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        alertThreshold: Math.floor(data.targetQuantity * 0.1),
      };

      // Create the new product
      const createResponse = await apiRequest("POST", "/api/products", newProductData);
      const newProduct = await createResponse.json();

      // Update source product stock (reduce by consumed quantity)
      if (selectedSourceProduct) {
        const newSourceStock = selectedSourceProduct.stockQuantity - data.sourceQuantity;
        await apiRequest("PUT", `/api/products/${selectedSourceProduct.id}`, {
          stockQuantity: newSourceStock,
        });
      }

      return { newProduct, sourceProduct: selectedSourceProduct };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "🎉 Repacking completed successfully!",
        description: `Created ${data.newProduct.name} from ${data.sourceProduct?.name}`,
      });
      setCurrentStep(3);
      setIsProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Repacking failed",
        description: error.message || "There was an error processing the repacking",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const onSubmit = (data: RepackingValues) => {
    if (!selectedSourceProduct) {
      toast({
        title: "No source product selected",
        description: "Please select a source product first",
        variant: "destructive",
      });
      return;
    }

    if (data.sourceQuantity > selectedSourceProduct.stockQuantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedSourceProduct.stockQuantity} units available`,
        variant: "destructive",
      });
      return;
    }

    repackMutation.mutate(data);
  };

  const handleSourceProductChange = (product: Product) => {
    setSelectedSourceProduct(product);
    form.setValue("sourceProductId", product.id.toString());
    
    // Auto-generate SKU for target product
    const timestamp = Date.now().toString().slice(-4);
    form.setValue("targetProductSku", `${product.sku}-RP${timestamp}`);
    setCurrentStep(2);
  };

  const filteredProducts = products?.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetProcess = () => {
    setCurrentStep(1);
    setSelectedSourceProduct(null);
    setSearchTerm("");
    form.reset();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Repacking</h1>
            <p className="text-muted-foreground">
              Transform bulk products into smaller retail units with our smart repacking wizard
            </p>
          </div>
          {currentStep > 1 && (
            <Button 
              onClick={resetProcess} 
              variant="outline" 
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          )}
        </div>

        {/* Enhanced Step Indicator */}
        <div className="flex items-center justify-center space-x-4 py-8">
          <div className={`flex items-center space-x-3 transition-all duration-300 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              currentStep > 1 ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {currentStep > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
            </div>
            <div>
              <div className="font-semibold">Select Source Product</div>
              <div className="text-sm text-gray-500">Choose product to repack</div>
            </div>
          </div>
          <ArrowRight className="h-6 w-6 text-gray-400" />
          <div className={`flex items-center space-x-3 transition-all duration-300 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              currentStep > 2 ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {currentStep > 2 ? <CheckCircle className="h-6 w-6" /> : '2'}
            </div>
            <div>
              <div className="font-semibold">Configure New Product</div>
              <div className="text-sm text-gray-500">Set quantities and details</div>
            </div>
          </div>
          <ArrowRight className="h-6 w-6 text-gray-400" />
          <div className={`flex items-center space-x-3 transition-all duration-300 ${currentStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}>
              {currentStep >= 3 ? <CheckCircle className="h-6 w-6" /> : '3'}
            </div>
            <div>
              <div className="font-semibold">Complete</div>
              <div className="text-sm text-gray-500">Repacking finished</div>
            </div>
          </div>
        </div>

        {/* Step 1: Product Selection */}
        {currentStep === 1 && (
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-6 w-6 text-blue-600" />
                Select Source Product to Repack
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search products by name or SKU..."
                  className="pl-10 py-3 text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts?.map((product: Product) => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-blue-300"
                    onClick={() => handleSourceProductChange(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                        {product.stockQuantity > 50 && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-blue-600">{formatCurrency(product.price)}</p>
                          <p className="text-sm text-gray-600">Stock: {product.stockQuantity}</p>
                        </div>
                        <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"}>
                          {product.stockQuantity > 0 ? "Available" : "Out of Stock"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && selectedSourceProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Product Info */}
            <Card className="border-2 border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Source Product
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-xl">{selectedSourceProduct.name}</h3>
                    <p className="text-gray-600">SKU: {selectedSourceProduct.sku}</p>
                    <p className="text-lg font-semibold text-green-600">
                      Price: {formatCurrency(selectedSourceProduct.price)}
                    </p>
                    <p className="text-sm">Available Stock: <span className="font-bold">{selectedSourceProduct.stockQuantity}</span> units</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Product Configuration */}
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <PackageOpen className="h-5 w-5 text-green-600" />
                  New Product Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sourceQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity to Use</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                max={selectedSourceProduct.stockQuantity}
                                className="text-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>Units to consume</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Units to Create</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                className="text-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>New units generated</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="targetProductName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Product Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter new product name" 
                              className="text-lg"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="targetProductSku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Auto-generated SKU" 
                                className="text-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetUnitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0.01" 
                                placeholder="0.00"
                                className="text-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="text-lg">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((category: any) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Product description..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      >
                        {isProcessing ? (
                          <>
                            <Calculator className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Scissors className="h-4 w-4 mr-2" />
                            Complete Repacking
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <Card className="border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Repacking Completed Successfully! 🎉
                </h2>
                <p className="text-gray-600">
                  Your new product has been created and inventory has been updated.
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={resetProcess}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Repack Another Product
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/products'}
                >
                  <Package className="h-4 w-4 mr-2" />
                  View All Products
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}