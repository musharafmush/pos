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
      productId: z.number().optional(), // Made optional to prevent validation errors
      productName: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      receivedQty: z.string().default("1"),
      freeQty: z.string().default("0"),
      cost: z.string().default("0"),
      hsnCode: z.string().optional(),
      taxPercent: z.string().default("0"),
      discountAmount: z.string().default("0"),
      expiryDate: z.string().optional(),
      netCost: z.string().default("0"),
      roiPercent: z.string().default("0"),
      grossProfitPercent: z.string().default("0"),
      sellingPrice: z.string().default("0"),
      mrp: z.string().default("0"),
      amount: z.string().default("0"),
      netAmount: z.string().default("0"),
      cashDiscountPercent: z.string().default("0"),
      cashDiscountAmount: z.string().default("0"),
      batchNo: z.string().optional(),
      location: z.string().optional(),
      unit: z.string().default("PCS"),
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
  productId: undefined as any, // Changed from 0 to undefined to prevent validation issues
  code: "",
  productName: "",
  description: "",
  receivedQty: "1",
  freeQty: "0",
  cost: "100", // Set a default cost so form doesn't submit with 0
  hsnCode: "",
  taxPercent: "0",
  discountAmount: "0",
  expiryDate: "",
  netCost: "100",
  roiPercent: "0",
  grossProfitPercent: "0",
  sellingPrice: "120",
  mrp: "120",
  amount: "100",
  netAmount: "100",
  cashDiscountPercent: "0",
  cashDiscountAmount: "0",
  batchNo: "",
  location: "",
  unit: "PCS",
};

// Main component
export default function PurchaseEntry() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [searchTerm, setSearchTerm] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;
  
  // Initialize form with proper default values for all fields
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      poDate: today,
      dueDate: today,
      paymentType: "cash",
      holdBills: false,
      print: "yes",
      supplierCode: "",
      supplierName: "",
      supplierPhone: "",
      supplierMobile: "",
      supplierGstNo: "",
      invoiceNo: "",
      invoiceDate: "",
      invoiceAmount: "0",
      lrNo: "",
      remarks: "",
      grossAmount: "0",
      itemDiscountAmount: "0",
      taxAmount: "0",
      cashDiscountAmount: "0",
      surchargeAmount: "0",
      freightAmount: "0",
      packingCharge: "0",
      otherCharge: "0",
      manualDiscountAmount: "0",
      payableAmount: "0",
      items: [{ ...emptyPurchaseItem }],
    },
  });
  
  // Fetch purchase data for editing
  const { data: existingPurchase, isLoading: purchaseLoading } = useQuery({
    queryKey: ['/api/purchases', editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await fetch(`/api/purchases/${editId}`);
      if (!res.ok) throw new Error('Failed to fetch purchase');
      return res.json();
    },
    enabled: !!editId,
  });
  
  // Effect to populate form when editing existing purchase
  useEffect(() => {
    if (existingPurchase && isEditMode) {
      // Format dates properly
      const poDate = existingPurchase.orderDate 
        ? format(new Date(existingPurchase.orderDate), "yyyy-MM-dd")
        : today;
      const dueDate = existingPurchase.expectedDate 
        ? format(new Date(existingPurchase.expectedDate), "yyyy-MM-dd")
        : today;
      
      // Populate form with existing data
      form.reset({
        poNo: existingPurchase.orderNumber || "",
        poDate: poDate,
        dueDate: dueDate,
        paymentType: "cash", // Default since not in schema
        supplierId: existingPurchase.supplierId || 0,
        supplierCode: existingPurchase.supplier?.id?.toString() || "",
        supplierName: existingPurchase.supplier?.name || "",
        supplierPhone: existingPurchase.supplier?.phone || "",
        supplierMobile: existingPurchase.supplier?.phone || "",
        supplierGstNo: existingPurchase.supplier?.taxId || "",
        invoiceNo: existingPurchase.invoiceNumber || "",
        invoiceDate: existingPurchase.invoiceDate ? format(new Date(existingPurchase.invoiceDate), "yyyy-MM-dd") : "",
        invoiceAmount: existingPurchase.totalAmount?.toString() || "0",
        holdBills: false,
        print: "yes",
        remarks: existingPurchase.notes || "",
        items: existingPurchase.items?.length > 0 
          ? existingPurchase.items.map((item: any) => ({
              productId: item.productId || 0,
              productName: item.product?.name || "",
              code: item.product?.sku || "",
              description: item.product?.description || "",
              receivedQty: item.quantity?.toString() || "1",
              freeQty: "0",
              cost: item.unitCost?.toString() || "0",
              hsnCode: item.product?.hsnCode || "",
              taxPercent: "0",
              discountAmount: "0",
              expiryDate: "",
              netCost: item.unitCost?.toString() || "0",
              roiPercent: "0",
              grossProfitPercent: "0",
              sellingPrice: item.product?.price?.toString() || "0",
              mrp: item.product?.price?.toString() || "0",
              amount: (Number(item.quantity || 0) * Number(item.unitCost || 0)).toString(),
              netAmount: (Number(item.quantity || 0) * Number(item.unitCost || 0)).toString(),
              cashDiscountPercent: "0",
              cashDiscountAmount: "0",
              batchNo: "",
              location: "",
              unit: "PCS",
            }))
          : [{ ...emptyPurchaseItem }],
        grossAmount: existingPurchase.totalAmount?.toString() || "0",
        payableAmount: existingPurchase.totalAmount?.toString() || "0",
      });
      
      toast({
        title: "Editing purchase order",
        description: `Loaded purchase order ${existingPurchase.orderNumber}`,
      });
    }
  }, [existingPurchase, isEditMode, form, today, toast]);

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


  
  // Create/Update purchase mutation
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseEntryFormValues) => {
      if (isEditMode) {
        const res = await apiRequest("PUT", `/api/purchases/${editId}`, data);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/purchases", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Purchase order updated" : "Purchase order created",
        description: isEditMode 
          ? "The purchase order has been successfully updated."
          : "The purchase order has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      
      if (!isEditMode) {
        form.reset();
        form.setValue("items", [{ ...emptyPurchaseItem }]);
        form.setValue("poDate", today);
        form.setValue("dueDate", today);
      }
    },
    onError: (error) => {
      toast({
        title: isEditMode ? "Error updating purchase order" : "Error creating purchase order",
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
    const netCost = receivedQty > 0 ? netAmount / receivedQty : 0;

    // Calculate profit metrics if selling price is available
    let roiPercent = 0;
    let grossProfitPercent = 0;
    
    if (sellingPrice > 0 && netCost > 0) {
      roiPercent = ((sellingPrice - netCost) / netCost) * 100;
      grossProfitPercent = ((sellingPrice - netCost) / sellingPrice) * 100;
    }

    // Update calculated fields with Indian Rupees formatting (no decimal places for currency)
    form.setValue(`items.${index}.amount`, amount.toFixed(0));
    form.setValue(`items.${index}.netAmount`, netAmount.toFixed(0));
    form.setValue(`items.${index}.netCost`, netCost.toFixed(0));
    form.setValue(`items.${index}.cashDiscountAmount`, cashDiscountAmount.toFixed(0));
    form.setValue(`items.${index}.roiPercent`, roiPercent.toFixed(2));
    form.setValue(`items.${index}.grossProfitPercent`, grossProfitPercent.toFixed(2));
    
    // Trigger real-time UI updates
    setTimeout(() => {
      form.trigger(`items.${index}.amount`);
      form.trigger(`items.${index}.netAmount`);
    }, 0);
  };

  // Auto-update Purchase Summary calculations
  useEffect(() => {
    const updateSummary = () => {
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
        
        // Update summary fields with Indian Rupees formatting (no decimals) - AUTO CHANGE
        form.setValue("grossAmount", grossAmount.toFixed(0));
        form.setValue("itemDiscountAmount", totalDiscount.toFixed(0));
        form.setValue("taxAmount", totalTax.toFixed(0));
        form.setValue("cashDiscountAmount", totalCashDiscount.toFixed(0));
        
        // Calculate payable amount with all additional charges - AUTO CHANGE
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
        ).toFixed(0);
        
        // Distribute additional charges to line items amounts
        if (totalAdditionalCharges > 0 && watchedItems.length > 0) {
          watchedItems.forEach((item, index) => {
            const itemAmount = Number(form.getValues(`items.${index}.amount`)) || 0;
            const proportion = grossAmount > 0 ? itemAmount / grossAmount : 0;
            const itemAdditionalCharge = (surchargeAmount + freightAmount + packingCharge + otherCharge) * proportion;
            
            // Add additional charges to line item amount
            const newLineItemAmount = itemAmount + itemAdditionalCharge;
            form.setValue(`items.${index}.amount`, newLineItemAmount.toFixed(0));
            
            // Update net amount as well
            const currentNetAmount = Number(form.getValues(`items.${index}.netAmount`)) || 0;
            form.setValue(`items.${index}.netAmount`, (currentNetAmount + itemAdditionalCharge).toFixed(0));
          });
        }

        // AUTO UPDATE final amounts instantly
        form.setValue("payableAmount", payableAmount);
        form.setValue("invoiceAmount", payableAmount);
        
        // Force UI refresh to show changes immediately
        setTimeout(() => {
          form.trigger(["grossAmount", "taxAmount", "payableAmount"]);
          // Also trigger line items to show updated amounts
          watchedItems.forEach((_, index) => {
            form.trigger(`items.${index}.amount`);
            form.trigger(`items.${index}.netAmount`);
          });
        }, 0);
      }
    };
    
    // Call update immediately and also watch for any changes
    updateSummary();
    
  }, [watchedItems, form, form.watch("surchargeAmount"), form.watch("freightAmount"), form.watch("packingCharge"), form.watch("otherCharge"), form.watch("manualDiscountAmount")]);
  
  // Function to handle supplier selection with auto-pull
  const handleSupplierChange = (supplierId: string) => {
    const id = parseInt(supplierId);
    const supplier = suppliers?.find((s: any) => s.id === id);
    
    if (supplier) {
      // Automatically fill all supplier details
      form.setValue("supplierId", id);
      form.setValue("supplierCode", supplier.id?.toString() || "");
      form.setValue("supplierName", supplier.name || "");
      form.setValue("supplierPhone", supplier.phone || "");
      form.setValue("supplierMobile", supplier.phone || "");
      form.setValue("supplierGstNo", supplier.taxId || "");
      
      toast({
        title: "Supplier information loaded",
        description: `Successfully loaded details for ${supplier.name}`,
      });
    }
  };
  
  // Function to handle product selection
  const handleProductSelect = (productId: number, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.name);
      form.setValue(`items.${index}.cost`, typeof product.cost === 'number' ? product.cost.toString() : product.cost);
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      form.setValue(`items.${index}.sellingPrice`, typeof product.price === 'number' ? product.price.toString() : product.price);
      form.setValue(`items.${index}.mrp`, typeof product.price === 'number' ? product.price.toString() : product.price);
      
      // Recalculate amounts for this item
      recalculateAmounts(index);
    }
  };
  
  const onSubmit = (data: PurchaseEntryFormValues) => {
    // Enhanced data processing to include freight charges in line items
    const enhancedData = { ...data };
    
    // Get additional charges
    const freightAmount = Number(data.freightAmount) || 0;
    const packingCharge = Number(data.packingCharge) || 0;
    const otherCharge = Number(data.otherCharge) || 0;
    const surchargeAmount = Number(data.surchargeAmount) || 0;
    
    // Total additional charges to distribute
    const totalAdditionalCharges = freightAmount + packingCharge + otherCharge + surchargeAmount;
    
    if (totalAdditionalCharges > 0 && data.items && data.items.length > 0) {
      // Calculate total line items amount for proportional distribution
      const totalLineItemAmount = data.items.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
      }, 0);
      
      // Distribute additional charges proportionally across line items
      enhancedData.items = data.items.map((item) => {
        const itemAmount = Number(item.amount) || 0;
        const proportion = totalLineItemAmount > 0 ? itemAmount / totalLineItemAmount : 0;
        const itemAdditionalCharge = totalAdditionalCharges * proportion;
        
        // Add freight and other charges to line item details for database storage
        return {
          ...item,
          freightCharge: (freightAmount * proportion).toFixed(0),
          packingCharge: (packingCharge * proportion).toFixed(0),
          otherCharge: (otherCharge * proportion).toFixed(0),
          surchargeAmount: (surchargeAmount * proportion).toFixed(0),
          totalAdditionalCharge: itemAdditionalCharge.toFixed(0),
          finalNetAmount: (Number(item.netAmount) + itemAdditionalCharge).toFixed(0)
        };
      });
    }
    
    savePurchaseMutation.mutate(enhancedData);
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Purchase Entry</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.history.back();
              }}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={savePurchaseMutation.isPending}
            >
              {savePurchaseMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> {isEditMode ? "Update" : "Save"}
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="details">Purchase Details</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Purchase Order Details */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Calendar className="h-5 w-5" />
                        Order Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      {/* Order Information */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-4">Order Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="poNo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">PO Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Auto-generated" 
                                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="poDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">PO Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Due Date and Payment */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-4">Payment & Delivery</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">Due Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
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
                                <FormLabel className="text-sm font-medium text-gray-700">Payment Type</FormLabel>
                                <Select 
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                      <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="cash">💵 Cash</SelectItem>
                                    <SelectItem value="credit">💳 Credit</SelectItem>
                                    <SelectItem value="cheque">📝 Cheque</SelectItem>
                                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Supplier Details */}
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <Building2 className="h-5 w-5" />
                        Supplier Information
                      </CardTitle>
                      <p className="text-sm text-green-700 mt-1">Select a supplier to auto-fill details</p>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      {/* Supplier Selection */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                Select Supplier *
                              </FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(parseInt(value));
                                  handleSupplierChange(value);
                                }}
                                value={field.value ? field.value.toString() : ""}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-white border-green-300 focus:border-green-500 focus:ring-green-500">
                                    <SelectValue placeholder="🏢 Choose your supplier..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {suppliers.map((supplier: any) => (
                                    <SelectItem 
                                      key={supplier.id} 
                                      value={supplier.id.toString()}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-500" />
                                        {supplier.name}
                                      </div>
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
                      
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Invoice Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Details</CardTitle>
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
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
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Additional Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="holdBills"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
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
                            <FormLabel>Print after saving</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
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
                      
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any additional remarks"
                                className="resize-none"
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
                
                <div className="mt-6 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("items")}
                  >
                    Next: Line Items
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="items">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Line Items</CardTitle>
                      <Button type="button" onClick={addItemRow}>
                        <FilePlus className="h-4 w-4 mr-2" /> Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="w-full overflow-x-auto border rounded-lg">
                      <div className="min-w-[2400px] bg-white">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow className="bg-blue-50 border-b-2">
                              <TableHead className="w-20 text-center font-bold border-r px-3 py-4">Sno</TableHead>
                              <TableHead className="w-40 font-bold border-r px-3 py-4">Code</TableHead>
                              <TableHead className="min-w-[200px] font-bold border-r px-3 py-4">Product Name</TableHead>
                              <TableHead className="min-w-[180px] font-bold border-r px-3 py-4">Description</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Received Qty</TableHead>
                              <TableHead className="w-32 text-center font-bold border-r px-3 py-4">Free Qty</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Cost</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">HSN Code</TableHead>
                              <TableHead className="w-24 text-center font-bold border-r px-3 py-4">Tax %</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Disc Amt</TableHead>
                              <TableHead className="w-40 text-center font-bold border-r px-3 py-4">Exp. Date</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Net Cost</TableHead>
                              <TableHead className="w-28 text-center font-bold border-r px-3 py-4">ROI %</TableHead>
                              <TableHead className="w-40 text-center font-bold border-r px-3 py-4">Gross Profit %</TableHead>
                              <TableHead className="w-40 text-center font-bold border-r px-3 py-4">Selling Price</TableHead>
                              <TableHead className="w-32 text-center font-bold border-r px-3 py-4">MRP</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Amount</TableHead>
                              <TableHead className="w-40 text-center font-bold border-r px-3 py-4">Net Amount</TableHead>
                              <TableHead className="w-28 text-center font-bold border-r px-3 py-4">Cash %</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Cash Amt</TableHead>
                              <TableHead className="w-32 text-center font-bold border-r px-3 py-4">Batch No</TableHead>
                              <TableHead className="w-36 text-center font-bold border-r px-3 py-4">Location</TableHead>
                              <TableHead className="w-32 text-center font-bold border-r px-3 py-4">Unit</TableHead>
                              <TableHead className="w-24 text-center font-bold px-3 py-4">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.getValues("items").map((item, index) => (
                              <TableRow key={index} className="hover:bg-muted/30">
                                <TableCell className="font-medium text-center py-4">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.code`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full h-10" placeholder="Code" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.productName`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" className="w-full h-10 justify-start">
                                                {field.value || "Select Product"}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-0">
                                              <div className="px-4 py-2 border-b">
                                                <Input
                                                  placeholder="Search products..."
                                                  value={searchTerm}
                                                  onChange={(e) => setSearchTerm(e.target.value)}
                                                  className="w-full"
                                                />
                                              </div>
                                              <div className="max-h-60 overflow-y-auto">
                                                {filteredProducts.length === 0 ? (
                                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                                    No products found
                                                  </div>
                                                ) : (
                                                  filteredProducts.map((product: any) => (
                                                    <div
                                                      key={product.id}
                                                      className="px-4 py-2 cursor-pointer hover:bg-muted"
                                                      onClick={() => {
                                                        handleProductSelect(product.id, index);
                                                        setSearchTerm("");
                                                      }}
                                                    >
                                                      <div className="font-medium">{product.name}</div>
                                                      <div className="text-sm text-muted-foreground">
                                                        SKU: {product.sku} | Stock: {product.stockQuantity} | Price: ₹{typeof product.price === 'number' ? product.price.toFixed(0) : product.price}
                                                      </div>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.description`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full h-10" placeholder="Description" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.receivedQty`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full text-xs"
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
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className="w-full text-xs"
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
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                            <Input 
                                              {...field} 
                                              className="w-full text-xs pl-6"
                                              placeholder="0"
                                              onChange={(e) => {
                                                field.onChange(e);
                                                recalculateAmounts(index);
                                              }}
                                            />
                                          </div>
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
                                          <Input {...field} className="w-full text-xs" />
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
                                            className="w-full text-xs"
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
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                            <Input 
                                              {...field} 
                                              className="w-full text-xs pl-6"
                                              placeholder="0"
                                              onChange={(e) => {
                                                field.onChange(e);
                                                recalculateAmounts(index);
                                              }}
                                            />
                                          </div>
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
                                            type="date" 
                                            {...field} 
                                            className="w-full text-xs" 
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
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                            <Input 
                                              {...field} 
                                              readOnly 
                                              className="w-full text-xs bg-muted pl-6"
                                              placeholder="0"
                                            />
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.roiPercent`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">%</span>
                                            <div className="font-medium text-sm ml-1">{field.value || "0"}</div>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.grossProfitPercent`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">%</span>
                                            <div className="font-medium text-sm ml-1">{field.value || "0"}</div>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.sellingPrice`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">₹</span>
                                            <Input 
                                              {...field} 
                                              className="w-full text-xs border-none bg-transparent p-0 focus-visible:ring-0"
                                              onChange={(e) => {
                                                field.onChange(e);
                                                recalculateAmounts(index);
                                              }}
                                            />
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.mrp`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">₹</span>
                                            <Input 
                                              {...field} 
                                              className="w-full text-xs border-none bg-transparent p-0 focus-visible:ring-0"
                                            />
                                          </div>
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
                                          <div className="flex items-center justify-center p-2 bg-blue-50 rounded-md">
                                            <span className="text-sm font-medium text-blue-700">₹</span>
                                            <div className="font-medium text-sm text-blue-700 ml-1">{Number(field.value || 0).toFixed(0)}</div>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.netAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-green-50 rounded-md">
                                            <span className="text-sm font-medium text-green-700">₹</span>
                                            <div className="font-medium text-sm text-green-700 ml-1">{Number(field.value || 0).toFixed(0)}</div>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cashDiscountPercent`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">%</span>
                                            <Input 
                                              {...field} 
                                              className="w-full text-xs border-none bg-transparent p-0 focus-visible:ring-0"
                                              onChange={(e) => {
                                                field.onChange(e);
                                                recalculateAmounts(index);
                                              }}
                                            />
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cashDiscountAmount`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-sm">₹</span>
                                            <div className="font-medium text-sm ml-1">{field.value || "0"}</div>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.batchNo`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full h-10" placeholder="Batch #" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.location`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Input {...field} className="w-full h-10" placeholder="Location" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.unit`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-0">
                                        <FormControl>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="w-full h-10">
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
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="py-4">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItemRow(index)}
                                    disabled={form.getValues("items").length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
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
                
                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("details")}
                  >
                    Back: Purchase Details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("summary")}
                  >
                    Next: Summary
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="summary">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="grossAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gross Amount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                  <Input {...field} value={field.value || "0"} readOnly className="bg-muted pl-6 font-semibold" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="itemDiscountAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Amount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                  <Input {...field} value={field.value || "0"} readOnly className="bg-muted pl-6 font-semibold" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taxAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Amount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                  <Input {...field} value={field.value || "0"} readOnly className="bg-muted pl-6 font-semibold" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="cashDiscountAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cash Discount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                  <Input {...field} value={field.value || "0"} readOnly className="bg-muted pl-6 font-semibold" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Charges</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="surchargeAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Surcharge</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Trigger recalculation of payable amount
                                    const items = form.getValues("items");
                                    if (items.length > 0) {
                                      // Just using this to trigger the useEffect
                                      form.setValue("items", [...items]);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="freightAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Freight Charges</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Trigger recalculation of payable amount
                                    const items = form.getValues("items");
                                    if (items.length > 0) {
                                      form.setValue("items", [...items]);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="packingCharge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packing Charges</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Trigger recalculation of payable amount
                                    const items = form.getValues("items");
                                    if (items.length > 0) {
                                      form.setValue("items", [...items]);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="otherCharge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Charges</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Trigger recalculation of payable amount
                                    const items = form.getValues("items");
                                    if (items.length > 0) {
                                      form.setValue("items", [...items]);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="manualDiscountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Discount</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Trigger recalculation of payable amount
                                  const items = form.getValues("items");
                                  if (items.length > 0) {
                                    form.setValue("items", [...items]);
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Final Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3"></div>
                      <FormField
                        control={form.control}
                        name="payableAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payable Amount</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 text-lg font-bold">₹</span>
                                <Input {...field} value={field.value || "0"} readOnly className="bg-green-50 border-green-200 text-lg font-bold pl-8 text-green-700" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("items")}
                  >
                    Back: Line Items
                  </Button>
                  <Button 
                    type="submit"
                    disabled={savePurchaseMutation.isPending}
                  >
                    {savePurchaseMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> {isEditMode ? "Update Purchase" : "Save Purchase"}
                      </>
                    )}
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