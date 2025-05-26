
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit, Eye, Search, Filter, Download, Upload } from "lucide-react";
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
  surchargeAmount: z.number().min(0, "Surcharge amount cannot be negative").optional(),
  packingCharges: z.number().min(0, "Packing charges cannot be negative").optional(),
  otherCharges: z.number().min(0, "Other charges cannot be negative").optional(),
  additionalDiscount: z.number().min(0, "Additional discount cannot be negative").optional(),
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

interface Purchase {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplier?: Supplier;
  orderDate: string;
  expectedDate?: string;
  status: string;
  total: string;
  items?: any[];
  createdAt: string;
}

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  
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
      freightAmount: 0,
      surchargeAmount: 0,
      packingCharges: 0,
      otherCharges: 0,
      additionalDiscount: 0,
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

  // Fetch all purchases
  const { data: purchases = [], isLoading: isLoadingPurchases, refetch: refetchPurchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
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
    mutationFn: async (data: any) => {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create purchase order");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      form.reset();
      setIsCreateDialogOpen(false);
      setActiveTab("dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error creating purchase order",
        description: error.message || "Please try again.",
      });
    },
  });

  // Update purchase mutation
  const updatePurchaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update purchase order");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setEditingPurchase(null);
      setIsEditDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error updating purchase order",
        description: error.message || "Please try again.",
      });
    },
  });

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete purchase order");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setIsDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error deleting purchase order",
        description: error.message || "Please try again.",
      });
    },
  });

  // Watch for changes in items array and additional charges to recalculate totals
  const watchedItems = useWatch({
    control: form.control,
    name: "items"
  });

  const watchedSurcharge = useWatch({
    control: form.control,
    name: "surchargeAmount"
  });

  const watchedFreight = useWatch({
    control: form.control,
    name: "freightAmount"
  });

  const watchedPacking = useWatch({
    control: form.control,
    name: "packingCharges"
  });

  const watchedOther = useWatch({
    control: form.control,
    name: "otherCharges"
  });

  const watchedAdditionalDiscount = useWatch({
    control: form.control,
    name: "additionalDiscount"
  });

  // Calculate totals when items or additional charges change
  useEffect(() => {
    const items = form.getValues("items") || [];

    let totalItems = 0;
    let totalQuantity = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // First pass: Calculate basic amounts without additional charges
    items.forEach((item) => {
      if (item.productId && item.productId > 0) {
        totalItems++;
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

    // Get additional charges from form
    const surchargeAmount = Number(watchedSurcharge) || 0;
    const packingCharges = Number(watchedPacking) || 0;
    const otherCharges = Number(watchedOther) || 0;
    const additionalDiscount = Number(watchedAdditionalDiscount) || 0;
    const freightCharges = Number(watchedFreight) || 0;

    const totalAdditionalCharges = surchargeAmount + packingCharges + otherCharges + freightCharges;

    // Second pass: Distribute additional charges proportionally
    items.forEach((item, index) => {
      if (item.productId && item.productId > 0) {
        const receivedQty = Number(item.receivedQty) || 0;
        const itemCost = (item.unitCost || 0) * receivedQty;
        const discount = item.discountAmount || 0;
        const taxableAmount = itemCost - discount;
        const tax = (taxableAmount * (item.taxPercentage || 0)) / 100;

        // Calculate net amount with additional charges distributed proportionally
        let netAmount = taxableAmount + tax;
        
        // Distribute additional charges proportionally if there are charges and subtotal
        if (totalAdditionalCharges > 0 && subtotal > 0) {
          const itemProportion = itemCost / subtotal;
          const itemAdditionalCharges = totalAdditionalCharges * itemProportion;
          netAmount += itemAdditionalCharges;
        }
        
        // Update the form value for this item's net amount
        form.setValue(`items.${index}.netAmount`, Math.round(netAmount * 100) / 100);
      }
    });

    const grandTotal = subtotal - totalDiscount + totalTax + totalAdditionalCharges - additionalDiscount;

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
  }, [watchedItems, watchedSurcharge, watchedFreight, watchedPacking, watchedOther, watchedAdditionalDiscount, form]);

  // Dynamic product selection handler
  const handleProductSelection = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.description || product.name);
      form.setValue(`items.${index}.unitCost`, parseFloat(product.price) || 0);
      form.setValue(`items.${index}.mrp`, parseFloat(product.price) * 1.2 || 0);
      form.setValue(`items.${index}.sellingPrice`, parseFloat(product.price) || 0);
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");

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

  // Add item function
  const addItem = () => {
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
      description: `Line item ${fields.length + 1} added successfully.`,
    });
  };

  // Remove item function
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      toast({
        title: "Item Removed! 🗑️",
        description: `Line item ${index + 1} removed successfully.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Remove! ⚠️",
        description: "At least one line item is required.",
      });
    }
  };

  // Handle form submission
  const onSubmit = (data: PurchaseFormData) => {
    try {
      if (!data.supplierId || data.supplierId === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please select a supplier.",
        });
        return;
      }

      const validItems = data.items.filter(item => item.productId && item.productId > 0);
      
      if (validItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please add at least one product to the purchase order.",
        });
        return;
      }

      const totalValue = validItems.reduce((total, item) => {
        const qty = Number(item.receivedQty) || Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return total + (qty * cost);
      }, 0);

      const purchaseData = {
        supplierId: Number(data.supplierId),
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate || data.orderDate,
        paymentTerms: data.paymentTerms || "Net 30",
        paymentMethod: data.paymentMethod || "Credit",
        status: data.status || "pending",
        priority: data.priority || "normal",
        shippingAddress: data.shippingAddress || "",
        billingAddress: data.billingAddress || "",
        shippingMethod: data.shippingMethod || "standard",
        freightAmount: Number(data.freightAmount) || 0,
        surchargeAmount: Number(data.surchargeAmount) || 0,
        packingCharges: Number(data.packingCharges) || 0,
        otherCharges: Number(data.otherCharges) || 0,
        additionalDiscount: Number(data.additionalDiscount) || 0,
        taxAmount: Number(data.taxAmount) || summary.totalTax,
        discountAmount: Number(data.discountAmount) || Math.abs(summary.totalDiscount),
        invoiceNumber: data.invoiceNumber || "",
        invoiceDate: data.invoiceDate || "",
        invoiceAmount: Number(data.invoiceAmount) || 0,
        lrNumber: data.lrNumber || "",
        remarks: data.remarks || "",
        internalNotes: data.internalNotes || "",
        total: totalValue.toString(),
        items: validItems.map(item => ({
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

      if (editingPurchase) {
        updatePurchaseMutation.mutate({ id: editingPurchase.id, data: purchaseData });
      } else {
        createPurchaseMutation.mutate(purchaseData);
      }
    } catch (error) {
      console.error("Error preparing purchase data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare purchase data. Please check your entries and try again.",
      });
    }
  };

  // Populate form with editing purchase data
  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    // Reset form and populate with purchase data
    form.reset({
      supplierId: purchase.supplierId,
      orderNumber: purchase.orderNumber,
      orderDate: purchase.orderDate,
      expectedDate: purchase.expectedDate || "",
      status: purchase.status,
      items: purchase.items || [{
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
      }]
    });
    setIsEditDialogOpen(true);
  };

  // Handle view purchase
  const handleView = (purchase: Purchase) => {
    setViewingPurchase(purchase);
    setIsViewDialogOpen(true);
  };

  // Handle delete purchase
  const handleDelete = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setIsDeleteDialogOpen(true);
  };

  // Filter purchases based on search and filters
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = !searchTerm || 
      purchase.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || purchase.supplierId.toString() === supplierFilter;

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Reset form for new purchase
  const handleCreateNew = () => {
    setEditingPurchase(null);
    form.reset({
      orderNumber: `PO-${Date.now().toString().slice(-8)}`,
      orderDate: today,
      expectedDate: "",
      paymentTerms: "Net 30",
      paymentMethod: "Credit",
      status: "Pending",
      freightAmount: 0,
      surchargeAmount: 0,
      packingCharges: 0,
      otherCharges: 0,
      additionalDiscount: 0,
      invoiceNumber: "",
      invoiceDate: "",
      invoiceAmount: 0,
      lrNumber: "",
      remarks: "",
      items: [{
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
      }]
    });
    setIsCreateDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Management Professional</h1>
            <p className="text-muted-foreground">Complete CRUD operations for purchase orders</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Purchase Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Search & Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by PO number or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{purchases.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                      <p className="text-2xl font-bold">{purchases.filter(p => p.status === 'pending').length}</p>
                    </div>
                    <Package className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed Orders</p>
                      <p className="text-2xl font-bold">{purchases.filter(p => p.status === 'received').length}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(purchases.reduce((sum, p) => sum + parseFloat(p.total || "0"), 0))}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Purchase Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPurchases ? (
                  <div className="text-center py-8">Loading purchase orders...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Expected Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-medium">{purchase.orderNumber}</TableCell>
                            <TableCell>{purchase.supplier?.name || 'Unknown Supplier'}</TableCell>
                            <TableCell>{new Date(purchase.orderDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(purchase.status)} px-2 py-1 text-xs font-medium`}>
                                {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(parseFloat(purchase.total || "0"))}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(purchase)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(purchase)}
                                  title="Edit Purchase"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(purchase)}
                                  title="Delete Purchase"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredPurchases.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No purchase orders found matching your criteria
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Analytics and reporting features coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Purchase Dialog */}
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingPurchase(null);
          }
        }}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? 'Edit Purchase Order' : 'Create New Purchase Order'}
              </DialogTitle>
              <DialogDescription>
                {editingPurchase ? 'Update the purchase order details below.' : 'Fill in the details to create a new purchase order.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Purchase Details</TabsTrigger>
                    <TabsTrigger value="items">Line Items</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>

                  {/* Purchase Details Tab */}
                  <TabsContent value="details" className="space-y-4">
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
                        <Label htmlFor="status">Status</Label>
                        <Select onValueChange={(value) => form.setValue("status", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Additional Charges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="freightAmount">Freight Charges (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("freightAmount", { valueAsNumber: true })}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="surchargeAmount">Surcharge (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("surchargeAmount", { valueAsNumber: true })}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="packingCharges">Packing Charges (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("packingCharges", { valueAsNumber: true })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea
                        {...form.register("remarks")}
                        placeholder="Enter any remarks..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Line Items Tab */}
                  <TabsContent value="items" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Line Items</h3>
                      <Button type="button" onClick={addItem} size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Tax %</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <Select onValueChange={(value) => handleProductSelection(index, parseInt(value))}>
                                  <SelectTrigger>
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
                                <Input
                                  type="number"
                                  {...form.register(`items.${index}.receivedQty`, { valueAsNumber: true })}
                                  placeholder="0"
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })}
                                  placeholder="0"
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...form.register(`items.${index}.taxPercentage`, { valueAsNumber: true })}
                                  placeholder="0"
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {formatCurrency((form.watch(`items.${index}.receivedQty`) || 0) * (form.watch(`items.${index}.unitCost`) || 0))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Summary Tab */}
                  <TabsContent value="summary" className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Purchase Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Items:</span>
                            <span className="font-medium">{summary.totalItems}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Quantity:</span>
                            <span className="font-medium">{summary.totalQuantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Tax:</span>
                            <span className="font-medium">{formatCurrency(summary.totalTax)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Freight Charges:</span>
                            <span className="font-medium">{formatCurrency(summary.freightCharges)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Discount:</span>
                            <span className="font-medium text-red-600">{formatCurrency(summary.totalDiscount)}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between text-lg font-bold">
                              <span>Grand Total:</span>
                              <span className="text-blue-600">{formatCurrency(summary.grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
                  >
                    {createPurchaseMutation.isPending || updatePurchaseMutation.isPending ? "Saving..." : (editingPurchase ? "Update" : "Create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Purchase Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                View complete details of purchase order {viewingPurchase?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            {viewingPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PO Number</Label>
                    <p className="text-sm font-medium">{viewingPurchase.orderNumber}</p>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <p className="text-sm font-medium">{viewingPurchase.supplier?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p className="text-sm font-medium">{new Date(viewingPurchase.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={`${getStatusColor(viewingPurchase.status)} px-2 py-1 text-xs`}>
                      {viewingPurchase.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="text-sm font-medium">{formatCurrency(parseFloat(viewingPurchase.total || "0"))}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the purchase order
                <strong> {purchaseToDelete?.orderNumber}</strong> and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (purchaseToDelete) {
                    deletePurchaseMutation.mutate(purchaseToDelete.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
