import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Plus, Calendar, Save, ChevronLeft, ChevronRight } from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  }).optional(),
  supplierCode: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierMobile: z.string().optional(),
  supplierGstNo: z.string().optional(),
  
  // Items array
  items: z.array(
    z.object({
      productId: z.number().optional(),
      productCode: z.string().optional(),
      description: z.string().optional(),
      receivedQty: z.string().optional().default("1"),
      freeQty: z.string().optional().default("0"),
      cost: z.string().optional().default("0"),
      hsnCode: z.string().optional(),
      taxPercent: z.string().optional().default("0"),
      discountAmount: z.string().optional().default("0"),
      expDate: z.string().optional(),
      netCost: z.string().optional().default("0"),
    })
  ).min(1, "At least one item is required"),
  
  // Summary fields
  grossAmount: z.string().optional().default("0"),
  discountAmount: z.string().optional().default("0"),
  taxAmount: z.string().optional().default("0"),
  cashDiscount: z.string().optional().default("0"),
  
  // Additional charges
  surcharge: z.string().optional().default("0"),
  freightCharges: z.string().optional().default("0"),
  packingCharges: z.string().optional().default("0"),
  otherCharges: z.string().optional().default("0"),
  additionalDiscount: z.string().optional().default("0"),
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

// Empty purchase item for initialization
const emptyPurchaseItem = {
  productId: undefined,
  productCode: "",
  description: "",
  receivedQty: "1",
  freeQty: "0",
  cost: "0",
  hsnCode: "",
  taxPercent: "0",
  discountAmount: "0",
  expDate: "",
  netCost: "0",
};

// Main component
export default function PurchaseEntryModern() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("purchase-details");
  const today = format(new Date(), "yyyy-MM-dd");
  const formattedToday = format(new Date(), "dd-MM-yyyy");
  
  // Initialize form
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      poNo: "Auto-generated",
      poDate: today,
      dueDate: today,
      paymentType: "Cash",
      items: [{ ...emptyPurchaseItem }],
      grossAmount: "0.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      cashDiscount: "0.00",
      surcharge: "",
      freightCharges: "",
      packingCharges: "",
      otherCharges: "",
      additionalDiscount: "",
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
        return await res.json();
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
  });
  
  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      // Prepare data for API
      const purchaseData = {
        supplierId: data.supplierId || 1,
        orderNumber: data.poNo || `PO-${Date.now()}`,
        poNo: data.poNo || "",
        poDate: data.poDate ? new Date(data.poDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        paymentMethod: data.paymentType || "Cash",
        status: "pending",
        total: calculateTotal().toString(),
        items: data.items.map(item => {
          const productId = item.productId || 1;
          const quantity = Number(item.receivedQty) || 1;
          const unitCost = Number(item.cost) || 0;
          
          return {
            productId,
            quantity,
            unitCost,
            hsnCode: item.hsnCode || "",
            taxPercentage: Number(item.taxPercent) || 0,
            discount: Number(item.discountAmount) || 0,
          };
        })
      };
      
      const res = await apiRequest("POST", "/api/purchases", purchaseData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Purchase created",
        description: "Purchase has been created successfully.",
      });
      
      // Reset form and navigate back to purchases list
      form.reset();
      window.location.href = "/purchases";
    },
    onError: (error: any) => {
      toast({
        title: "Error creating purchase",
        description: error.message || "There was an error creating the purchase.",
        variant: "destructive",
      });
    }
  });
  
  // Add a new item to the purchase
  const addItem = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { ...emptyPurchaseItem }]);
  };
  
  // Calculate item's net cost
  const calculateItemNetCost = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    const qty = Number(item.receivedQty) || 0;
    const cost = Number(item.cost) || 0;
    const taxPercent = Number(item.taxPercent) || 0;
    const discount = Number(item.discountAmount) || 0;
    
    const subtotal = qty * cost;
    const taxAmount = subtotal * (taxPercent / 100);
    const netCost = subtotal + taxAmount - discount;
    
    form.setValue(`items.${index}.netCost`, netCost.toFixed(2));
  };
  
  // Recalculate all amounts when items change
  const recalculateAmounts = (index: number) => {
    calculateItemNetCost(index);
    updateSummaryTotals();
  };
  
  // Update summary totals
  const updateSummaryTotals = () => {
    const items = form.getValues("items");
    
    let grossAmount = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    
    items.forEach(item => {
      const qty = Number(item.receivedQty) || 0;
      const cost = Number(item.cost) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const discount = Number(item.discountAmount) || 0;
      
      const subtotal = qty * cost;
      grossAmount += subtotal;
      taxAmount += subtotal * (taxPercent / 100);
      discountAmount += discount;
    });
    
    form.setValue("grossAmount", grossAmount.toFixed(2));
    form.setValue("taxAmount", taxAmount.toFixed(2));
    form.setValue("discountAmount", discountAmount.toFixed(2));
  };
  
  // Calculate total purchase value
  const calculateTotal = () => {
    const grossAmount = Number(form.getValues("grossAmount")) || 0;
    const taxAmount = Number(form.getValues("taxAmount")) || 0;
    const discountAmount = Number(form.getValues("discountAmount")) || 0;
    const cashDiscount = Number(form.getValues("cashDiscount")) || 0;
    
    const surcharge = Number(form.getValues("surcharge")) || 0;
    const freightCharges = Number(form.getValues("freightCharges")) || 0;
    const packingCharges = Number(form.getValues("packingCharges")) || 0;
    const otherCharges = Number(form.getValues("otherCharges")) || 0;
    const additionalDiscount = Number(form.getValues("additionalDiscount")) || 0;
    
    const total = grossAmount + taxAmount - discountAmount - cashDiscount + 
                 surcharge + freightCharges + packingCharges + otherCharges - additionalDiscount;
    
    return Math.max(0, total);
  };
  
  // Handle product selection
  const handleProductSelect = (productId: number, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    
    if (product) {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productCode`, product.sku || "");
      form.setValue(`items.${index}.description`, product.name);
      form.setValue(`items.${index}.cost`, typeof product.cost === 'number' ? product.cost.toString() : product.cost);
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      
      // Recalculate amounts for this item
      recalculateAmounts(index);
    }
  };
  
  // Handle supplier selection
  const handleSupplierSelect = (supplierId: number) => {
    const supplier = suppliers.find((s: any) => s.id === supplierId);
    
    if (supplier) {
      form.setValue("supplierId", supplier.id);
      form.setValue("supplierCode", supplier.code || "");
      form.setValue("supplierPhone", supplier.phone || "");
      form.setValue("supplierGstNo", supplier.gstNo || "");
    }
  };
  
  // Navigation between tabs
  const goToNextTab = () => {
    if (activeTab === "purchase-details") {
      setActiveTab("line-items");
    } else if (activeTab === "line-items") {
      setActiveTab("summary");
    }
  };
  
  const goToPreviousTab = () => {
    if (activeTab === "summary") {
      setActiveTab("line-items");
    } else if (activeTab === "line-items") {
      setActiveTab("purchase-details");
    }
  };
  
  // Handle form submission
  const onSubmit = (data: PurchaseEntryFormValues) => {
    createPurchaseMutation.mutate(data);
  };
  
  // Update calculations when items change
  useEffect(() => {
    updateSummaryTotals();
  }, [watchedItems]);
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Purchase Entry</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full max-w-md grid grid-cols-3">
                <TabsTrigger value="purchase-details">Purchase Details</TabsTrigger>
                <TabsTrigger value="line-items">Line Items</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              
              {/* Purchase Details Tab */}
              <TabsContent value="purchase-details" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Details Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">Order Details</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="poNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO Number</FormLabel>
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
                                <div className="relative">
                                  <Input 
                                    type="date" 
                                    {...field}
                                  />
                                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
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
                                <div className="relative">
                                  <Input 
                                    type="date" 
                                    {...field}
                                  />
                                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
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
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Cash">Cash</SelectItem>
                                  <SelectItem value="Credit">Credit</SelectItem>
                                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="Check">Check</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Supplier Details Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">Supplier Details</h2>
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(Number(value));
                                  handleSupplierSelect(Number(value));
                                }}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a supplier" />
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
                            name="supplierCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="Supplier code" {...field} readOnly />
                                </FormControl>
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
                                  <Input placeholder="GST number" {...field} readOnly />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="supplierPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="Phone number" {...field} readOnly />
                                </FormControl>
                                <FormMessage />
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
                                  <Input placeholder="Mobile number" {...field} readOnly />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-end">
                  <Button type="button" onClick={goToNextTab} className="gap-2">
                    Next: Line Items <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              {/* Line Items Tab */}
              <TabsContent value="line-items" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Line Items</h2>
                      <Button 
                        type="button" 
                        onClick={addItem}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" /> Add Item
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Sno</TableHead>
                            <TableHead className="w-24">Code</TableHead>
                            <TableHead className="w-64">Description</TableHead>
                            <TableHead className="w-24">Received Qty</TableHead>
                            <TableHead className="w-24">Free Qty</TableHead>
                            <TableHead className="w-24">Cost</TableHead>
                            <TableHead className="w-24">HSN Code</TableHead>
                            <TableHead className="w-16">Tax %</TableHead>
                            <TableHead className="w-24">Disc Amt</TableHead>
                            <TableHead className="w-32">Exp. Date</TableHead>
                            <TableHead className="w-24">Net Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {watchedItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productCode`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          readOnly
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select 
                                        onValueChange={(value) => {
                                          field.onChange(Number(value));
                                          handleProductSelect(Number(value), index);
                                        }}
                                        value={field.value?.toString()}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select Product" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {products.map((product: any) => (
                                            <SelectItem 
                                              key={product.id} 
                                              value={product.id.toString()}
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
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          type="number"
                                          min="1"
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
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.freeQty`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
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
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
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
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.hsnCode`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
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
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          type="number"
                                          min="0"
                                          max="100"
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
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.discountAmount`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          type="number"
                                          min="0"
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
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.expDate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          type="date"
                                        />
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
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="h-8"
                                          readOnly
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-between">
                  <Button type="button" onClick={goToPreviousTab} variant="outline" className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back: Purchase Details
                  </Button>
                  <Button type="button" onClick={goToNextTab} className="gap-2">
                    Next: Summary <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
              
              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Purchase Summary Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">Purchase Summary</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="grossAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gross Amount</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="discountAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Amount</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Amount</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cashDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cash Discount</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Total Amount</h3>
                          <div className="text-xl font-bold">
                            $ {calculateTotal().toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Additional Charges Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">Additional Charges</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="surcharge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Surcharge</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="freightCharges"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Freight Charges</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="packingCharges"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packing Charges</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
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
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalDiscount"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Additional Discount</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <Button type="button" onClick={goToPreviousTab} variant="outline" className="gap-2">
                    <ChevronLeft className="h-4 w-4" /> Back: Line Items
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPurchaseMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {createPurchaseMutation.isPending ? "Saving..." : "Save Purchase"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}