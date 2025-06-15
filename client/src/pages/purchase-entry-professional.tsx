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
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit2, List, Download, FileText, Archive, Search, X, QrCode as QrCodeIcon } from "lucide-react";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { DollarSign as DollarSignIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

  // State to control bulk items only in modal
  const [showBulkItemsOnly, setShowBulkItemsOnly] = useState(false);

  // Get current date for defaults
  const today = new Date().toISOString().split('T')[0];

  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId && editId !== 'null' && editId !== 'undefined';

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
                        (item.receivedQty > 0 && item.unitCost > 0)
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
    const taxCalculationMethod = form.getValues("taxCalculationMethod") || "exclusive";

    let totalItems = 0;
    let totalQuantity = 0;    let subtotal = 0;
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
            // Tax is included in the unit cost
            taxableAmount = itemCost - discount;
            const baseAmount = taxableAmount / (1 + (taxPercentage / 100));
            tax = taxableAmount - baseAmount;
            subtotal += baseAmount;
            break;

          case "compound":
            // Tax on tax calculation
            taxableAmount = itemCost - discount;
            const primaryTax = (taxableAmount * (taxPercentage / 100));
            const compoundTax = (primaryTax * (taxPercentage / 100));
            tax = primaryTax + compoundTax;
            subtotal += itemCost;
            break;

          case "exclusive":
          default:
            // Standard tax exclusive calculation
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
            taxableAmount = itemCost - discount;
            baseAmount = taxableAmount / (1 + (taxPercentage / 100));
            tax = taxableAmount - baseAmount;
            break;

          case "compound":
            taxableAmount = itemCost - discount;
            const primaryTax = (taxableAmount * (taxPercentage / 100));
            const compoundTax = (primaryTax * (taxPercentage / 100));
            tax = primaryTax + compoundTax;
            break;

          case "exclusive":
          default:
            taxableAmount = itemCost - discount;
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
  }, [watchedItems, watchedSurcharge, watchedFreight, watchedPacking, watchedOther, watchedAdditionalDiscount, form]);

  // Dynamic product selection handler
  const handleProductSelection = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Auto-populate fields based on selected product
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.code`, product.sku || "");
      form.setValue(`items.${index}.description`, product.description || product.name);

      // Use cost price from product if available, otherwise use selling price
      const costPrice = parseFloat(product.cost || product.price) || 0;
      const sellingPrice = parseFloat(product.price) || 0;
      const mrpPrice = parseFloat(product.mrp || (sellingPrice * 1.2).toString()) || 0;

      form.setValue(`items.${index}.unitCost`, costPrice);
      form.setValue(`items.${index}.sellingPrice`, sellingPrice);
      form.setValue(`items.${index}.mrp`, mrpPrice);
      form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");

      // Set default received quantity if not set
      if (!form.getValues(`items.${index}.receivedQty`) || form.getValues(`items.${index}.receivedQty`) === 0) {
        form.setValue(`items.${index}.receivedQty`, 1);
        form.setValue(`items.${index}.quantity`, 1);
      }

      // Calculate GST automatically
      const cgstRate = parseFloat(product.cgstRate || "0");
      const sgstRate = parseFloat(product.sgstRate || "0");
      const igstRate = parseFloat(product.igstRate || "0");
      const totalGst = cgstRate + sgstRate + igstRate;

      if (totalGst > 0) {
        form.setValue(`items.${index}.taxPercentage`, totalGst);
      }

      // Calculate net amount using the correct cost price
      const qty = form.getValues(`items.${index}.receivedQty`) || 1;
      const taxPercent = totalGst || 18;
      const subtotal = qty * costPrice;
      const tax = (subtotal * taxPercent) / 100;
      const netAmount = subtotal + tax;

      form.setValue(`items.${index}.netAmount`, netAmount);

      // Trigger form validation and update
      form.trigger(`items.${index}`);

      toast({
        title: "Product Selected! 🎯",
        description: `${product.name} added with cost price ₹${costPrice.toFixed(2)}`,
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
            taxPercentage: 18,
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
          (item.receivedQty > 0 || item.quantity > 0) &&
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
      const totalReceivedItems = form.getValues("items").reduce((total, item) => {
        return total + (item.receivedQty || 0);
      }, 0);

      toast({
        title: isEditMode ? "Purchase order updated! 📦" : "Purchase order created! 📦",
        description: isEditMode
          ? `Purchase order updated successfully. Stock levels have been adjusted.`
          : `Purchase order created successfully. ${totalReceivedItems} items added to inventory.`,
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
              <Archive className="mr-2 h-4```text
 w-4" />
              Hold
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={()={() => {
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
                        onValueChange={(value) => form.setValue("taxCalculationMethod", value)}
                        value={form.watch("taxCalculationMethod") || "exclusive"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax calculation method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exclusive">Tax Exclusive (Add tax to base amount)</SelectItem>
                          <SelectItem value="inclusive">Tax Inclusive (Tax included in base amount)</SelectItem>
                          <SelectItem value="compound">Compound Tax (Tax on tax)</SelectItem>
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

              {/* Tax Information Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="h-5 w-5" />
                        Tax Information & GST Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* HSN Code and GST Code */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="defaultHsnCode">Default HSN Code</Label>
                          <div className="space-y-2">
                            <Input
                              placeholder="Enter HSN Code manually (e.g., 10019000)"
                              className="text-gray-900"
                            />
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Or select from common HSN codes" />
                              </SelectTrigger>
                              <SelectContent className="max-h-80 overflow-y-auto">
                                {/* Food & Beverages - 0% & 5% GST */}
                                <SelectItem value="10019000">10019000 - Rice (5%)</SelectItem>
                                <SelectItem value="15179010">15179010 - Edible Oil (5%)</SelectItem>
                                <SelectItem value="17019900">17019900 - Sugar (5%)</SelectItem>
                                <SelectItem value="04070010">04070010 - Eggs (0%)</SelectItem>
                                <SelectItem value="07010000">07010000 - Fresh Vegetables (0%)</SelectItem>
                                <SelectItem value="08010000">08010000 - Fresh Fruits (0%)</SelectItem>
                                <SelectItem value="19059090">19059090 - Biscuits (18%)</SelectItem>
                                <SelectItem value="21069099">21069099 - Spices & Condiments (5%)</SelectItem>

                                {/* Textiles & Clothing - 5% & 12% GST */}
                                <SelectItem value="62019000">62019000 - Men's Garments (12%)</SelectItem>
                                <SelectItem value="62029000">62029000 - Women's Garments (12%)</SelectItem>
                                <SelectItem value="63010000">63010000 - Bed Sheets (5%)</SelectItem>
                                <SelectItem value="64029100">64029100 - Footwear (18%)</SelectItem>

                                {/* Electronics - 12% & 18% GST */}
                                <SelectItem value="85171200">85171200 - Mobile Phones (12%)</SelectItem>
                                <SelectItem value="84713000">84713000 - Laptops (18%)</SelectItem>
                                <SelectItem value="85285200">85285200 - LED TV (18%)</SelectItem>
                                <SelectItem value="85287100">85287100 - Set Top Box (18%)</SelectItem>
                                <SelectItem value="85044090">85044090 - Mobile Charger (18%)</SelectItem>

                                {/* Personal Care - 18% GST */}
                                <SelectItem value="33061000">33061000 - Toothpaste (18%)</SelectItem>
                                <SelectItem value="34012000">34012000 - Soap (18%)</SelectItem>
                                <SelectItem value="33051000">33051000 - Shampoo (18%)</SelectItem>
                                <SelectItem value="96031000">96031000 - Toothbrush (18%)</SelectItem>

                                {/* Beverages & Luxury - 28% GST */}
                                <SelectItem value="22021000">22021000 - Soft Drinks (28%)</SelectItem>
                                <SelectItem value="24021000">24021000 - Cigarettes (28%)</SelectItem>
                                <SelectItem value="22030000">22030000 - Beer (28%)</SelectItem>
                                <SelectItem value="22084000">22084000 - Wine (28%)</SelectItem>

                                {/* Automobiles - 28% GST */}
                                <SelectItem value="87032390">87032390 - Passenger Cars (28%)</SelectItem>
                                <SelectItem value="87111000">87111000 - Motorcycles (28%)</SelectItem>
                                <SelectItem value="87120000">87120000 - Bicycles (12%)</SelectItem>

                                {/* Medicines & Healthcare - 5% & 12% GST */}
                                <SelectItem value="30049099">30049099 - Medicines (5%)</SelectItem>
                                <SelectItem value="90183900">90183900 - Medical Equipment (12%)</SelectItem>
                                <SelectItem value="30059090">30059090 - Health Supplements (18%)</SelectItem>

                                {/* Books & Stationery - 5% & 12% GST */}
                                <SelectItem value="49019900">49019900 - Books (5%)</SelectItem>
                                <SelectItem value="48201000">48201000 - Notebooks (12%)</SelectItem>
                                <SelectItem value="96085000">96085000 - Pens (18%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            GST Code *
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              Auto-updated from HSN
                            </span>
                          </Label>
                          <Select defaultValue="GST 18%">
                            <SelectTrigger>
                              <SelectValue placeholder="Select GST rate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GST 0%">GST 0% - Nil Rate (Basic necessities)</SelectItem>
                              <SelectItem value="GST 5%">GST 5% - Essential goods (Food grains, medicines)</SelectItem>
                              <SelectItem value="GST 12%">GST 12% - Standard rate (Textiles, electronics)</SelectItem>
                              <SelectItem value="GST 18%">GST 18% - Standard rate (Most goods & services)</SelectItem>
                              <SelectItem value="GST 28%">GST 28% - Luxury goods (Cars, cigarettes)</SelectItem>
                              <SelectItem value="EXEMPT">EXEMPT - Tax exempted items</SelectItem>
                              <SelectItem value="ZERO RATED">ZERO RATED - Export goods</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* GST Breakdown & Compliance */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">GST Breakdown & Compliance</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>CGST Rate (%)</Label>
                            <Input placeholder="9.00" type="number" step="0.01" defaultValue="9" />
                          </div>
                          <div className="space-y-2">
                            <Label>SGST Rate (%)</Label>
                            <Input placeholder="9.00" type="number" step="0.01" defaultValue="9" />
                          </div>
                          <div className="space-y-2">
                            <Label>IGST Rate (%)</Label>
                            <Input placeholder="0.00" type="number" step="0.01" defaultValue="0" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <div className="space-y-2">
                            <Label>Tax Calculation Method</Label>
                            <Select defaultValue="exclusive">
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                                <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                                <SelectItem value="compound">Compound Tax</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Cess Rate (%) - Optional</Label>
                            <Input placeholder="0.00" type="number" step="0.01" />
                          </div>
                        </div>
                      </div>

                      {/* Purchase GST Configuration */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Purchase GST Configuration</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Purchase GST Calculated On</Label>
                            <Select defaultValue="MRP">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MRP">MRP</SelectItem>
                                <SelectItem value="Cost">Cost</SelectItem>
                                <SelectItem value="Selling Price">Selling Price</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Purchase Abatement %</Label>
                            <Input placeholder="0" type="number" step="0.01" />
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <Label>GST UOM (Unit of Measurement)</Label>
                          <Select defaultValue="PIECES">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PIECES">PIECES</SelectItem>
                              <SelectItem value="KG">KG (Kilograms)</SelectItem>
                              <SelectItem value="LITRE">LITRE (Litres)</SelectItem>
                              <SelectItem value="METER">METER (Meters)</SelectItem>
                              <SelectItem value="GRAMS">GRAMS</SelectItem>
                              <SelectItem value="DOZEN">DOZEN</SelectItem>
                              <SelectItem value="PACKETS">PACKETS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Tax Compliance Switches */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Tax Compliance & Special Cases</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm font-medium">Config Item With Commodity</Label>
                              <p className="text-xs text-gray-600">Enable for commodity-based tax calculations</p>
                            </div>
                            <Switch />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm font-medium">Senior Citizen Exemption Applicable</Label>
                              <p className="text-xs text-gray-600">Apply senior citizen tax exemptions where applicable</p>
                            </div>
                            <Switch />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm font-medium">Reverse Charge Mechanism</Label>
                              <p className="text-xs text-gray-600">Apply reverse charge for specific transactions</p>
                            </div>
                            <Switch />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm font-medium">Zero Tax Rate</Label>
                              <p className="text-xs text-gray-600">Apply zero tax rate for exempt items</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                      </div>

                      {/* Tax Summary Display */}
                      <div className="border-t pt-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Tax Calculation Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total CGST (9%):</span>
                                <span className="font-medium">₹0.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total SGST (9%):</span>
                                <span className="font-medium">₹0.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total IGST (0%):</span>
                                <span className="font-medium">₹0.00</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Total Tax Amount:</span>
                                <span className="font-medium">₹0.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Tax Percentage:</span>
                                <span className="font-medium">18%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Tax Method:</span>
                                <span className="font-medium">Exclusive</span>
                              </div>
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