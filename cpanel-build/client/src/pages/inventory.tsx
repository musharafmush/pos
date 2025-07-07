import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, PackageIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

const adjustStockFormSchema = z.object({
  productId: z.coerce.number({
    required_error: "Product is required",
    invalid_type_error: "Product must be a number",
  }),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
  type: z.enum(["add", "remove"]),
});

type AdjustStockFormValues = z.infer<typeof adjustStockFormSchema>;

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: {
      productId: 0,
      quantity: 1,
      reason: "",
      type: "add",
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    }
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['/api/products/low-stock'],
    queryFn: async () => {
      const response = await fetch('/api/products/low-stock?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch low stock products');
      }
      return response.json();
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (data: AdjustStockFormValues) => {
      const productId = data.productId;
      const quantity = data.type === "add" ? data.quantity : -data.quantity;
      
      // This endpoint doesn't exist yet, but we can update product stock
      // by updating the product with a new stockQuantity
      const product = products.find((p: any) => p.id === productId);
      if (!product) throw new Error("Product not found");
      
      const updatedProduct = {
        ...product,
        stockQuantity: product.stockQuantity + quantity
      };
      
      return await apiRequest("PUT", `/api/products/${productId}`, updatedProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setIsAdjustDialogOpen(false);
      form.reset();
      toast({
        title: "Stock adjusted",
        description: "Inventory has been successfully updated",
      });
    },
    onError: (error) => {
      console.error("Error adjusting stock:", error);
      toast({
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: AdjustStockFormValues) => {
    adjustStockMutation.mutate(data);
  };

  // Filter displayed products based on search term, category, and stock level
  const filteredProducts = products?.filter((product: any) => {
    // Filter by search term
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by category
    const matchesCategory = filterCategory === "all" || 
      product.categoryId === parseInt(filterCategory);
    
    // Filter by stock level
    const matchesStock = filterStock === "all" || 
      (filterStock === "low" && product.stockQuantity <= product.alertThreshold) ||
      (filterStock === "out" && product.stockQuantity === 0) ||
      (filterStock === "in" && product.stockQuantity > product.alertThreshold);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Inventory Management</h2>
          <Button onClick={() => setIsAdjustDialogOpen(true)} className="mt-4 sm:mt-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            Adjust Stock
          </Button>
        </div>

        <Tabs defaultValue="inventory" className="mb-6">
          <TabsList>
            <TabsTrigger value="inventory">All Inventory</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Inventory Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input 
                      placeholder="Search by name, SKU or barcode"
                      className="pl-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStock} onValueChange={setFilterStock}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Stock Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock Levels</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="out">Out of Stock</SelectItem>
                        <SelectItem value="in">In Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading inventory...
                  </div>
                ) : filteredProducts && filteredProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>In Stock</TableHead>
                          <TableHead>Alert Threshold</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product: any) => {
                          // Determine stock status
                          const outOfStock = product.stockQuantity === 0;
                          const lowStock = !outOfStock && product.stockQuantity <= product.alertThreshold;
                          const inStock = !outOfStock && !lowStock;
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                                    ) : (
                                      <PackageIcon className="h-6 w-6" />
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {product.barcode && `Barcode: ${product.barcode}`}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.category?.name || "Uncategorized"}
                              </TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell>{product.stockQuantity}</TableCell>
                              <TableCell>{product.alertThreshold}</TableCell>
                              <TableCell>
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-xs font-medium",
                                  outOfStock && "bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300",
                                  lowStock && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300",
                                  inStock && "bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-300"
                                )}>
                                  {outOfStock ? "Out of Stock" : lowStock ? "Low Stock" : "In Stock"}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No products match your filter criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="low-stock">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading low stock items...
                  </div>
                ) : lowStockProducts && lowStockProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>In Stock</TableHead>
                          <TableHead>Alert Threshold</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockProducts.map((product: any) => {
                          // Determine if critically low
                          const criticallyLow = product.stockQuantity === 0 || 
                            product.stockQuantity <= (product.alertThreshold * 0.3);
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                                    ) : (
                                      <PackageIcon className="h-6 w-6" />
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{product.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {product.barcode && `Barcode: ${product.barcode}`}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.category?.name || "Uncategorized"}
                              </TableCell>
                              <TableCell>{product.sku}</TableCell>
                              <TableCell>
                                <span className={criticallyLow ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                  {product.stockQuantity}
                                </span>
                              </TableCell>
                              <TableCell>{product.alertThreshold}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    form.reset({
                                      productId: product.id,
                                      quantity: 1,
                                      reason: "Restock",
                                      type: "add"
                                    });
                                    setIsAdjustDialogOpen(true);
                                  }}
                                >
                                  Restock
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No low stock items found.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
            <DialogDescription>
              Add or remove items from inventory.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} (SKU: {product.sku})
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add">
                          <div className="flex items-center">
                            <ArrowUpIcon className="h-4 w-4 mr-2 text-green-500" />
                            <span>Add Stock</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="remove">
                          <div className="flex items-center">
                            <ArrowDownIcon className="h-4 w-4 mr-2 text-red-500" />
                            <span>Remove Stock</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity*</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reason for adjustment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAdjustDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={adjustStockMutation.isPending}
                >
                  {adjustStockMutation.isPending ? "Adjusting..." : "Adjust Stock"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
