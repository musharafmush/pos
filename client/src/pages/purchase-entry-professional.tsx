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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit2 } from "lucide-react";
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

  // Modal state for Add Item
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [modalData, setModalData] = useState({
    productId: 0,
    code: "",
    description: "",
    receivedQty: 0,
    freeQty: 0,
    unitCost: 0,
    hsnCode: "",
    taxPercentage: 18,
    discountAmount: 0,
    expiryDate: "",
    batchNumber: "",
    sellingPrice: 0,
    mrp: 0,
    netAmount: 0,
    location: "",
    unit: "PCS",
  });

  // Get current date for defaults
  const today = new Date().toISOString().split('T')[0];

  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;

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
      internalNotes: "",
      items: [
        {
          productId: 0,
          code: "",
          description: "",
          quantity: 1,
          receivedQty: 1,
          freeQty: 0,
          unitCost: 0,
          sellingPrice: 0,
          mrp: 0,
          hsnCode: "",
          taxPercentage: 18,
          discountAmount: 0,
          discountPercent: 0,
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

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Loading state for save button
  const [isSaving, setIsSaving] = useState(false);

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

  // Effect to populate form when editing existing purchase
  useEffect(() => {
    if (existingPurchase && isEditMode) {
      console.log('Loading existing purchase data:', existingPurchase);
      
      // Format dates properly - handle different possible date field names
      const orderDate = existingPurchase.poDate || existingPurchase.orderDate || existingPurchase.order_date
        ? (existingPurchase.poDate || existingPurchase.orderDate || existingPurchase.order_date).split('T')[0]
        : today;
      const expectedDate = existingPurchase.dueDate || existingPurchase.expectedDate || existingPurchase.due_date
        ? (existingPurchase.dueDate || existingPurchase.expectedDate || existingPurchase.due_date).split('T')[0]
        : "";

      // Map database field names to form field names with proper product information
      const mappedItems = existingPurchase.items?.length > 0
        ? existingPurchase.items.map((item: any) => {
            // Find the product details to get name and sku
            const product = products.find(p => p.id === (item.productId || item.product_id));
            
            return {
              productId: item.productId || item.product_id || 0,
              code: item.code || product?.sku || "",
              description: item.description || product?.name || "",
              quantity: Number(item.quantity) || 1,
              receivedQty: Number(item.receivedQty || item.received_qty || item.quantity) || Number(item.quantity) || 1,
              freeQty: Number(item.freeQty || item.free_qty) || 0,
              unitCost: Number(item.unitCost || item.unit_cost || item.cost) || 0,
              sellingPrice: Number(item.sellingPrice || item.selling_price) || 0,
              mrp: Number(item.mrp) || 0,
              hsnCode: item.hsnCode || item.hsn_code || product?.hsnCode || "",
              taxPercentage: Number(item.taxPercentage || item.tax_percentage || item.taxPercent || item.tax_percent) || 18,
              discountAmount: Number(item.discountAmount || item.discount_amount) || 0,
              discountPercent: Number(item.discountPercent || item.discount_percent) || 0,
              expiryDate: item.expiryDate || item.expiry_date || "",
              batchNumber: item.batchNumber || item.batch_number || "",
              netCost: Number(item.netCost || item.net_cost) || 0,
              roiPercent: Number(item.roiPercent || item.roi_percent) || 0,
              grossProfitPercent: Number(item.grossProfitPercent || item.gross_profit_percent) || 0,
              netAmount: Number(item.netAmount || item.net_amount || item.subtotal) || 0,
              cashPercent: Number(item.cashPercent || item.cash_percent) || 0,
              cashAmount: Number(item.cashAmount || item.cash_amount) || 0,
              location: item.location || "",
              unit: item.unit || "PCS",
            };
          })
        : [{
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
            batchNumber: "",
            netCost: 0,
            roiPercent: 0,
            grossProfitPercent: 0,
            netAmount: 0,
            cashPercent: 0,
            cashAmount: 0,
            location: "",
            unit: "PCS",
          }];

      const formData = {
        supplierId: existingPurchase.supplierId || existingPurchase.supplier_id || 0,
        orderNumber: existingPurchase.poNo || existingPurchase.orderNumber || existingPurchase.order_number || "",
        orderDate: orderDate,
        expectedDate: expectedDate,
        paymentTerms: existingPurchase.paymentTerms || "Net 30",
        paymentMethod: existingPurchase.paymentType || existingPurchase.paymentMethod || "Credit",
        status: existingPurchase.status || "Pending",
        freightAmount: Number(existingPurchase.freightAmount || existingPurchase.freight_amount) || 0,
        surchargeAmount: Number(existingPurchase.surchargeAmount || existingPurchase.surcharge_amount) || 0,
        packingCharges: Number(existingPurchase.packingCharge || existingPurchase.packing_charge) || 0,
        otherCharges: Number(existingPurchase.otherCharge || existingPurchase.other_charge) || 0,
        additionalDiscount: Number(existingPurchase.manualDiscountAmount || existingPurchase.manual_discount_amount) || 0,
        invoiceNumber: existingPurchase.invoiceNo || existingPurchase.invoice_no || "",
        invoiceDate: existingPurchase.invoiceDate || existingPurchase.invoice_date 
          ? (existingPurchase.invoiceDate || existingPurchase.invoice_date).split('T')[0] 
          : "",
        invoiceAmount: Number(existingPurchase.invoiceAmount || existingPurchase.invoice_amount) || 0,
        lrNumber: existingPurchase.lrNumber || existingPurchase.lr_number || "",
        remarks: existingPurchase.remarks || "",
        internalNotes: existingPurchase.internalNotes || existingPurchase.internal_notes || "",
        items: mappedItems,
      };

      console.log('Form data to populate:', formData);

      // Populate form with existing data
      form.reset(formData);

      // Also set the supplier value in the select component
      if (formData.supplierId) {
        setTimeout(() => {
          form.setValue("supplierId", formData.supplierId);
        }, 100);
      }

      toast({
        title: "Editing purchase order",
        description: `Loaded purchase order ${formData.orderNumber}`,
      });
    }
  }, [existingPurchase, isEditMode, form, today, toast, products]);

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

    // Get additional charges from form - use the watched values for real-time updates
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

  // Modal synchronization functions
  const syncModalToTable = () => {
    if (editingItemIndex !== null) {
      // Update the form data with modal data
      const itemPath = `items.${editingItemIndex}` as const;
      form.setValue(`${itemPath}.productId`, modalData.productId);
      form.setValue(`${itemPath}.code`, modalData.code);
      form.setValue(`${itemPath}.description`, modalData.description);
      form.setValue(`${itemPath}.receivedQty`, modalData.receivedQty);
      form.setValue(`${itemPath}.freeQty`, modalData.freeQty);
      form.setValue(`${itemPath}.unitCost`, modalData.unitCost);
      form.setValue(`${itemPath}.hsnCode`, modalData.hsnCode);
      form.setValue(`${itemPath}.taxPercentage`, modalData.taxPercentage);
      form.setValue(`${itemPath}.discountAmount`, modalData.discountAmount);
      form.setValue(`${itemPath}.expiryDate`, modalData.expiryDate);
      form.setValue(`${itemPath}.batchNumber`, modalData.batchNumber);
      form.setValue(`${itemPath}.sellingPrice`, modalData.sellingPrice);
      form.setValue(`${itemPath}.mrp`, modalData.mrp);
      form.setValue(`${itemPath}.netAmount`, modalData.netAmount);
      form.setValue(`${itemPath}.location`, modalData.location);
      form.setValue(`${itemPath}.unit`, modalData.unit);
      
      // Trigger form validation
      form.trigger(`items.${editingItemIndex}`);
    }
  };

  const syncTableToModal = (index: number) => {
    if (editingItemIndex === index) {
      const item = form.getValues(`items.${index}`);
      setModalData({
        productId: item.productId || 0,
        code: item.code || "",
        description: item.description || "",
        receivedQty: item.receivedQty || 0,
        freeQty: item.freeQty || 0,
        unitCost: item.unitCost || 0,
        hsnCode: item.hsnCode || "",
        taxPercentage: item.taxPercentage || 18,
        discountAmount: item.discountAmount || 0,
        expiryDate: item.expiryDate || "",
        batchNumber: item.batchNumber || "",
        sellingPrice: item.sellingPrice || 0,
        mrp: item.mrp || 0,
        netAmount: item.netAmount || 0,
        location: item.location || "",
        unit: item.unit || "PCS",
      });
    }
  };

  const openAddItemModal = (index?: number) => {
    if (index !== undefined) {
      // Edit existing item
      setEditingItemIndex(index);
      const item = form.getValues(`items.${index}`);
      setModalData({
        productId: item.productId || 0,
        code: item.code || "",
        description: item.description || "",
        receivedQty: item.receivedQty || 0,
        freeQty: item.freeQty || 0,
        unitCost: item.unitCost || 0,
        hsnCode: item.hsnCode || "",
        taxPercentage: item.taxPercentage || 18,
        discountAmount: item.discountAmount || 0,
        expiryDate: item.expiryDate || "",
        batchNumber: item.batchNumber || "",
        sellingPrice: item.sellingPrice || 0,
        mrp: item.mrp || 0,
        netAmount: item.netAmount || 0,
        location: item.location || "",
        unit: item.unit || "PCS",
      });
    } else {
      // Add new item
      setEditingItemIndex(null);
      const newBatchNumber = `BATCH-${Date.now().toString().slice(-6)}`;
      setModalData({
        productId: 0,
        code: "",
        description: "",
        receivedQty: 1,
        freeQty: 0,
        unitCost: 0,
        hsnCode: "",
        taxPercentage: 18,
        discountAmount: 0,
        expiryDate: "",
        batchNumber: newBatchNumber,
        sellingPrice: 0,
        mrp: 0,
        netAmount: 0,
        location: "",
        unit: "PCS",
      });
    }
    setIsAddItemModalOpen(true);
  };

  const saveModalItem = () => {
    if (editingItemIndex !== null) {
      // Update existing item
      syncModalToTable();
      toast({
        title: "Item Updated! ✨",
        description: "Line item updated successfully with new data.",
      });
    } else {
      // Add new item
      append({
        productId: modalData.productId,
        code: modalData.code,
        description: modalData.description,
        quantity: modalData.receivedQty,
        receivedQty: modalData.receivedQty,
        freeQty: modalData.freeQty,
        unitCost: modalData.unitCost,
        sellingPrice: modalData.sellingPrice,
        mrp: modalData.mrp,
        hsnCode: modalData.hsnCode,
        taxPercentage: modalData.taxPercentage,
        discountAmount: modalData.discountAmount,
        discountPercent: 0,
        expiryDate: modalData.expiryDate,
        batchNumber: modalData.batchNumber,
        netCost: 0,
        roiPercent: 0,
        grossProfitPercent: 0,
        netAmount: modalData.netAmount,
        cashPercent: 0,
        cashAmount: 0,
        location: modalData.location,
        unit: modalData.unit,
      });
      toast({
        title: "New Item Added! ✨",
        description: `Line item ${fields.length + 1} added successfully.`,
      });
    }
    setIsAddItemModalOpen(false);
    setEditingItemIndex(null);
  };

  // Enhanced dynamic add item function
  const addItem = () => {
    openAddItemModal();
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

  // Submit purchase order (create or update)
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      let response;
      const url = isEditMode ? `/api/purchases/${editId}` : "/api/purchases";
      const method = isEditMode ? "PUT" : "POST";
      
      console.log(`${method} ${url} with data:`, data);
      
      response = await apiRequest(method, url, data);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(isEditMode ? "Failed to update purchase order" : "Failed to create purchase order");
      }
      return response.json();
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
        // Reset form only for new purchases
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
          internalNotes: "",
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
              discountPercent: 0,
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
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: isEditMode ? "Error updating purchase order" : "Error creating purchase order",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: PurchaseFormData) => {
    try {
      // Validate required fields
      if (!data.supplierId || data.supplierId === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please select a supplier.",
        });
        return;
      }

      // Filter and validate items - allow 0 quantities in edit mode if they existed before
      const validItems = data.items.filter(item => {
        const hasProduct = item.productId && item.productId > 0;
        // In edit mode, include items even with 0 quantity if they have a product selected
        const hasValidQuantity = isEditMode ? 
          (hasProduct) : 
          ((Number(item.receivedQty) || Number(item.quantity) || 0) > 0);
        const hasCost = (Number(item.unitCost) || 0) >= 0;
        return hasProduct && hasValidQuantity && hasCost;
      });

      if (validItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please add at least one product to the purchase order.",
        });
        return;
      }

      // In edit mode, allow 0 quantities but warn about negative costs
      const itemsWithIssues = validItems.filter(item => {
        const cost = Number(item.unitCost) || 0;
        return cost < 0;
      });

      if (itemsWithIssues.length > 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Item costs cannot be negative.",
        });
        return;
      }

      // Calculate total purchase value
      const totalValue = validItems.reduce((total, item) => {
        const qty = Number(item.receivedQty) || Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return total + (qty * cost);
      }, 0);

      // Create purchase data with proper structure for backend compatibility
      const purchaseData = {
        // Core purchase details
        supplierId: Number(data.supplierId),
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate || data.orderDate,
        dueDate: data.expectedDate || data.orderDate,
        paymentMethod: data.paymentMethod || "Credit",
        paymentTerms: data.paymentTerms || "Net 30",
        status: data.status || "Pending",

        // Invoice details
        invoiceNumber: data.invoiceNumber || "",
        invoiceDate: data.invoiceDate || "",
        invoiceAmount: Number(data.invoiceAmount) || 0,
        remarks: data.remarks || "",

        // Additional charges
        freightAmount: Number(data.freightAmount) || 0,
        surchargeAmount: Number(data.surchargeAmount) || 0,
        packingCharges: Number(data.packingCharges) || 0,
        otherCharges: Number(data.otherCharges) || 0,
        additionalDiscount: Number(data.additionalDiscount) || 0,

        // Items array in expected format
        items: validItems.map(item => {
          // Use receivedQty if available, otherwise fall back to quantity, default to 1 for new items
          const quantity = Number(item.receivedQty) || Number(item.quantity) || (isEditMode ? 0 : 1);
          
          return {
            productId: Number(item.productId),
            quantity: quantity,
            receivedQty: quantity,
            freeQty: Number(item.freeQty) || 0,
            unitCost: Number(item.unitCost) || 0,
            cost: Number(item.unitCost) || 0,
            hsnCode: item.hsnCode || "",
            taxPercentage: Number(item.taxPercentage) || 0,
            discountAmount: Number(item.discountAmount) || 0,
            discountPercent: Number(item.discountPercent) || 0,
            expiryDate: item.expiryDate || "",
            batchNumber: item.batchNumber || "",
            sellingPrice: Number(item.sellingPrice) || 0,
            mrp: Number(item.mrp) || 0,
            netAmount: Number(item.netAmount) || 0,
            location: item.location || "",
            unit: item.unit || "PCS",
            roiPercent: Number(item.roiPercent) || 0,
            grossProfitPercent: Number(item.grossProfitPercent) || 0,
            cashPercent: Number(item.cashPercent) || 0,
            cashAmount: Number(item.cashAmount) || 0
          };
        })
      };

      console.log("Submitting professional purchase data:", purchaseData);

      // Set saving state
      setIsSaving(true);

      // Submit the purchase data using the standard API endpoint
      savePurchaseMutation.mutate(purchaseData);
    } catch (error) {
      console.error("Error preparing purchase data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare purchase data. Please check your entries and try again.",
      });
    } finally {
      setIsSaving(false);
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                toast({
                  title: "Print Feature",
                  description: "Print functionality will be available after saving the purchase order.",
                });
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSaving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
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
                      <Select 
                        onValueChange={(value) => form.setValue("supplierId", parseInt(value))}
                        value={form.watch("supplierId")?.toString() || ""}
                      >
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

                    {/* Payment Terms */}
                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("paymentTerms", value)}
                        value={form.watch("paymentTerms") || ""}
                      >
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
                          <SelectItem value="received">Fully Received</SelectItem>                          <SelectItem value="closed">Closed</SelectItem>
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
                  </div>
                </CardContent>
              </Card>

              {/* Additional Charges Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Charges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="flex gap-2">
                      <Button onClick={addItem} size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
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
                                    onChange={(e) => {
                                      form.setValue(`items.${index}.code`, e.target.value);
                                      syncTableToModal(index);
                                    }}
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Select 
                                    onValueChange={(value) => handleProductSelection(index, parseInt(value))}
                                    value={form.watch(`items.${index}.productId`)?.toString() || ""}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Product">
                                        {selectedProduct ? (
                                          <div className="flex flex-col text-left">
                                            <span className="font-medium text-sm">{selectedProduct.name}</span>
                                            <span className="text-xs text-gray-500">{selectedProduct.sku}</span>
                                          </div>
                                        ) : "Select Product"}
                                      </SelectValue>
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
                                    onChange={(e) => {
                                      form.setValue(`items.${index}.description`, e.target.value);
                                      syncTableToModal(index);
                                    }}
                                  />
                                </TableCell>

                                <TableCell className="border-r px-2 py-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    {...form.register(`items.${index}.receivedQty`, { 
                                      valueAsNumber: true,
                                      onChange: (e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        form.setValue(`items.${index}.receivedQty`, value);
                                        
                                        // Recalculate net amount when quantity changes
                                        const unitCost = form.getValues(`items.${index}.unitCost`) || 0;
                                        const discount = form.getValues(`items.${index}.discountAmount`) || 0;
                                        const taxPercentage = form.getValues(`items.${index}.taxPercentage`) || 0;
                                        
                                        const subtotal = value * unitCost;
                                        const taxableAmount = subtotal - discount;
                                        const tax = (taxableAmount * taxPercentage) / 100;
                                        const netAmount = taxableAmount + tax;
                                        
                                        form.setValue(`items.${index}.netAmount`, netAmount);
                                        
                                        // Trigger form validation
                                        setTimeout(() => form.trigger(`items.${index}`), 50);
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

                                          // Auto-calculate net amount using receivedQty
                                          const receivedQty = form.getValues(`items.${index}.receivedQty`) || 0;
                                          const discount = form.getValues(`items.${index}.discountAmount`) || 0;
                                          const taxPercentage = form.getValues(`items.${index}.taxPercentage`) || 0;

                                          const subtotal = value * receivedQty;
                                          const taxableAmount = subtotal - discount;
                                          const tax = (taxableAmount * taxPercentage) / 100;
                                          const netAmount = taxableAmount + tax;

                                          form.setValue(`items.${index}.netAmount`, netAmount);
                                          
                                          // Trigger form validation
                                          setTimeout(() => form.trigger(`items.${index}`), 50);
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
                                    {form.watch(`items.${index}.netAmount`) > 0 ? (
                                      <>
                                        <span className="text-xs font-medium text-green-700">₹</span>
                                        <span className="font-medium text-green-700 ml-1">{Math.round(form.watch(`items.${index}.netAmount`))}</span>
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
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAddItemModal(index)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-8 w-8 rounded-full"
                                      title="Edit item"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
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
                          <div className="flex justify-between">
                            <span className="text-gray-600">Surcharge:</span>
                            <span className="font-medium">+{formatCurrency(Number(form.watch("surchargeAmount")) || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Packing Charges:</span>
                            <span className="font-medium">+{formatCurrency(Number(form.watch("packingCharges")) || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Other Charges:</span>
                            <span className="font-medium">+{formatCurrency(Number(form.watch("otherCharges")) || 0)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Additional Discount:</span>
                            <span className="font-medium">-{formatCurrency(Number(form.watch("additionalDiscount")) || 0)}</span>
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

        {/* Add Item Modal */}
        <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItemIndex !== null ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modal-product">Product Name *</Label>
                <Select 
                  onValueChange={(value) => {
                    const productId = parseInt(value);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                      const newModalData = {
                        ...modalData,
                        productId,
                        code: product.sku || "",
                        description: product.description || product.name,
                        unitCost: parseFloat(product.price) || 0,
                        mrp: parseFloat(product.price) * 1.2 || 0,
                        sellingPrice: parseFloat(product.price) || 0,
                        hsnCode: product.hsnCode || "",
                      };
                      setModalData(newModalData);
                      if (editingItemIndex !== null) {
                        syncModalToTable();
                      }
                    }
                  }}
                  value={modalData.productId?.toString() || ""}
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-code">Code</Label>
                <Input
                  id="modal-code"
                  value={modalData.code}
                  onChange={(e) => {
                    const newModalData = { ...modalData, code: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.code`, e.target.value);
                    }
                  }}
                  placeholder="Product code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-description">Description</Label>
                <Input
                  id="modal-description"
                  value={modalData.description}
                  onChange={(e) => {
                    const newModalData = { ...modalData, description: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.description`, e.target.value);
                    }
                  }}
                  placeholder="Product description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-receivedQty">Received Qty *</Label>
                <Input
                  id="modal-receivedQty"
                  type="number"
                  min="0"
                  value={modalData.receivedQty}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const newModalData = { ...modalData, receivedQty: value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.receivedQty`, value);
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-freeQty">Free Qty</Label>
                <Input
                  id="modal-freeQty"
                  type="number"
                  min="0"
                  value={modalData.freeQty}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const newModalData = { ...modalData, freeQty: value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.freeQty`, value);
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-cost">Cost *</Label>
                <Input
                  id="modal-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modalData.unitCost}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const newModalData = { ...modalData, unitCost: value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.unitCost`, value);
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-hsnCode">HSN Code</Label>
                <Input
                  id="modal-hsnCode"
                  value={modalData.hsnCode}
                  onChange={(e) => {
                    const newModalData = { ...modalData, hsnCode: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.hsnCode`, e.target.value);
                    }
                  }}
                  placeholder="HSN Code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-taxPercentage">Tax %</Label>
                <Input
                  id="modal-taxPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={modalData.taxPercentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const newModalData = { ...modalData, taxPercentage: value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.taxPercentage`, value);
                    }
                  }}
                  placeholder="18"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-discountAmount">Discount Amount</Label>
                <Input
                  id="modal-discountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modalData.discountAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const newModalData = { ...modalData, discountAmount: value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.discountAmount`, value);
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-expiryDate">Exp. Date</Label>
                <Input
                  id="modal-expiryDate"
                  type="date"
                  value={modalData.expiryDate}
                  onChange={(e) => {
                    const newModalData = { ...modalData, expiryDate: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.expiryDate`, e.target.value);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-batchNumber">Batch Number</Label>
                <Input
                  id="modal-batchNumber"
                  value={modalData.batchNumber}
                  onChange={(e) => {
                    const newModalData = { ...modalData, batchNumber: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.batchNumber`, e.target.value);
                    }
                  }}
                  placeholder="Batch number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-location">Location</Label>
                <Input
                  id="modal-location"
                  value={modalData.location}
                  onChange={(e) => {
                    const newModalData = { ...modalData, location: e.target.value };
                    setModalData(newModalData);
                    if (editingItemIndex !== null) {
                      form.setValue(`items.${editingItemIndex}.location`, e.target.value);
                    }
                  }}
                  placeholder="Storage location"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddItemModalOpen(false);
                  setEditingItemIndex(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveModalItem}>
                {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};