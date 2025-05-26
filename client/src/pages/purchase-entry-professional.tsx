import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const purchaseItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  code: z.string().optional(),
  description: z.string().optional(),
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
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.number().min(0, "Invoice amount cannot be negative").optional(),
  lrNumber: z.string().optional(),
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
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    freightCharges: 0,
    grandTotal: 0
  });

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
      invoiceNumber: "",
      invoiceDate: "",
      invoiceAmount: 0,
      lrNumber: "",
      remarks: "",
      items: [
        {
          productId: 0,
          code: "",
          description: "",
          quantity: 1,
          receivedQty: 0,
          freeQty: 0,
          unitCost: 0,
          sellingPrice: 0,
          mrp: 0,
          hsnCode: "",
          taxPercentage: 18,
          discountAmount: 0,
          expiryDate: "",
          batchNumber: "",
          netCost: 0,
          roiPercent: 0,
          grossProfitPercent: 0,
          netAmount: 0,
          cashPercent: 0,
          cashAmount: 0,
          location: "",
          unit: "PCS",
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

  // Watch for changes in items array to recalculate totals
  const watchedItems = useWatch({
    control: form.control,
    name: "items"
  });

  // Calculate totals when items change
  useEffect(() => {
    const items = form.getValues("items") || [];

    let totalItems = 0;
    let totalQuantity = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let freightCharges = 0;

    items.forEach((item) => {
      if (item.productId && item.productId > 0) {
        totalItems++;
        // Use receivedQty instead of quantity for proper calculation
        const receivedQty = Number(item.receivedQty) || 0;
        totalQuantity += receivedQty;

        const itemCost = (item.unitCost || 0) * receivedQty;
        subtotal += itemCost;

        // Calculate discount
        const discount = item.discountAmount || 0;
        totalDiscount += discount;

        // Calculate tax (GST)
        const taxableAmount = itemCost - discount;
        const tax = (taxableAmount * (item.taxPercentage || 0)) / 100;
        totalTax += tax;
      }
    });

    // Add freight charges (could be configurable)
    freightCharges = 0; // Set based on your business logic

    const grandTotal = subtotal - totalDiscount + totalTax + freightCharges;

    // Update the summary state
    setSummary({
      totalItems,
      totalQuantity,
      subtotal,
      totalDiscount: -totalDiscount,
      totalTax: totalTax,
      freightCharges,
      grandTotal
    });
  }, [watchedItems, form]);

  // Dynamic product selection handler
  const handleProductSelection = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Auto-populate fields based on selected product
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.description || product.name);
      form.setValue(`items.${index}.unitCost`, parseFloat(product.price) || 0);
      form.setValue(`items.${index}.mrp`, parseFloat(product.price) * 1.2 || 0); // Auto-calculate MRP with 20% markup
      form.setValue(`items.${index}.sellingPrice`, parseFloat(product.price) || 0);
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");

      // Calculate GST automatically
      const cgstRate = parseFloat(product.cgstRate || "0");
      const sgstRate = parseFloat(product.sgstRate || "0");
      const igstRate = parseFloat(product.igstRate || "0");
      const totalGst = cgstRate + sgstRate + igstRate;

      if (totalGst > 0) {
        form.setValue(`items.${index}.taxPercentage`, totalGst);
      }

      toast({
        title: "Product Selected! 🎯",
        description: `${product.name} added with auto-populated details.`,
      });
    }
  };

  // Enhanced dynamic add item function
  const addItem = () => {
    // Generate unique batch number for new items
    const newBatchNumber = `BATCH-${Date.now().toString().slice(-6)}`;

    append({
      productId: 0,
      code: "",
      description: "",
      quantity: 1,
      receivedQty: 0,
      freeQty: 0,
      unitCost: 0,
      sellingPrice: 0,
      mrp: 0,
      hsnCode: "",
      taxPercentage: 18,
      discountAmount: 0,
      discountPercent: 0,
      expiryDate: "",
      batchNumber: newBatchNumber,
      netCost: 0,
      roiPercent: 0,
      grossProfitPercent: 0,
      netAmount: 0,
      cashPercent: 0,
      cashAmount: 0,
      location: "",
      unit: "PCS",
    });

    toast({
      title: "New Item Added! ✨",
      description: `Line item ${fields.length + 1} added successfully. Ready for product selection.`,
    });
  };

  // Enhanced remove item function with better validation
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      toast({
        title: "Item Removed! 🗑️",
        description: `Line item ${index + 1} removed successfully. Totals updated automatically.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Remove! ⚠️",
        description: "At least one line item is required for the purchase order.",
      });
    }
  };

  // Handle form submission
  const onSubmit = (data: PurchaseFormData) => {
    try {
      // Calculate total purchase value
      const totalValue = data.items.reduce((total, item) => {
        const qty = Number(item.receivedQty) || Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return total + (qty * cost);
      }, 0);

      // Create purchase data with proper structure
      const purchaseData = {
        supplierId: Number(data.supplierId),
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate || data.orderDate,
        paymentTerms: data.paymentTerms || "Net 30",
        paymentMethod: data.paymentMethod || "Credit",
        status: data.status || "Pending",
        priority: data.priority || "normal",
        shippingAddress: data.shippingAddress || "",
        billingAddress: data.billingAddress || "",
        shippingMethod: data.shippingMethod || "standard",
        freightAmount: Number(data.freightAmount) || 0,
        taxAmount: Number(data.taxAmount) || summary.totalTax,
        discountAmount: Number(data.discountAmount) || Math.abs(summary.totalDiscount),
        invoiceNumber: data.invoiceNumber || "",
        invoiceDate: data.invoiceDate || "",
        invoiceAmount: Number(data.invoiceAmount) || 0,
        lrNumber: data.lrNumber || "",
        remarks: data.remarks || "",
        internalNotes: data.internalNotes || "",
        total: totalValue.toString(),
        items: data.items
          .filter(item => item.productId && item.productId > 0)
          .map(item => ({
            productId: Number(item.productId),
            quantity: Number(item.receivedQty) || Number(item.quantity) || 1,
            unitCost: Number(item.unitCost) || 0,
            taxPercentage: Number(item.taxPercentage) || 0,
            discountAmount: Number(item.discountAmount) || 0,
            hsnCode: item.hsnCode || "",
            expiryDate: item.expiryDate || null,
            batchNumber: item.batchNumber || "",
            sellingPrice: Number(item.sellingPrice) || 0,
            mrp: Number(item.mrp) || 0,
            freeQty: Number(item.freeQty) || 0,
            location: item.location || "",
            unit: item.unit || "PCS",
          }))
      };

      // Submit the purchase data
      createPurchaseMutation.mutate(purchaseData);
    } catch (error) {
      console.error("Error preparing purchase data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare purchase data. Please check your entries and try again.",
      });
    }
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
                </CardContent>
              </Card>

              {/* Invoice Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input
                        {...form.register("invoiceNumber")}
                        placeholder="Enter invoice number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoiceDate">Invoice Date</Label>
                      <Input
                        type="date"
                        {...form.register("invoiceDate")}
                        placeholder="dd-mm-yyyy"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoiceAmount">Invoice Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register("invoiceAmount", { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lrNumber">LR Number</Label>
                      <Input
                        {...form.register("lrNumber")}
                        placeholder="Enter LR number"
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
                    <div className="min-w-[2400px] bg-white">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-blue-50 border-b-2 border-blue-200">
                            <TableHead className="w-16 text-center font-bold border-r px-2 py-3">No</TableHead>
                            <TableHead className="w-32 font-bold border-r px-2 py-3">Code</TableHead>
                            <TableHead className="min-w-[200px] font-bold border-r px-2 py-3">Product Name</TableHead>
                            <TableHead className="min-w-[150px] font-bold border-r px-2 py-3">Description</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Received Qty</TableHead>
                            <TableHead className="w-24 text-center font-bold border-r px-2 py-3">Free Qty</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Cost</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">HSN Code</TableHead>
                            <TableHead className="w-20 text-center font-bold border-r px-2 py-3">Tax %</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Disc Amt</TableHead>
                            <TableHead className="w-32 text-center font-bold border-r px-2 py-3">Exp. Date</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Net Cost</TableHead>
                            <TableHead className="w-24 text-center font-bold border-r px-2 py-3">ROI %</TableHead>
                            <TableHead className="w-32 text-center font-bold border-r px-2 py-3">Gross Profit %</TableHead>
                            <TableHead className="w-32 text-center font-bold border-r px-2 py-3">Selling Price</TableHead>
                            <TableHead className="w-24 text-center font-bold border-r px-2 py-3">MRP</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Amount</TableHead>
                            <TableHead className="w-32 text-center font-bold border-r px-2 py-3">Net Amount</TableHead>
                            <TableHead className="w-24 text-center font-bold border-r px-2 py-3">Cash %</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Cash Amt</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Batch No</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r px-2 py-3">Location</TableHead>
                            <TableHead className="w-24 text-center font-bold border-r px-2 py-3">Unit</TableHead>
                            <TableHead className="w-20 text-center font-bold px-2 py-3">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));

                            // Calculate values
                            const qty = form.watch(`items.${index}.receivedQty`) || 0;
                            const freeQty = form.watch(`items.${index}.freeQty`) || 0;
                            const cost = form.watch(`items.${index}.unitCost`) || 0;
                            const discountAmount = form.watch(`items.${index}.discountAmount`) || 0;
                            const taxPercent = form.watch(`items.${index}.taxPercentage`) || 0;
                            const cashPercent = form.watch(`items.${index}.cashPercent`) || 0;
                            const sellingPrice = form.watch(`items.${index}.sellingPrice`) || 0;

                            const amount = qty * cost;
                            const netCost = cost + (cost * taxPercent / 100) - discountAmount;
                            const netAmount = amount - discountAmount + (amount * taxPercent / 100);
                            const cashAmount = amount * cashPercent / 100;
                            const roiPercent = sellingPrice > 0 && netCost > 0 ? ((sellingPrice - netCost) / netCost) * 100 : 0;
                            const grossProfitPercent = sellingPrice > 0 ? ((sellingPrice - netCost) / sellingPrice) * 100 : 0;

                            return (
                              <TableRow key={field.id} className="hover:bg-gray-50">
                                <TableCell className="text-center font-medium border-r px-2 py-3">
                                  {index + 1}
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    {...form.register(`items.${index}.code`)}
                                    className="w-full text-xs"
                                    placeholder="Code"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Select onValueChange={(value) => handleProductSelection(index, parseInt(value))}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id.toString()}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{product.name}</span>
                                            <span className="text-xs text-gray-500">{product.sku}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    {...form.register(`items.${index}.description`)}
                                    className="w-full text-xs"
                                    placeholder="Description"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    {...form.register(`items.${index}.receivedQty`, { 
                                      valueAsNumber: true,
                                      onChange: () => {
                                        // Trigger recalculation when quantity changes
                                        setTimeout(() => form.trigger(`items.${index}`), 100);
                                      }
                                    })}
                                    className="w-full text-center text-xs"
                                    placeholder="0"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    {...form.register(`items.${index}.freeQty`, { valueAsNumber: true })}
                                    className="w-full text-center text-xs"
                                    placeholder="0"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      {...form.register(`items.${index}.unitCost`, { 
                                        valueAsNumber: true,
                                        onChange: (e) => {
                                          const value = parseFloat(e.target.value) || 0;
                                          form.setValue(`items.${index}.unitCost`, value);

                                          // Auto-calculate net amount
                                          const quantity = form.getValues(`items.${index}.quantity`) || 0;
                                          const discount = form.getValues(`items.${index}.discountAmount`) || 0;
                                          const taxPercentage = form.getValues(`items.${index}.taxPercentage`) || 0;

                                          const subtotal = value * quantity;
                                          const taxableAmount = subtotal - discount;
                                          const tax = (taxableAmount * taxPercentage) / 100;
                                          const netAmount = taxableAmount + tax;

                                          form.setValue(`items.${index}.netAmount`, netAmount);
                                        }
                                      })}
                                      className="w-full text-right text-xs pl-6"
                                      placeholder="0"
                                    />
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    {...form.register(`items.${index}.hsnCode`)}
                                    className="w-full text-center text-xs"
                                    placeholder="HSN"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    {...form.register(`items.${index}.taxPercentage`, { valueAsNumber: true })}
                                    className="w-full text-center text-xs"
                                    placeholder="0"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      {...form.register(`items.${index}.discountAmount`, { valueAsNumber: true })}
                                      className="w-full text-right text-xs pl-6"
                                      placeholder="0"
                                    />
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="date"
                                    {...form.register(`items.${index}.expiryDate`)}
                                    className="w-full text-xs"
                                    placeholder="dd-mm-yyyy"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                                    <span className="text-xs">₹</span>
                                    <span className="ml-1 font-medium">{netCost.toFixed(0)}</span>
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                                    <span className="font-medium">{roiPercent.toFixed(2)}</span>
                                    <span className="text-xs ml-1">%</span>
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                                                                   <span className="font-medium">{grossProfitPercent.toFixed(2)}</span>
                                    <span className="text-xs ml-1">%</span>
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      {...form.register(`items.${index}.sellingPrice`, { valueAsNumber: true })}
                                      className="w-full text-right text-xs pl-6"
                                      placeholder="0"
                                    />
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      {...form.register(`items.${index}.mrp`, { valueAsNumber: true })}
                                      className="w-full text-right text-xs pl-6"
                                      placeholder="0"
                                    />
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-blue-50 rounded text-xs">
                                    {amount > 0 ? (
                                      <>
                                        <span className="text-xs font-medium text-blue-700">₹</span>
                                        <span className="font-medium text-blue-700 ml-1">{amount.toFixed(0)}</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-green-50 rounded text-xs">
                                    {netAmount > 0 ? (
                                      <>
                                        <span className="text-xs font-medium text-green-700">₹</span>
                                        <span className="font-medium text-green-700 ml-1">{netAmount.toFixed(0)}</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    {...form.register(`items.${index}.cashPercent`, { valueAsNumber: true })}
                                    className="w-full text-center text-xs"
                                    placeholder="0"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                                    {cashAmount > 0 ? (
                                      <>
                                        <span className="text-xs">₹</span>
                                        <span className="font-medium ml-1">{cashAmount.toFixed(0)}</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    {...form.register(`items.${index}.batchNumber`)}
                                    className="w-full text-xs"
                                    placeholder="Batch #"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    {...form.register(`items.${index}.location`)}
                                    className="w-full text-xs"
                                    placeholder="Location"
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Select onValueChange={(value) => form.setValue(`items.${index}.unit`, value)} defaultValue="PCS">
                                    <SelectTrigger className="w-full text-xs">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PCS">PCS</SelectItem>
                                      <SelectItem value="KG">KG</SelectItem>
                                      <SelectItem value="LTR">LTR</SelectItem>
                                      <SelectItem value="BOX">BOX</SelectItem>
                                      <SelectItem value="PACK">PACK</SelectItem>
                                      <SelectItem value="DOZEN">DOZEN</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="px-2 py-3">
                                  <div className="flex items-center justify-center">
                                    {fields.length > 1 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8 rounded-full"
                                        title="Delete item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled
                                        className="text-gray-300 p-1 h-8 w-8 rounded-full cursor-not-allowed"
                                        title="Cannot delete the last item"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
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
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Order Details */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Details</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Number:</span>
                            <span className="font-medium">{form.watch("orderNumber") || "PO-32232115"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Date:</span>
                            <span className="font-medium">{form.watch("orderDate") || "2025-05-26"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Terms:</span>
                            <span className="font-medium">{form.watch("paymentTerms") || "Net 30"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                              {form.watch("status") || "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Financial Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Items:</span>
                            <span className="font-medium">{summary.totalItems}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Quantity:</span>
                            <span className="font-medium">{summary.totalQuantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Total Discount:</span>
                            <span className="font-medium">{formatCurrency(summary.totalDiscount)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Total Tax (GST):</span>
                            <span className="font-medium">+{formatCurrency(summary.totalTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Freight Charges:</span>
                            <span className="font-medium">+{formatCurrency(summary.freightCharges)}</span>
                          </div>

                          <div className="border-t pt-3 mt-4">
                            <div className="flex justify-between text-xl font-bold text-blue-600">
                              <span>Grand Total:</span>
                              <span>{formatCurrency(summary.grandTotal)}</span>
                            </div>
                          </div>
                        </div>
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
};