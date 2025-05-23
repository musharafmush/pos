import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Search, Package, Building2, Calculator, Save } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Form schemas
const purchaseItemSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0, "Unit cost must be positive"),
  total: z.number().min(0, "Total must be positive"),
});

const purchaseFormSchema = z.object({
  supplierId: z.number().min(1, "Please select a supplier"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
  freight: z.number().min(0),
  total: z.number().min(0),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function PurchaseEntry() {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();

  // Fetch data
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return await res.json();
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    }
  });

  // Form setup
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      referenceNumber: "",
      notes: "",
      items: [],
      subtotal: 0,
      taxRate: 18, // Default GST rate for India
      taxAmount: 0,
      freight: 0,
      total: 0,
    },
    mode: "onChange"
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues("items");
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = form.getValues("taxRate") || 0;
    const freight = form.getValues("freight") || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount + freight;

    form.setValue("subtotal", subtotal);
    form.setValue("taxAmount", taxAmount);
    form.setValue("total", total);
  };

  // Add product to purchase
  const addProduct = (product: any) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitCost: parseFloat(product.price) || 0,
      total: parseFloat(product.price) || 0,
    };

    if (selectedItemIndex !== null) {
      update(selectedItemIndex, newItem);
      setSelectedItemIndex(null);
    } else {
      append(newItem);
    }

    setIsProductDialogOpen(false);
    calculateTotals();
  };

  // Update item quantity or cost
  const updateItem = (index: number, field: 'quantity' | 'unitCost', value: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    if (field === 'quantity') {
      item.quantity = value;
    } else {
      item.unitCost = value;
    }
    
    item.total = item.quantity * item.unitCost;
    update(index, item);
    calculateTotals();
  };

  // Remove item
  const removeItem = (index: number) => {
    remove(index);
    calculateTotals();
  };

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      const purchaseData = {
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate,
        referenceNumber: data.referenceNumber || `PUR-${Date.now()}`,
        notes: data.notes,
        subtotal: data.subtotal.toString(),
        taxAmount: data.taxAmount.toString(),
        freight: data.freight.toString(),
        total: data.total.toString(),
        status: "pending",
        items: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost.toString(),
          total: item.total.toString(),
        })),
      };

      return await apiRequest("/api/purchases", "POST", purchaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Purchase created successfully!",
        description: "The purchase entry has been saved.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating purchase",
        description: error.message || "There was an error creating the purchase.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PurchaseFormValues) => {
    createPurchaseMutation.mutate(data);
  };

  const subtotal = form.watch("subtotal") || 0;
  const taxAmount = form.watch("taxAmount") || 0;
  const freight = form.watch("freight") || 0;
  const total = form.watch("total") || 0;

  return (
    <DashboardLayout>
      <div className="container max-w-6xl pb-8 px-4">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Purchase Entry</h1>
            <Button 
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {createPurchaseMutation.isPending ? "Saving..." : "Save Purchase"}
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Purchase Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Purchase Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier*</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((supplier: any) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                  {supplier.name}
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
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date*</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="referenceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter reference number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes about this purchase..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Purchase Items
                    </CardTitle>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedItemIndex(null);
                        setIsProductDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {fields.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[120px]">Quantity</TableHead>
                            <TableHead className="w-[120px]">Unit Cost</TableHead>
                            <TableHead className="w-[120px]">Total</TableHead>
                            <TableHead className="w-[80px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <div className="font-medium">{field.productName}</div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={field.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={field.unitCost}
                                  onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(field.total)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No items added yet. Click "Add Product" to start.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Purchase Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setTimeout(calculateTotals, 0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="freight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Freight/Shipping</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="₹0"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                setTimeout(calculateTotals, 0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({form.watch("taxRate") || 0}%):</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight:</span>
                      <span className="font-medium">{formatCurrency(freight)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold text-green-600">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid gap-2">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => addProduct(product)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.description}</div>
                    <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(parseFloat(product.price) || 0)}</div>
                    <div className="text-sm text-gray-500">Stock: {product.stockQuantity || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}