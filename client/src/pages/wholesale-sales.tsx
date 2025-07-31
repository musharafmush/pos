import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, ShoppingCart, Users, Package, TrendingUp, Edit, Trash2, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Wholesale Sale Schema
const wholesaleSaleSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    wholesalePrice: z.number().min(0, "Wholesale price is required"),
    discount: z.number().default(0),
    total: z.number()
  })).min(1, "At least one item is required"),
  subtotal: z.number(),
  totalDiscount: z.number().default(0),
  tax: z.number().default(0),
  total: z.number(),
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "credit"]),
  paymentTerms: z.string().default("Net 30"),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).default("pending")
});

type WholesaleSale = z.infer<typeof wholesaleSaleSchema>;

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  wholesalePrice?: number;
  stock: number;
  category: string;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: string;
}

interface WholesaleSaleItem {
  id: number;
  productId: number;
  quantity: number;
  wholesalePrice: number;
  discount: number;
  total: number;
  product: Product;
}

interface WholesaleSaleRecord {
  id: number;
  orderNumber: string;
  customerId: number;
  subtotal: number;
  totalDiscount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentTerms: string;
  notes?: string;
  status: string;
  createdAt: string;
  customer: Customer;
  items: WholesaleSaleItem[];
}

export default function WholesaleSales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    productId: number;
    quantity: number;
    wholesalePrice: number;
    discount: number;
    total: number;
    product: Product;
  }>>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<WholesaleSaleRecord | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<WholesaleSale>({
    resolver: zodResolver(wholesaleSaleSchema),
    defaultValues: {
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      tax: 0,
      total: 0,
      paymentMethod: "bank_transfer",
      paymentTerms: "Net 30",
      status: "pending"
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    staleTime: 5000,
    refetchInterval: 15000
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    staleTime: 10000,
    refetchInterval: 30000
  });

  // Fetch wholesale sales
  const { data: wholesaleSales = [], isLoading } = useQuery<WholesaleSaleRecord[]>({
    queryKey: ['/api/wholesale-sales'],
    staleTime: 5000,
    refetchInterval: 10000
  });

  // Create wholesale sale mutation
  const createWholesaleSaleMutation = useMutation({
    mutationFn: (data: WholesaleSale) => apiRequest('/api/wholesale-sales', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wholesale-sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsCreateDialogOpen(false);
      setSelectedProducts([]);
      form.reset();
      toast({
        title: "Success",
        description: "Wholesale sale created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wholesale sale",
        variant: "destructive"
      });
    }
  });

  // Update wholesale sale mutation
  const updateWholesaleSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<WholesaleSale> }) => 
      apiRequest(`/api/wholesale-sales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wholesale-sales'] });
      setEditingSale(null);
      toast({
        title: "Success",
        description: "Wholesale sale updated successfully"
      });
    }
  });

  // Delete wholesale sale mutation
  const deleteWholesaleSaleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/wholesale-sales/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wholesale-sales'] });
      toast({
        title: "Success",
        description: "Wholesale sale deleted successfully"
      });
    }
  });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProductToSale = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);
    if (existingItem) {
      toast({
        title: "Product already added",
        description: "This product is already in the sale. Modify quantity if needed.",
        variant: "destructive"
      });
      return;
    }

    const wholesalePrice = product.wholesalePrice || product.price * 0.8; // 20% wholesale discount
    const newItem = {
      productId: product.id,
      quantity: 1,
      wholesalePrice,
      discount: 0,
      total: wholesalePrice,
      product
    };

    setSelectedProducts([...selectedProducts, newItem]);
    calculateTotals([...selectedProducts, newItem]);
  };

  const updateProductInSale = (productId: number, updates: Partial<typeof selectedProducts[0]>) => {
    const updatedProducts = selectedProducts.map(item => {
      if (item.productId === productId) {
        const updated = { ...item, ...updates };
        updated.total = (updated.wholesalePrice * updated.quantity) - updated.discount;
        return updated;
      }
      return item;
    });
    setSelectedProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  const removeProductFromSale = (productId: number) => {
    const updatedProducts = selectedProducts.filter(item => item.productId !== productId);
    setSelectedProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  const calculateTotals = (items: typeof selectedProducts) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    form.setValue('items', items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      wholesalePrice: item.wholesalePrice,
      discount: item.discount,
      total: item.total
    })));
    form.setValue('subtotal', subtotal);
    form.setValue('totalDiscount', totalDiscount);
    form.setValue('tax', tax);
    form.setValue('total', total);
  };

  const onSubmit = (data: WholesaleSale) => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please add at least one product to the sale",
        variant: "destructive"
      });
      return;
    }
    createWholesaleSaleMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      confirmed: "default",
      shipped: "secondary",
      delivered: "default",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  // Statistics
  const stats = {
    totalSales: wholesaleSales.length,
    pendingSales: wholesaleSales.filter(sale => sale.status === 'pending').length,
    totalRevenue: wholesaleSales.reduce((sum, sale) => sum + sale.total, 0),
    avgOrderValue: wholesaleSales.length > 0 ? wholesaleSales.reduce((sum, sale) => sum + sale.total, 0) / wholesaleSales.length : 0
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wholesale Sales Management</h1>
          <p className="text-muted-foreground">Manage bulk orders and wholesale transactions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Wholesale Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Wholesale Sale</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name} - {customer.phone}
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
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Product Search and Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-md"
                    />
                  </div>

                  {searchTerm && (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                      {filteredProducts.slice(0, 9).map((product) => (
                        <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addProductToSale(product)}>
                          <CardContent className="p-2">
                            <div className="text-sm font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">₹{product.wholesalePrice || (product.price * 0.8).toFixed(2)}</div>
                            <div className="text-xs">Stock: {product.stock}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Wholesale Price</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProducts.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell>{item.product.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateProductInSale(item.productId, { quantity: parseInt(e.target.value) || 1 })}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.wholesalePrice}
                                  onChange={(e) => updateProductInSale(item.productId, { wholesalePrice: parseFloat(e.target.value) || 0 })}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.discount}
                                  onChange={(e) => updateProductInSale(item.productId, { discount: parseFloat(e.target.value) || 0 })}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>₹{item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProductFromSale(item.productId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="mt-4 space-y-2 border-t pt-4">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{form.watch('subtotal')?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax (18%):</span>
                          <span>₹{form.watch('tax')?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>₹{form.watch('total')?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional notes..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createWholesaleSaleMutation.isPending}>
                    {createWholesaleSaleMutation.isPending ? "Creating..." : "Create Sale"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Wholesale Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading sales...</div>
          ) : wholesaleSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wholesale sales found. Create your first wholesale sale to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wholesaleSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sale.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{sale.customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{sale.items.length} items</TableCell>
                    <TableCell className="font-medium">₹{sale.total.toFixed(2)}</TableCell>
                    <TableCell>{sale.paymentMethod.toUpperCase()}</TableCell>
                    <TableCell>{getStatusBadge(sale.status)}</TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteWholesaleSaleMutation.mutate(sale.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}