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
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit2, List, Download, FileText, Archive, Search, X, QrCode as QrCodeIcon, CreditCard, DollarSign, Clock } from "lucide-react";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

// Product Search with Suggestions Component
const ProductSearchWithSuggestions = ({ 
  products, 
  onProductSelect, 
  placeholder = "Search products..." 
}: {
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (searchTerm.length >= 1) {
      const searchLower = searchTerm.toLowerCase().trim();

      const filtered = products.filter(product => {
        if (!product) return false;

        const name = (product.name || '').toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        const description = (product.description || '').toLowerCase();

        return name.includes(searchLower) ||
               sku.includes(searchLower) ||
               description.includes(searchLower) ||
               name.startsWith(searchLower) ||
               sku.startsWith(searchLower);
      }).slice(0, 10); // Limit to 10 suggestions

      console.log('Search term:', searchTerm, 'Filtered products:', filtered.length);

      setFilteredProducts(filtered);
      setShowSuggestions(filtered.length > 0 && searchTerm.length >= 1);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
          selectProduct(filteredProducts[selectedIndex]);
        } else if (filteredProducts.length === 1) {
          selectProduct(filteredProducts[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectProduct = (product: Product) => {
    onProductSelect(product);
    setSearchTerm("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full text-xs pl-10 pr-8"
          onFocus={() => {
            if (searchTerm.length >= 1 && filteredProducts.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={(e) => {
            // Delay hiding suggestions to allow for clicks
            setTimeout(() => {
              if (e.currentTarget && !e.currentTarget.contains(document.activeElement)) {
                setShowSuggestions(false);
              }
            }, 200);
          }}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setShowSuggestions(false);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          <div className="sticky top-0 p-2 text-xs text-gray-600 bg-blue-50 border-b border-blue-200 font-medium">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </div>

          {filteredProducts.map((product, index) => (
            <div
              key={`suggestion-${product.id}-${index}`}
              onClick={() => selectProduct(product)}
              className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex 
                  ? 'bg-blue-100 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 mb-1 truncate">
                    {product.name || 'Unnamed Product'}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {product.sku || 'No SKU'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium text-green-600">₹{product.price || '0'}</span>
                  </div>
                  {product.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {product.description}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-xs px-2 py-1 rounded-full font-medium border ${
                    (product.stockQuantity || 0) <= (product.alertThreshold || 5) 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : (product.stockQuantity || 0) > 50
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    Stock: {product.stockQuantity || 0}
                  </div>
                  {(product.stockQuantity || 0) <= (product.alertThreshold || 5) && (
                    <div className="text-xs text-red-600 font-medium mt-1">
                      ⚠️ Low Stock
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && searchTerm.length >= 2 && (
            <div className="p-4 text-center">
              <div className="text-gray-400 mb-2">🔍</div>
              <div className="text-sm text-gray-600 font-medium">No products found</div>
              <div className="text-xs text-gray-500">
                Try searching with different keywords
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const purchaseItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  receivedQty: z.number().min(0, "Received quantity cannot be negative").optional(),
  freeQty: z.number().min(0, "Free quantity cannot be negative").optional(),
  unitCost: z.number().min(0, "Unit cost must be at least 0"),
  sellingPrice: z.number().min(0, "Selling price must be at least 0").optional(),
  wholesalePrice: z.number().min(0, "Wholesale price must be at least 0").optional(),
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
  taxCalculationMethod: z.string().optional(),
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
  // Payment fields
  paymentType: z.string().optional(),
  payment_status: z.string().optional(),
  paid_amount: z.number().optional(),
  payment_date: z.string().optional(),
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
  cost?: string;
  wholesalePrice?: string;
  mrp?: string;
  hsnCode?: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
  alertThreshold?: number;
  stockQuantity?: number;
  barcode?: string;
}

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  // Professional Record Payment Mutation for Bill Payment Management
  const recordPayment = useMutation({
    mutationFn: async (data: { purchaseId: number; amount: number; method: string; date: string }) => {
      console.log('💰 Recording payment via professional interface:', data);
      
      // Use the existing payment endpoint that works with updatePaymentStatus
      const paymentData = {
        paymentAmount: data.amount,
        paymentMethod: data.method,
        paymentDate: data.date,
        paymentType: 'payment'
      };
      
      const response = await fetch(`/api/purchases/${data.purchaseId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record payment');
      }
      
      return response.json();
    },
    onSuccess: async (result, variables) => {
      console.log('✅ Payment recorded successfully:', result);
      
      // Update form data immediately with new payment information
      const currentPaidAmount = Number(form.getValues("paid_amount") || 0);
      const newTotalPaid = currentPaidAmount + variables.amount;
      
      form.setValue("paid_amount", newTotalPaid);
      form.setValue("payment_status", newTotalPaid >= summary.grandTotal ? 'paid' : 'partial');
      form.setValue("payment_date", variables.date);
      form.setValue("paymentMethod", variables.method);
      
      // Comprehensive cache invalidation for real-time updates
      await queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/suppliers/order-summary'] });
      
      // Force refetch all purchase-related data
      await queryClient.refetchQueries({ queryKey: ['/api/purchases'], type: 'all' });
      
      toast({
        title: "Payment Recorded Successfully! 💰",
        description: `Payment of ${formatCurrency(variables.amount)} recorded via ${variables.method}`,
      });
      
      console.log('🔄 Cache invalidated and form updated with new payment data');
    },
    onError: (error: any) => {
      console.error('❌ Payment recording failed:', error);
      toast({
        variant: "destructive",
        title: "Payment Recording Failed",
        description: error.message || "Failed to record payment. Please try again.",
      });
    }
  });
  
  console.log('🚀 PurchaseEntryProfessional component loaded');
  const [barcodeInput, setBarcodeInput] = useState("");
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    freightCharges: 0,
    grandTotal: 0
  });

  // Hold Purchase functionality - persist in localStorage
  const [heldPurchases, setHeldPurchases] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('purchase-held-orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldPurchases, setShowHeldPurchases] = useState(false);

  // Payment Management functionality  
  const [showPaymentManagementMenu, setShowPaymentManagementMenu] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentAmount: 0,
    paymentMethod: "Cash",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentReference: "",
    paymentNotes: "",
  });

  // Record Payment Dialog State
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    method: "Cash",
    date: new Date().toISOString().split('T')[0],
    reference: "",
    notes: ""
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
    wholesalePrice: 0,
    mrp: 0,
    netAmount: 0,
    location: "",
    unit: "PCS",
  });

  // State to control bulk items only in modal
  const [showBulkItemsOnly, setShowBulkItemsOnly] = useState(false);

  // Get current date for defaults
  const today = new Date().toISOString().split('T')[0];

  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId && editId !== 'null' && editId !== 'undefined';
  
  console.log('🔍 Edit Mode Check:', {
    editId,
    isEditMode,
    url: window.location.href
  });

  // Validate edit ID format
  useEffect(() => {
    if (editId && (editId === 'null' || editId === 'undefined' || isNaN(Number(editId)))) {
      toast({
        variant: "destructive",
        title: "Invalid Purchase ID",
        description: "The purchase order ID in the URL is invalid. Redirecting to create new purchase.",
      });
      // Clear the invalid edit parameter
      window.history.replaceState({}, '', '/purchase-entry-professional');
    }
  }, [editId, toast]);

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      orderNumber: `PO-${Date.now().toString().slice(-8)}`,
      orderDate: today,
      expectedDate: "",
      paymentTerms: "Net 30",
      paymentMethod: "Credit",
      status: "Pending",
      taxCalculationMethod: "exclusive",
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
      // Initialize payment fields
      paymentType: "Credit",
      payment_status: "unpaid",
      paid_amount: 0,
      payment_date: undefined,
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
  const { data: existingPurchase, isLoading: purchaseLoading, error: purchaseError } = useQuery({
    queryKey: ['/api/purchases', editId],
    queryFn: async () => {
      if (!editId) return null;
      console.log(`🔄 Fetching purchase data for ID: ${editId}`);
      const res = await fetch(`/api/purchases/${editId}`);
      if (!res.ok) throw new Error('Failed to fetch purchase');
      const data = await res.json();
      console.log('📦 Purchase data received:', data);
      return data;
    },
    enabled: !!editId,
  });
  
  console.log('📊 Purchase Query State:', {
    existingPurchase: !!existingPurchase,
    purchaseLoading,
    purchaseError,
    isEditMode
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter bulk items
  const bulkItems = products.filter(product => product.name.toUpperCase().includes("BULK"));

  // Loading state for save button
  const [isSaving, setIsSaving] = useState(false);

  // Cleanup effect to prevent memory leaks and stuck states
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or intervals
      // Reset form state if component unmounts unexpectedly
      setIsAddItemModalOpen(false);
      setShowHeldPurchases(false);
      setEditingItemIndex(null);
    };
  }, []);

  // Hold Purchase functions
  const holdPurchase = () => {
    const currentFormData = form.getValues();

    // More flexible validation - allow holding even without supplier for draft purposes
    const hasAnyData = currentFormData.supplierId > 0 || 
                      currentFormData.orderNumber.trim() !== "" ||
                      currentFormData.items.some(item => 
                        item.productId > 0 || 
                        item.description?.trim() !== "" ||
                        ((item.receivedQty || 0) > 0 && (item.unitCost || 0) > 0)
                      );

    if (!hasAnyData) {
      toast({
        variant: "destructive",
        title: "Cannot Hold Empty Purchase",
        description: "Please add at least a supplier, product, or some purchase details before holding.",
      });
      return;
    }

    const holdId = `HOLD-${Date.now().toString().slice(-8)}`;
    const selectedSupplier = suppliers.find(s => s.id === currentFormData.supplierId);
    const validItems = currentFormData.items.filter(item => 
      item.productId > 0 || item.description?.trim() !== ""
    );

    const heldPurchase = {
      id: holdId,
      timestamp: new Date().toISOString(), // Store as ISO string for localStorage
      supplier: selectedSupplier || { id: 0, name: "No Supplier Selected" },
      orderNumber: currentFormData.orderNumber || `DRAFT-${holdId}`,
      formData: { ...currentFormData },
      summary: { ...summary },
      itemsCount: validItems.length,
      totalValue: summary.grandTotal || 0
    };

    const updatedHeldPurchases = [...heldPurchases, heldPurchase];
    setHeldPurchases(updatedHeldPurchases);

    // Persist to localStorage
    try {
      localStorage.setItem('purchase-held-orders', JSON.stringify(updatedHeldPurchases));
    } catch (error) {
      console.error('Failed to save held purchases to localStorage:', error);
    }

    // Reset form for new purchase
    const newOrderNumber = `PO-${Date.now().toString().slice(-8)}`;
    form.reset({
      orderNumber: newOrderNumber,
      orderDate: today,
      expectedDate: "",
      paymentTerms: "Net 30",
      paymentMethod: "Credit",
      status: "Pending",
      taxCalculationMethod: "exclusive",
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
      // Reset payment fields
      paymentType: "Credit",
      payment_status: "unpaid",
      paid_amount: 0,
      payment_date: undefined,
    });

    // Force form to refresh
    setTimeout(() => {
      setActiveTab("details");
    }, 100);

    toast({
      title: "Purchase Order Held! 📋",
      description: `Purchase order ${heldPurchase.orderNumber} has been held successfully. You can recall it anytime from the held purchases list.`,
    });
  };

  const recallHeldPurchase = (heldPurchase: any) => {
    try {
      // Ensure form data is properly structured
      const recallData = {
        ...heldPurchase.formData,
        // Ensure supplier ID is properly set
        supplierId: heldPurchase.formData.supplierId || 0,
        // Ensure all required fields have default values
        orderNumber: heldPurchase.formData.orderNumber || heldPurchase.orderNumber,
        orderDate: heldPurchase.formData.orderDate || today,
        paymentTerms: heldPurchase.formData.paymentTerms || "Net 30",
        paymentMethod: heldPurchase.formData.paymentMethod || "Credit",
        status: heldPurchase.formData.status || "Pending",
        taxCalculationMethod: heldPurchase.formData.taxCalculationMethod || "exclusive",
        // Ensure items array is valid
        items: heldPurchase.formData.items && heldPurchase.formData.items.length > 0 
          ? heldPurchase.formData.items
          : [{
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
            }]
      };

      // Reset form with recalled data
      form.reset(recallData);

      // Force update supplier selection if available
      if (recallData.supplierId > 0) {
        setTimeout(() => {
          form.setValue("supplierId", recallData.supplierId);
          form.trigger("supplierId");
        }, 100);
      }

      // Remove from held purchases and update localStorage
      const updatedHeldPurchases = heldPurchases.filter(p => p.id !== heldPurchase.id);
      setHeldPurchases(updatedHeldPurchases);

      try {
        localStorage.setItem('purchase-held-orders', JSON.stringify(updatedHeldPurchases));
      } catch (error) {
        console.error('Failed to update localStorage:', error);
      }

      setShowHeldPurchases(false);

      // Switch to details tab
      setActiveTab("details");

      toast({
        title: "Purchase Order Recalled! ✅",
        description: `Purchase order ${heldPurchase.orderNumber} has been recalled successfully and is ready for editing.`,
      });
    } catch (error) {
      console.error("Error recalling held purchase:", error);
      toast({
        variant: "destructive",
        title: "Recall Failed",
        description: "Failed to recall the held purchase order. Please try again.",
      });
    }
  };

  const deleteHeldPurchase = (holdId: string) => {
    const updatedHeldPurchases = heldPurchases.filter(p => p.id !== holdId);
    setHeldPurchases(updatedHeldPurchases);

    try {
      localStorage.setItem('purchase-held-orders', JSON.stringify(updatedHeldPurchases));
    } catch (error) {
      console.error('Failed to update localStorage:', error);
    }

    toast({
      title: "Held Purchase Deleted",
      description: `Held purchase order has been deleted.`,
    });
  };

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

  const watchedTaxCalculationMethod = useWatch({
    control: form.control,
    name: "taxCalculationMethod"
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

            // Calculate selling price, wholesale price and MRP if not available from database
            let sellingPrice = Number(item.sellingPrice || item.selling_price) || 0;
            let wholesalePrice = Number(item.wholesalePrice || item.wholesale_price) || 0;
            let mrp = Number(item.mrp) || 0;

            // If selling price is not set, try to get from product or calculate from cost
            if (sellingPrice === 0) {
              if (product?.price && parseFloat(product.price) > 0) {
                sellingPrice = parseFloat(product.price);
              } else {
                const unitCost = Number(item.unitCost || item.unit_cost || item.cost) || 0;
                if (unitCost > 0) {
                  // Apply standard retail markup (30-50% depending on category)
                  sellingPrice = Math.round(unitCost * 1.4 * 100) / 100;
                }
              }
            }

            // If wholesale price is not set, try to get from product
            if (wholesalePrice === 0) {
              if (product?.wholesalePrice && parseFloat(product.wholesalePrice) > 0) {
                wholesalePrice = parseFloat(product.wholesalePrice);
              }
            }

            // If MRP is not set, try to get from product or calculate from selling price
            if (mrp === 0) {
              if (product?.mrp && parseFloat(product.mrp) > 0) {
                mrp = parseFloat(product.mrp);
              } else if (sellingPrice > 0) {
                // Apply standard MRP markup (20-25% above selling price)
                mrp = Math.round(sellingPrice * 1.2 * 100) / 100;
              }
            }

            return {
              productId: item.productId || item.product_id || 0,
              code: item.code || product?.sku || "",
              description: item.description || product?.name || "",
              quantity: Number(item.quantity) || 1,
              receivedQty: Number(item.receivedQty || item.received_qty || item.quantity) || Number(item.quantity) || 1,
              freeQty: Number(item.freeQty || item.free_qty) || 0,
              unitCost: Number(item.unitCost || item.unit_cost || item.cost) || 0,
              sellingPrice: sellingPrice,
              wholesalePrice: wholesalePrice,
              mrp: mrp,
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

      console.log('📋 Mapping purchase data for form:');
      console.log('- Purchase items found:', existingPurchase.items?.length || 0);
      console.log('- Supplier ID:', existingPurchase.supplierId || existingPurchase.supplier_id);
      console.log('- Order number:', existingPurchase.poNo || existingPurchase.orderNumber || existingPurchase.order_number);

      const formData = {
        supplierId: existingPurchase.supplierId || existingPurchase.supplier_id || 0,
        orderNumber: existingPurchase.poNo || existingPurchase.orderNumber || existingPurchase.order_number || "",
        orderDate: orderDate,
        expectedDate: expectedDate,
        paymentTerms: existingPurchase.paymentTerms || "Net 30",
        paymentMethod: existingPurchase.paymentType || existingPurchase.paymentMethod || "Credit",
        status: existingPurchase.status || "Pending",
        taxCalculationMethod: existingPurchase.taxCalculationMethod || "exclusive",
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
        // Populate payment fields from existing purchase
        paymentType: existingPurchase.paymentType || "Credit",
        payment_status: existingPurchase.payment_status || "unpaid",
        paid_amount: Number(existingPurchase.paid_amount) || 0,
        payment_date: existingPurchase.payment_date ? existingPurchase.payment_date.split('T')[0] : undefined,
      };
      
      console.log('📋 Final form data:', formData);

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
    const taxCalculationMethod = watchedTaxCalculationMethod || form.getValues("taxCalculationMethod") || "exclusive";

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
        const discount = item.discountAmount || 0;
        const taxPercentage = item.taxPercentage || 0;

        let tax = 0;
        let taxableAmount = 0;

        // Calculate tax based on selected method
        switch (taxCalculationMethod) {
          case "inclusive":
            // Tax is included in the unit cost - need to extract the base amount
            taxableAmount = itemCost - discount;
            if (taxPercentage > 0) {
              const baseAmountIncl = taxableAmount / (1 + (taxPercentage / 100));
              tax = taxableAmount - baseAmountIncl;
              subtotal += baseAmountIncl;
            } else {
              tax = 0;
              subtotal += taxableAmount;
            }
            break;

          case "compound":
            // Tax on tax calculation - compound interest approach
            taxableAmount = itemCost - discount;
            if (taxPercentage > 0) {
              const primaryTax = (taxableAmount * taxPercentage) / 100;
              const compoundTax = (primaryTax * taxPercentage) / 100;
              tax = primaryTax + compoundTax;
            } else {
              tax = 0;
            }
            subtotal += itemCost;
            break;

          case "exclusive":
          default:
            // Standard tax exclusive calculation - tax added on top
            taxableAmount = itemCost - discount;
            tax = (taxableAmount * taxPercentage) / 100;
            subtotal += itemCost;
            break;
        }

        totalDiscount += discount;
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
        const taxPercentage = item.taxPercentage || 0;

        let tax = 0;
        let taxableAmount = 0;
        let baseAmount = itemCost;

        // Calculate tax and amounts based on selected method
        switch (taxCalculationMethod) {
          case "inclusive":
            // Tax is included in the unit cost - extract base amount
            taxableAmount = itemCost - discount;
            if (taxPercentage > 0) {
              baseAmount = taxableAmount / (1 + (taxPercentage / 100));
              tax = taxableAmount - baseAmount;
            } else {
              baseAmount = taxableAmount;
              tax = 0;
            }
            break;

          case "compound":
            // Tax on tax calculation - compound interest approach
            taxableAmount = itemCost - discount;
            baseAmount = itemCost;
            if (taxPercentage > 0) {
              const primaryTax = (taxableAmount * taxPercentage) / 100;
              const compoundTax = (primaryTax * taxPercentage) / 100;
              tax = primaryTax + compoundTax;
            } else {
              tax = 0;
            }
            break;

          case "exclusive":
          default:
            // Standard tax exclusive calculation - tax added on top
            taxableAmount = itemCost - discount;
            baseAmount = itemCost;
            tax = (taxableAmount * taxPercentage) / 100;
            break;
        }

        // Calculate net amount with additional charges distributed proportionally
        let netAmount = taxableAmount + tax;

        // Distribute additional charges proportionally if there are charges and subtotal
        if (totalAdditionalCharges > 0 && subtotal > 0) {
          const itemProportion = baseAmount / subtotal;
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
  }, [watchedItems, watchedSurcharge, watchedFreight, watchedPacking, watchedOther, watchedAdditionalDiscount, watchedTaxCalculationMethod, form]);

  // Helper function to recalculate net amount for an item based on tax method
  const recalculateItemNetAmount = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const taxCalculationMethod = form.getValues("taxCalculationMethod") || "exclusive";

    if (!item || item.productId === 0) return;

    const qty = Number(item.receivedQty) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const discount = Number(item.discountAmount) || 0;
    const taxPercentage = Number(item.taxPercentage) || 0;

    // Get additional charges for proportional distribution using form getValues
    const formValues = form.getValues();
    const surchargeAmount = Number(formValues.surchargeAmount) || 0;
    const freightAmount = Number(formValues.freightAmount) || 0;
    const packingCharges = Number(formValues.packingCharges) || 0;
    const otherCharges = Number(formValues.otherCharges) || 0;
    const additionalDiscount = Number(formValues.additionalDiscount) || 0;

    const totalAdditionalCharges = surchargeAmount + freightAmount + packingCharges + otherCharges;

    // Calculate total order value for proportional distribution
    const allItems = form.getValues("items") || [];
    const totalOrderValue = allItems.reduce((sum, item) => {
      if (item.productId && item.productId > 0) {
        return sum + ((item.receivedQty || 0) * (item.unitCost || 0));
      }
      return sum;
    }, 0);

    // Calculate proportional additional charges for this item
    let itemAdditionalCharges = 0;
    let itemAdditionalDiscount = 0;

    const subtotal = qty * unitCost;
    if (totalOrderValue > 0) {
      const itemProportion = subtotal / totalOrderValue;
      itemAdditionalCharges = totalAdditionalCharges * itemProportion;
      itemAdditionalDiscount = additionalDiscount * itemProportion;
    }

    let netAmount = 0;

    switch (taxCalculationMethod) {
      case "inclusive":
        // Tax is included in cost price - net amount is same as taxable amount
        const taxableAmountIncl = subtotal - discount;
        netAmount = taxableAmountIncl + itemAdditionalCharges - itemAdditionalDiscount;
        break;
      case "compound":
        // Compound tax calculation
        const taxableAmountComp = subtotal - discount;
        if (taxPercentage > 0) {
          const primaryTax = (taxableAmountComp * taxPercentage) / 100;
          const compoundTax = (primaryTax * taxPercentage) / 100;
          netAmount = taxableAmountComp + primaryTax + compoundTax + itemAdditionalCharges - itemAdditionalDiscount;
        } else {
          netAmount = taxableAmountComp + itemAdditionalCharges - itemAdditionalDiscount;
        }
        break;
      case "exclusive":
      default:
        // Standard exclusive tax calculation - tax added on top
        const taxableAmountExcl = subtotal - discount;
        const tax = (taxableAmountExcl * taxPercentage) / 100;
        netAmount = taxableAmountExcl + tax + itemAdditionalCharges - itemAdditionalDiscount;
        break;
    }

    // Update netAmount field
    form.setValue(`items.${index}.netAmount`, Math.round(netAmount * 100) / 100);
  };

  // Effect to recalculate all items when tax calculation method changes
  useEffect(() => {
    if (watchedTaxCalculationMethod) {
      const items = form.getValues("items") || [];
      items.forEach((_, index) => {
        recalculateItemNetAmount(index);
      });
      // Trigger form validation to update totals
      form.trigger("items");
      // Force a re-render to update the display
      setTimeout(() => {
        const currentItems = form.getValues("items");
        form.setValue("items", [...currentItems]);
      }, 100);
    }
  }, [watchedTaxCalculationMethod, form]);

  // Effect to recalculate when item fields change
  useEffect(() => {
    const items = form.getValues("items") || [];
    items.forEach((item, index) => {
      if (item.productId && item.productId > 0) {
        recalculateItemNetAmount(index);
      }
    });
  }, [watchedItems]);

  // Enhanced tax field syncing utility with detailed breakdown
  const syncTaxFieldsFromProduct = (product: Product, index: number) => {
    // Extract tax rates from product with fallback logic
    const cgstRate = parseFloat(product.cgstRate || "0");
    const sgstRate = parseFloat(product.sgstRate || "0");
    const igstRate = parseFloat(product.igstRate || "0");
    const cessRate = 0; // Cess rate not implemented in current product schema

    // Calculate total GST (CGST + SGST for intra-state, IGST for inter-state)
    let totalGst = 0;
    let gstBreakdown = {
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: cessRate
    };

    if (igstRate > 0) {
      totalGst = igstRate; // Inter-state transaction
      gstBreakdown.igst = igstRate;
    } else if (cgstRate > 0 || sgstRate > 0) {
      totalGst = cgstRate + sgstRate; // Intra-state transaction
      gstBreakdown.cgst = cgstRate;
      gstBreakdown.sgst = sgstRate;
    }

    // Auto-detect HSN code and suggest GST rate if missing
    let hsnCode = product.hsnCode || "";
    let suggestedGstRate = totalGst;

    // HSN-based GST rate suggestion if product doesn't have tax rates
    if ((!hsnCode || totalGst === 0) && product.name) {
      // Auto-suggest HSN based on product name/category
      const productName = product.name.toLowerCase();
      if (productName.includes('rice') || productName.includes('wheat') || productName.includes('sugar')) {
        hsnCode = hsnCode || "10019000"; // Food grains - 5%
        suggestedGstRate = totalGst || 5;
      } else if (productName.includes('oil') || productName.includes('edible')) {
        hsnCode = hsnCode || "15179010"; // Edible oil - 5%
        suggestedGstRate = totalGst || 5;
      } else if (productName.includes('biscuit') || productName.includes('snack')) {
        hsnCode = hsnCode || "19059090"; // Biscuits - 18%
        suggestedGstRate = totalGst || 18;
      } else if (productName.includes('soap') || productName.includes('shampoo')) {
        hsnCode = hsnCode || "34012000"; // Personal care - 18%
        suggestedGstRate = totalGst || 18;
      } else if (productName.includes('phone') || productName.includes('mobile')) {
        hsnCode = hsnCode || "85171200"; // Mobile phones - 12%
        suggestedGstRate = totalGst || 12;
      } else {
        hsnCode = hsnCode || "19059090"; // Default general goods
        suggestedGstRate = totalGst || 18;
      }

      // If we're suggesting a rate and don't have breakdown, create default breakdown
      if (totalGst === 0) {
        if (suggestedGstRate > 0) {
          // Default to intra-state (CGST + SGST)
          gstBreakdown.cgst = suggestedGstRate / 2;
          gstBreakdown.sgst = suggestedGstRate / 2;
          gstBreakdown.igst = 0;
        }
      }
    }

    // If still no HSN, use generic HSN based on suggested rate
    if (!hsnCode && suggestedGstRate > 0) {
      if (suggestedGstRate <= 5) hsnCode = "10019000";
      else if (suggestedGstRate <= 12) hsnCode = "85171200";
      else if (suggestedGstRate <= 18) hsnCode = "19059090";
      else hsnCode = "22021000";
    }

    // Set tax fields with proper breakdown
    form.setValue(`items.${index}.hsnCode`, hsnCode);
    form.setValue(`items.${index}.taxPercentage`, suggestedGstRate);

    // Store detailed tax breakdown for display
    const taxBreakdown = {
      cgst: gstBreakdown.cgst,
      sgst: gstBreakdown.sgst,
      igst: gstBreakdown.igst,
      cess: gstBreakdown.cess,
      total: suggestedGstRate,
      hsnCode: hsnCode,
      taxType: igstRate > 0 ? 'IGST' : 'CGST+SGST'
    };

    return taxBreakdown;
  };

  // Dynamic product selection handler with enhanced tax syncing
  const handleProductSelection = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Auto-populate basic fields
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.description || product.name);

      // Enhanced cost price calculation with multiple fallbacks
      let costPrice = 0;
      if (product.cost && parseFloat(product.cost) > 0) {
        costPrice = parseFloat(product.cost);
      } else if (product.price && parseFloat(product.price) > 0) {
        // If no cost, estimate from price (typically 60-70% of selling price)
        costPrice = Math.round(parseFloat(product.price) * 0.65 * 100) / 100;
      } else {
        // Default minimum cost
        costPrice = 10;
      }

      const sellingPrice = parseFloat(product.price) || 0;
      const wholesalePrice = parseFloat(product.wholesalePrice || "0") || 0;

      // Calculate MRP: use product MRP if available, otherwise calculate from selling price
      let mrpPrice = 0;
      if (product.mrp && parseFloat(product.mrp) > 0) {
        mrpPrice = parseFloat(product.mrp);
      } else if (sellingPrice > 0) {
        // Standard retail markup is typically 20-25%
        mrpPrice = Math.round(sellingPrice * 1.2 * 100) / 100;
      } else if (costPrice > 0) {
        // If no selling price, calculate from cost with typical markup
        mrpPrice = Math.round(costPrice * 1.5 * 100) / 100;
      }

      form.setValue(`items.${index}.unitCost`, costPrice);
      form.setValue(`items.${index}.sellingPrice`, sellingPrice);
      form.setValue(`items.${index}.wholesalePrice`, wholesalePrice);
      form.setValue(`items.${index}.mrp`, mrpPrice);

      // Set default received quantity if not set
      if (!form.getValues(`items.${index}.receivedQty`) || form.getValues(`items.${index}.receivedQty`) === 0) {
        form.setValue(`items.${index}.receivedQty`, 1);
        form.setValue(`items.${index}.quantity`, 1);
      }

      // Calculate total GST percentage from product's GST rates
      const cgstRate = parseFloat(product.cgstRate || "0");
      const sgstRate = parseFloat(product.sgstRate || "0");
      const igstRate = parseFloat(product.igstRate || "0");
      const totalGstRate = cgstRate + sgstRate + igstRate;

      // Set HSN code and tax percentage from product
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
      form.setValue(`items.${index}.taxPercentage`, totalGstRate);

      // Calculate net amount with accurate tax calculation
      const qty = form.getValues(`items.${index}.receivedQty`) || 1;
      const taxCalculationMethod = form.getValues("taxCalculationMethod") || "exclusive";
      const discountAmount = form.getValues(`items.${index}.discountAmount`) || 0;

      let netAmount = 0;
      const subtotal = qty * costPrice;

      switch (taxCalculationMethod) {
        case "inclusive":
          // Tax included in cost price - extract base amount first
          const taxableAmountIncl = subtotal - discountAmount;
          if (totalGstRate > 0) {
            const baseAmountIncl = taxableAmountIncl / (1 + (totalGstRate / 100));
            const taxAmountIncl = taxableAmountIncl - baseAmountIncl;
            netAmount = taxableAmountIncl; // Net amount is the same as cost when tax is inclusive
          } else {
            netAmount = taxableAmountIncl;
          }
          break;
        case "compound":
          // Compound tax calculation - tax on tax
          const taxableAmountComp = subtotal - discountAmount;
          if (totalGstRate > 0) {
            const primaryTax = (taxableAmountComp * totalGstRate) / 100;
            const compoundTax = (primaryTax * totalGstRate) / 100;
            netAmount = taxableAmountComp + primaryTax + compoundTax;
          } else {
            netAmount = taxableAmountComp;
          }
          break;
        case "exclusive":
        default:
          // Standard exclusive tax calculation - tax added on top
          const taxableAmountExcl = subtotal - discountAmount;
          const taxExcl = (taxableAmountExcl * totalGstRate) / 100;
          netAmount = taxableAmountExcl + taxExcl;
          break;
      }

      form.setValue(`items.${index}.netAmount`, netAmount);

      // Trigger form validation and update
      form.trigger(`items.${index}`);

      // Show success toast with enhanced information
      toast({
        title: "Product Selected",
        description: `${product.name} added - Cost: ₹${costPrice.toFixed(2)}, Tax: ${totalGstRate}%`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Product Not Found",
        description: "Selected product not found in database",
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
      form.setValue(`${itemPath}.quantity`, modalData.receivedQty); // Also update quantity
      form.setValue(`${itemPath}.receivedQty`, modalData.receivedQty);
      form.setValue(`${itemPath}.freeQty`, modalData.freeQty);
      form.setValue(`${itemPath}.unitCost`, modalData.unitCost);
      form.setValue(`${itemPath}.hsnCode`, modalData.hsnCode);
      form.setValue(`${itemPath}.taxPercentage`, modalData.taxPercentage);
      form.setValue(`${itemPath}.discountAmount`, modalData.discountAmount);
      form.setValue(`${itemPath}.expiryDate`, modalData.expiryDate);
      form.setValue(`${itemPath}.batchNumber`, modalData.batchNumber);
      form.setValue(`${itemPath}.sellingPrice`, modalData.sellingPrice);
      form.setValue(`${itemPath}.wholesalePrice`, modalData.wholesalePrice);
      form.setValue(`${itemPath}.mrp`, modalData.mrp);
      form.setValue(`${itemPath}.netAmount`, modalData.netAmount);
      form.setValue(`${itemPath}.location`, modalData.location);
      form.setValue(`${itemPath}.unit`, modalData.unit);

      // Recalculate net amount based on modal data
      const subtotal = modalData.receivedQty * modalData.unitCost;
      const taxableAmount = subtotal - modalData.discountAmount;
      const tax = (taxableAmount * modalData.taxPercentage) / 100;
      const calculatedNetAmount = taxableAmount + tax;

      form.setValue(`${itemPath}.netAmount`, calculatedNetAmount);

      // Trigger form validation and force re-render
      form.trigger(`items.${editingItemIndex}`);

      // Force update of the watched items to recalculate totals
      setTimeout(() => {
        form.trigger('items');
      }, 100);
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
        wholesalePrice: item.wholesalePrice || 0,
        mrp: item.mrp || 0,
        netAmount: item.netAmount || 0,
        location: item.location || "",
        unit: "PCS",
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
        wholesalePrice: item.wholesalePrice || 0,
        mrp: item.mrp || 0,
        netAmount: item.netAmount || 0,
        location: item.location || "",
        unit: "PCS",
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
        wholesalePrice: 0,
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

  // Barcode scanning functionality
  const handleBarcodeSubmit = async () => {
    if (!barcodeInput.trim()) return;

    try {
      // Find product by barcode
      const product = products.find(p => 
        p.barcode && p.barcode.toLowerCase() === barcodeInput.toLowerCase().trim()
      );

      if (product) {
        // Check if product already exists in current items
        const existingItemIndex = form.getValues("items").findIndex(item => 
          item.productId === product.id
        );

        if (existingItemIndex !== -1) {
          // Increment quantity if product already exists
          const currentQty = form.getValues(`items.${existingItemIndex}.receivedQty`) || 0;
          const newQty = currentQty + 1;
          form.setValue(`items.${existingItemIndex}.receivedQty`, newQty);
          form.setValue(`items.${existingItemIndex}.quantity`, newQty);

          // Recalculate net amount
          const cost = form.getValues(`items.${existingItemIndex}.unitCost`) || 0;
          const discount = form.getValues(`items.${existingItemIndex}.discountAmount`) || 0;
          const taxPercentage = form.getValues(`items.${existingItemIndex}.taxPercentage`) || 0;

          const subtotal = newQty * cost;
          const taxableAmount = subtotal - discount;
          const tax = (taxableAmount * taxPercentage) / 100;
          const netAmount = taxableAmount + tax;

          form.setValue(`items.${existingItemIndex}.netAmount`, netAmount);
          form.trigger(`items.${existingItemIndex}`);

          toast({
            title: "Quantity Updated! 📦",
            description: `${product.name} quantity increased to ${newQty}`,
          });
        } else {
          // Add as new item if first occurrence
          const newBatchNumber = `BATCH-${Date.now().toString().slice(-6)}`;

          // Use cost price from product if available, otherwise use selling price
          const costPrice = parseFloat(product.cost || product.price) || 0;
          const sellingPrice = parseFloat(product.price) || 0;
          const mrpPrice = parseFloat(product.mrp || (sellingPrice * 1.2).toString()) || 0;

          // Calculate total GST percentage from product's GST rates
          const cgstRate = parseFloat(product.cgstRate || "0");
          const sgstRate = parseFloat(product.sgstRate || "0");
          const igstRate = parseFloat(product.igstRate || "0");
          const totalGstRate = cgstRate + sgstRate + igstRate;

          append({
            productId: product.id,
            code: product.sku || "",
            description: product.description || product.name,
            quantity: 1,
            receivedQty: 1,
            freeQty: 0,
            unitCost: costPrice,
            sellingPrice: sellingPrice,
            mrp: mrpPrice,
            hsnCode: product.hsnCode || "",
            taxPercentage: totalGstRate,
            discountAmount: 0,
            discountPercent: 0,
            expiryDate: "",
            batchNumber: newBatchNumber,
            netCost: 0,
            roiPercent: 0,
            grossProfitPercent: 0,
            netAmount: costPrice,
            cashPercent: 0,
            cashAmount: 0,
            location: "",
            unit: "PCS",
          });

          toast({
            title: "Product Added by Barcode! 🎯",
            description: `${product.name} added to purchase order`,
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Barcode Not Found",
          description: `No product found with barcode: ${barcodeInput}`,
        });
      }
    } catch (error) {
      console.error("Error processing barcode:", error);
      toast({
        variant: "destructive",
        title: "Barcode Error",
        description: "Failed to process barcode scan",
      });
    } finally {
      setBarcodeInput("");
    }
  };

  // Enhanced dynamic add item function
  const addItem = () => {
    try {
      append({
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
      });

      toast({
        title: "Item Added",
        description: `New line item ${fields.length + 1} added successfully.`,
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add new item. Please try again.",
      });
    }
  };

  // Enhanced remove item function with better validation
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      try {
        remove(index);
        toast({
          title: "Item Removed",
          description: `Line item ${index + 1} removed successfully.`,
        });
      } catch (error) {
        console.error('Error removing item:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to remove item. Please try again.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Cannot Remove",
        description: "At least one line item is required for the purchase order.",
      });
    }
  };

  // Submit purchase order (create or update)
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      try {
        console.log('🔄 Starting purchase save/update process...');

        const url = isEditMode ? `/api/purchases/${editId}` : "/api/purchases";
        const method = isEditMode ? "PUT" : "POST";

        console.log(`📤 ${method} ${url}`);
        console.log('📝 Request data:', JSON.stringify(data, null, 2));

        // Enhanced validation before sending
        if (!data.supplierId || data.supplierId <= 0) {
          throw new Error('Please select a supplier before saving');
        }

        if (!data.orderNumber || data.orderNumber.trim() === '') {
          throw new Error('Order number is required');
        }

        if (!data.items || data.items.length === 0) {
          throw new Error('At least one item is required');
        }

        // Validate items
        const validItems = data.items.filter(item => 
          item.productId && 
          item.productId > 0 && 
          ((item.receivedQty || 0) > 0 || (item.quantity || 0) > 0) &&
          item.unitCost >= 0
        );

        if (validItems.length === 0) {
          throw new Error('Please add at least one valid item with quantity and cost');
        }

        // Update data with only valid items
        const requestData = {
          ...data,
          items: validItems
        };

        console.log(`✅ Validation passed. Sending ${validItems.length} valid items`);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        console.log(`📥 Response status: ${response.status} ${response.statusText}`);
        console.log('📄 Response content-type:', response.headers.get('content-type'));

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMessage = isEditMode ? "Failed to update purchase order" : "Failed to create purchase order";

          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              console.error('❌ Server error response:', errorData);

              // Use the most specific error message available
              errorMessage = errorData.error || errorData.message || errorMessage;

              // Add technical details if available
              if (errorData.technical && errorData.technical !== errorMessage) {
                console.error('🔧 Technical details:', errorData.technical);
              }

            } catch (jsonError) {
              console.error('❌ Failed to parse error JSON:', jsonError);
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
          } else {
            // Handle non-JSON responses
            try {
              const errorText = await response.text();
              console.error('❌ Server returned non-JSON response:', errorText.substring(0, 500));

              if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
                errorMessage = `Server error (${response.status}). The server returned an error page instead of data.`;
              } else {
                errorMessage = `Server error: ${response.status}. ${errorText.substring(0, 100)}`;
              }
            } catch (textError) {
              console.error('❌ Failed to read error response:', textError);
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
          }

          throw new Error(errorMessage);
        }

        // Validate response content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.error('❌ Expected JSON but got:', responseText.substring(0, 500));
          throw new Error('Server returned invalid response format. Expected JSON data.');
        }

        const result = await response.json();
        console.log('✅ Success response:', result);

        // Validate response structure
        if (isEditMode && !result.success && !result.purchase && !result.id) {
          console.warn('⚠️ Unexpected response structure for update:', result);
        }

        return result;

      } catch (error) {
        console.error('💥 Purchase save/update error:', error);

        // Re-throw with enhanced error context
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to server. Please check your connection and try again.');
        }

        throw error;
      }
    },
    onSuccess: (data) => {
      const items = form.getValues("items");
      const totalReceivedItems = items.reduce((total, item) => {
        return total + (item.receivedQty || 0);
      }, 0);
      const totalFreeItems = items.reduce((total, item) => {
        return total + (item.freeQty || 0);
      }, 0);
      const totalStockAdded = totalReceivedItems + totalFreeItems;

      toast({
        title: isEditMode ? "Purchase order updated!" : "Purchase order created!",
        description: isEditMode
          ? `Purchase order updated successfully. Stock levels have been adjusted.`
          : `Purchase order created successfully. ${totalStockAdded} total units added to inventory (${totalReceivedItems} received + ${totalFreeItems} free).`,
      });

      // Invalidate both purchases and products queries to refresh stock data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      if (!isEditMode) {
        // Reset form only for new purchases
        const newOrderNumber = `PO-${Date.now().toString().slice(-8)}`;
        form.reset({
          orderNumber: newOrderNumber,
          orderDate: today,
          expectedDate: "",
          paymentTerms: "Net 30",
          paymentMethod: "Credit",
          status: "Pending",
          taxCalculationMethod: "exclusive",
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
          // Reset payment fields
          paymentType: "Credit",
          payment_status: "unpaid",
          paid_amount: 0,
          payment_date: undefined,
        });

        // Force form to re-render with clean state
        setTimeout(() => {
          setActiveTab("details");
        }, 100);
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

      // In edit mode, validate that we have a valid edit ID
      if (isEditMode && (!editId || editId === 'null' || editId === 'undefined')) {
        toast({
          variant: "destructive",
          title: "Edit Error",
          description: "Invalid purchase order ID. Please try again from the purchases list.",
        });
        return;
      }

      // Filter and validate items with more flexible validation
      const validItems = data.items.filter(item => {
        const hasProduct = item.productId && item.productId > 0;
        const hasValidQuantity = (Number(item.receivedQty) || Number(item.quantity) || 0) > 0;
        const hasCost = (Number(item.unitCost) || 0) >= 0;

        // Check if item has meaningful data
        return hasProduct && hasValidQuantity && hasCost;
      });

      // Ensure each valid item has proper receivedQty value
      validItems.forEach(item => {
        if (!item.receivedQty || item.receivedQty === 0) {
          item.receivedQty = item.quantity || 1;
        }
      });

      console.log('Validating items:', {
        totalItems: data.items.length,
        validItems: validItems.length,
        editMode: isEditMode,
        editId: editId,
        itemsData: data.items.map(item => ({
          productId: item.productId,
          receivedQty: item.receivedQty,
          quantity: item.quantity,
          unitCost: item.unitCost
        }))
      });

      if (validItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please add at least one product with quantity and cost to the purchase order.",
        });
        return;
      }

      // Check for negative costs
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
        const receivedQty = Number(item.receivedQty) || Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        return total + (receivedQty * cost);
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
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",

        // Payment information
        paymentType: data.paymentType || data.paymentMethod || "Credit",
        payment_status: data.payment_status || "unpaid",
        paid_amount: Number(data.paid_amount) || 0,
        payment_date: data.payment_date || undefined,

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
          // Ensure we have valid quantities
          const receivedQty = Math.max(Number(item.receivedQty) || 0, 0);
          const quantity = Math.max(Number(item.quantity) || receivedQty || 1, 0);
          const finalQty = receivedQty > 0 ? receivedQty : quantity;

          console.log(`Mapping item: Product ID ${item.productId}, Received Qty: ${receivedQty}, Final Quantity: ${finalQty}`);

          return {
            productId: Number(item.productId),
            quantity: finalQty,
            receivedQty: receivedQty,
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
            wholesalePrice: Number(item.wholesalePrice) || 0,
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

  // Show loading state when in edit mode and data is still loading
  if (isEditMode && purchaseLoading) {
    return (
      <DashboardLayout>
        <div className="container max-w-full pb-8 px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Purchase Order</h3>
              <p className="text-gray-600">Please wait while we load the purchase order details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if failed to load purchase in edit mode
  if (isEditMode && purchaseError) {
    return (
      <DashboardLayout>
        <div className="container max-w-full pb-8 px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Purchase Order</h3>
              <p className="text-gray-600 mb-4">Unable to load purchase order details. Please check the ID and try again.</p>
              <Link href="/purchase-dashboard">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Purchases
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
            {/* Barcode Scanner Input */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <QrCodeIcon className="h-4 w-4 text-blue-600" />
              <Input
                placeholder="Scan or enter barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeSubmit();
                  }
                }}
                className="w-48 h-8 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-blue-600/70"
              />
              <Button
                onClick={handleBarcodeSubmit}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHeldPurchases(true)}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <List className="mr-2 h-4 w-4" />
              Held ({heldPurchases.length})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={holdPurchase}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <Archive className="mr-2 h-4 w-4" />
              Hold
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRecordPaymentDialog(true)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
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

                    <div className="space-y-2">
                      <Label htmlFor="taxCalculationMethod">Tax Calculation Method</Label>
                      <Select 
                        onValueChange={(value) => {
                          form.setValue("taxCalculationMethod", value);
                          toast({
                            title: "Tax Method Updated",
                            description: `Switched to ${value === 'exclusive' ? 'Tax Exclusive - tax added on top' : value === 'inclusive' ? 'Tax Inclusive - tax included in price' : 'Compound Tax - tax on tax calculation'}. All items will be recalculated.`,
                          });
                          // Trigger recalculation immediately
                          setTimeout(() => {
                            const items = form.getValues("items") || [];
                            items.forEach((_, index) => {
                              recalculateItemNetAmount(index);
                            });
                            form.trigger("items");
                          }, 100);
                        }}
                        value={form.watch("taxCalculationMethod") || "exclusive"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax calculation method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exclusive">Tax Exclusive - Tax added on top of base amount</SelectItem>
                          <SelectItem value="inclusive">Tax Inclusive - Tax included in the base amount</SelectItem>
                          <SelectItem value="compound">Compound Tax - Tax calculated on tax (compound)</SelectItem>
                                    </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground mt-1">
            Current method: <span className="font-medium text-blue-600">
              {form.watch("taxCalculationMethod") === "inclusive" ? "Tax Inclusive" : 
               form.watch("taxCalculationMethod") === "compound" ? "Compound Tax" : "Tax Exclusive"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <SelectItem value="partially_received">Partially Received</SelectItem>                          <SelectItem value="closed">Closed</SelectItem>
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

  {/* Enhanced Additional Charges Section */}
  <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
    <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
      <CardTitle className="flex items-center gap-2 text-blue-800">
        <Package className="w-5 h-5" />
        Additional Charges
      </CardTitle>
      <p className="text-sm text-blue-600">These charges will be distributed proportionally across all line items</p>
    </CardHeader>
    <CardContent className="space-y-6 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="surchargeAmount" className="text-sm font-semibold text-gray-700">
            Surcharge (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("surchargeAmount", { 
                valueAsNumber: true
              })}
              className="pl-8 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="freightAmount" className="text-sm font-semibold text-gray-700">
            Freight Charges (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("freightAmount", { 
                valueAsNumber: true
              })}
              className="pl-8 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="packingCharges" className="text-sm font-semibold text-gray-700">
            Packing Charges (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("packingCharges", { 
                valueAsNumber: true
              })}
              className="pl-8 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="otherCharges" className="text-sm font-semibold text-gray-700">
            Other Charges (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("otherCharges", { 
                valueAsNumber: true
              })}
              className="pl-8 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalDiscount" className="text-sm font-semibold text-gray-700">
            Additional Discount (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("additionalDiscount", { 
                valueAsNumber: true
              })}
              className="pl-8 border-red-200 focus:border-red-500 focus:ring-red-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Additional Charges Summary */}
      <div className="bg-white rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Charges Summary</h4>
          <Badge variant="outline" className="text-blue-700 border-blue-300">
            Auto-calculated
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-green-600 font-medium">Total Charges</div>
            <div className="text-lg font-bold text-green-800">
              ₹{(
                (Number(watchedSurcharge) || 0) + 
                (Number(watchedFreight) || 0) + 
                (Number(watchedPacking) || 0) + 
                (Number(watchedOther) || 0)
              ).toFixed(2)}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-red-600 font-medium">Total Discount</div>
            <div className="text-lg font-bold text-red-800">
              ₹{(Number(watchedAdditionalDiscount) || 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-blue-600 font-medium">Net Additional</div>
            <div className="text-lg font-bold text-blue-800">
              ₹{(
                (Number(watchedSurcharge) || 0) + 
                (Number(watchedFreight) || 0) + 
                (Number(watchedPacking) || 0) + 
                (Number(watchedOther) || 0) - 
                (Number(watchedAdditionalDiscount) || 0)
              ).toFixed(2)}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-purple-600 font-medium">Impact on Cost</div>
            <div className="text-sm font-bold text-purple-800">
              Distributed across {form.watch("items")?.filter(item => item.productId > 0).length || 0} items
            </div>
          </div>
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
            {...form.register(`shippingAddress`)}
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
  {/* Barcode Scanner Section */}
  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
        <QrCodeIcon className="h-5 w-5" />
        Quick Barcode Entry
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <QrCodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
          <Input
            placeholder="Scan barcode or type product code to quickly add items..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBarcodeSubmit();
              }
            }}
            className="pl-10 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            Tax Method: {form.watch("taxCalculationMethod") === "inclusive" ? "Tax Inclusive" : 
                       form.watch("taxCalculationMethod") === "compound" ? "Compound Tax" : "Tax Exclusive"}
          </Badge>
          <Button
            onClick={handleBarcodeSubmit}
            disabled={!barcodeInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add to Purchase
          </Button>
        </div>
      </div>
      <p className="text-xs text-blue-600 mt-2">
        💡 Tip: Use a barcode scanner or manually enter product barcodes for instant item addition
      </p>
    </CardContent>
  </Card>

  <Card className="w-full">
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl font-semibold">Line Items</CardTitle>
        <div className="flex gap-2">
          <Button onClick={addItem} size="sm" variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-6">
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
        <div className="min-w-[3200px] bg-white shadow-sm">
          <Table className="text-sm border-collapse">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-300">
                <TableHead className="w-20 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">No</TableHead>
                <TableHead className="w-40 font-bold border-r border-blue-200 px-4 py-4 text-sm">Code</TableHead>
                <TableHead className="min-w-[280px] font-bold border-r border-blue-200 px-4 py-4 text-sm">Product Name</TableHead>
                <TableHead className="min-w-[200px] font-bold border-r border-blue-200 px-4 py-4 text-sm">Description</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Previous Stock</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Received Qty</TableHead>
                <TableHead className="w-32 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">
                  <div className="flex items-center justify-center gap-1">
                    <span>Free Qty</span>
                    <div className="group relative">
                      <span className="cursor-help text-green-600">🎁</span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        Free quantities automatically add to stock
                      </div>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Cost</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">HSN Code</TableHead>
                <TableHead className="w-28 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Tax %</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Disc Amt</TableHead>
                <TableHead className="w-40 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Exp. Date</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Net Cost</TableHead>
                <TableHead className="w-32 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">ROI %</TableHead>
                <TableHead className="w-40 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Gross Profit %</TableHead>
                <TableHead className="w-40 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Selling Price</TableHead>
                <TableHead className="w-40 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Wholesale Price</TableHead>
                <TableHead className="w-32 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">MRP</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Amount</TableHead>
                <TableHead className="w-40 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Net Amount</TableHead>
                <TableHead className="w-32 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Cash %</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Cash Amt</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Batch No</TableHead>
                <TableHead className="w-36 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Location</TableHead>
                <TableHead className="w-32 text-center font-bold border-r border-blue-200 px-4 py-4 text-sm">Unit</TableHead>
                <TableHead className="w-28 text-center font-bold px-4 py-4 text-sm">Actions</TableHead>
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

                // Get additional charges for proportional distribution
                const surchargeAmount = Number(watchedSurcharge) || 0;
                const freightAmount = Number(watchedFreight) || 0;
                const packingCharges = Number(watchedPacking) || 0;
                const otherCharges = Number(watchedOther) || 0;
                const additionalDiscount = Number(watchedAdditionalDiscount) || 0;

                const totalAdditionalCharges = surchargeAmount + freightAmount + packingCharges + otherCharges;

                // Calculate total order value for proportional distribution
                const allItems = form.watch("items") || [];
                const totalOrderValue = allItems.reduce((sum, item) => {
                  if (item.productId && item.productId > 0) {
                    return sum + ((item.receivedQty || 0) * (item.unitCost || 0));
                  }
                  return sum;
                }, 0);

                // Calculate proportional additional charges for this item
                let itemAdditionalCharges = 0;
                let itemAdditionalDiscount = 0;

                const subtotal = qty * cost;
                if (totalOrderValue > 0) {
                  const itemProportion = subtotal / totalOrderValue;
                  itemAdditionalCharges = totalAdditionalCharges * itemProportion;
                  itemAdditionalDiscount = additionalDiscount * itemProportion;
                }

                // Enhanced Net Cost and Net Amount calculation using proper tax method
                const taxCalculationMethod = form.watch("taxCalculationMethod") || "exclusive";
                let baseCostWithTax = cost;
                let netAmount = 0;
                let taxableAmount = amount - discountAmount;

                // Calculate based on tax method
                switch (taxCalculationMethod) {
                  case "inclusive":
                    // Tax is included in cost - extract base amount
                    if (taxPercent > 0) {
                      baseCostWithTax = cost / (1 + (taxPercent / 100));
                      netAmount = taxableAmount + itemAdditionalCharges - itemAdditionalDiscount;
                    } else {
                      baseCostWithTax = cost;
                      netAmount = taxableAmount + itemAdditionalCharges - itemAdditionalDiscount;
                    }
                    break;
                  case "compound":
                    // Compound tax calculation
                    baseCostWithTax = cost;
                    if (taxPercent > 0) {
                      const primaryTax = (taxableAmount * taxPercent) / 100;
                      const compoundTax = (primaryTax * taxPercent) / 100;
                      netAmount = taxableAmount + primaryTax + compoundTax + itemAdditionalCharges - itemAdditionalDiscount;
                    } else {
                      netAmount = taxableAmount + itemAdditionalCharges - itemAdditionalDiscount;
                    }
                    break;
                  case "exclusive":
                  default:
                    // Tax exclusive - tax added on top
                    baseCostWithTax = cost;
                    const tax = (taxableAmount * taxPercent) / 100;
                    netAmount = taxableAmount + tax + itemAdditionalCharges - itemAdditionalDiscount;
                    break;
                }

                const netCost = baseCostWithTax + (itemAdditionalCharges / qty) - (discountAmount / qty) - (itemAdditionalDiscount / qty);
                const cashAmount = amount * cashPercent / 100;
                const roiPercent = sellingPrice > 0 && netCost > 0 ? ((sellingPrice - netCost) / netCost) * 100 : 0;
                const grossProfitPercent = sellingPrice > 0 ? ((sellingPrice - netCost) / sellingPrice) * 100 : 0;

                return (
                  <TableRow key={field.id} className="hover:bg-blue-50 border-b border-gray-200 transition-colors">
                    <TableCell className="border-r border-gray-200 px-2 py-2">
                      <div className="flex items-center justify-center h-8">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                          {index + 1}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="border-r border-gray-200 px-2 py-2">
                      <Input
                        {...form.register(`items.${index}.code`)}
                        className="w-full text-sm"
                        placeholder="Code/SKU (Press Enter to search)"
                        onChange={(e) => {
                          form.setValue(`items.${index}.code`, e.target.value);
                          syncTableToModal(index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const searchCode = e.currentTarget.value.toLowerCase().trim();
                            if (searchCode) {
                              const matchedProduct = products.find(p => 
                                p.sku?.toLowerCase() === searchCode ||
                                p.sku?.toLowerCase().includes(searchCode)
                              );
                              if (matchedProduct) {
                                handleProductSelection(index, matchedProduct.id);
                                toast({
                                  title: "Product Found by Code! 🎯",
                                  description: `${matchedProduct.name} (${matchedProduct.sku}) selected.`,
                                });
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Code Not Found",
                                  description: `No product found with code: ${searchCode}`,
                                });
                              }
                            }
                          }
                        }}
                      />
                    </TableCell>

                    <TableCell className="border-r border-gray-200 px-2 py-2 relative">
                      <div className="space-y-2 relative">
                        {/* Enhanced Product search with auto-suggestion dropdown */}
                        <div className="relative">
                          <ProductSearchWithSuggestions 
                            products={products}
                            onProductSelect={(product) => handleProductSelection(index, product.id)}
                            placeholder="🔍 Search products..."
                          />
                        </div>

                        <Select 
                          onValueChange={(value) => handleProductSelection(index, parseInt(value))}
                          value={form.watch(`items.${index}.productId`)?.toString() || ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="📋 Select from List">
                              {selectedProduct ? (
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-sm">{selectedProduct.name}</span>
                                  <span className="text-xs text-gray-500">{selectedProduct.sku}</span>
                                </div>
                              ) : "📋 Select from List"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {products.length === 0 ? (
                              <div className="p-4 text-center text-gray-500">
                                <span>No products available</span>
                              </div>
                            ) : (
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex flex-col w-full">
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-sm">{product.name}</span>
                                        <span className="text-xs text-gray-500">{product.sku} | ₹{product.price}</span>
                                      </div>
                                      <div className="flex flex-col items-end ml-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          (product.stockQuantity || 0) <= (product.alertThreshold || 5) 
                                            ? 'bg-red-100 text-red-700' 
                                            : (product.stockQuantity || 0) > 50
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {product.stockQuantity || 0}
                                        </span>
                                        {(product.stockQuantity || 0) <= (product.alertThreshold || 5) && (
                                          <span className="text-xs text-red-600 font-medium">Low!</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

                        {/* Enhanced Stock indicator with more details */}
                        {selectedProduct && (
                          <div className="bg-gray-50 rounded p-2 border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Current Stock:</span>
                              <span className={`font-bold ${
                                (selectedProduct.stockQuantity || 0) <= (selectedProduct.alertThreshold || 5) 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {selectedProduct.stockQuantity || 0} units
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-gray-600">Price:</span>
                              <span className="font-medium text-blue-600">₹{selectedProduct.price}</span>
                            </div>
                            {(selectedProduct.stockQuantity || 0) <= (selectedProduct.alertThreshold || 5) && (
                              <div className="text-xs text-red-600 font-medium mt-1 flex items-center">
                                <span>⚠️ Low Stock Alert!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="border-r border-gray-200 px-2 py-2">
                      <Input
                        {...form.register(`items.${index}.description`)}
                        className="w-full text-sm"
                        placeholder="Description"
                        onChange={(e) => {
                          form.setValue(`items.${index}.description`, e.target.value);
                          syncTableToModal(index);
                        }}
                      />
                    </TableCell>

                    <TableCell className="border-r border-gray-200 px-2 py-2">
                      <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg text-sm h-12">
                        {selectedProduct ? (
                          <span className={`font-medium ${
                            (selectedProduct.stockQuantity || 0) <= (selectedProduct.alertThreshold || 5) 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {selectedProduct.stockQuantity || 0}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            // Move to cost field
                            const nextField = document.querySelector(`input[name="items.${index}.unitCost"]`) as HTMLInputElement;
                            nextField?.focus();
                          }
                        }}
                      />
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min="0"
                          {...form.register(`items.${index}.freeQty`, { 
                            valueAsNumber: true
                          })}
                          className="w-full text-center text-xs bg-green-50 border-green-200 focus:border-green-400 focus:bg-green-100"
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              // Move to next field (cost)
                              const nextField = document.querySelector(`input[name="items.${index}.unitCost"]`) as HTMLInputElement;
                              nextField?.focus();
                            }
                          }}
                        />

                        {/* Free Qty Indicator */}
                        {(() => {
                          const freeQty = form.watch(`items.${index}.freeQty`) || 0;
                          if (freeQty > 0) {
                            return (
                              <div className="text-xs text-green-600 text-center font-medium">
                                🎁 +{freeQty} free
                              </div>
                            );
                          }
                          return (
                            <div className="text-xs text-gray-400 text-center">
                              Free bonus
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.watch(`items.${index}.unitCost`) || ""}
                            onChange={async (e) => {
                              const value = parseFloat(e.target.value) || 0;
                              form.setValue(`items.${index}.unitCost`, value);

                              // Auto-calculate net amount using proper tax method
                              setTimeout(() => {
                                recalculateItemNetAmount(index);
                              }, 50);

                              // Update product cost price in real-time if changed significantly
                              const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));
                              if (selectedProduct && value > 0) {
                                const originalCost = parseFloat(selectedProduct.cost || "0");
                                const costDifference = Math.abs(value - originalCost);

                                // Update product cost if difference is more than 0.01
                                if (costDifference > 0.01) {
                                  try {
                                    await apiRequest('PATCH', `/api/products/${selectedProduct.id}`, { cost: value });

                                    // Update local products array to reflect the change
                                    const updatedProducts = products.map(p => 
                                      p.id === selectedProduct.id ? { ...p, cost: value.toString() } : p
                                    );
                                    queryClient.setQueryData(['/api/products'], updatedProducts);

                                    // Show success notification
                                    toast({
                                      title: "Product Cost Updated",
                                      description: `${selectedProduct.name} cost updated from ₹${originalCost} to ₹${value}`,
                                    });

                                    console.log(`Updated product ${selectedProduct.name} cost from ${originalCost} to ${value}`);
                                  } catch (error) {
                                    console.error('Failed to update product cost:', error);
                                    toast({
                                      title: "Update Failed",
                                      description: "Failed to update product cost. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }

                              // Trigger form validation
                              setTimeout(() => form.trigger(`items.${index}`), 50);
                            }}
                            className="w-full text-right text-xs pl-6 focus:bg-yellow-50 focus:border-blue-500"
                            placeholder="Enter cost price"
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Move to next field (tax percentage)
                                const nextField = document.querySelector(`input[name="items.${index}.taxPercentage"]`) as HTMLInputElement;
                                nextField?.focus();
                              }
                            }}
                          />
                        </div>

                        {/* Cost Price Indicator */}
                        {(() => {
                          const currentCost = form.watch(`items.${index}.unitCost`) || 0;
                          const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));

                          if (selectedProduct && currentCost > 0) {
                            const originalCost = parseFloat(selectedProduct.cost || "0");
                            const sellingPrice = parseFloat(selectedProduct.price || "0");
                            const costDifference = Math.abs(currentCost - originalCost);

                            if (originalCost > 0 && costDifference < 0.01) {
                              return (
                                <div className="text-xs text-green-600 text-center">
                                  Original cost
                                </div>
                              );
                            } else if (originalCost === 0 && sellingPrice > 0) {
                              return (
                                <div className="text-xs text-blue-600 text-center">
                                  Estimated cost
                                </div>
                              );
                            } else if (originalCost > 0 && costDifference > 0.01) {
                              const difference = ((currentCost - originalCost) / originalCost) * 100;
                              return (
                                <div className={`text-xs text-center ${
                                  difference > 0 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {difference > 0 ? '+' : ''}{difference.toFixed(1)}% - Will update product
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>

                    <TableCell className="border-r border-gray-200 px-2 py-2">
                      <div className="space-y-2">
                        <Input
                          {...form.register(`items.${index}.hsnCode`)}
                          className="w-full text-center text-xs"
                          placeholder="HSN Code"
                          onChange={(e) => {
                            const hsnValue = e.target.value;
                            form.setValue(`items.${index}.hsnCode`, hsnValue);

                            // Auto-suggest GST rate based on HSN code
                            if (hsnValue.length >= 4) {
                              let suggestedGst = 0;
                              if (hsnValue.startsWith("04") || hsnValue.startsWith("07") || hsnValue.startsWith("08")) {
                                suggestedGst = 0; // Fresh produce
                              } else if (hsnValue.startsWith("10") || hsnValue.startsWith("15") || hsnValue.startsWith("17")) {
                                suggestedGst = 5; // Food grains, oils, sugar
                              } else if (hsnValue.startsWith("62") || hsnValue.startsWith("85171") || hsnValue.startsWith("87120")) {
                                suggestedGst = 12; // Textiles, phones, bicycles
                              } else if (hsnValue.startsWith("33") || hsnValue.startsWith("34") || hsnValue.startsWith("19")) {
                                suggestedGst = 18; // Personal care, biscuits
                              } else if (hsnValue.startsWith("22") || hsnValue.startsWith("24") || hsnValue.startsWith("87032")) {
                                suggestedGst = 28; // Beverages, tobacco, cars
                              } else {
                                suggestedGst = 18; // Default rate
                              }

                              if (suggestedGst !== form.getValues(`items.${index}.taxPercentage`)) {
                                form.setValue(`items.${index}.taxPercentage`, suggestedGst);

                                // Recalculate net amount with new tax rate using proper tax method
                                setTimeout(() => {
                                  recalculateItemNetAmount(index);
                                }, 50);

                                toast({
                                  title: "Tax Rate Updated! 📊",
                                  description: `GST rate auto-updated to ${suggestedGst}% based on HSN ${hsnValue}`,
                                });
                              }
                            }
                          }}
                        />

                        {/* HSN Code Validation Indicator */}
                        {form.watch(`items.${index}.hsnCode`) && (
                          <div className={`text-xs px-2 py-1 rounded text-center ${
                            (form.watch(`items.${index}.hsnCode`) || "").length >= 6 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {(form.watch(`items.${index}.hsnCode`) || "").length >= 6 ? '✓ Valid HSN' : '⚠ Incomplete'}
                          </div>
                        )}

                        {/* Barcode Display */}
                        {selectedProduct?.barcode && (
                          <div className="flex flex-col items-center p-2 bg-gray-50 rounded border">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${selectedProduct.barcode}`}
                              alt="Product Barcode"
                              className="w-12 h-12 mb-1"
                            />
                            <span className="text-xs font-mono text-gray-600">
                              {selectedProduct.barcode}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={form.watch(`items.${index}.taxPercentage`) || 0}
                          onChange={(e) => {
                            const taxRate = parseFloat(e.target.value) || 0;
                            form.setValue(`items.${index}.taxPercentage`, taxRate);

                            // Recalculate net amount when tax changes using proper tax method
                            setTimeout(() => {
                              recalculateItemNetAmount(index);
                            }, 50);
                          }}
                          className="w-full text-center text-xs"
                          placeholder="0"
                        />

                        {/* Enhanced Tax Breakdown Display like add-item-dashboard */}
                        {(form.watch(`items.${index}.taxPercentage`) || 0) > 0 && (
                          <div className="text-xs bg-blue-50 p-2 rounded border space-y-1">
                            {(() => {
                              const totalTax = form.watch(`items.${index}.taxPercentage`) || 0;
                              const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));

                              // Use product tax breakdown if available
                              let cgstRate = 0;
                              let sgstRate = 0;
                              let igstRate = 0;

                              if (selectedProduct) {
                                cgstRate = parseFloat(selectedProduct.cgstRate || "0");
                                sgstRate = parseFloat(selectedProduct.sgstRate || "0");
                                igstRate = parseFloat(selectedProduct.igstRate || "0");
                              }

                              // If product doesn't have breakdown, use default
                              if (cgstRate === 0 && sgstRate === 0 && igstRate === 0 && totalTax > 0) {
                                cgstRate = totalTax / 2;
                                sgstRate = totalTax / 2;
                              }

                              return (
                                <div className="text-center">
                                  <div className="text-blue-700 font-medium text-xs mb-1">
                                    Total GST: {totalTax}%
                                  </div>

                                  {/* GST Breakdown */}
                                  {totalTax > 0 && (
                                    <div className="grid grid-cols-3 gap-1 text-xs">
                                      <div className="bg-green-100 text-green-700 px-1 py-0.5 rounded">
                                        <div className="font-medium">CGST</div>
                                        <div>{cgstRate}%</div>
                                      </div>
                                      <div className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                                        <div className="font-medium">SGST</div>
                                        <div>{sgstRate}%</div>
                                      </div>
                                      <div className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                                        <div className="font-medium">IGST</div>
                                        <div>{igstRate}%</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tax Type Indicator */}
                                  <div className="text-xs text-gray-600 mt-1">
                                    {igstRate > 0 ? 'Inter-State' : 'Intra-State'}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Quick Tax Rate Buttons */}
                        <div className="flex flex-wrap gap-1">
                          {[0, 5, 12, 18, 28].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                form.setValue(`items.${index}.taxPercentage`, rate);

                                // Recalculate net amount
                                const qty = form.getValues(`items.${index}.receivedQty`) || 0;
                                const cost = form.getValues(`items.${index}.unitCost`) || 0;
                                const discount = form.getValues(`items.${index}.discountAmount`) || 0;
                                const subtotal = qty * cost;
                                const taxableAmount = subtotal - discount;
                                const tax = (taxableAmount * rate) / 100;
                                const netAmount = taxableAmount + tax;

                                form.setValue(`items.${index}.netAmount`, netAmount);
                                form.trigger(`items.${index}`);
                              }}
                              className={`px-1 py-0.5 text-xs rounded border ${
                                form.watch(`items.${index}.taxPercentage`) === rate
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {rate}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
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

                    <TableCell className="border-r px-3 py-3">
                      <Input
                        type="date"
                        {...form.register(`items.${index}.expiryDate`)}
                        className="w-full text-xs"
                        placeholder="dd-mm-yyyy"
                      />
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                        <div className="flex items-center">
                          <span className="text-xs">₹</span>
                          <span className="ml-1 font-medium">{netCost.toFixed(2)}</span>
                          {totalAdditionalCharges > 0 && (
                            <span className="ml-1 text-green-600" title="Includes additional charges">📦</span>
                          )}
                        </div>
                        {totalAdditionalCharges > 0 && (
                          <div className="text-xs text-green-600 mt-1">
                            +₹{(itemAdditionalCharges / qty).toFixed(2)} charges
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                        <span className="font-medium">{roiPercent.toFixed(2)}</span>
                        <span className="text-xs ml-1">%</span>
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="flex items-center justify-center p-1 bg-gray-50 rounded text-xs">
                        <span className="font-medium">{grossProfitPercent.toFixed(2)}</span>
                        <span className="text-xs ml-1">%</span>
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register(`items.${index}.sellingPrice`, { 
                            valueAsNumber: true,
                            setValueAs: (value) => value || 0
                          })}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            form.setValue(`items.${index}.sellingPrice`, value);

                            // Auto-calculate MRP if not set (typical markup is 20-25%)
                            const currentMrp = form.getValues(`items.${index}.mrp`) || 0;
                            if (currentMrp === 0 && value > 0) {
                              const suggestedMrp = Math.round(value * 1.2 * 100) / 100; // 20% markup
                              form.setValue(`items.${index}.mrp`, suggestedMrp);
                            }

                            form.trigger(`items.${index}`);
                          }}
                          className="w-full text-right text-xs pl-6"
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      {/* Selling Price Indicator */}
                      {(() => {
                        const sellingPrice = form.watch(`items.${index}.sellingPrice`) || 0;
                        const unitCost = form.watch(`items.${index}.unitCost`) || 0;
                        const margin = unitCost > 0 ? ((sellingPrice - unitCost) / unitCost) * 100 : 0;

                        if (sellingPrice > 0 && unitCost > 0) {
                          return (
                            <div className={`text-xs text-center mt-1 px-1 py-0.5 rounded ${
                              margin > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {margin > 0 ? '+' : ''}{margin.toFixed(1)}% margin
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register(`items.${index}.wholesalePrice`, { 
                            valueAsNumber: true,
                            setValueAs: (value) => value || 0
                          })}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            form.setValue(`items.${index}.wholesalePrice`, value);
                            form.trigger(`items.${index}`);
                          }}
                          className="w-full text-right text-xs pl-6"
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      {/* Wholesale Price Indicator */}
                      {(() => {
                        const wholesalePrice = form.watch(`items.${index}.wholesalePrice`) || 0;
                        const unitCost = form.watch(`items.${index}.unitCost`) || 0;
                        const sellingPrice = form.watch(`items.${index}.sellingPrice`) || 0;

                        if (wholesalePrice > 0 && unitCost > 0) {
                          const margin = ((wholesalePrice - unitCost) / unitCost) * 100;
                          return (
                            <div className={`text-xs text-center mt-1 px-1 py-0.5 rounded ${
                              margin > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {margin > 0 ? '+' : ''}{margin.toFixed(1)}% bulk margin
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register(`items.${index}.mrp`, { 
                            valueAsNumber: true,
                            setValueAs: (value) => value || 0
                          })}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            form.setValue(`items.${index}.mrp`, value);
                            form.trigger(`items.${index}`);
                          }}
                          className="w-full text-right text-xs pl-6"
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      {/* MRP vs Selling Price Indicator */}
                      {(() => {
                        const mrp = form.watch(`items.${index}.mrp`) || 0;
                        const sellingPrice = form.watch(`items.${index}.sellingPrice`) || 0;

                        if (mrp > 0 && sellingPrice > 0) {
                          const discount = ((mrp - sellingPrice) / mrp) * 100;
                          return (
                            <div className={`text-xs text-center mt-1 px-1 py-0.5 rounded ${
                              discount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                            }`}>
                              {discount > 0 ? `${discount.toFixed(1)}% off MRP` : 'Above MRP'}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
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

                    <TableCell className="border-r px-3 py-3">
                      <div className="flex items-center justify-center p-1 bg-green-50 rounded text-xs">
                        {((form.watch(`items.${index}.netAmount`) as number) || 0) > 0 ? (
                          <>
                            <span className="text-xs font-medium text-green-700">₹</span>
                            <span className="font-medium text-green-700 ml-1">{Math.round(form.watch(`items.${index}.netAmount`) || 0)}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
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

                    <TableCell className="border-r px-3 py-3">
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

                    <TableCell className="border-r px-3 py-3">
                      <Input
                        {...form.register(`items.${index}.batchNumber`)}
                        className="w-full text-xs"
                        placeholder="Batch #"
                      />
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
                      <Input
                        {...form.register(`items.${index}.location`)}
                        className="w-full text-xs"
                        placeholder="Location"
                      />
                    </TableCell>

                    <TableCell className="border-r px-3 py-3">
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

                    <TableCell className="px-3 py-3">
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
                <span className="text-gray-600">Tax Calculation:</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  {(() => {
                    const method = form.watch("taxCalculationMethod") || "exclusive";
                    switch (method) {
                      case "inclusive": return "Tax Inclusive";
                      case "compound": return "Compound Tax";
                      default: return "Tax Exclusive";
                    }
                  })()}
                </span>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Financial Summary</h3>
              {isEditMode && (
                <Button
                  onClick={() => setShowRecordPaymentDialog(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
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

        {/* Enhanced Payment Status Record Management Section */}
        {isEditMode && existingPurchase && (
          <div className="mt-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Payment Records & Management
            </h3>
            
            {/* Current Payment Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Total Amount</div>
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(summary.grandTotal)}</div>
                <div className="text-xs text-blue-500">Purchase Order Value</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-600 font-medium">Amount Paid</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(Number(existingPurchase.paid_amount || 0))}
                </div>
                <div className="text-xs text-green-500">
                  {existingPurchase.payment_date ? 
                    `Paid on ${new Date(existingPurchase.payment_date).toLocaleDateString()}` : 
                    (existingPurchase.payment_method || 'No payments yet')
                  }
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="text-sm text-orange-600 font-medium">Outstanding</div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)))}
                </div>
                <div className="text-xs text-orange-500">Balance Due</div>
              </div>
            </div>

            {/* Payment Details Record */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Payment Record Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Information */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Payment Status:</span>
                    <span className="font-semibold">
                      {(() => {
                        const currentPaidAmount = Number(existingPurchase.paid_amount || 0);
                        if (currentPaidAmount >= summary.grandTotal) {
                          return <Badge className="bg-green-100 text-green-800 border-green-200">Fully Paid</Badge>;
                        } else if (currentPaidAmount > 0) {
                          return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partially Paid</Badge>;
                        } else {
                          return <Badge className="bg-red-100 text-red-800 border-red-200">Payment Due</Badge>;
                        }
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Payment Method:</span>
                    <span className="font-semibold text-gray-800">
                      {existingPurchase.payment_method || 'Not specified'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Payment Date:</span>
                    <span className="font-semibold text-gray-800">
                      {existingPurchase.payment_date ? 
                        new Date(existingPurchase.payment_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short', 
                          day: 'numeric'
                        }) : 
                        'Not recorded'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 font-medium">Payment Type:</span>
                    <span className="font-semibold text-gray-800">
                      {existingPurchase.payment_type || 'Standard Payment'}
                    </span>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Order Value:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(summary.grandTotal)}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Paid Amount:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(Number(existingPurchase.paid_amount || 0))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Remaining Balance:</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 font-medium">Payment Progress:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {Math.round((Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status Badge and Progress */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Current Status:</span>
                {(() => {
                  const currentPaidAmount = Number(existingPurchase.paid_amount || 0);
                  if (currentPaidAmount >= summary.grandTotal) {
                    return (
                      <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Fully Paid
                      </Badge>
                    );
                  } else if (currentPaidAmount > 0) {
                    return (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        Partially Paid
                      </Badge>
                    );
                  } else {
                    return (
                      <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        Unpaid
                      </Badge>
                    );
                  }
                })()}
              </div>
              
              {existingPurchase.payment_date && (
                <div className="text-sm text-gray-600">
                  Last payment: {new Date(existingPurchase.payment_date).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Payment Progress Bar */}
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, (Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%`
                }}
              ></div>
            </div>

            {/* Comprehensive Payment Transaction History */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Payment Transaction History & Summary
              </h4>
              
              <div className="space-y-3">
                {Number(existingPurchase.paid_amount || 0) > 0 ? (
                  <>
                    {/* Payment Received Record */}
                    <div className="flex items-center justify-between p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-semibold text-green-900 text-lg">
                            Payment Received - {existingPurchase.payment_method || 'Cash'}
                          </div>
                          <div className="text-sm text-green-700">
                            {existingPurchase.payment_date ? 
                              new Date(existingPurchase.payment_date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 
                              'Payment recorded successfully'
                            }
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            Transaction Type: {existingPurchase.payment_type || 'Standard Payment'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-900 text-xl">
                          {formatCurrency(Number(existingPurchase.paid_amount || 0))}
                        </div>
                        <div className="text-sm text-green-700">
                          Amount Paid
                        </div>
                      </div>
                    </div>
                    
                    {/* Outstanding Balance if any */}
                    {Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)) > 0 && (
                      <div className="flex items-center justify-between p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                          <div>
                            <div className="font-semibold text-orange-900 text-lg">
                              Outstanding Balance
                            </div>
                            <div className="text-sm text-orange-700">
                              Awaiting payment - Balance due
                            </div>
                            <div className="text-xs text-orange-600 mt-1">
                              Status: Partially Paid
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-orange-900 text-xl">
                            {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)))}
                          </div>
                          <div className="text-sm text-orange-700">
                            Remaining Due
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* No Payment Record */
                  <div className="flex items-center justify-between p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="font-semibold text-red-900 text-lg">
                          No Payment Recorded
                        </div>
                        <div className="text-sm text-red-700">
                          Full payment pending for this purchase order
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Status: Payment Due
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-900 text-xl">
                        {formatCurrency(summary.grandTotal)}
                      </div>
                      <div className="text-sm text-red-700">
                        Total Due
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Status Information */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">Payment Status</div>
                <div className="font-semibold text-gray-800">
                  {(() => {
                    const currentPaidAmount = Number(existingPurchase.paid_amount || 0);
                    if (currentPaidAmount >= summary.grandTotal) {
                      return "Payment Complete - Fully Settled";
                    } else if (currentPaidAmount > 0) {
                      return `Partially Paid - ${formatCurrency(Math.max(0, summary.grandTotal - currentPaidAmount))} Outstanding`;
                    } else {
                      return `Payment Pending - ${formatCurrency(summary.grandTotal)} Due`;
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Complete Payment Record Summary */}
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
              <h4 className="font-bold text-blue-900 mb-5 flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-700" />
                Complete Payment Record Summary
              </h4>
              
              {Number(existingPurchase.paid_amount || 0) > 0 ? (
                <div className="space-y-4">
                  {/* Payment Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(Number(existingPurchase.paid_amount || 0))}
                        </div>
                        <div className="text-sm text-green-600 font-semibold">Amount Paid</div>
                        <div className="text-xs text-gray-500 mt-1">
                          via {existingPurchase.payment_method || 'Cash'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-700">
                          {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)))}
                        </div>
                        <div className="text-sm text-orange-600 font-semibold">Outstanding</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)) > 0 ? 'Balance Due' : 'Fully Settled'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-700">
                          {Math.round((Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%
                        </div>
                        <div className="text-sm text-blue-600 font-semibold">Completion</div>
                        <div className="text-xs text-gray-500 mt-1">Payment Progress</div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Payment Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h5 className="font-semibold text-gray-800 mb-4">Payment Transaction Details</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Payment Information */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Payment Method:</span>
                          <span className="font-semibold text-gray-800">
                            {existingPurchase.payment_method || 'Cash'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Payment Date:</span>
                          <span className="font-semibold text-gray-800">
                            {existingPurchase.payment_date ? 
                              new Date(existingPurchase.payment_date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric'
                              }) : 
                              'Not recorded'
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Payment Status:</span>
                          <span className="font-semibold">
                            {(() => {
                              const currentPaidAmount = Number(existingPurchase.paid_amount || 0);
                              if (currentPaidAmount >= summary.grandTotal) {
                                return <Badge className="bg-green-100 text-green-800 border-green-200">Fully Paid</Badge>;
                              } else if (currentPaidAmount > 0) {
                                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partially Paid</Badge>;
                              } else {
                                return <Badge className="bg-red-100 text-red-800 border-red-200">Payment Due</Badge>;
                              }
                            })()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Transaction Type:</span>
                          <span className="font-semibold text-gray-800">
                            {existingPurchase.payment_type || 'Standard Payment'}
                          </span>
                        </div>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Total Order Value:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(summary.grandTotal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Amount Received:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(Number(existingPurchase.paid_amount || 0))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Remaining Balance:</span>
                          <span className="font-bold text-orange-600">
                            {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase.paid_amount || 0)))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Payment Completion:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, (Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {Math.round((Number(existingPurchase.paid_amount || 0) / summary.grandTotal) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Payment Recorded State */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="font-semibold text-red-900 text-lg mb-2">
                    No Payment Recorded
                  </div>
                  <div className="text-red-700 mb-4">
                    Total amount of {formatCurrency(summary.grandTotal)} is pending payment
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200 px-4 py-2">
                    Payment Due - {formatCurrency(summary.grandTotal)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Status Record Payment Management Menu Dialog */}
      <Dialog open={showPaymentManagementMenu} onOpenChange={setShowPaymentManagementMenu}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Payment Status Record Payment Management
            </DialogTitle>
            <p className="text-gray-600">Comprehensive payment management system for purchase orders</p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
            {/* Quick Payment Actions */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Quick Payment Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentManagementMenu(false);
                    // Record Payment functionality removed - show message
                    toast({
                      title: "Record Payment Functionality Disabled",
                      description: "Please use the Purchase Dashboard to record payments.",
                    });
                  }}
                  className="w-full justify-start text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record New Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentManagementMenu(false);
                    // Record Payment functionality removed - show message
                    toast({
                      title: "Record Payment Functionality Disabled",
                      description: "Please use the Purchase Dashboard to record payments.",
                    });
                  }}
                  className="w-full justify-start text-green-700 border-green-300 hover:bg-green-50"
                  disabled={Number(existingPurchase?.paid_amount || 0) >= summary.grandTotal}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Full Balance
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentManagementMenu(false);
                    // Record Payment functionality removed - show message
                    toast({
                      title: "Record Payment Functionality Disabled",
                      description: "Please use the Purchase Dashboard to record payments.",
                    });
                  }}
                  className="w-full justify-start text-purple-700 border-purple-300 hover:bg-purple-50"
                  disabled={Number(existingPurchase?.paid_amount || 0) >= summary.grandTotal}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Pay 50% Advance
                </Button>
              </CardContent>
            </Card>

            {/* Payment Status Overview */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Payment Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-gray-800">{formatCurrency(summary.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-bold text-green-800">
                      {formatCurrency(Number(existingPurchase?.paid_amount || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="font-bold text-orange-800">
                      {formatCurrency(Math.max(0, summary.grandTotal - Number(existingPurchase?.paid_amount || 0)))}
                    </span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    {(() => {
                      const currentPaidAmount = Number(existingPurchase?.paid_amount || 0);
                      if (currentPaidAmount >= summary.grandTotal) {
                        return (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Fully Paid
                          </Badge>
                        );
                      } else if (currentPaidAmount > 0) {
                        return (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Partially Paid
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Unpaid
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History & Records */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payment Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Number(existingPurchase?.paid_amount || 0) > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                      <div className="text-lg font-bold text-orange-800">
                        {formatCurrency(Number(existingPurchase?.paid_amount || 0))}
                      </div>
                      <div className="text-sm text-orange-600">
                        via {existingPurchase?.payment_method || 'Cash'}
                      </div>
                      {existingPurchase?.payment_date && (
                        <div className="text-xs text-gray-500">
                          {new Date(existingPurchase.payment_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No payment records yet
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-orange-700 hover:bg-orange-50"
                  onClick={() => {
                    window.open('/purchase-dashboard', '_blank');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View in Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPaymentManagementMenu(false)}
            >
              Close Menu
            </Button>
            <Button
              onClick={() => {
                setShowPaymentManagementMenu(false);
                setShowRecordPaymentDialog(true);
              }}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

                {/* Enhanced search with suggestions for modal */}
                <div className="space-y-2">
                  <ProductSearchWithSuggestions
                    products={products}
                    onProductSelect={(product) => {
                      // Use cost price from product if available, otherwise use selling price
                      const costPrice = parseFloat(product.cost || product.price) || 0;
                      const sellingPrice = parseFloat(product.price) || 0;
                      const mrpPrice = parseFloat(product.mrp || (sellingPrice * 1.2).toString()) || 0;

                      const newModalData = {
                        ...modalData,
                        productId: product.id,
                        code: product.sku || "",
                        description: product.description || product.name,
                        unitCost: costPrice,
                        mrp: mrpPrice,
                        sellingPrice: sellingPrice,
                        hsnCode: product.hsnCode || "",
                      };
                      setModalData(newModalData);
                      if (editingItemIndex !== null) {
                        syncModalToTable();
                      }

                      toast({
                        title: "Product Selected! 🎯",
                        description: `${product.name} selected with auto-populated details.`,
                      });
                    }}
                    placeholder="🔍 Search products by name, SKU, or description..."
                  />

                  <Select 
                    onValueChange={(value) => {
                      const productId = parseInt(value);
                      const product = products.find(p => p.id === productId);
                      if (product) {
                        // Use cost price from product if available, otherwise use selling price
                        const costPrice = parseFloat(product.cost || product.price) || 0;
                        const sellingPrice = parseFloat(product.price) || 0;
                        const mrpPrice = parseFloat(product.mrp || (sellingPrice * 1.2).toString()) || 0;

                        const newModalData = {
                          ...modalData,
                          productId,
                          code: product.sku || "",
                          description: product.description || product.name,
                          unitCost: costPrice,
                          mrp: mrpPrice,
                          sellingPrice: sellingPrice,
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
                      <SelectValue placeholder="Or browse all products from dropdown" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] overflow-y-auto">
                      {(showBulkItemsOnly ? bulkItems : products).length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No products available
                          </div>
                        ) : (
                          (showBulkItemsOnly ? bulkItems : products).map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              <div className="flex flex-col text-left">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-gray-500">
                                  SKU: {product.sku} | Price: ₹{product.price}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick toggle for bulk items */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showBulkItemsOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowBulkItemsOnly(!showBulkItemsOnly)}
                    className="text-xs"
                  >
                    {showBulkItemsOnly ? "Show All Products" : "Show Only Bulk Items"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-code">Product Code</Label>
                <Input
                  id="modal-code"
                  value={modalData.code}
                  onChange={(e) => setModalData({...modalData, code: e.target.value})}
                  placeholder="Enter product code/SKU"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setIsAddItemModalOpen(false);
                setEditingItemIndex(null);
                setModalData({
                  name: '',
                  quantity: 1,
                  weight: '',
                  unit: 'kg',
                  unitPrice: 0,
                  gst: 0,
                  code: '',
                  hsnCode: '',
                  cgst: 0,
                  sgst: 0,
                  igst: 0,
                  discount: 0,
                  subtotal: 0
                });
              }}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingItemIndex !== null) {
                  const updatedItems = [...items];
                  updatedItems[editingItemIndex] = {
                    ...modalData,
                    subtotal: modalData.quantity * modalData.unitPrice * (1 + modalData.gst / 100) - modalData.discount
                  };
                  setItems(updatedItems);
                } else {
                  const newItem = {
                    ...modalData,
                    subtotal: modalData.quantity * modalData.unitPrice * (1 + modalData.gst / 100) - modalData.discount
                  };
                  setItems([...items, newItem]);
                }
                setIsAddItemModalOpen(false);
                setEditingItemIndex(null);
                setModalData({
                  name: '',
                  quantity: 1,
                  weight: '',
                  unit: 'kg',
                  unitPrice: 0,
                  gst: 0,
                  code: '',
                  hsnCode: '',
                  cgst: 0,
                  sgst: 0,
                  igst: 0,
                  discount: 0,
                  subtotal: 0
                });
              }}>
                {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Held Purchases Dialog */}
        <Dialog open={showHeldPurchases} onOpenChange={setShowHeldPurchases}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Held Purchase Orders ({heldPurchases.length})
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {heldPurchases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No held orders found
                </div>
              ) : (
                <div className="grid gap-3">
                  {heldPurchases.map((purchase) => (
                    <Card key={purchase.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                {purchase.orderNumber}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {format(new Date(purchase.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Supplier:</span>
                              <span className="ml-2">
                                {suppliers.find(s => s.id === purchase.supplierId)?.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Total:</span>
                              <span className="ml-2 font-bold">
                                {formatCurrency(purchase.grandTotal)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Load held purchase data into form
                                loadHeldPurchase(purchase);
                                setShowHeldPurchases(false);
                              }}
                            >
                              Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm('Delete this held order?')) {
                                  setHeldPurchases(prev => prev.filter(p => p.id !== purchase.id));
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                {heldPurchases.length > 0 && (
                  <span>Total held orders: {heldPurchases.length}</span>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowHeldPurchases(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={showRecordPaymentDialog} onOpenChange={setShowRecordPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for this purchase order
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label htmlFor="payment-amount" className="text-sm font-semibold text-gray-800 mb-3 block">
                  Payment Amount to Record
                </label>
                
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-lg">₹</span>
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentFormData.amount || ''}
                    onChange={(e) => setPaymentFormData({
                      ...paymentFormData,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Enter payment amount"
                    className="pl-10 pr-4 py-3 text-lg font-semibold border-2 border-gray-300 focus:border-green-500 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentFormData({
                      ...paymentFormData,
                      amount: summary.grandTotal
                    })}
                    className="text-xs bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                  >
                    Full Balance
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentFormData({
                      ...paymentFormData,
                      amount: Math.round(summary.grandTotal / 2)
                    })}
                    className="text-xs bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentFormData({
                      ...paymentFormData,
                      amount: Math.round(summary.grandTotal / 4)
                    })}
                    className="text-xs bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-700"
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentFormData({
                      ...paymentFormData,
                      amount: 0
                    })}
                    className="text-xs bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-method" className="text-sm font-medium">Payment Method</label>
                <select
                  id="payment-method"
                  value={paymentFormData.method}
                  onChange={(e) => setPaymentFormData({
                    ...paymentFormData,
                    method: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-date" className="text-sm font-medium">Payment Date</label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData({
                    ...paymentFormData,
                    date: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-reference" className="text-sm font-medium">Reference Number (Optional)</label>
                <Input
                  id="payment-reference"
                  value={paymentFormData.reference}
                  onChange={(e) => setPaymentFormData({
                    ...paymentFormData,
                    reference: e.target.value
                  })}
                  placeholder="Transaction ID, Check number, etc."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-notes" className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  id="payment-notes"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({
                    ...paymentFormData,
                    notes: e.target.value
                  })}
                  placeholder="Additional payment notes..."
                  className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRecordPaymentDialog(false);
                  setPaymentFormData({
                    amount: 0,
                    method: "Cash",
                    date: new Date().toISOString().split('T')[0],
                    reference: "",
                    notes: ""
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    if (!paymentFormData.amount || paymentFormData.amount <= 0) {
                      toast({
                        variant: "destructive",
                        title: "Invalid Payment Amount",
                        description: "Please enter a valid payment amount greater than ₹0.",
                      });
                      return;
                    }

                    const purchaseId = isEditMode ? editId : null;
                    if (!purchaseId) {
                      toast({
                        variant: "destructive",
                        title: "Purchase Order Required",
                        description: "Please save the purchase order first before recording payments.",
                      });
                      return;
                    }

                    // Record payment via the mutation
                    await recordPayment.mutateAsync({
                      purchaseId: purchaseId,
                      amount: paymentFormData.amount,
                      method: paymentFormData.method,
                      date: paymentFormData.date,
                    });

                    // Close dialog and reset form
                    setShowRecordPaymentDialog(false);
                    setPaymentFormData({
                      amount: 0,
                      method: "Cash",
                      date: new Date().toISOString().split('T')[0],
                      reference: "",
                      notes: ""
                    });

                  } catch (error) {
                    console.error('Error recording payment:', error);
                    toast({
                      variant: "destructive",
                      title: "Payment Recording Failed",
                      description: `Failed to record payment: ${error.message}. Please verify the details and try again.`,
                    });
                  }
                }}
                disabled={!paymentFormData.amount || paymentFormData.amount <= 0 || recordPayment.isPending}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-6"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {recordPayment.isPending ? "Recording..." : "Save Payment Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};
