import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Printer, ArrowLeft, Trash2, Package } from "lucide-react";
import { Link } from "wouter";

const purchaseItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  receivedQty: z.number().min(0, "Received quantity cannot be negative").optional(),
  freeQty: z.number().min(0, "Free quantity cannot be negative").optional(),
  unitCost: z.number().min(0, "Unit cost must be at least 0"),
  sellingPrice: z.number().min(0, "Selling price must be at least 0").optional(),
  mrp: z.number().min(0, "MRP must be at least 0").optional(),
  hsnCode: z.string().optional(),
  taxPercentage: z.number().min(0).max(100, "Tax percentage must be between 0 and 100").optional(),
  discountAmount: z.number().min(0, "Discount amount cannot be negative").optional(),
  discountPercent: z.number().min(0).max(100, "Discount percentage must be between 0 and 100").optional(),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  netCost: z.number().min(0, "Net cost cannot be negative").optional(),
  roiPercent: z.number().min(0, "ROI percentage cannot be negative").optional(),
  grossProfitPercent: z.number().min(0, "Gross profit percentage cannot be negative").optional(),
  netAmount: z.number().min(0, "Net amount cannot be negative").optional(),
  cashPercent: z.number().min(0).max(100, "Cash percentage must be between 0 and 100").optional(),
  cashAmount: z.number().min(0, "Cash amount cannot be negative").optional(),
  location: z.string().optional(),
  unit: z.string().optional(),
});

const purchaseSchema = z.object({
  supplierId: z.number().min(1, "Supplier is required"),
  orderNumber: z.string().min(3, "Order number must be at least 3 characters"),
  orderDate: z.string().nonempty("Order date is required"),
  expectedDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingMethod: z.string().optional(),
  freightAmount: z.number().min(0, "Freight amount cannot be negative").optional(),
  taxAmount: z.number().min(0, "Tax amount cannot be negative").optional(),
  discountAmount: z.number().min(0, "Discount amount cannot be negative").optional(),
  remarks: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  price: string;
  hsnCode?: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
}

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  
  // Get current date for defaults
  const today = new Date().toISOString().split('T')[0];
  
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      orderNumber: `PO-${Date.now().toString().slice(-8)}`,
      orderDate: today,
      expectedDate: "",
      paymentTerms: "Net 30",
      paymentMethod: "Credit",
      status: "Pending",
      remarks: "",
      items: [
        {
          productId: 0,
          quantity: 1,
          receivedQty: 0,
          freeQty: 0,
          unitCost: 0,
          hsnCode: "",
          taxPercentage: 18,
          discountAmount: 0,
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error creating purchase order",
        description: error.message || "Please try again.",
      });
    },
  });

  const onSubmit = (data: PurchaseFormData) => {
    console.log("Form data:", data);
    
    // Validate items have proper values
    const validItems = data.items.filter(item => item.productId > 0 && item.quantity > 0 && item.unitCost > 0);
    
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid items",
        description: "Please add at least one item with valid product, quantity, and unit cost.",
      });
      return;
    }

    // Calculate total
    const total = validItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitCost;
      const discount = item.discountAmount || 0;
      return sum + (subtotal - discount);
    }, 0);

    const purchaseData = {
      supplierId: data.supplierId,
      orderNumber: data.orderNumber,
      orderDate: data.orderDate,
      expectedDate: data.expectedDate || null,
      paymentTerms: data.paymentTerms || "Net 30",
      paymentMethod: data.paymentMethod || "Credit",
      status: data.status || "Pending",
      remarks: data.remarks || "",
      total: total.toString(),
      items: validItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        receivedQty: item.receivedQty || 0,
        unitCost: item.unitCost,
        subtotal: (item.quantity * item.unitCost) - (item.discountAmount || 0),
        hsnCode: item.hsnCode || "",
        taxPercentage: item.taxPercentage || 0,
        discountAmount: item.discountAmount || 0,
      })),
    };

    console.log("Submitting purchase data:", purchaseData);
    createPurchaseMutation.mutate(purchaseData);
  };

  // Add new item
  const addItem = () => {
    append({
      productId: 0,
      quantity: 1,
      receivedQty: 0,
      freeQty: 0,
      unitCost: 0,
      hsnCode: "",
      taxPercentage: 18,
      discountAmount: 0,
    });
  };

  // Calculate subtotal for an item
  const calculateSubtotal = (quantity: number, unitCost: number, discountAmount: number = 0) => {
    return (quantity * unitCost) - discountAmount;
  };

  // Calculate total
  const calculateTotal = () => {
    const items = form.watch("items");
    return items.reduce((sum, item) => {
      if (item.productId > 0 && item.quantity > 0 && item.unitCost > 0) {
        return sum + calculateSubtotal(item.quantity, item.unitCost, item.discountAmount || 0);
      }
      return sum;
    }, 0);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/purchase-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Purchases
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Purchase Entry</h1>
              <p className="text-muted-foreground">Create new purchase order</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createPurchaseMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Purchase Details</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Purchase Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Purchase Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Supplier *</Label>
                      <Select onValueChange={(value) => form.setValue("supplierId", parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Order Number *</Label>
                      <Input
                        {...form.register("orderNumber")}
                        placeholder="PO-12345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orderDate">Order Date *</Label>
                      <Input
                        type="date"
                        {...form.register("orderDate")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectedDate">Expected Date</Label>
                      <Input
                        type="date"
                        {...form.register("expectedDate")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select onValueChange={(value) => form.setValue("paymentTerms", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15">Net 15 Days</SelectItem>
                          <SelectItem value="Net 30">Net 30 Days</SelectItem>
                          <SelectItem value="Net 45">Net 45 Days</SelectItem>
                          <SelectItem value="Net 60">Net 60 Days</SelectItem>
                          <SelectItem value="Cash">Cash on Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select onValueChange={(value) => form.setValue("paymentMethod", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Credit">Credit</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Order Status</Label>
                      <Select onValueChange={(value) => form.setValue("status", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_approval">Pending Approval</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="partially_received">Partially Received</SelectItem>
                          <SelectItem value="received">Fully Received</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select onValueChange={(value) => form.setValue("priority", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingMethod">Shipping Method</Label>
                      <Select onValueChange={(value) => form.setValue("shippingMethod", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shipping method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Delivery</SelectItem>
                          <SelectItem value="express">Express Delivery</SelectItem>
                          <SelectItem value="overnight">Overnight</SelectItem>
                          <SelectItem value="pickup">Supplier Pickup</SelectItem>
                          <SelectItem value="freight">Freight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="freightAmount">Freight Amount (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register("freightAmount", { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingAddress">Shipping Address</Label>
                      <Textarea
                        {...form.register("shippingAddress")}
                        placeholder="Enter shipping address..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingAddress">Billing Address</Label>
                      <Textarea
                        {...form.register("billingAddress")}
                        placeholder="Enter billing address..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="remarks">Public Remarks</Label>
                      <Textarea
                        {...form.register("remarks")}
                        placeholder="Remarks visible to supplier..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="internalNotes">Internal Notes</Label>
                      <Textarea
                        {...form.register("internalNotes")}
                        placeholder="Internal notes (not visible to supplier)..."
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Line Items Tab */}
            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    <Button onClick={addItem} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 text-xs">
                          <TableHead className="w-8">Sno</TableHead>
                          <TableHead className="w-16">Code</TableHead>
                          <TableHead className="min-w-32">Product Name</TableHead>
                          <TableHead className="w-20">Description</TableHead>
                          <TableHead className="w-20 text-center">Received Qty</TableHead>
                          <TableHead className="w-20 text-center">Free Qty</TableHead>
                          <TableHead className="w-20 text-right">Cost</TableHead>
                          <TableHead className="w-16">HSN Code</TableHead>
                          <TableHead className="w-16 text-center">Tax %</TableHead>
                          <TableHead className="w-20 text-right">Disc Amt</TableHead>
                          <TableHead className="w-20">Exp. Date</TableHead>
                          <TableHead className="w-20 text-right">Net Cost</TableHead>
                          <TableHead className="w-16 text-center">ROI %</TableHead>
                          <TableHead className="w-20 text-center">Gross Profit %</TableHead>
                          <TableHead className="w-20 text-right">Selling Price</TableHead>
                          <TableHead className="w-20 text-right">MRP</TableHead>
                          <TableHead className="w-20 text-right">Amount</TableHead>
                          <TableHead className="w-20 text-right">Net Amount</TableHead>
                          <TableHead className="w-16 text-center">Cash %</TableHead>
                          <TableHead className="w-20 text-right">Cash Amt</TableHead>
                          <TableHead className="w-20">Batch No</TableHead>
                          <TableHead className="w-20">Location</TableHead>
                          <TableHead className="w-16">Unit</TableHead>
                          <TableHead className="w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));
                          
                          return (
                            <TableRow key={field.id} className="text-xs">
                              <TableCell className="text-center font-medium">{index + 1}</TableCell>
                              
                              <TableCell>
                                <span className="text-xs text-gray-600">
                                  {selectedProduct?.sku || "Code"}
                                </span>
                              </TableCell>
                              
                              <TableCell>
                                <Select onValueChange={(value) => {
                                  const productId = parseInt(value);
                                  const product = products.find(p => p.id === productId);
                                  form.setValue(`items.${index}.productId`, productId);
                                  if (product) {
                                    form.setValue(`items.${index}.unitCost`, parseFloat(product.price) || 0);
                                    form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
                                    form.setValue(`items.${index}.mrp`, parseFloat(product.mrp) || 0);
                                    // Auto-calculate GST if available
                                    const gstRate = parseFloat(product.cgstRate || "0") + parseFloat(product.sgstRate || "0");
                                    if (gstRate > 0) {
                                      form.setValue(`items.${index}.taxPercentage`, gstRate);
                                    }
                                  }
                                }}>
                                  <SelectTrigger className="min-w-32 text-xs">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id.toString()}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              <TableCell>
                                <span className="text-xs text-gray-600">
                                  {selectedProduct?.description || "Description"}
                                </span>
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  {...form.register(`items.${index}.receivedQty`, { valueAsNumber: true })}
                                  className="w-16 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  {...form.register(`items.${index}.freeQty`, { valueAsNumber: true })}
                                  className="w-16 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  {...form.register(`items.${index}.hsnCode`)}
                                  className="w-16 text-xs"
                                  placeholder="HSN"
                                  value={selectedProduct?.hsnCode || form.watch(`items.${index}.hsnCode`) || ""}
                                  onChange={(e) => form.setValue(`items.${index}.hsnCode`, e.target.value)}
                                />
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  {...form.register(`items.${index}.taxPercentage`, { valueAsNumber: true })}
                                  className="w-12 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>
                              
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.discountAmount`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="date"
                                  {...form.register(`items.${index}.expiryDate`)}
                                  className="w-20 text-xs"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.netCost`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.roiPercent`, { valueAsNumber: true })}
                                  className="w-12 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.grossProfitPercent`, { valueAsNumber: true })}
                                  className="w-16 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.sellingPrice`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.mrp`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell className="text-right">
                                {(() => {
                                  const receivedQty = form.watch(`items.${index}.receivedQty`) || 0;
                                  const cost = form.watch(`items.${index}.unitCost`) || 0;
                                  const discountAmount = form.watch(`items.${index}.discountAmount`) || 0;
                                  const taxPercent = form.watch(`items.${index}.taxPercentage`) || 0;
                                  
                                  const subtotal = receivedQty * cost;
                                  const taxableAmount = subtotal - discountAmount;
                                  const taxAmount = (taxableAmount * taxPercent) / 100;
                                  const total = taxableAmount + taxAmount;
                                  
                                  return (
                                    <span className="font-medium text-xs">
                                      ₹{total.toFixed(0)}
                                    </span>
                                  );
                                })()}
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.netAmount`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  {...form.register(`items.${index}.cashPercent`, { valueAsNumber: true })}
                                  className="w-12 text-center text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`items.${index}.cashAmount`, { valueAsNumber: true })}
                                  className="w-16 text-right text-xs"
                                  placeholder="0"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  {...form.register(`items.${index}.batchNumber`)}
                                  className="w-16 text-xs"
                                  placeholder="Batch #"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  {...form.register(`items.${index}.location`)}
                                  className="w-16 text-xs"
                                  placeholder="Location"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  {...form.register(`items.${index}.unit`)}
                                  className="w-12 text-xs"
                                  placeholder="PCS"
                                />
                              </TableCell>
                              
                              <TableCell>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold">Order Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Order Number:</span>
                          <span className="font-medium">{form.watch("orderNumber")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Order Date:</span>
                          <span className="font-medium">{form.watch("orderDate")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Terms:</span>
                          <span className="font-medium">{form.watch("paymentTerms") || "Net 30"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge variant="secondary">{form.watch("status") || "Pending"}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold">Financial Summary</h3>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const items = form.watch("items") || [];
                          let subtotal = 0;
                          let totalTax = 0;
                          let totalDiscount = 0;
                          let totalQuantity = 0;

                          items.forEach((item: any) => {
                            const qty = item.quantity || 0;
                            const cost = item.unitCost || 0;
                            const discountPercent = item.discountPercent || 0;
                            const taxPercent = item.taxPercentage || 0;
                            
                            totalQuantity += qty;
                            const itemSubtotal = qty * cost;
                            subtotal += itemSubtotal;
                            
                            const itemDiscount = (itemSubtotal * discountPercent) / 100;
                            totalDiscount += itemDiscount;
                            
                            const taxableAmount = itemSubtotal - itemDiscount;
                            const itemTax = (taxableAmount * taxPercent) / 100;
                            totalTax += itemTax;
                          });

                          const freightAmount = form.watch("freightAmount") || 0;
                          const grandTotal = subtotal - totalDiscount + totalTax + freightAmount;

                          return (
                            <>
                              <div className="flex justify-between">
                                <span>Total Items:</span>
                                <span className="font-medium">{fields.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Quantity:</span>
                                <span className="font-medium">{totalQuantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span className="font-medium">₹{subtotal.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between text-red-600">
                                <span>Total Discount:</span>
                                <span className="font-medium">-₹{totalDiscount.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between text-green-600">
                                <span>Total Tax (GST):</span>
                                <span className="font-medium">+₹{totalTax.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Freight Charges:</span>
                                <span className="font-medium">+₹{freightAmount.toFixed(0)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between text-lg font-semibold">
                                <span>Grand Total:</span>
                                <span className="text-blue-600">₹{grandTotal.toFixed(0)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {form.watch("remarks") && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Remarks</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {form.watch("remarks")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}