import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Calendar, 
  CreditCard, 
  FilePlus, 
  Trash2, 
  Save, 
  Printer, 
  Search,
  Plus,
  Building2,
  Calculator,
  Package,
  Receipt,
  CheckCircle,
  IndianRupee,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Types
import type { Product, Supplier } from "@shared/schema";

// Schema for form validation
const purchaseEntrySchema = z.object({
  // Basic Details
  orderNumber: z.string().min(1, "Order number is required"),
  supplierId: z.number().min(1, "Please select a supplier"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDate: z.string().min(1, "Expected date is required"),
  
  // Invoice Details
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.string().default("0"),
  
  // Payment & Status
  paymentMethod: z.string().min(1, "Payment method is required"),
  status: z.string().default("pending"),
  remarks: z.string().optional(),
  
  // Financial Details
  grossAmount: z.string().default("0"),
  discountAmount: z.string().default("0"),
  taxAmount: z.string().default("0"),
  freightCharges: z.string().default("0"),
  otherCharges: z.string().default("0"),
  totalAmount: z.string().default("0"),
  
  // Line Items
  items: z.array(
    z.object({
      productId: z.number().min(1, "Please select a product"),
      productName: z.string().min(1, "Product name is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitCost: z.number().min(0.01, "Unit cost must be greater than 0"),
      discount: z.number().default(0),
      taxRate: z.number().default(0),
      amount: z.number().default(0),
    })
  ).min(1, "At least one item is required"),
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

export default function PurchaseEntryNew() {
  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const productSearchRef = useRef<HTMLInputElement>(null);
  
  // Generate order number
  const orderNumber = `PO-${Date.now().toString().slice(-8)}`;
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Form initialization
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      orderNumber,
      supplierId: 0,
      orderDate: today,
      expectedDate: today,
      invoiceNo: "",
      invoiceDate: "",
      invoiceAmount: "0",
      paymentMethod: "Cash",
      status: "pending",
      remarks: "",
      grossAmount: "0",
      discountAmount: "0",
      taxAmount: "0",
      freightCharges: "0",
      otherCharges: "0",
      totalAmount: "0",
      items: [{
        productId: 0,
        productName: "",
        quantity: 1,
        unitCost: 0,
        discount: 0,
        taxRate: 0,
        amount: 0,
      }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });
  
  // Fetch products for search
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );
  
  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );
  
  // Calculate totals automatically
  const watchedItems = form.watch("items");
  
  useEffect(() => {
    let grossAmount = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    watchedItems.forEach((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const discount = Number(item.discount) || 0;
      const taxRate = Number(item.taxRate) || 0;
      
      const itemGross = quantity * unitCost;
      const itemDiscount = (itemGross * discount) / 100;
      const itemTaxableAmount = itemGross - itemDiscount;
      const itemTax = (itemTaxableAmount * taxRate) / 100;
      const itemAmount = itemTaxableAmount + itemTax;
      
      // Update item amount
      form.setValue(`items.${index}.amount`, itemAmount);
      
      grossAmount += itemGross;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });
    
    const freightCharges = Number(form.watch("freightCharges")) || 0;
    const otherCharges = Number(form.watch("otherCharges")) || 0;
    const finalTotal = grossAmount - totalDiscount + totalTax + freightCharges + otherCharges;
    
    form.setValue("grossAmount", grossAmount.toFixed(0));
    form.setValue("discountAmount", totalDiscount.toFixed(0));
    form.setValue("taxAmount", totalTax.toFixed(0));
    form.setValue("totalAmount", finalTotal.toFixed(0));
  }, [watchedItems, form.watch("freightCharges"), form.watch("otherCharges")]);
  
  // Add new item row
  const addItem = () => {
    append({
      productId: 0,
      productName: "",
      quantity: 1,
      unitCost: 0,
      discount: 0,
      taxRate: 18, // Default GST rate
      amount: 0,
    });
  };
  
  // Save purchase mutation
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          grossAmount: Number(data.grossAmount),
          discountAmount: Number(data.discountAmount),
          taxAmount: Number(data.taxAmount),
          freightCharges: Number(data.freightCharges),
          otherCharges: Number(data.otherCharges),
          totalAmount: Number(data.totalAmount),
          items: data.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            discount: Number(item.discount),
            taxRate: Number(item.taxRate),
            amount: Number(item.amount),
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create purchase order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success! 🎉",
        description: "Purchase order created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      // Reset form or redirect
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: PurchaseEntryFormValues) => {
    savePurchaseMutation.mutate(data);
  };
  
  // Select product for item
  const selectProduct = (product: Product, itemIndex: number) => {
    form.setValue(`items.${itemIndex}.productId`, product.id);
    form.setValue(`items.${itemIndex}.productName`, product.name);
    form.setValue(`items.${itemIndex}.unitCost`, Number(product.price));
    setProductSearchTerm("");
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Purchase Entry</h1>
              <p className="text-sm text-muted-foreground">Create new purchase order for inventory management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={savePurchaseMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savePurchaseMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Purchase Order
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Order Details Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50 dark:bg-gray-800" />
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
                        <FormLabel>Order Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>Expected Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Credit">Credit</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Supplier Details Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name} - {supplier.email}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Invoice Details Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-purple-600" />
                  Invoice Details (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter invoice number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoiceAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Line Items Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    Purchase Items
                  </CardTitle>
                  <Button type="button" onClick={addItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          {/* Product Selection */}
                          <div className="md:col-span-2">
                            <FormLabel>Product</FormLabel>
                            <div className="relative">
                              <Input
                                placeholder="Search products..."
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                ref={productSearchRef}
                              />
                              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                              
                              {productSearchTerm && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                  {filteredProducts.map((product) => (
                                    <div
                                      key={product.id}
                                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                      onClick={() => selectProduct(product, index)}
                                    >
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-sm text-gray-500">
                                        SKU: {product.sku} • {formatCurrency(product.price)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.productName`}
                              render={({ field }) => (
                                <Input {...field} className="mt-2" placeholder="Selected product" readOnly />
                              )}
                            />
                          </div>
                          
                          {/* Quantity */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1"
                                    {...field} 
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Unit Cost */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitCost`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Cost</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.01"
                                      className="pl-10"
                                      {...field} 
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Discount % */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.discount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Discount %</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    placeholder="0"
                                    {...field} 
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Tax Rate % */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.taxRate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax %</FormLabel>
                                <FormControl>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Tax %" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">0%</SelectItem>
                                      <SelectItem value="5">5%</SelectItem>
                                      <SelectItem value="12">12%</SelectItem>
                                      <SelectItem value="18">18%</SelectItem>
                                      <SelectItem value="28">28%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Item Total & Remove Button */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="text-lg font-medium">
                            Item Total: {formatCurrency(watchedItems[index]?.amount || 0)}
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Financial Summary Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-600" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="freightCharges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Freight Charges</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
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
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any remarks..."
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                {/* Total Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Amount:</span>
                      <span className="font-medium">{formatCurrency(form.watch("grossAmount"))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(form.watch("discountAmount"))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Amount:</span>
                      <span className="font-medium">{formatCurrency(form.watch("taxAmount"))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Charges:</span>
                      <span className="font-medium">{formatCurrency((Number(form.watch("freightCharges")) + Number(form.watch("otherCharges"))))}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(form.watch("totalAmount"))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}