import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Calendar, 
  CreditCard, 
  FilePlus, 
  Trash2, 
  Save, 
  Printer, 
  XCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Form schema
const purchaseEntrySchema = z.object({
  // Order details
  poNo: z.string().optional(),
  poDate: z.string().min(1, "Please select a PO date"),
  dueDate: z.string().min(1, "Please select a due date"),
  paymentType: z.string().min(1, "Please select a payment type"),
  
  // Supplier details
  supplierId: z.number({
    required_error: "Please select a supplier",
  }),
  supplierCode: z.string().optional(),
  supplierName: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierMobile: z.string().optional(),
  supplierGstNo: z.string().optional(),
  
  // Invoice details
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.string().optional(),
  lrNo: z.string().optional(),
  
  // Additional fields
  holdBills: z.boolean().optional(),
  print: z.string().optional(),
  remarks: z.string().optional(),
  
  // Items array
  items: z.array(
    z.object({
      productId: z.number({
        required_error: "Product is required",
      }),
      productName: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      receivedQty: z.string()
        .min(1, "Quantity is required")
        .refine(val => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
      freeQty: z.string().optional(),
      cost: z.string()
        .min(1, "Cost is required")
        .refine(val => !isNaN(Number(val)) && Number(val) >= 0, "Must be a positive number"),
      hsnCode: z.string().optional(),
      taxPercent: z.string().default("0"),
      discountAmount: z.string().default("0"),
      expiryDate: z.string().optional(),
      netCost: z.string().optional(),
      roiPercent: z.string().optional(),
      grossProfitPercent: z.string().optional(),
      sellingPrice: z.string().optional(),
      mrp: z.string().optional(),
      amount: z.string().optional(),
      netAmount: z.string().optional(),
      cashDiscountPercent: z.string().optional(),
      cashDiscountAmount: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
  
  // Totals
  grossAmount: z.string().optional(),
  itemDiscountAmount: z.string().optional(),
  cashDiscountPercent: z.string().optional(),
  cashDiscountAmount: z.string().optional(),
  taxAmount: z.string().optional(),
  surchargeAmount: z.string().optional(),
  freightAmount: z.string().optional(),
  packingCharge: z.string().optional(),
  otherCharge: z.string().optional(),
  manualDiscountAmount: z.string().optional(),
  prAdjustedAmount: z.string().optional(),
  otherChargeTax: z.string().optional(),
  extraCess: z.string().optional(),
  roundoffAmount: z.string().optional(),
  payableAmount: z.string().optional(),
  freightPayable: z.string().optional(),
  packingPayable: z.string().optional(),
  goodsTes: z.string().optional(),
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

// Empty purchase item for initialization
const emptyPurchaseItem = {
  productId: 0,
  code: "",
  productName: "",
  description: "",
  receivedQty: "1",
  freeQty: "0",
  cost: "0",
  hsnCode: "",
  taxPercent: "0",
  discountAmount: "0",
  expiryDate: "",
  netCost: "0",
  roiPercent: "0",
  grossProfitPercent: "0",
  sellingPrice: "0",
  mrp: "0",
  amount: "0",
  netAmount: "0",
  cashDiscountPercent: "0",
  cashDiscountAmount: "0",
};

// Main component
export default function PurchaseEntry() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [searchTerm, setSearchTerm] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Initialize form
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      poDate: today,
      dueDate: today,
      paymentType: "cash",
      holdBills: false,
      print: "yes",
      items: [{ ...emptyPurchaseItem }],
    },
  });
  
  // Watch form values to calculate totals
  const watchedItems = form.watch("items");
  
  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/suppliers");
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        const data = await res.json();
        return data.map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name,
          code: supplier.id.toString(),
          phone: supplier.phone || "",
          mobile: supplier.phone || "", // Using phone as mobile if available
          gstNo: supplier.taxId || ""
        }));
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
  });
  
  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        return data.map((product: any) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          cost: product.cost || product.price, // Use price as default cost if cost is not available
          hsnCode: product.hsnCode || "",
          stockQuantity: product.stockQuantity || 0
        }));
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
  });
  
  // Filter products based on search term
  const filteredProducts = searchTerm
    ? products.filter((product: any) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;
  
  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      const res = await apiRequest("POST", "/api/purchases", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order created",
        description: "The purchase order has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      form.reset();
      form.setValue("items", [{ ...emptyPurchaseItem }]);
      form.setValue("poDate", today);
      form.setValue("dueDate", today);
    },
    onError: (error) => {
      toast({
        title: "Error creating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Function to add a new item row
  const addItemRow = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [...currentItems, { ...emptyPurchaseItem }]);
  };
  
  // Function to remove an item row
  const removeItemRow = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue(
        "items",
        currentItems.filter((_, i) => i !== index)
      );
    }
  };
  
  // Function to recalculate amounts for a specific item
  const recalculateAmounts = (index: number) => {
    // Get all the values
    const receivedQty = Number(form.getValues(`items.${index}.receivedQty`)) || 0;
    const cost = Number(form.getValues(`items.${index}.cost`)) || 0;
    const discountAmount = Number(form.getValues(`items.${index}.discountAmount`)) || 0;
    const taxPercent = Number(form.getValues(`items.${index}.taxPercent`)) || 0;
    const sellingPrice = Number(form.getValues(`items.${index}.sellingPrice`)) || 0;
    const cashDiscountPercent = Number(form.getValues(`items.${index}.cashDiscountPercent`)) || 0;

    // Calculate basic amounts
    const amount = receivedQty * cost;
    const amountAfterDisc = amount - discountAmount;
    const taxAmount = amountAfterDisc * (taxPercent / 100);
    const netAmount = amountAfterDisc + taxAmount;
    const cashDiscountAmount = amount * (cashDiscountPercent / 100);

    // Calculate net cost (including tax, discounts)
    const netCost = netAmount / receivedQty; // Per unit cost after all calculations

    // Calculate profit metrics if selling price is available
    let roiPercent = 0;
    let grossProfitPercent = 0;
    
    if (sellingPrice > 0 && netCost > 0) {
      roiPercent = ((sellingPrice - netCost) / netCost) * 100;
      grossProfitPercent = ((sellingPrice - netCost) / sellingPrice) * 100;
    }

    // Update calculated fields
    form.setValue(`items.${index}.amount`, amount.toFixed(2));
    form.setValue(`items.${index}.netAmount`, netAmount.toFixed(2));
    form.setValue(`items.${index}.netCost`, netCost.toFixed(2));
    form.setValue(`items.${index}.cashDiscountAmount`, cashDiscountAmount.toFixed(2));
    form.setValue(`items.${index}.roiPercent`, roiPercent.toFixed(2));
    form.setValue(`items.${index}.grossProfitPercent`, grossProfitPercent.toFixed(2));
  };

  // Calculate totals whenever items change
  useEffect(() => {
    if (watchedItems && watchedItems.length > 0) {
      let grossAmount = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalCashDiscount = 0;
      
      watchedItems.forEach((item, index) => {
        // Recalculate each item to ensure consistency
        recalculateAmounts(index);
        
        // Add to totals
        const amount = Number(form.getValues(`items.${index}.amount`)) || 0;
        const discountAmount = Number(form.getValues(`items.${index}.discountAmount`)) || 0;
        const taxPercent = Number(form.getValues(`items.${index}.taxPercent`)) || 0;
        const amountAfterDisc = amount - discountAmount;
        const taxAmount = amountAfterDisc * (taxPercent / 100);
        const cashDiscountAmount = Number(form.getValues(`items.${index}.cashDiscountAmount`)) || 0;
        
        grossAmount += amount;
        totalDiscount += discountAmount;
        totalTax += taxAmount;
        totalCashDiscount += cashDiscountAmount;
      });
      
      // Update summary fields
      form.setValue("grossAmount", grossAmount.toFixed(2));
      form.setValue("itemDiscountAmount", totalDiscount.toFixed(2));
      form.setValue("taxAmount", totalTax.toFixed(2));
      form.setValue("cashDiscountAmount", totalCashDiscount.toFixed(2));
      
      // Calculate payable amount
      const surchargeAmount = Number(form.getValues("surchargeAmount")) || 0;
      const freightAmount = Number(form.getValues("freightAmount")) || 0;
      const packingCharge = Number(form.getValues("packingCharge")) || 0;
      const otherCharge = Number(form.getValues("otherCharge")) || 0;
      const manualDiscountAmount = Number(form.getValues("manualDiscountAmount")) || 0;
      
      const payableAmount = (
        grossAmount - 
        totalDiscount + 
        totalTax -
        totalCashDiscount +
        surchargeAmount +
        freightAmount +
        packingCharge +
        otherCharge -
        manualDiscountAmount
      ).toFixed(2);
      
      form.setValue("payableAmount", payableAmount);
      form.setValue("invoiceAmount", payableAmount);
    }
  }, [watchedItems, form]);
  
  // Function to handle supplier selection
  const handleSupplierChange = (supplierId: string) => {
    const id = parseInt(supplierId);
    const supplier = suppliers.find((s: any) => s.id === id);
    
    if (supplier) {
      form.setValue("supplierId", id);
      form.setValue("supplierCode", supplier.code || "");
      form.setValue("supplierName", supplier.name || "");
      form.setValue("supplierPhone", supplier.phone || "");
      form.setValue("supplierMobile", supplier.mobile || "");
      form.setValue("supplierGstNo", supplier.gstNo || "");
    }
  };
  
  // Function to handle product selection
  const handleProductSelect = (productId: number, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.description`, product.name);
      form.setValue(`items.${index}.cost`, product.cost.toString());
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      form.setValue(`items.${index}.sellingPrice`, product.price.toString());
      form.setValue(`items.${index}.mrp`, product.price.toString());
      
      // Recalculate amounts
      const qty = Number(form.getValues(`items.${index}.receivedQty`)) || 0;
      const cost = Number(product.cost) || 0;
      form.setValue(`items.${index}.amount`, (qty * cost).toFixed(2));
    }
  };
  
  // Form submission handler
  const onSubmit = (data: PurchaseEntryFormValues) => {
    createPurchaseMutation.mutate(data);
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 = Save
      if (e.key === "F5") {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
      // F6 = Clear
      else if (e.key === "F6") {
        e.preventDefault();
        form.reset();
        form.setValue("items", [{ ...emptyPurchaseItem }]);
        form.setValue("poDate", today);
        form.setValue("dueDate", today);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, onSubmit, today]);
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Purchase Entry</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-1" 
              onClick={() => form.reset()}
            >
              <XCircle className="h-4 w-4" /> Clear
            </Button>
            <Button 
              variant="outline" 
              className="gap-1"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button 
              className="gap-1" 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {createPurchaseMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        
        <div className="bg-muted/30 p-1 mb-4 text-xs">
          <div className="flex gap-8">
            <div>F5: Save</div>
            <div>F6: Clear</div>
            <div>F8: Print</div>
            <div>F12: Close</div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Purchase Details</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Purchase Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Purchase Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="poNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO No.</FormLabel>
                              <FormControl>
                                <Input placeholder="Auto-generated" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="poDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO Date</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Input type="date" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Input type="date" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="paymentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="credit">Credit</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="holdBills"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Hold Bills</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="print"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Print</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Print option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Supplier Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Supplier Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <Select 
                                onValueChange={(value) => handleSupplierChange(value)}
                                defaultValue={field.value?.toString()}
                              >
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
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="supplierCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="supplierName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="supplierPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="supplierMobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supplierGstNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Number</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Invoice Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="lrNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LR No.</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="invoiceNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice No.</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                    </div>
                  </CardContent>
                </Card>
                
                {/* Remarks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter any additional notes or comments here" 
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="items">
                <Card>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Line Items</CardTitle>
                      <Button 
                        onClick={addItemRow} 
                        size="sm" 
                        className="h-8 gap-1"
                      >
                        <FilePlus className="h-4 w-4" /> Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-12">Sno</TableHead>
                              <TableHead className="w-20">Code</TableHead>
                              <TableHead className="min-w-[180px]">Description</TableHead>
                              <TableHead className="w-24">Received Qty</TableHead>
                              <TableHead className="w-24">Free Qty</TableHead>
                              <TableHead className="w-24">Cost</TableHead>
                              <TableHead className="w-24">HSN Code</TableHead>
                              <TableHead className="w-20">Tax %</TableHead>
                              <TableHead className="w-24">Disc Amt</TableHead>
                              <TableHead className="w-24">Expiry Date</TableHead>
                              <TableHead className="w-24">Net Cost</TableHead>
                              <TableHead className="w-20">ROI %</TableHead>
                              <TableHead className="w-24">Gross Profit %</TableHead>
                              <TableHead className="w-24">Selling Price</TableHead>
                              <TableHead className="w-20">MRP</TableHead>
                              <TableHead className="w-24">Amount</TableHead>
                              <TableHead className="w-24">Net Amount</TableHead>
                              <TableHead className="w-24">Cash Disc %</TableHead>
                              <TableHead className="w-24">Cash Disc Amt</TableHead>
                              <TableHead className="w-12">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.getValues("items").map((_, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.code`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            className="w-full"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.productName`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <Select
                                          disabled={createPurchaseMutation.isPending}
                                          value={field.value}
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            
                                            const product = products.find(
                                              (p: any) => p.name === value
                                            );
                                            
                                            if (product) {
                                              form.setValue(
                                                `items.${index}.productId`,
                                                product.id
                                              );
                                              form.setValue(
                                                `items.${index}.code`,
                                                product.sku || ""
                                              );
                                              form.setValue(
                                                `items.${index}.cost`,
                                                product.cost?.toString() || "0"
                                              );
                                              form.setValue(
                                                `items.${index}.hsnCode`,
                                                product.hsnCode || ""
                                              );
                                              form.setValue(
                                                `items.${index}.sellingPrice`,
                                                product.price?.toString() || "0"
                                              );
                                              form.setValue(
                                                `items.${index}.mrp`,
                                                (parseFloat(product.price || "0") * 1.1).toFixed(2)
                                              );
                                              // Initialize quantities
                                              form.setValue(
                                                `items.${index}.receivedQty`,
                                                "1"
                                              );
                                              form.setValue(
                                                `items.${index}.freeQty`,
                                                "0"
                                              );
                                              // Calculate amounts
                                              recalculateAmounts(index);
                                            }
                                          }}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select product" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {filteredProducts.map((product: any) => (
                                              <SelectItem
                                                key={product.id}
                                                value={product.name}
                                              >
                                                {product.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.receivedQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                            className="w-full"
                                            type="number"
                                            min="0"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.freeQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            className="w-full"
                                            type="number"
                                            min="0"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                            className="w-full"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.hsnCode`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            className="w-full"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.taxPercent`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                            className="w-full"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.discountAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                            className="w-full"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.expiryDate`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input
                                            {...field}
                                            disabled={createPurchaseMutation.isPending}
                                            className="w-full"
                                            type="date"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                className="w-full justify-start font-normal"
                                              >
                                                {field.value !== 0 
                                                  ? products.find((p: any) => p.id === field.value)?.name || "Select product" 
                                                  : "Select product"}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-0" align="start">
                                              <div className="p-2">
                                                <Input
                                                  placeholder="Search products..."
                                                  className="mb-2"
                                                  value={searchTerm}
                                                  onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                                <div className="max-h-[200px] overflow-y-auto">
                                                  {filteredProducts.length > 0 ? (
                                                    <div className="grid gap-1">
                                                      {filteredProducts.map((product: any) => (
                                                        <Button
                                                          key={product.id}
                                                          variant="ghost"
                                                          className="justify-start font-normal"
                                                          onClick={() => {
                                                            handleProductSelect(product.id, index);
                                                            setSearchTerm("");
                                                          }}
                                                        >
                                                          <span>{product.name}</span>
                                                          <span className="ml-auto text-muted-foreground">
                                                            {product.sku}
                                                          </span>
                                                        </Button>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <p className="text-center py-2 text-sm text-muted-foreground">
                                                      No products found
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.receivedQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
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
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.hsnCode`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.taxPercent`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.discountAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.netCost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" readOnly {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.amount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input className="w-20" readOnly {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItemRow(index)}
                                    disabled={form.getValues("items").length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Additional Charges</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="freightAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Freight Amount</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="packingCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Packing Charge</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="otherCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Other Charge</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="manualDiscountAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Manual Discount</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-muted-foreground">Gross Amount:</div>
                        <div className="text-right font-medium">
                          ₹{form.getValues("grossAmount") || "0.00"}
                        </div>
                        
                        <div className="text-muted-foreground">Item Discount:</div>
                        <div className="text-right font-medium">
                          ₹{form.getValues("itemDiscountAmount") || "0.00"}
                        </div>
                        
                        <div className="text-muted-foreground">Tax Amount:</div>
                        <div className="text-right font-medium">
                          ₹{form.getValues("taxAmount") || "0.00"}
                        </div>
                        
                        <div className="text-muted-foreground">Additional Charges:</div>
                        <div className="text-right font-medium">
                          ₹{(
                            (Number(form.getValues("freightAmount")) || 0) +
                            (Number(form.getValues("packingCharge")) || 0) +
                            (Number(form.getValues("otherCharge")) || 0)
                          ).toFixed(2)}
                        </div>
                        
                        <div className="text-muted-foreground">Manual Discount:</div>
                        <div className="text-right font-medium">
                          ₹{form.getValues("manualDiscountAmount") || "0.00"}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-base font-semibold">Payable Amount:</div>
                        <div className="text-right text-base font-bold">
                          ₹{form.getValues("payableAmount") || "0.00"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}