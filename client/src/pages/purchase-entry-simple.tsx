import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  supplierName: z.string().optional(),
  supplierGstNo: z.string().optional(),
  
  // Invoice details
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  
  // Additional fields
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
      form.reset({
        poDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        paymentType: "credit",
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
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    form.setValue("items", updatedItems);
  };
  
  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find((s: any) => s.id === parseInt(supplierId));
    if (supplier) {
      form.setValue("supplierId", supplier.id);
      form.setValue("supplierName", supplier.name);
      form.setValue("supplierGstNo", supplier.gstNo || "");
    }
  };
  
  // Calculate item values
  const calculateItemValues = (index: number) => {
    const items = [...form.getValues("items")];
    const item = items[index];
    
    // Parse values as numbers
    const receivedQty = parseFloat(item.receivedQty) || 0;
    const cost = parseFloat(item.cost) || 0;
    const taxPercentage = parseFloat(item.taxPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;
    const sellingPrice = parseFloat(item.sellingPrice) || 0;
    const cashDiscountPercentage = parseFloat(item.cashDiscountPercentage) || 0;
    
    // Calculate net cost
    const netCost = cost + (cost * taxPercentage / 100) - discountAmount;
    item.netCost = netCost.toFixed(2);
    
    // Calculate amount
    const amount = receivedQty * cost;
    item.amount = amount.toFixed(2);
    
    // Calculate net amount
    const netAmount = receivedQty * netCost;
    item.netAmount = netAmount.toFixed(2);
    
    // Calculate cash discount amount
    const cashDiscountAmount = netAmount * cashDiscountPercentage / 100;
    item.cashDiscountAmount = cashDiscountAmount.toFixed(2);
    
    // Calculate ROI% and gross profit% only if selling price is provided
    if (sellingPrice > 0 && netCost > 0) {
      // ROI%
      const roiPercentage = ((sellingPrice - netCost) / netCost) * 100;
      item.roiPercentage = roiPercentage.toFixed(2);
      
      // Gross profit%
      const grossProfitPercentage = ((sellingPrice - netCost) / sellingPrice) * 100;
      item.grossProfitPercentage = grossProfitPercentage.toFixed(2);
    }
    
    form.setValue("items", items);
  };
  
  // Handle product selection
  const handleProductChange = (index: number, productName: string) => {
    const product = products.find((p: any) => p.name === productName);
    if (product) {
      // Update product details
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.cost`, product.cost?.toString() || "0");
      form.setValue(`items.${index}.sellingPrice`, product.price?.toString() || "0");
      form.setValue(`items.${index}.mrp`, ((parseFloat(product.price?.toString() || "0")) * 1.1).toFixed(2));
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      
      // Calculate values based on updated product data
      calculateItemValues(index);
    }
  };
  
  // Form submission
  const onSubmit = (data: PurchaseEntryFormValues) => {
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
                    <div className="rounded-md border overflow-x-auto max-h-[calc(100vh-320px)]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead className="w-[80px]">Code</TableHead>
                            <TableHead className="w-[200px]">Description</TableHead>
                            <TableHead className="w-[80px]">Qty</TableHead>
                            <TableHead className="w-[80px]">Free</TableHead>
                            <TableHead className="w-[80px]">Cost</TableHead>
                            <TableHead className="w-[80px]">HSN</TableHead>
                            <TableHead className="w-[80px]">Tax %</TableHead>
                            <TableHead className="w-[80px]">Disc Amt</TableHead>
                            <TableHead className="w-[110px]">Expiry Date</TableHead>
                            <TableHead className="w-[80px]">Net Cost</TableHead>
                            <TableHead className="w-[80px]">ROI %</TableHead>
                            <TableHead className="w-[80px]">Profit %</TableHead>
                            <TableHead className="w-[80px]">Selling</TableHead>
                            <TableHead className="w-[80px]">MRP</TableHead>
                            <TableHead className="w-[80px]">Amount</TableHead>
                            <TableHead className="w-[80px]">Net Amt</TableHead>
                            <TableHead className="w-[80px]">Cash D %</TableHead>
                            <TableHead className="w-[80px]">Cash D Amt</TableHead>
                            <TableHead className="w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {form.getValues("items").map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              
                              {/* Code */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.code`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full" 
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Description / Product Name */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productName`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Select
                                          value={field.value}
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            handleProductChange(index, value);
                                          }}
                                        >
                                          <SelectTrigger className="h-8 w-full">
                                            <SelectValue placeholder="Select product" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {products.map((product: any) => (
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="1"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
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
                                          className="h-8 w-full" 
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
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
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full" 
                                        />
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
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
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full" 
                                          type="date" 
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Net Cost - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.netCost`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* ROI % - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.roiPercentage`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Gross Profit % - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.grossProfitPercentage`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Amount - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.amount`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Net Amount - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.netAmount`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
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
                                          className="h-8 w-full" 
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            calculateItemValues(index);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              
                              {/* Cash Discount Amount - Calculated */}
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.cashDiscountAmount`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8 w-full bg-muted/30" 
                                          readOnly
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