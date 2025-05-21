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
  XCircle,
  Search,
  Plus,
  ChevronDown,
  Building2,
  Calculator,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { cn } from "@/lib/utils";

// UI Components
import {
  Card,
  CardContent,
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Form schema
const purchaseEntrySchema = z.object({
  supplierId: z.coerce.number().min(1, "Please select a supplier"),
  supplierCode: z.string().optional(),
  supplierName: z.string().optional(),
  supplierGstNo: z.string().optional(),
  supplierPhone: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  poNo: z.string().optional(),
  poDate: z.date().optional(),
  dueDate: z.date().optional(),
  invoiceDate: z.date().optional(),
  invoiceNo: z.string().optional(),
  invoiceAmount: z.string().optional(),
  grossAmount: z.string().optional(),
  draft: z.string().default("No"),
  paymentType: z.string().default("Credit"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  status: z.string().default("pending"),
  remarks: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.coerce.number().min(1, "Please select a product"),
      description: z.string().optional(),
      code: z.string().optional(),
      hsnCode: z.string().optional(),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
      unitCost: z.coerce.number().min(0.01, "Unit cost must be greater than 0"),
      taxPercentage: z.coerce.number().optional(),
      discount: z.coerce.number().optional(),
      discountPercent: z.coerce.number().optional(),
      netCost: z.coerce.number().optional(),
      roi: z.coerce.number().optional(),
      grossProfit: z.coerce.number().optional(),
      sellingPrice: z.coerce.number().optional(),
      mrp: z.coerce.number().optional(),
      subtotal: z.coerce.number().optional(),
      cashDiscount: z.coerce.number().optional()
    })
  ).min(1, "At least one item is required")
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

export default function PurchaseEntryLegacy() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const productSearchRef = useRef<HTMLInputElement>(null);
  const today = new Date();

  // Define form
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      orderNumber: `PO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      poDate: today,
      invoiceDate: today,
      dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentMethod: "cash",
      paymentType: "Credit",
      draft: "No",
      status: "pending",
      items: [
        {
          productId: 0,
          code: "",
          description: "",
          quantity: 1,
          unitCost: 0,
          taxPercentage: 0,
          discount: 0,
          discountPercent: 0,
          netCost: 0,
          roi: 0,
          grossProfit: 0,
          sellingPrice: 0,
          mrp: 0,
          subtotal: 0,
          cashDiscount: 0
        }
      ]
    }
  });

  // Set up field array for line items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return await res.json();
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    }
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      const res = await apiRequest("POST", "/api/purchases", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase created",
        description: `Purchase order #${data.orderNumber} has been created.`,
      });
      // Reset form or redirect
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating purchase",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues("items") || [];
    
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    
    items.forEach(item => {
      const itemSubtotal = (item.quantity || 0) * (item.unitCost || 0);
      const itemTax = itemSubtotal * ((item.taxPercentage || 0) / 100);
      const itemDiscount = itemSubtotal * ((item.discountPercent || 0) / 100);
      
      subtotal += itemSubtotal;
      taxAmount += itemTax;
      discountAmount += itemDiscount;
    });
    
    const total = subtotal + taxAmount - discountAmount;
    
    return { subtotal, taxAmount, discountAmount, total };
  };

  // Recalculate line item
  const recalculateAmounts = (index: number) => {
    const quantity = form.getValues(`items.${index}.quantity`) || 0;
    const unitCost = form.getValues(`items.${index}.unitCost`) || 0;
    const sellingPrice = form.getValues(`items.${index}.sellingPrice`) || 0;
    const discountPercent = form.getValues(`items.${index}.discountPercent`) || 0;
    
    const subtotal = quantity * unitCost;
    const discount = (subtotal * discountPercent) / 100;
    const netCost = subtotal - discount;
    const grossProfit = (sellingPrice - unitCost) * quantity;
    const roi = unitCost > 0 ? ((sellingPrice - unitCost) / unitCost) * 100 : 0;
    
    form.setValue(`items.${index}.subtotal`, subtotal);
    form.setValue(`items.${index}.discount`, discount);
    form.setValue(`items.${index}.netCost`, netCost);
    form.setValue(`items.${index}.grossProfit`, grossProfit);
    form.setValue(`items.${index}.roi`, roi);
    
    // Update form totals
    const { total } = calculateTotals();
    form.setValue("grossAmount", total.toString());
    form.setValue("invoiceAmount", total.toString());
  };

  // Handle quantity or price changes
  const handleItemChange = (index: number) => {
    recalculateAmounts(index);
  };

  // Function to handle supplier selection
  const handleSupplierSelect = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    form.setValue("supplierId", supplierId);
    
    const supplier = suppliers.find((s: any) => s.id === supplierId);
    if (supplier) {
      form.setValue("supplierCode", supplier.id.toString() || "");
      form.setValue("supplierName", supplier.name || "");
      form.setValue("supplierPhone", supplier.phone || "");
      form.setValue("supplierGstNo", supplier.taxId || "");
    }
  };
  
  // Function to handle product selection
  const handleProductSelect = (productId: number, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.name);
      form.setValue(`items.${index}.unitCost`, typeof product.cost === 'number' ? product.cost : parseFloat(product.cost || "0"));
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      form.setValue(`items.${index}.sellingPrice`, typeof product.price === 'number' ? product.price : parseFloat(product.price || "0"));
      form.setValue(`items.${index}.mrp`, typeof product.price === 'number' ? product.price : parseFloat(product.price || "0"));
      
      // Recalculate amounts for this item
      recalculateAmounts(index);
    }
  };

  // Handle form submission
  const onSubmit = (data: PurchaseEntryFormValues) => {
    createPurchaseMutation.mutate(data);
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter((supplier: any) => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter products based on search term
  const filteredProducts = products.filter((product: any) => 
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
    product.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Purchase (Local)</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseMutation.isPending}
              size="sm"
            >
              {createPurchaseMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FormLabel className="text-sm font-medium">Code*</FormLabel>
                      <div className="flex items-center gap-1 mt-1">
                        <FormControl>
                          <Input 
                            placeholder="Supplier code" 
                            value={form.watch("supplierCode")} 
                            readOnly 
                            className="h-8 border-gray-300"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                  placeholder="Search suppliers..."
                                  className="pl-8 h-9"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {filteredSuppliers.length === 0 ? (
                                <div className="py-2 px-3 text-center text-sm text-gray-500">
                                  No suppliers found
                                </div>
                              ) : (
                                filteredSuppliers.map((supplier: any) => (
                                  <div
                                    key={supplier.id}
                                    className={cn(
                                      "py-1.5 px-3 text-sm cursor-pointer hover:bg-gray-100",
                                      selectedSupplierId === supplier.id && "bg-gray-100"
                                    )}
                                    onClick={() => handleSupplierSelect(supplier.id)}
                                  >
                                    <div className="font-medium">{supplier.name}</div>
                                    <div className="text-xs text-gray-500">{supplier.email || supplier.phone}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">PO No.</FormLabel>
                      <FormField
                        control={form.control}
                        name="poNo"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input {...field} className="h-8 border-gray-300" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Shortname</FormLabel>
                      <FormControl>
                        <Input 
                          value={form.watch("supplierName")} 
                          readOnly 
                          className="h-8 border-gray-300 mt-1" 
                        />
                      </FormControl>
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">PO Date</FormLabel>
                      <FormField
                        control={form.control}
                        name="poDate"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} 
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                className="h-8 border-gray-300"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Name*</FormLabel>
                      <FormControl>
                        <Input 
                          value={form.watch("supplierName")} 
                          readOnly 
                          className="h-8 border-gray-300 mt-1" 
                        />
                      </FormControl>
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Holddays</FormLabel>
                      <FormControl>
                        <Input className="h-8 border-gray-300 mt-1" value="0" readOnly />
                      </FormControl>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Mobile</FormLabel>
                      <FormControl>
                        <Input 
                          value={form.watch("supplierPhone")} 
                          readOnly 
                          className="h-8 border-gray-300 mt-1" 
                        />
                      </FormControl>
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} 
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                className="h-8 border-gray-300"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Cash Disc.</FormLabel>
                      <FormControl>
                        <Input className="h-8 border-gray-300 mt-1" value="0.00" readOnly />
                      </FormControl>
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Invoice No.</FormLabel>
                      <FormField
                        control={form.control}
                        name="invoiceNo"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input {...field} className="h-8 border-gray-300" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Draft</FormLabel>
                      <FormField
                        control={form.control}
                        name="draft"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 border-gray-300">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Yes">Yes</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Invoice Date</FormLabel>
                      <FormField
                        control={form.control}
                        name="invoiceDate"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''} 
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                className="h-8 border-gray-300"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Payment type</FormLabel>
                      <FormField
                        control={form.control}
                        name="paymentType"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 border-gray-300">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Credit">Credit</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <FormLabel className="text-sm font-medium">Invoice Amount</FormLabel>
                      <FormField
                        control={form.control}
                        name="invoiceAmount"
                        render={({ field }) => (
                          <FormItem className="mt-1">
                            <FormControl>
                              <Input {...field} className="h-8 border-gray-300" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products List - Legacy Style Table */}
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-blue-50 py-2 px-4 border-b font-semibold">
                Products List
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b text-left">
                      <th className="px-3 py-3 border-r w-12">S.No</th>
                      <th className="px-3 py-3 border-r w-24">Code</th>
                      <th className="px-3 py-3 border-r w-[160px]">Description</th>
                      <th className="px-3 py-3 border-r w-20 text-center">Recd Qty</th>
                      <th className="px-3 py-3 border-r w-14 text-center">FOC</th>
                      <th className="px-3 py-3 border-r w-20 text-right">Cost</th>
                      <th className="px-3 py-3 border-r w-20 text-center">HSN Code</th>
                      <th className="px-3 py-3 border-r w-14 text-center">Tax %</th>
                      <th className="px-3 py-3 border-r w-16 text-center">Dis Amt</th>
                      <th className="px-3 py-3 border-r w-16 text-center">ExpDt</th>
                      <th className="px-3 py-3 border-r w-14 text-center">Dis %</th>
                      <th className="px-3 py-3 border-r w-20 text-right">NetCost</th>
                      <th className="px-3 py-3 border-r w-16 text-center">R.O.I %</th>
                      <th className="px-3 py-3 border-r w-20 text-center">Gross Profit</th>
                      <th className="px-3 py-3 border-r w-20 text-center">Selling</th>
                      <th className="px-3 py-3 border-r w-16 text-center">M.R.P</th>
                      <th className="px-3 py-3 border-r w-20 text-right">Amount</th>
                      <th className="px-3 py-3 border-r w-16 text-center">Net Amt</th>
                      <th className="px-3 py-3 border-r w-16 text-center">CashDisAmt</th>
                      <th className="p-2 w-10 text-center">
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          className="h-5 w-5"
                          onClick={() => {
                            append({
                              productId: 0,
                              code: "",
                              description: "",
                              quantity: 1,
                              unitCost: 0,
                              taxPercentage: 0,
                              discount: 0,
                              discountPercent: 0,
                              netCost: 0,
                              roi: 0,
                              grossProfit: 0,
                              sellingPrice: 0,
                              mrp: 0,
                              subtotal: 0,
                              cashDiscount: 0
                            });
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-3 border-r text-center">{index + 1}</td>
                        <td className="px-3 py-3 border-r">
                          <div className="flex items-center gap-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.code`}
                              render={({ field }) => (
                                <FormItem className="w-full m-0">
                                  <FormControl>
                                    <Input {...field} className="h-8 text-sm" readOnly />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 min-w-0">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                <div className="p-2 border-b">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                      placeholder="Search products..."
                                      className="pl-8 h-9"
                                      value={productSearchTerm}
                                      onChange={(e) => setProductSearchTerm(e.target.value)}
                                      ref={productSearchRef}
                                    />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                  {filteredProducts.length === 0 ? (
                                    <div className="py-2 px-3 text-center text-sm text-gray-500">
                                      No products found
                                    </div>
                                  ) : (
                                    filteredProducts.map((product: any) => (
                                      <div
                                        key={product.id}
                                        className="py-1.5 px-3 text-sm cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleProductSelect(product.id, index)}
                                      >
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-xs text-gray-500">{product.sku} - ₹{product.price}</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </td>
                        <td className="px-3 py-3 border-r">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input {...field} className="h-8 text-sm" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    className="h-8 text-sm text-right"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleItemChange(index);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">0</td>
                        <td className="px-3 py-3 border-r">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitCost`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleItemChange(index);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.hsnCode`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input {...field} className="h-8 text-sm" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.taxPercentage`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleItemChange(index);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-right">
                          <FormField
                            control={form.control}
                            name={`items.${index}.discount`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r"></td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.discountPercent`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleItemChange(index);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-right">
                          <FormField
                            control={form.control}
                            name={`items.${index}.netCost`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.roi`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.grossProfit`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.sellingPrice`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      handleItemChange(index);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.mrp`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-right">
                          <FormField
                            control={form.control}
                            name={`items.${index}.subtotal`}
                            render={({ field }) => (
                              <FormItem className="m-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    className="h-8 text-sm text-right"
                                    readOnly
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 border-r text-right">
                          {form.watch(`items.${index}.netCost`)}
                        </td>
                        <td className="px-3 py-3 border-r text-right">0.00</td>
                        <td className="px-3 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => remove(index)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    
                    {fields.length === 0 && (
                      <tr>
                        <td colSpan={20} className="p-4 text-center text-gray-500">
                          No items added yet. Click the + button to add a line item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-medium">
                      <td colSpan={3} className="p-2 border-r text-right">
                        Total:
                      </td>
                      <td className="p-2 border-r text-center">
                        {form.getValues("items")?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </td>
                      <td className="p-2 border-r"></td>
                      <td className="p-2 border-r"></td>
                      <td colSpan={7} className="p-2 border-r"></td>
                      <td colSpan={3} className="p-2 border-r text-right">
                        {form.getValues("items")?.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2) || "0.00"}
                      </td>
                      <td colSpan={3} className="p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <div className="border border-gray-300 rounded p-3">
                  <FormLabel className="text-sm font-semibold mb-1 block">Remarks</FormLabel>
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter any additional notes or remarks"
                            className="h-20"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                }}
              >
                <XCircle className="mr-2 h-4 w-4" /> Clear
              </Button>
              <Button
                type="submit"
                disabled={createPurchaseMutation.isPending}
              >
                {createPurchaseMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Purchase
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}