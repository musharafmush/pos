import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { Package, PackageOpen, Plus, History, AlertTriangle } from "lucide-react";
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

interface RepackingHistory {
  id: number;
  sourceProduct: Product;
  targetProduct: Product;
  sourceQuantity: number;
  targetQuantity: number;
  repackedAt: string;
  notes?: string;
}

export default function Repacking() {
  const [isRepackDialogOpen, setIsRepackDialogOpen] = useState(false);
  const [selectedSourceProduct, setSelectedSourceProduct] = useState<Product | null>(null);
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

  // Fetch repacking history (mock data for now)
  const { data: repackingHistory } = useQuery({
    queryKey: ["/api/repacking/history"],
    queryFn: async () => {
      // This would be replaced with actual API call
      return [] as RepackingHistory[];
    },
  });

  const repackMutation = useMutation({
    mutationFn: async (data: RepackingValues) => {
      // Create new product from repacking
      const newProductData = {
        name: data.targetProductName,
        sku: data.targetProductSku,
        description: data.description || `Repacked from ${selectedSourceProduct?.name}`,
        price: data.targetUnitPrice,
        stockQuantity: data.targetQuantity,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        alertThreshold: Math.floor(data.targetQuantity * 0.1), // 10% of initial stock
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
        title: "Repacking completed",
        description: `Successfully created ${data.newProduct.name} from ${data.sourceProduct?.name}`,
      });
      setIsRepackDialogOpen(false);
      form.reset();
      setSelectedSourceProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Repacking failed",
        description: error.message || "There was an error processing the repacking",
        variant: "destructive",
      });
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

  const handleSourceProductChange = (productId: string) => {
    const product = products?.find((p: Product) => p.id.toString() === productId);
    setSelectedSourceProduct(product || null);
    
    if (product) {
      // Auto-generate SKU for target product
      const timestamp = Date.now().toString().slice(-4);
      form.setValue("targetProductSku", `${product.sku}-RP${timestamp}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Repacking</h1>
            <p className="text-muted-foreground">
              Break down bulk products into smaller units or repackage items
            </p>
          </div>
          <Dialog open={isRepackDialogOpen} onOpenChange={setIsRepackDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PackageOpen className="h-4 w-4" />
                New Repacking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Repack Product</DialogTitle>
                <DialogDescription>
                  Convert bulk products into smaller units or create new product variants
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Product Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Source Product
                      </h3>
                      
                      <FormField
                        control={form.control}
                        name="sourceProductId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product to Repack</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleSourceProductChange(value);
                                }} 
                                value={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products?.map((product: Product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          SKU: {product.sku} | Stock: {product.stockQuantity}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedSourceProduct && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                          <p className="text-sm font-medium">{selectedSourceProduct.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Available: {selectedSourceProduct.stockQuantity} units
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Price: {formatCurrency(selectedSourceProduct.price)}
                          </p>
                        </div>
                      )}

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
                                max={selectedSourceProduct?.stockQuantity || 999}
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              How many units to consume from source product
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Target Product Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <PackageOpen className="h-5 w-5" />
                        New Product
                      </h3>

                      <FormField
                        control={form.control}
                        name="targetProductName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter new product name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetProductSku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-generated SKU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="targetQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Units Created</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} />
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
                                <SelectTrigger>
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
                    </div>
                  </div>

                  <div className="space-y-4">
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

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repacking Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional notes about this repacking operation..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsRepackDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={repackMutation.isPending}
                      className="gap-2"
                    >
                      {repackMutation.isPending ? (
                        "Processing..."
                      ) : (
                        <>
                          <PackageOpen className="h-4 w-4" />
                          Complete Repacking
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Available for repacking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products?.filter((p: Product) => p.stockQuantity <= (p.alertThreshold || 10)).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Need replenishment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repacking History</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{repackingHistory?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Operations completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Products Available for Repacking */}
          <Card>
            <CardHeader>
              <CardTitle>Products Available for Repacking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>Uncategorized</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.stockQuantity}</span>
                            {product.stockQuantity <= (product.alertThreshold || 10) && (
                              <Badge variant="destructive" className="text-xs">Low</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          {product.stockQuantity > 0 ? (
                            <Badge variant="secondary">Available</Badge>
                          ) : (
                            <Badge variant="outline">Out of Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={product.stockQuantity === 0}
                            onClick={() => {
                              setSelectedSourceProduct(product);
                              form.setValue("sourceProductId", product.id.toString());
                              const timestamp = Date.now().toString().slice(-4);
                              form.setValue("targetProductSku", `${product.sku}-RP${timestamp}`);
                              setIsRepackDialogOpen(true);
                            }}
                          >
                            <PackageOpen className="h-3 w-3" />
                            Repack
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}