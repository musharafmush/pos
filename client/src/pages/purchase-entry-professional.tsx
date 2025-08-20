import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { 
  Building2, 
  Plus, 
  Minus,
  Save,
  ArrowLeft,
  Package,
  Calculator,
  Calendar,
  FileText,
  Truck,
  DollarSign,
  Tag,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Trash2,
  Copy,
  Search,
  ShoppingCart,
  Receipt,
  CreditCard,
  Users,
  ClipboardList,
  Info,
  TrendingUp,
  Eye,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { PurchasePaymentManagement } from "@/components/purchase-payment-management";

// Purchase schema
const purchaseItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  sku: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  freeQty: z.number().min(0, "Free quantity must be non-negative").default(0),
  discount: z.number().min(0).max(100, "Discount must be between 0 and 100").default(0),
  taxRate: z.number().min(0).max(100, "Tax rate must be between 0 and 100").default(0),
  total: z.number().min(0),
});

const purchaseFormSchema = z.object({
  supplierId: z.number().min(1, "Please select a supplier"),
  orderNumber: z.string().min(3, "Order number must be at least 3 characters"),
  orderDate: z.string(),
  expectedDate: z.string().optional(),
  paymentTerms: z.string().default("Net 30"),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  freightCost: z.number().min(0).default(0),
  otherCharges: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

export default function PurchaseEntryProfessional() {
  const [location, navigate] = useLocation();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [savedPurchase, setSavedPurchase] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract ID from URL params for editing
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const editingId = urlParams.get('id');
  const isEditing = !!editingId;

  // Form setup
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: 0,
      orderNumber: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: "",
      paymentTerms: "Net 30",
      notes: "",
      items: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      freightCost: 0,
      otherCharges: 0,
      totalAmount: 0,
    },
  });

  // Fetch data
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await apiRequest('/api/suppliers');
      return response as any[];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await apiRequest('/api/products');
      return response as any[];
    }
  });

  // Fetch purchase for editing
  const { data: existingPurchase } = useQuery({
    queryKey: [`/api/purchases/${editingId}`],
    queryFn: async () => {
      if (!editingId) return null;
      const response = await apiRequest(`/api/purchases/${editingId}`);
      return response;
    },
    enabled: !!editingId
  });

  // Load existing purchase data for editing
  useEffect(() => {
    if (existingPurchase && isEditing) {
      const formData: PurchaseFormData = {
        supplierId: existingPurchase.supplierId || 0,
        orderNumber: existingPurchase.orderNumber || "",
        orderDate: existingPurchase.orderDate ? new Date(existingPurchase.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expectedDate: existingPurchase.expectedDate ? new Date(existingPurchase.expectedDate).toISOString().split('T')[0] : "",
        paymentTerms: existingPurchase.paymentTerms || "Net 30",
        notes: existingPurchase.notes || "",
        items: existingPurchase.items?.map((item: any) => ({
          productId: item.productId || item.product_id,
          productName: item.productName || item.product?.name || "",
          sku: item.sku || item.product?.sku || "",
          quantity: parseFloat(item.quantity || "1"),
          unitPrice: parseFloat(item.unitPrice || item.unit_price || "0"),
          freeQty: parseFloat(item.freeQty || item.free_qty || "0"),
          discount: parseFloat(item.discount || "0"),
          taxRate: parseFloat(item.taxRate || item.tax_rate || "0"),
          total: parseFloat(item.subtotal || item.total || "0"),
        })) || [],
        subtotal: parseFloat(existingPurchase.subtotal || existingPurchase.total || "0"),
        taxAmount: parseFloat(existingPurchase.taxAmount || existingPurchase.tax || "0"),
        discountAmount: parseFloat(existingPurchase.discountAmount || existingPurchase.discount || "0"),
        freightCost: parseFloat(existingPurchase.freightCost || existingPurchase.freight_cost || "0"),
        otherCharges: parseFloat(existingPurchase.otherCharges || existingPurchase.other_charges || "0"),
        totalAmount: parseFloat(existingPurchase.total || existingPurchase.totalAmount || "0"),
      };
      
      // Reset form with existing data
      form.reset(formData);
      
      // Calculate totals
      calculateTotals(formData.items);
    }
  }, [existingPurchase, isEditing, form]);

  // Watch items for calculation
  const watchedItems = form.watch("items");
  const watchedFreightCost = form.watch("freightCost");
  const watchedOtherCharges = form.watch("otherCharges");
  const watchedDiscountAmount = form.watch("discountAmount");

  // Calculate totals when items change
  useEffect(() => {
    if (watchedItems?.length > 0) {
      calculateTotals(watchedItems);
    }
  }, [watchedItems, watchedFreightCost, watchedOtherCharges, watchedDiscountAmount]);

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountAmount = itemTotal * ((item.discount || 0) / 100);
      return sum + (itemTotal - discountAmount);
    }, 0);

    const taxAmount = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountAmount = itemTotal * ((item.discount || 0) / 100);
      const taxableAmount = itemTotal - discountAmount;
      return sum + (taxableAmount * ((item.taxRate || 0) / 100));
    }, 0);

    const totalAmount = subtotal + taxAmount + (watchedFreightCost || 0) + (watchedOtherCharges || 0) - (watchedDiscountAmount || 0);

    form.setValue("subtotal", subtotal);
    form.setValue("taxAmount", taxAmount);
    form.setValue("totalAmount", totalAmount);

    // Update item totals
    items.forEach((item, index) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountAmount = itemTotal * ((item.discount || 0) / 100);
      const taxableAmount = itemTotal - discountAmount;
      const itemTaxAmount = taxableAmount * ((item.taxRate || 0) / 100);
      const finalTotal = taxableAmount + itemTaxAmount;
      
      form.setValue(`items.${index}.total`, finalTotal);
    });
  };

  // Add new item
  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [
      ...currentItems,
      {
        productId: 0,
        productName: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        freeQty: 0,
        discount: 0,
        taxRate: 18, // Default GST rate
        total: 0,
      },
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    form.setValue("items", currentItems.filter((_, i) => i !== index));
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find(p => p.id === parseInt(productId.toString()));
    if (product) {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.sku`, product.sku || "");
      form.setValue(`items.${index}.unitPrice`, parseFloat(product.cost || product.price || "0"));
    }
  };

  // Save purchase mutation
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const endpoint = isEditing ? `/api/purchases/${editingId}` : '/api/purchases';
      const method = isEditing ? 'PUT' : 'POST';
      
      return await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          ...data,
          userId: 1, // Current user ID
        })
      });
    },
    onSuccess: (response) => {
      setSavedPurchase(response);
      toast({
        title: `Purchase ${isEditing ? 'Updated' : 'Created'} Successfully`,
        description: `Purchase order ${form.getValues('orderNumber')} has been ${isEditing ? 'updated' : 'saved'}.`,
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      
      // Navigate to dashboard after successful save
      setTimeout(() => {
        navigate('/purchase-dashboard-enhanced');
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save purchase order. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PurchaseFormData) => {
    if (data.items.length === 0) {
      toast({
        title: "No Items Added",
        description: "Please add at least one item to the purchase order.",
        variant: "destructive"
      });
      return;
    }
    
    savePurchaseMutation.mutate(data);
  };

  const formValues = form.watch();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="purchase-entry">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild data-testid="button-back">
              <Link href="/purchase-dashboard-enhanced">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isEditing ? 'Update purchase order details and items' : 'Create a new purchase order for your supplier'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {savedPurchase && (
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(true)}
                data-testid="button-record-payment"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={savePurchaseMutation.isPending}
              data-testid="button-save-purchase"
            >
              {savePurchaseMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Purchase' : 'Save Purchase'}
                </>
              )}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Purchase Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Purchase Order Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <Select 
                          value={field.value?.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <Building2 className="h-4 w-4" />
                                  <span>{supplier.name}</span>
                                </div>
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
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-order-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-order-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expected-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Net 15">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30">Net 30 Days</SelectItem>
                            <SelectItem value="Net 60">Net 60 Days</SelectItem>
                            <SelectItem value="Net 90">Net 90 Days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Special instructions, delivery notes, etc."
                            className="min-h-[80px]"
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Purchase Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Purchase Items</span>
                    <Badge variant="secondary" className="ml-2">
                      {formValues.items?.length || 0} items
                    </Badge>
                  </CardTitle>
                  <Button
                    type="button"
                    onClick={addItem}
                    size="sm"
                    data-testid="button-add-item"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formValues.items?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No items added yet</p>
                    <p>Click "Add Item" to start building your purchase order</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Free Qty</TableHead>
                          <TableHead>Discount %</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formValues.items?.map((item, index) => (
                          <TableRow key={index} data-testid={`row-item-${index}`}>
                            <TableCell className="min-w-[200px]">
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select
                                      value={field.value?.toString()}
                                      onValueChange={(value) => handleProductSelect(index, parseInt(value))}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid={`select-product-${index}`}>
                                          <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products.map((product) => (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            <div>
                                              <div className="font-medium">{product.name}</div>
                                              <div className="text-sm text-gray-500">
                                                SKU: {product.sku} | Cost: {formatCurrency(parseFloat(product.cost || product.price || "0"))}
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
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                        data-testid={`input-quantity-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-24"
                                        data-testid={`input-price-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.freeQty`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                        data-testid={`input-free-qty-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.discount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                        data-testid={`input-discount-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.taxRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                        data-testid={`input-tax-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-bold" data-testid={`text-total-${index}`}>
                                {formatCurrency(item.total || 0)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-remove-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Purchase Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Additional Charges */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Additional Charges</h4>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="freightCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Freight Cost</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-freight-cost"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otherCharges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Charges</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-other-charges"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Discount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-discount-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Amount Breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Amount Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="font-medium" data-testid="text-subtotal">
                          {formatCurrency(formValues.subtotal || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tax Amount:</span>
                        <span className="font-medium" data-testid="text-tax-amount">
                          {formatCurrency(formValues.taxAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Freight:</span>
                        <span className="font-medium">
                          {formatCurrency(formValues.freightCost || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                        <span className="font-medium">
                          {formatCurrency(formValues.otherCharges || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>Discount:</span>
                        <span className="font-medium">
                          -{formatCurrency(formValues.discountAmount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Final Total */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Order Total</h4>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-green-200 dark:border-green-600">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-amount">
                          {formatCurrency(formValues.totalAmount || 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formValues.items?.length || 0} items
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Payment Management Dialog */}
        {savedPurchase && (
          <PurchasePaymentManagement
            purchase={savedPurchase}
            isOpen={isPaymentDialogOpen}
            onClose={() => setIsPaymentDialogOpen(false)}
            onPaymentRecorded={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
              setIsPaymentDialogOpen(false);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}