
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit2, Eye, Search, Filter } from "lucide-react";
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
  supplier: Supplier;
  user: any;
  total: string;
  status: string;
  orderDate: string;
  createdAt: string;
  items?: any[];
}

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
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

  // Fetch purchases with search and filters
  const { data: purchases = [], isLoading: purchasesLoading, refetch } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases", searchTerm, statusFilter, supplierFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (supplierFilter !== "all") params.append("supplierId", supplierFilter);
      
      const response = await fetch(`/api/purchases?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch purchases");
      return response.json();
    },
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
      setIsCreateMode(false);
      setActiveTab("list");
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
      setActiveTab("list");
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

        const discount = item.discountAmount || 0;
        totalDiscount += discount;

        const taxableAmount = itemCost - discount;
        const tax = (taxableAmount * (item.taxPercentage || 0)) / 100;
        totalTax += tax;
      }
    });

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

        let netAmount = taxableAmount + tax;
        
        if (totalAdditionalCharges > 0 && subtotal > 0) {
          const itemProportion = itemCost / subtotal;
          const itemAdditionalCharges = totalAdditionalCharges * itemProportion;
          netAmount += itemAdditionalCharges;
        }
        
        form.setValue(`items.${index}.netAmount`, Math.round(netAmount * 100) / 100);
      }
    });

    const grandTotal = subtotal - totalDiscount + totalTax + totalAdditionalCharges - additionalDiscount;

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

  // Product selection handler
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

  // Form submission handler
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

  // Edit purchase handler
  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    // Populate form with purchase data
    form.reset({
      supplierId: purchase.supplier.id,
      orderNumber: purchase.orderNumber,
      orderDate: purchase.orderDate.split('T')[0],
      status: purchase.status,
      // Add other fields as needed
      items: purchase.items || [],
    });
    setActiveTab("form");
  };

  // View purchase handler
  const handleViewPurchase = async (purchase: Purchase) => {
    try {
      const response = await fetch(`/api/purchases/${purchase.id}`);
      if (response.ok) {
        const fullPurchase = await response.json();
        setViewingPurchase(fullPurchase);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load purchase details.",
      });
    }
  };

  // Delete purchase handler
  const handleDeletePurchase = (id: number) => {
    deletePurchaseMutation.mutate(id);
  };

  // Start new purchase
  const startNewPurchase = () => {
    setEditingPurchase(null);
    form.reset();
    setIsCreateMode(true);
    setActiveTab("form");
  };

  // Cancel form
  const cancelForm = () => {
    setIsCreateMode(false);
    setEditingPurchase(null);
    form.reset();
    setActiveTab("list");
  };

  // Filter purchases based on search and filters
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = !searchTerm || 
      purchase.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || purchase.supplier.id.toString() === supplierFilter;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Purchase Management</h1>
              <p className="text-muted-foreground">Create and manage purchase orders</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "form" && (
              <>
                <Button variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createPurchaseMutation.isPending || updatePurchaseMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingPurchase ? "Update" : "Save"}
                    </>
                  )}
                </Button>
              </>
            )}
            {activeTab === "list" && (
              <Button onClick={startNewPurchase} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Purchase Order
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Purchase Orders</TabsTrigger>
            <TabsTrigger value="form" disabled={!isCreateMode && !editingPurchase}>
              {editingPurchase ? "Edit Purchase" : "New Purchase"}
            </TabsTrigger>
          </TabsList>

          {/* Purchase List Tab */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search & Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search by order number or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier-filter">Supplier</Label>
                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Suppliers" />
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
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setSupplierFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders ({filteredPurchases.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="text-center py-8">Loading purchases...</div>
                ) : filteredPurchases.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No purchase orders</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new purchase order.</p>
                    <div className="mt-6">
                      <Button onClick={startNewPurchase}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Purchase Order
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.orderNumber}</TableCell>
                          <TableCell>{purchase.supplier.name}</TableCell>
                          <TableCell>{new Date(purchase.orderDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                purchase.status === "received" ? "default" : 
                                purchase.status === "pending" ? "secondary" :
                                purchase.status === "cancelled" ? "destructive" : "outline"
                              }
                            >
                              {purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(purchase.total))}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewPurchase(purchase)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPurchase(purchase)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the purchase order.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePurchase(purchase.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Form Tab */}
          <TabsContent value="form" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs defaultValue="details" className="w-full">
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

                        {/* Additional Charges Section */}
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Additional Charges</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="surchargeAmount">Surcharge (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("surchargeAmount", { 
                                  valueAsNumber: true
                                })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="freightAmount">Freight Charges (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("freightAmount", { 
                                  valueAsNumber: true
                                })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="packingCharges">Packing Charges (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("packingCharges", { 
                                  valueAsNumber: true
                                })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="otherCharges">Other Charges (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("otherCharges", { 
                                  valueAsNumber: true
                                })}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="additionalDiscount">Additional Discount (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                {...form.register("additionalDiscount", { 
                                  valueAsNumber: true
                                })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Invoice Details Section */}
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="remarks">Remarks</Label>
                              <Textarea
                                {...form.register("remarks")}
                                placeholder="Enter remarks..."
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="internalNotes">Internal Notes</Label>
                              <Textarea
                                {...form.register("internalNotes")}
                                placeholder="Internal notes..."
                                rows={3}
                              />
                            </div>
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
                              <TableRow>
                                <TableHead className="w-[200px]">Product</TableHead>
                                <TableHead className="w-[100px]">Code</TableHead>
                                <TableHead className="w-[150px]">Description</TableHead>
                                <TableHead className="w-[100px]">Qty</TableHead>
                                <TableHead className="w-[100px]">Recv Qty</TableHead>
                                <TableHead className="w-[100px]">Free Qty</TableHead>
                                <TableHead className="w-[100px]">Unit Cost</TableHead>
                                <TableHead className="w-[80px]">Tax %</TableHead>
                                <TableHead className="w-[100px]">Discount</TableHead>
                                <TableHead className="w-[100px]">HSN Code</TableHead>
                                <TableHead className="w-[100px]">Batch No</TableHead>
                                <TableHead className="w-[100px]">Expiry Date</TableHead>
                                <TableHead className="w-[120px]">Net Amount</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <Select onValueChange={(value) => handleProductSelection(index, parseInt(value))}>
                                      <SelectTrigger className="w-full">
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
                                      className="w-full"
                                      {...form.register(`items.${index}.code`)}
                                      placeholder="Code"
                                      readOnly
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      className="w-full"
                                      {...form.register(`items.${index}.description`)}
                                      placeholder="Description"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-full"
                                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                      placeholder="1"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-full"
                                      {...form.register(`items.${index}.receivedQty`, { valueAsNumber: true })}
                                      placeholder="0"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-full"
                                      {...form.register(`items.${index}.freeQty`, { valueAsNumber: true })}
                                      placeholder="0"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full"
                                      {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })}
                                      placeholder="0"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className="w-full"
                                      {...form.register(`items.${index}.taxPercentage`, { valueAsNumber: true })}
                                      placeholder="18"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full"
                                      {...form.register(`items.${index}.discountAmount`, { valueAsNumber: true })}
                                      placeholder="0"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      className="w-full"
                                      {...form.register(`items.${index}.hsnCode`)}
                                      placeholder="HSN"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      className="w-full"
                                      {...form.register(`items.${index}.batchNumber`)}
                                      placeholder="Batch"
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="date"
                                      className="w-full"
                                      {...form.register(`items.${index}.expiryDate`)}
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <div className="text-sm font-medium bg-gray-50 p-2 rounded">
                                      {formatCurrency(form.watch(`items.${index}.netAmount`) || 0)}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
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
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Details</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order Number:</span>
                                  <span className="font-medium">{form.watch("orderNumber")}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order Date:</span>
                                  <span className="font-medium">{form.watch("orderDate")}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Status:</span>
                                  <Badge variant="secondary">{form.watch("status") || "Pending"}</Badge>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold mb-4 text-gray-800">Financial Summary</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Items:</span>
                                  <span className="font-medium">{summary.totalItems}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Subtotal:</span>
                                  <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Tax:</span>
                                  <span className="font-medium">{formatCurrency(summary.totalTax)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Freight Charges:</span>
                                  <span className="font-medium">{formatCurrency(summary.freightCharges)}</span>
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
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* View Purchase Dialog */}
        <Dialog open={!!viewingPurchase} onOpenChange={() => setViewingPurchase(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                View complete purchase order information
              </DialogDescription>
            </DialogHeader>
            {viewingPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order Number</Label>
                    <p className="font-medium">{viewingPurchase.orderNumber}</p>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <p className="font-medium">{viewingPurchase.supplier.name}</p>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p className="font-medium">{new Date(viewingPurchase.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant="secondary">{viewingPurchase.status}</Badge>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="font-medium text-lg">{formatCurrency(parseFloat(viewingPurchase.total))}</p>
                  </div>
                </div>
                
                {viewingPurchase.items && viewingPurchase.items.length > 0 && (
                  <div>
                    <Label>Items</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingPurchase.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.product?.name || 'Unknown Product'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(item.cost || 0))}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(item.total || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingPurchase(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
