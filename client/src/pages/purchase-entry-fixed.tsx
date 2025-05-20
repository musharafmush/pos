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
      receivedQty: z.string().min(1, "Quantity is required"),
      freeQty: z.string().optional(),
      cost: z.string().min(1, "Cost is required"),
      hsnCode: z.string().optional(),
      taxPercentage: z.string().optional(),
      discountAmount: z.string().optional(),
      expiryDate: z.string().optional(),
      netCost: z.string().optional(),
      roiPercentage: z.string().optional(),
      grossProfitPercentage: z.string().optional(),
      sellingPrice: z.string().optional(),
      mrp: z.string().optional(),
      amount: z.string().optional(),
      netAmount: z.string().optional(),
      cashDiscountPercentage: z.string().optional(),
      cashDiscountAmount: z.string().optional(),
    })
  ),
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

export default function PurchaseEntry() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch suppliers data
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      return response.json();
    }
  });
  
  // Fetch products data
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });
  
  // Form definition
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      poDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      paymentType: "credit",
      holdBills: false,
      print: "summary",
      items: [
        {
          productId: 0,
          productName: "",
          code: "",
          receivedQty: "1",
          freeQty: "0",
          cost: "0",
          hsnCode: "",
          taxPercentage: "0",
          discountAmount: "0",
          expiryDate: "",
          netCost: "0",
          roiPercentage: "0",
          grossProfitPercentage: "0",
          sellingPrice: "0",
          mrp: "0",
          amount: "0",
          netAmount: "0",
          cashDiscountPercentage: "0",
          cashDiscountAmount: "0",
        }
      ],
    },
  });
  
  // Filter products based on search term
  const filteredProducts = products.filter((product: any) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      const response = await apiRequest('POST', '/api/purchases', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create purchase');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase entry has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      // Reset form except the dates
      const currentDate = form.getValues('poDate');
      const dueDate = form.getValues('dueDate');
      form.reset({
        poDate: currentDate,
        dueDate: dueDate,
        paymentType: "credit",
        holdBills: false,
        print: "summary",
        items: [
          {
            productId: 0,
            productName: "",
            code: "",
            receivedQty: "1",
            freeQty: "0",
            cost: "0",
            hsnCode: "",
            taxPercentage: "0",
            discountAmount: "0",
            expiryDate: "",
            netCost: "0",
            roiPercentage: "0",
            grossProfitPercentage: "0",
            sellingPrice: "0",
            mrp: "0",
            amount: "0",
            netAmount: "0",
            cashDiscountPercentage: "0",
            cashDiscountAmount: "0",
          }
        ],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Add new line item
  const addItemRow = () => {
    const items = form.getValues("items");
    form.setValue("items", [
      ...items,
      {
        productId: 0,
        productName: "",
        code: "",
        receivedQty: "1",
        freeQty: "0",
        cost: "0",
        hsnCode: "",
        taxPercentage: "0",
        discountAmount: "0",
        expiryDate: "",
        netCost: "0",
        roiPercentage: "0",
        grossProfitPercentage: "0",
        sellingPrice: "0",
        mrp: "0",
        amount: "0",
        netAmount: "0",
        cashDiscountPercentage: "0",
        cashDiscountAmount: "0",
      }
    ]);
  };
  
  // Remove line item
  const removeItemRow = (index: number) => {
    const items = form.getValues("items");
    if (items.length === 1) {
      toast({
        title: "Error",
        description: "Cannot remove all items. At least one item is required.",
        variant: "destructive",
      });
      return;
    }
    form.setValue("items", items.filter((_, i) => i !== index));
  };
  
  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s: any) => s.id === parseInt(supplierId));
    if (supplier) {
      form.setValue("supplierId", supplier.id);
      form.setValue("supplierName", supplier.name);
      form.setValue("supplierPhone", supplier.phone || "");
      form.setValue("supplierMobile", supplier.mobile || "");
      form.setValue("supplierGstNo", supplier.gstNo || "");
    }
  };
  
  // Recalculate line item amounts
  const recalculateAmounts = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    // Parse values as numbers
    const receivedQty = parseFloat(item.receivedQty) || 0;
    const cost = parseFloat(item.cost) || 0;
    const taxPercentage = parseFloat(item.taxPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;
    const sellingPrice = parseFloat(item.sellingPrice) || 0;
    const cashDiscountPercentage = parseFloat(item.cashDiscountPercentage) || 0;
    
    // Calculate values
    const netCost = cost + (cost * taxPercentage / 100) - discountAmount;
    const amount = receivedQty * cost;
    const netAmount = receivedQty * netCost;
    const cashDiscountAmount = netAmount * cashDiscountPercentage / 100;
    
    // Calculate ROI and gross profit if selling price is set
    let roiPercentage = 0;
    let grossProfitPercentage = 0;
    
    if (sellingPrice > 0 && netCost > 0) {
      roiPercentage = ((sellingPrice - netCost) / netCost) * 100;
      grossProfitPercentage = ((sellingPrice - netCost) / sellingPrice) * 100;
    }
    
    // Update form values
    form.setValue(`items.${index}.netCost`, netCost.toFixed(2));
    form.setValue(`items.${index}.amount`, amount.toFixed(2));
    form.setValue(`items.${index}.netAmount`, netAmount.toFixed(2));
    form.setValue(`items.${index}.cashDiscountAmount`, cashDiscountAmount.toFixed(2));
    form.setValue(`items.${index}.roiPercentage`, roiPercentage.toFixed(2));
    form.setValue(`items.${index}.grossProfitPercentage`, grossProfitPercentage.toFixed(2));
  };
  
  // Watch form values for calculations
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Check if the changed field is part of an item
      if (name && name.startsWith('items.')) {
        const parts = name.split('.');
        if (parts.length === 3) {
          const index = parseInt(parts[1]);
          const field = parts[2];
          
          // Only recalculate if the field is one that affects calculations
          if (['receivedQty', 'cost', 'taxPercentage', 'discountAmount', 'sellingPrice', 'cashDiscountPercentage'].includes(field)) {
            recalculateAmounts(index);
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  // Form submission
  const onSubmit = (data: PurchaseEntryFormValues) => {
    // Calculate total amounts
    const totalAmount = data.items.reduce(
      (sum, item) => sum + parseFloat(item.amount || "0"), 
      0
    );
    
    const totalNetAmount = data.items.reduce(
      (sum, item) => sum + parseFloat(item.netAmount || "0"), 
      0
    );
    
    // Set invoice amount if not provided
    if (!data.invoiceAmount) {
      data.invoiceAmount = totalNetAmount.toFixed(2);
    }
    
    createPurchaseMutation.mutate(data);
  };
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Purchase Entry</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="gap-1"
              disabled={createPurchaseMutation.isPending}
              onClick={() => form.reset()}
            >
              <XCircle className="h-4 w-4" /> Clear
            </Button>
            <Button 
              type="submit"
              className="gap-1"
              disabled={createPurchaseMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="details" className="flex-1">Order Details</TabsTrigger>
                <TabsTrigger value="items" className="flex-1">Line Items</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="poNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Auto" {...field} />
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
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="paymentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Type</FormLabel>
                              <Select
                                disabled={createPurchaseMutation.isPending}
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="credit">Credit</SelectItem>
                                  <SelectItem value="cheque">Cheque</SelectItem>
                                  <SelectItem value="online">Online</SelectItem>
                                </SelectContent>
                              </Select>
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
                                <Input type="date" {...field} />
                              </FormControl>
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
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 py-2">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={createPurchaseMutation.isPending}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Hold Bills</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="print"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Print</FormLabel>
                              <Select
                                disabled={createPurchaseMutation.isPending}
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select print type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="summary">Summary</SelectItem>
                                  <SelectItem value="detailed">Detailed</SelectItem>
                                  <SelectItem value="none">No Print</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Supplier Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Supplier Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <Select
                              disabled={createPurchaseMutation.isPending}
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                handleSupplierChange(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((supplier: any) => (
                                  <SelectItem 
                                    key={supplier.id} 
                                    value={supplier.id.toString()}
                                  >
                                    {supplier.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="supplierPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Phone" 
                                  {...field} 
                                  disabled
                                />
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
                                <Input 
                                  placeholder="Mobile" 
                                  {...field} 
                                  disabled
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="supplierGstNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="GST Number" 
                                {...field} 
                                disabled
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Invoice Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Invoice Number" {...field} />
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Amount</FormLabel>
                              <FormControl>
                                <Input placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="lrNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LR Number</FormLabel>
                              <FormControl>
                                <Input placeholder="LR Number" {...field} />
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
                </div>
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
                            <TableRow className="bg-muted/50 sticky top-0">
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
                            {form.getValues("items").map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                
                                {/* Code */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.code`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Product Selection */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.productName`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
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
                                                  ((parseFloat(product.price?.toString() || "0")) * 1.1).toFixed(2)
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
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Received Quantity */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.receivedQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="1"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Free Quantity */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.freeQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="1"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Cost */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* HSN Code */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.hsnCode`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Tax % */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.taxPercentage`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Discount Amount */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.discountAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Expiry Date */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.expiryDate`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full" type="date" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Net Cost - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.netCost`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* ROI % - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.roiPercentage`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Gross Profit % - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.grossProfitPercentage`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Selling Price */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.sellingPrice`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* MRP */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.mrp`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
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
                                
                                {/* Amount - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.amount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Net Amount - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.netAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Cash Discount % */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cashDiscountPercentage`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              recalculateAmounts(index);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Cash Discount Amount - Calculated Field */}
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cashDiscountAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full" 
                                            readOnly
                                            disabled
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                
                                {/* Actions */}
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItemRow(index)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
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
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}