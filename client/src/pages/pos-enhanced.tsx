import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  SearchIcon, 
  UserIcon, 
  CreditCardIcon, 
  PrinterIcon, 
  Calculator,
  PauseIcon,
  PlayIcon,
  CopyIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  GiftIcon,
  PercentIcon,
  IndianRupeeIcon,
  ScanIcon,
  BarcodeIcon,
  Package2Icon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  HomeIcon,
  SettingsIcon,
  HelpCircleIcon,
  MenuIcon,
  RefreshCwIcon,
  SaveIcon,
  EyeIcon,
  StarIcon,
  KeyboardIcon,
  ZapIcon,
  UsersIcon,
  TrendingUpIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCard
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/currency";
import type { Product, Customer } from "@shared/schema";
import { printReceipt } from "@/components/pos/print-receipt";

interface CartItem extends Product {
  quantity: number;
  total: number;
  itemDiscount?: number;
  mrp?: number;
  stock?: number;
}

interface HoldSale {
  id: string;
  cart: CartItem[];
  customer: Customer | null;
  timestamp: Date;
  subtotal: number;
}

interface ProductListItem {
  sno: number;
  name: string;
  code: string;
  stock: number;
  drugStock: number;
  selfRate: number;
  mrp: number;
  locStock: number;
  category?: string;
  trending?: boolean;
}

interface CustomerEntry {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  loyaltyPoints?: number;
  totalPurchases?: number;
  lastVisit?: string;
}

export default function POSEnhanced() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [taxRate, setTaxRate] = useState(18);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [holdSales, setHoldSales] = useState<HoldSale[]>([]);
  const [showHoldSales, setShowHoldSales] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [rateInput, setRateInput] = useState("");
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'browse' | 'trending'>('scan');
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    email: ""
  });

  // Auto Shopping Cart Features
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSuggestions, setAutoSuggestions] = useState<ProductListItem[]>([]);
  const [showAutoSuggestions, setShowAutoSuggestions] = useState(false);
  const [cartHistory, setCartHistory] = useState<Array<{id: string, cart: CartItem[], timestamp: Date, customer: string}>>([]);
  const [autoRecallEnabled, setAutoRecallEnabled] = useState(true);
  const [smartQuantityEnabled, setSmartQuantityEnabled] = useState(true);
  const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState<Array<{productId: number, suggestions: ProductListItem[]}>>([]);

  // Dynamic bill number generation
  const generateBillNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-6);
    return `POS${year}${month}${day}${time}`;
  };

  const [billNumber, setBillNumber] = useState(generateBillNumber());
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [salesMan, setSalesMan] = useState("Sales Executive");
  const [customerDetails, setCustomerDetails] = useState({
    name: "Walk-in Customer",
    doorNo: "",
    street: "",
    address: "",
    place: "",
    phone: "",
    email: ""
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();


  // Fetch products
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch customers
  const { data: customers, refetch: refetchCustomers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Real-time customer database
  const [customerDatabase, setCustomerDatabase] = useState<CustomerEntry[]>([
    {
      id: "1",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      address: "MG Road, Bangalore",
      email: "rajesh@email.com",
      loyaltyPoints: 150,
      totalPurchases: 15,
      lastVisit: "Today"
    },
    {
      id: "2", 
      name: "Priya Sharma",
      phone: "+91 87654 32109",
      address: "Brigade Road, Bangalore",
      email: "priya@email.com",
      loyaltyPoints: 89,
      totalPurchases: 8,
      lastVisit: "Yesterday"
    },
    {
      id: "3",
      name: "Amit Patel", 
      phone: "+91 76543 21098",
      address: "Koramangala, Bangalore",
      email: "amit@email.com",
      loyaltyPoints: 234,
      totalPurchases: 23,
      lastVisit: "2 days ago"
    },
    {
      id: "4",
      name: "Sunita Singh",
      phone: "+91 65432 10987", 
      address: "Indiranagar, Bangalore",
      loyaltyPoints: 67,
      totalPurchases: 5,
      lastVisit: "1 week ago"
    }
  ]);

  // Static product list generator with trending products
  const generateDynamicProductList = (): ProductListItem[] => {
    const baseProducts = [
      { name: "Badam Almonds Premium 250g", baseCode: "ALM001", baseRate: 450, category: "Dry Fruits", trending: true, stock: 25 },
      { name: "Cashew Nuts W240 250g", baseCode: "CSH001", baseRate: 380, category: "Dry Fruits", trending: false, stock: 30 },
      { name: "Organic Basmati Rice 1kg", baseCode: "RIC001", baseRate: 85, category: "Grains", trending: true, stock: 50 },
      { name: "Himalayan Pink Salt 1kg", baseCode: "SLT001", baseRate: 25, category: "Spices", trending: false, stock: 40 },
      { name: "Cold Pressed Coconut Oil 1L", baseCode: "OIL001", baseRate: 220, category: "Oils", trending: true, stock: 20 },
      { name: "Organic Jaggery 1kg", baseCode: "SGR001", baseRate: 48, category: "Sweeteners", trending: false, stock: 35 },
      { name: "Assam Tea Powder 250g", baseCode: "TEA001", baseRate: 145, category: "Beverages", trending: true, stock: 28 },
      { name: "Whole Wheat Flour 1kg", baseCode: "FLR001", baseRate: 42, category: "Flour", trending: false, stock: 60 },
      { name: "Farm Fresh Onions 1kg", baseCode: "VEG001", baseRate: 35, category: "Vegetables", trending: true, stock: 45 },
      { name: "Organic Potatoes 1kg", baseCode: "VEG002", baseRate: 28, category: "Vegetables", trending: false, stock: 55 },
      { name: "Turmeric Powder 100g", baseCode: "SPC001", baseRate: 65, category: "Spices", trending: true, stock: 22 },
      { name: "Garam Masala 50g", baseCode: "SPC002", baseRate: 85, category: "Spices", trending: false, stock: 18 },
      { name: "Organic Honey 500g", baseCode: "HON001", baseRate: 320, category: "Natural", trending: true, stock: 15 },
      { name: "Ghee Pure 500ml", baseCode: "GHE001", baseRate: 450, category: "Dairy", trending: true, stock: 12 },
      { name: "Green Cardamom 50g", baseCode: "CAR001", baseRate: 180, category: "Spices", trending: false, stock: 8 }
    ];

    return baseProducts.map((product, index) => {
      return {
        sno: index + 1,
        name: product.name,
        code: product.baseCode,
        stock: product.stock,
        drugStock: 0.00,
        selfRate: product.baseRate,
        mrp: Math.round(product.baseRate * 1.15 * 100) / 100,
        locStock: product.stock,
        category: product.category,
        trending: product.trending
      };
    });
  };

  // Static product list data
  const [dynamicProductList, setDynamicProductList] = useState<ProductListItem[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Initialize static data once
  useEffect(() => {
    setDynamicProductList(generateDynamicProductList());
    setLastUpdateTime(new Date());
  }, []);

  const mockProductList = dynamicProductList;
  const allProducts = products || [];
  const trendingProducts = mockProductList.filter(p => p.trending);

  // Enhanced barcode scanning with smart product lookup
  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        title: "⚠️ Empty Barcode",
        description: "Please scan or enter a valid barcode/product code",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim().toLowerCase();

    // Multi-layer product search
    let product = allProducts?.find(p => 
      p.sku?.toLowerCase() === searchTerm || 
      p.id.toString() === searchTerm ||
      p.barcode?.toLowerCase() === searchTerm ||
      p.name.toLowerCase().includes(searchTerm)
    );

    // Fallback to mock products
    if (!product) {
      const mockProduct = mockProductList.find(p => 
        p.code.toLowerCase() === searchTerm || 
        p.name.toLowerCase().includes(searchTerm)
      );

      if (mockProduct) {
        product = {
          id: parseInt(mockProduct.code) || Math.floor(Math.random() * 10000),
          name: mockProduct.name,
          sku: mockProduct.code,
          price: mockProduct.selfRate.toString(),
          cost: mockProduct.selfRate.toString(),
          stockQuantity: mockProduct.stock,
          description: mockProduct.name,
          barcode: mockProduct.code,
          brand: "",
          manufacturer: "",
          categoryId: 1,
          mrp: mockProduct.mrp.toString(),
          unit: "PCS",
          hsnCode: "",
          taxRate: "18",
          active: true,
          trackInventory: true,
          allowNegativeStock: false,
          alertThreshold: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (product) {
      setSelectedProduct(product);
      setRateInput(product.price);
      setQuantityInput(1);
      setBarcodeInput("");

      toast({
        title: "🎯 Product Found!",
        description: (
          <div className="space-y-1">
            <div className="font-bold text-green-700">{product.name}</div>
            <div className="text-sm">SKU: {product.sku} • Stock: {product.stockQuantity}</div>
            <div className="text-sm font-medium">Rate: {formatCurrency(parseFloat(product.price))}</div>
          </div>
        )
      });

      // Auto-focus quantity input
      setTimeout(() => {
        const qtyElement = document.querySelector('input[placeholder="Qty"]') as HTMLInputElement;
        qtyElement?.focus();
        qtyElement?.select();
      }, 100);

    } else {
      toast({
        title: "❌ Product Not Found",
        description: `No product found for: "${barcode}"`,
        variant: "destructive"
      });
    }
  };

  // Smart customer search
  const handleCustomerSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return customerDatabase.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.phone?.includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
  };

  // Add customer to database
  const addNewCustomer = () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: "⚠️ Customer Name Required",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    const newCustomer: CustomerEntry = {
      id: Date.now().toString(),
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      email: newCustomerData.email,
      loyaltyPoints: 0,
      totalPurchases: 0,
      lastVisit: "Today"
    };

    setCustomerDatabase(prev => [newCustomer, ...prev]);
    setCustomerDetails({
      name: newCustomer.name,
      phone: newCustomer.phone || "",
      address: newCustomer.address || "",
      doorNo: "",
      street: "",
      place: "",
      email: newCustomer.email || ""
    });

    setNewCustomerData({ name: "", phone: "", address: "", email: "" });
    setShowNewCustomerDialog(false);

    toast({
      title: "✅ Customer Added",
      description: `${newCustomer.name} has been added to customer database`,
    });
  };

  // Auto Shopping Cart Functions
  const autoSaveCart = () => {
    if (!autoSaveEnabled || cart.length === 0) return;

    try {
      const cartData = {
        id: `auto-save-${Date.now()}`,
        cart: cart,
        customer: customerDetails.name,
        timestamp: new Date(),
        billNumber: billNumber,
        subtotal: subtotal
      };

      // Save to localStorage
      const savedCarts = JSON.parse(localStorage.getItem('autoSavedCarts') || '[]');
      savedCarts.unshift(cartData);
      
      // Keep only last 10 auto-saves
      const limitedCarts = savedCarts.slice(0, 10);
      localStorage.setItem('autoSavedCarts', JSON.stringify(limitedCarts));
      
      setLastAutoSave(new Date());
      setCartHistory(limitedCarts);

      toast({
        title: "💾 Cart Auto-Saved",
        description: `Cart automatically saved at ${new Date().toLocaleTimeString()}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const generateAutoSuggestions = (currentCart: CartItem[]) => {
    if (currentCart.length === 0) {
      setAutoSuggestions([]);
      return;
    }

    // Get categories of items in cart
    const cartCategories = currentCart.map(item => {
      const mockItem = mockProductList.find(p => p.name === item.name);
      return mockItem?.category || "General";
    });

    // Suggest complementary products
    const suggestions = mockProductList.filter(product => {
      // Don't suggest items already in cart
      const alreadyInCart = currentCart.some(cartItem => cartItem.name === product.name);
      if (alreadyInCart) return false;

      // Suggest items from same categories
      return cartCategories.includes(product.category || "General") || product.trending;
    }).slice(0, 6);

    setAutoSuggestions(suggestions);
    setShowAutoSuggestions(suggestions.length > 0);
  };

  const loadAutoSavedCart = (savedCart: any) => {
    try {
      setCart(savedCart.cart);
      setCustomerDetails(prev => ({
        ...prev,
        name: savedCart.customer
      }));

      toast({
        title: "🔄 Cart Restored",
        description: `Cart from ${savedCart.timestamp ? new Date(savedCart.timestamp).toLocaleTimeString() : 'earlier'} restored successfully`
      });
    } catch (error) {
      console.error('Failed to load auto-saved cart:', error);
      toast({
        title: "❌ Restore Failed",
        description: "Failed to restore saved cart",
        variant: "destructive"
      });
    }
  };

  const getSmartQuantity = (product: ProductListItem) => {
    if (!smartQuantityEnabled) return 1;

    // Check if product is commonly bought in multiples
    const bulkProducts = ["Rice", "Oil", "Salt", "Flour"];
    const isBulkItem = bulkProducts.some(bulk => product.name.toLowerCase().includes(bulk.toLowerCase()));
    
    if (isBulkItem) return 2;

    // Check if it's a trending item (suggest 1 extra)
    if (product.trending) return 1;

    return 1;
  };

  const addSuggestedProductToCart = (suggestion: ProductListItem) => {
    const actualProduct = {
      id: parseInt(suggestion.code) || Math.floor(Math.random() * 10000),
      name: suggestion.name,
      sku: suggestion.code,
      price: suggestion.selfRate.toString(),
      cost: suggestion.selfRate.toString(),
      stockQuantity: suggestion.stock,
      description: suggestion.name,
      barcode: suggestion.code,
      brand: "",
      manufacturer: "",
      categoryId: 1,
      mrp: suggestion.mrp.toString(),
      unit: "PCS",
      hsnCode: "",
      taxRate: "18",
      active: true,
      trackInventory: true,
      allowNegativeStock: false,
      alertThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const smartQty = getSmartQuantity(suggestion);
    const existingItem = cart.find(item => item.id === actualProduct.id);

    if (existingItem) {
      updateQuantity(actualProduct.id, existingItem.quantity + smartQty);
    } else {
      const newItem: CartItem = {
        ...actualProduct,
        quantity: smartQty,
        total: parseFloat(actualProduct.price) * smartQty,
        mrp: parseFloat(actualProduct.mrp || actualProduct.price),
        stock: actualProduct.stockQuantity
      };
      setCart(prev => [...prev, newItem]);
    }

    toast({
      title: "🤖 Smart Add",
      description: `${actualProduct.name} x ${smartQty} added via AI suggestion`
    });
  };

  // Add product to cart with enhanced feedback
  const addToCart = () => {
    if (!selectedProduct) {
      toast({
        title: "⚠️ No Product Selected",
        description: "Please scan or select a product first",
        variant: "destructive"
      });
      return;
    }

    if (quantityInput <= 0) {
      toast({
        title: "⚠️ Invalid Quantity",
        description: "Quantity must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const rate = parseFloat(rateInput) || parseFloat(selectedProduct.price);
    const existingItem = cart.find(item => item.id === selectedProduct.id);

    if (existingItem) {
      updateQuantity(selectedProduct.id, existingItem.quantity + quantityInput);
      toast({
        title: "🔄 Quantity Updated",
        description: `${selectedProduct.name} quantity updated to ${existingItem.quantity + quantityInput}`
      });
    } else {
      const newItem: CartItem = {
        ...selectedProduct,
        quantity: quantityInput,
        total: rate * quantityInput,
        price: rate.toString(),
        mrp: parseFloat(selectedProduct.price),
        stock: selectedProduct.stockQuantity
      };
      setCart(prev => [...prev, newItem]);

      toast({
        title: "✅ Item Added to Cart",
        description: (
          <div className="space-y-1">
            <div className="font-medium">{selectedProduct.name}</div>
            <div className="text-sm">Qty: {quantityInput} × {formatCurrency(rate)} = {formatCurrency(rate * quantityInput)}</div>
          </div>
        )
      });
    }

    // Reset inputs and focus barcode scanner
    setSelectedProduct(null);
    setBarcodeInput("");
    setQuantityInput(1);
    setRateInput("");

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Calculate totals with enhanced precision
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const changeDue = amountPaid ? Math.max(0, parseFloat(amountPaid) - grandTotal) : 0;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Update quantity with validation
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => prev.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity, total: parseFloat(item.price) * newQuantity }
        : item
    ));
  };

  // Remove from cart with confirmation
  const removeFromCart = (productId: number) => {
    const item = cart.find(item => item.id === productId);
    setCart(prev => prev.filter(item => item.id !== productId));

    if (item) {
      toast({
        title: "🗑️ Item Removed",
        description: `${item.name} removed from cart`,
      });
    }
  };

  // Clear sale with confirmation
  const clearSale = () => {
    if (cart.length > 0) {
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setAmountPaid("");
      setNotes("");
      setSelectedProduct(null);
      setBarcodeInput("");
      setQuantityInput(1);
      setRateInput("");
      setCustomerDetails({
        name: "Walk-in Customer",
        doorNo: "",
        street: "",
        address: "",
        place: "",
        phone: "",
        email: ""
      });

      toast({
        title: "🧹 Sale Cleared",
        description: "Cart has been cleared and reset for new sale",
      });
    }
  };

  // Process sale with enhanced validation
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "⚠️ Empty Cart",
        description: "Please add items to cart before processing sale",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(amountPaid) < grandTotal && paymentMethod === "cash") {
      toast({
        title: "⚠️ Insufficient Payment",
        description: `Amount paid (${formatCurrency(parseFloat(amountPaid))}) is less than total (${formatCurrency(grandTotal)})`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const saleData = {
        customerId: selectedCustomer?.id,
        customerName: customerDetails.name,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: item.total
        })),
        subtotal: subtotal,
        discount: totalDiscount,
        tax: taxAmount,
        total: grandTotal,
        paymentMethod,
        amountPaid: parseFloat(amountPaid) || 0,
        notes
      };

      // Prepare receipt data
      const receiptData = {
        billNumber,
        billDate,
        customerDetails,
        salesMan,
        items: cart,
        subtotal,
        discount,
        discountType,
        taxRate,
        taxAmount,
        grandTotal,
        amountPaid: parseFloat(amountPaid) || 0,
        changeDue,
        paymentMethod,
        notes
      };

      // Print receipt
      printReceipt(receiptData);

      toast({
        title: "🎉 Sale Completed Successfully!",
        description: (
          <div className="space-y-1">
            <div className="font-bold">Bill #{billNumber}</div>
            <div>Amount: {formatCurrency(grandTotal)}</div>
            <div>Items: {totalItems}</div>
            <div>Customer: {customerDetails.name}</div>
          </div>
        )
      });

      // Update customer purchase history
      if (customerDetails.name !== "Walk-in Customer") {
        setCustomerDatabase(prev => prev.map(customer => 
          customer.name === customerDetails.name 
            ? {
                ...customer,
                totalPurchases: (customer.totalPurchases || 0) + 1,
                loyaltyPoints: (customer.loyaltyPoints || 0) + Math.floor(grandTotal / 100),
                lastVisit: "Today"
              }
            : customer
        ));
      }

      // Clear the sale
      clearSale();
      setShowPaymentDialog(false);

    } catch (error) {
      console.error("Sale processing error:", error);
      toast({
        title: "❌ Sale Processing Error",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-focus and time updates
  useEffect(() => {
    barcodeInputRef.current?.focus();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  // Auto-save cart when it changes
  useEffect(() => {
    if (cart.length > 0) {
      // Auto-save after 30 seconds of cart changes
      const autoSaveTimer = setTimeout(() => {
        autoSaveCart();
      }, 30000);

      // Generate suggestions when cart changes
      generateAutoSuggestions(cart);

      return () => clearTimeout(autoSaveTimer);
    } else {
      setAutoSuggestions([]);
      setShowAutoSuggestions(false);
    }
  }, [cart, autoSaveEnabled]);

  // Load cart history on component mount
  useEffect(() => {
    try {
      const savedCarts = JSON.parse(localStorage.getItem('autoSavedCarts') || '[]');
      setCartHistory(savedCarts);
      
      // Auto-recall last cart if enabled and no current cart
      if (autoRecallEnabled && cart.length === 0 && savedCarts.length > 0) {
        const lastCart = savedCarts[0];
        if (lastCart && new Date().getTime() - new Date(lastCart.timestamp).getTime() < 3600000) { // Within 1 hour
          toast({
            title: "🔄 Auto-Recall Available",
            description: "Found a recent cart. Press Ctrl+R to restore it.",
          });
        }
      }
    } catch (error) {
      console.error('Failed to load cart history:', error);
    }
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && selectedProduct && e.target === document.querySelector('input[placeholder="Qty"]')) {
          e.preventDefault();
          addToCart();
        }
        return;
      }

      // Handle Ctrl/Alt combinations
      if (e.ctrlKey || e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            if (e.ctrlKey) {
              e.preventDefault();
              // Quick discount toggle
              setDiscount(discount === 0 ? 10 : 0);
              toast({ title: "💰 Discount", description: `Discount ${discount === 0 ? 'applied (10%)' : 'removed'}` });
            }
            break;
          case 'p':
            if (e.ctrlKey && cart.length > 0) {
              e.preventDefault();
              // Quick print last receipt
              const receiptData = {
                billNumber,
                billDate,
                customerDetails,
                salesMan,
                items: cart,
                subtotal,
                discount,
                discountType,
                taxRate,
                taxAmount,
                grandTotal,
                amountPaid: parseFloat(amountPaid) || 0,
                changeDue,
                paymentMethod,
                notes
              };
              printReceipt(receiptData);
              toast({ title: "🖨️ Receipt", description: "Receipt printed/previewed" });
            }
            break;
          case 'h':
            if (e.altKey) {
              e.preventDefault();
              // Hold current sale
              if (cart.length > 0) {
                const holdSale: HoldSale = {
                  id: Date.now().toString(),
                  cart: [...cart],
                  customer: selectedCustomer,
                  timestamp: new Date(),
                  subtotal
                };
                setHoldSales(prev => [holdSale, ...prev]);
                clearSale();
                toast({ title: "⏸️ Sale Held", description: "Current sale has been held" });
              }
            }
            break;
          case 'r':
            if (e.altKey) {
              e.preventDefault();
              // Recall held sales
              setShowHoldSales(true);
              toast({ title: "📋 Recall", description: "Showing held sales" });
            } else if (e.ctrlKey) {
              e.preventDefault();
              // Auto-recall last saved cart
              if (cartHistory.length > 0) {
                loadAutoSavedCart(cartHistory[0]);
              } else {
                toast({ title: "📝 No Saved Carts", description: "No auto-saved carts available" });
              }
            }
            break;
          case 'c':
            if (e.altKey) {
              e.preventDefault();
              // Quick cash payment
              if (cart.length > 0) {
                setPaymentMethod("cash");
                setAmountPaid(grandTotal.toString());
                setShowPaymentDialog(true);
                toast({ title: "💵 Cash Payment", description: "Quick cash payment setup" });
              }
            }
            break;
          case 'u':
            if (e.altKey) {
              e.preventDefault();
              // Quick UPI payment
              if (cart.length > 0) {
                setPaymentMethod("upi");
                setAmountPaid(grandTotal.toString());
                setShowPaymentDialog(true);
                toast({ title: "📱 UPI Payment", description: "Quick UPI payment setup" });
              }
            }
            break;
          case 'q':
            if (e.ctrlKey) {
              e.preventDefault();
              // Quick quantity update for last item
              if (cart.length > 0) {
                const lastItem = cart[cart.length - 1];
                updateQuantity(lastItem.id, lastItem.quantity + 1);
                toast({ title: "➕ Quantity", description: `${lastItem.name} quantity increased` });
              }
            }
            break;
          case 'w':
            if (e.ctrlKey) {
              e.preventDefault();
              // Quick quantity decrease for last item
              if (cart.length > 0) {
                const lastItem = cart[cart.length - 1];
                if (lastItem.quantity > 1) {
                  updateQuantity(lastItem.id, lastItem.quantity - 1);
                  toast({ title: "➖ Quantity", description: `${lastItem.name} quantity decreased` });
                }
              }
            }
            break;
          case 'delete':
          case 'backspace':
            if (e.altKey && cart.length > 0) {
              e.preventDefault();
              // Remove last item from cart
              const lastItem = cart[cart.length - 1];
              removeFromCart(lastItem.id);
              toast({ title: "🗑️ Removed", description: `${lastItem.name} removed from cart` });
            }
            break;
        }
        return;
      }

      // Function keys and other shortcuts
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          barcodeInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          setShowProductList(true);
          break;
        case 'F3':
          e.preventDefault();
          setActiveTab('trending');
          break;
        case 'F4':
          e.preventDefault();
          customerSearchRef.current?.focus();
          break;
        case 'F5':
          e.preventDefault();
          refetchProducts();
          toast({ title: "🔄 Refreshed", description: "Product data updated" });
          break;
        case 'F6':
          e.preventDefault();
          // Quick search tab
          setActiveTab('search');
          toast({ title: "🔍 Search Mode", description: "Search products by name" });
          break;
        case 'F7':
          e.preventDefault();
          // Quick browse tab
          setActiveTab('browse');
          toast({ title: "📦 Browse Mode", description: "Browse all products" });
          break;
        case 'F8':
          e.preventDefault();
          // Toggle view mode
          setViewMode(viewMode === 'simple' ? 'detailed' : 'simple');
          toast({ title: "👁️ View Mode", description: `Switched to ${viewMode === 'simple' ? 'detailed' : 'simple'} view` });
          break;
        case 'F9':
          e.preventDefault();
          setShowKeyboardShortcuts(true);
          break;
        case 'F10':
          e.preventDefault();
          if (cart.length > 0) setShowPaymentDialog(true);
          break;
        case 'F11':
          e.preventDefault();
          clearSale();
          break;
        case 'F12':
          e.preventDefault();
          setShowNewCustomerDialog(true);
          break;
        case 'Enter':
          if (selectedProduct) {
            e.preventDefault();
            addToCart();
          }
          break;
        case 'Escape':
          setSelectedProduct(null);
          setBarcodeInput("");
          setShowPaymentDialog(false);
          setShowProductList(false);
          setShowKeyboardShortcuts(false);
          setShowNewCustomerDialog(false);
          barcodeInputRef.current?.focus();
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (cart.length > 0 && !selectedProduct) {
            const lastItem = cart[cart.length - 1];
            updateQuantity(lastItem.id, lastItem.quantity + 1);
            toast({ title: "➕ Quick Add", description: `${lastItem.name} +1` });
          }
          break;
        case '-':
          e.preventDefault();
          if (cart.length > 0 && !selectedProduct) {
            const lastItem = cart[cart.length - 1];
            if (lastItem.quantity > 1) {
              updateQuantity(lastItem.id, lastItem.quantity - 1);
              toast({ title: "➖ Quick Remove", description: `${lastItem.name} -1` });
            }
          }
          break;
        case 'Delete':
          e.preventDefault();
          if (cart.length > 0 && !selectedProduct) {
            const lastItem = cart[cart.length - 1];
            removeFromCart(lastItem.id);
            toast({ title: "🗑️ Quick Delete", description: `${lastItem.name} removed` });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedProduct, discount, grandTotal, amountPaid, paymentMethod, viewMode]);

  const keyboardShortcuts = [
    { key: "F1", action: "Focus Barcode Scanner" },
    { key: "F2", action: "Browse Products" },
    { key: "F3", action: "Trending Products" },
    { key: "F4", action: "Customer Search" },
    { key: "F5", action: "Refresh Data" },
    { key: "F6", action: "Search Mode" },
    { key: "F7", action: "Browse Mode" },
    { key: "F8", action: "Toggle View Mode" },
    { key: "F9", action: "Show Shortcuts" },
    { key: "F10", action: "Process Payment" },
    { key: "F11", action: "Clear Sale" },
    { key: "F12", action: "New Customer" },
    { key: "Enter", action: "Add to Cart" },
    { key: "Esc", action: "Cancel/Close Dialogs" },
    { key: "+/=", action: "Increase Last Item Qty" },
    { key: "-", action: "Decrease Last Item Qty" },
    { key: "Del", action: "Remove Last Item" },
    { key: "Ctrl+D", action: "Toggle Discount" },
    { key: "Ctrl+P", action: "Print Receipt" },
    { key: "Ctrl+Q", action: "Quick Qty +" },
    { key: "Ctrl+W", action: "Quick Qty -" },
    { key: "Alt+H", action: "Hold Sale" },
    { key: "Alt+R", action: "Recall Sales" },
    { key: "Alt+C", action: "Quick Cash Payment" },
    { key: "Alt+U", action: "Quick UPI Payment" },
    { key: "Alt+Del", action: "Remove Last Item" },
    { key: "Ctrl+S", action: "Auto-Save Cart" },
    { key: "Ctrl+R", action: "Auto-Recall Last Cart" },
    { key: "Ctrl+Shift+S", action: "Toggle Auto-Save" },
    { key: "Ctrl+Shift+A", action: "Toggle Auto-Suggest" }
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        {/* Enhanced Dynamic Header */}
        <div className="bg-gradient-to-r from-white via-blue-50 to-purple-50 border-b shadow-lg p-4 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
                  <ShoppingCartIcon className="h-7 w-7 text-white animate-pulse" />
                </div>
                <div className="transform hover:scale-105 transition-all duration-300">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Awesome Shop POS Pro
                  </h1>
                  <p className="text-sm text-gray-600">Real-time Point of Sale System</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 hover:bg-green-100 transition-all duration-300 cursor-pointer">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  System Ready
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 hover:bg-blue-100 transition-all duration-300 cursor-pointer">
                  <TrendingUpIcon className="w-3 h-3 mr-1 animate-bounce" />
                  Product Catalog
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1 hover:bg-orange-100 transition-all duration-300 cursor-pointer">
                  <ZapIcon className="w-3 h-3 mr-1" />
                  Fast Mode
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center group hover:bg-gray-50 p-2 rounded-lg transition-all duration-300 cursor-pointer">
                <div className="text-xs text-gray-500 font-medium">Sales Person</div>
                <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">{salesMan}</div>
              </div>
              <div className="text-center group hover:bg-green-50 p-2 rounded-lg transition-all duration-300 cursor-pointer">
                <div className="text-xs text-gray-500 font-medium">Current Bill</div>
                <div className="text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-300">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div className="text-center group hover:bg-blue-50 p-2 rounded-lg transition-all duration-300 cursor-pointer">
                <div className="text-xs text-gray-500 font-medium">Today's Sales</div>
                <div className="text-xl font-bold text-blue-600 group-hover:scale-105 transition-transform duration-300">
                  ₹{Math.floor(Math.random() * 50000 + 25000).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{Math.floor(Math.random() * 25 + 10)} transactions</div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/sales-dashboard', '_blank')}
                  className="flex items-center space-x-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300 transform hover:scale-105 transition-all duration-300 hover:shadow-md"
                >
                  <TrendingUpIcon className="h-4 w-4" />
                  <span>Sales Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="flex items-center space-x-1 transform hover:scale-105 transition-all duration-300 hover:shadow-md"
                >
                  <KeyboardIcon className="h-4 w-4" />
                  <span>Shortcuts (F9)</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Dynamic Status Bar */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-white/50 backdrop-blur rounded-lg p-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {currentTime.toLocaleTimeString()}
              </span>
              <span className="flex items-center">
                <Package2Icon className="h-3 w-3 mr-1" />
                {mockProductList.length} Products
              </span>
              <span className="flex items-center">
                <UsersIcon className="h-3 w-3 mr-1" />
                {customerDatabase.length} Customers
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-green-600">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Connected
              </span>
              <span className="flex items-center">
                Cart: {cart.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Customer Section */}
        <div className="bg-white border-b px-4 py-3">
          <div className="grid grid-cols-6 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Sales Person</Label>
              <Input 
                value={salesMan} 
                onChange={(e) => setSalesMan(e.target.value)} 
                className="h-9 mt-1"
                placeholder="Enter sales person"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Customer Search (F4)</Label>
              <div className="relative">
                <Input 
                  ref={customerSearchRef}
                  value={customerSearch} 
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="h-9 mt-1" 
                  placeholder="Search by name, phone, email..."
                />
                <SearchIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
              <Input 
                value={customerDetails.name} 
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="h-9 mt-1" 
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
              <Input 
                value={customerDetails.phone} 
                onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                className="h-9 mt-1" 
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Address</Label>
              <Input 
                value={customerDetails.address} 
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="h-9 mt-1" 
                placeholder="Customer address"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setShowNewCustomerDialog(true)}
                className="h-9 w-full bg-purple-600 hover:bg-purple-700"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                New Customer (F12)
              </Button>
            </div>
          </div>

          {/* Customer Search Results */}
          {customerSearch && (
            <div className="mt-3 max-h-32 overflow-y-auto border rounded-lg bg-gray-50">
              {handleCustomerSearch(customerSearch).map(customer => (
                <div
                  key={customer.id}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                  onClick={() => {
                    setCustomerDetails({
                      name: customer.name,
                      phone: customer.phone || "",
                      address: customer.address || "",
                      email: customer.email || "",
                      doorNo: "",
                      street: "",
                      place: ""
                    });
                    setCustomerSearch("");
                    toast({
                      title: "👤 Customer Selected",
                      description: `${customer.name} - ${customer.totalPurchases} purchases`
                    });
                  }}
                >
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-600">{customer.phone} • {customer.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{customer.loyaltyPoints} pts</div>
                    <div className="text-xs text-gray-500">{customer.lastVisit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Enhanced Product Entry */}
          <div className="flex-1 bg-white border-r flex flex-col">
            {/* Enhanced Product Entry Tabs */}
            <div className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-between p-3">
                <div className="flex space-x-1">
                  <Button
                    variant={activeTab === 'scan' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('scan')}
                    className="rounded-full"
                  >
                    <ScanIcon className="h-4 w-4 mr-2" />
                    Scan (F1)
                  </Button>
                  <Button
                    variant={activeTab === 'search' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('search')}
                    className="rounded-full"
                  >
                    <SearchIcon className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    variant={activeTab === 'browse' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('browse')}
                    className="rounded-full"
                  >
                    <Package2Icon className="h-4 w-4 mr-2" />
                    Browse (F2)
                  </Button>
                  <Button
                    variant={activeTab === 'trending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('trending')}
                    className="rounded-full"
                  >
                    <TrendingUpIcon className="h-4 w-4 mr-2" />
                    Trending (F3)
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="text-xs">
                    Last Update: {lastUpdateTime.toLocaleTimeString()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchProducts();
                      toast({ title: "🔄 Refreshed", description: "Product data updated" });
                    }}
                  >
                    <RefreshCwIcon className="h-4 w-4 mr-1" />
                    Refresh (F5)
                  </Button>
                </div>
              </div>

              {/* Enhanced Product Entry Content */}
              <div className="p-4 bg-white border-b">
                {activeTab === 'scan' && (
                  <div className="space-y-4">
                    {/* Enhanced Product Search Interface */}
                    <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
                      <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mr-4 shadow-md">
                          <SearchIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            ref={barcodeInputRef}
                            placeholder="🔍 Enter Product name / SKU / Scan bar code"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleBarcodeInput(barcodeInput);
                              }
                            }}
                            className="h-14 text-lg border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl pl-4 pr-16 bg-white shadow-inner"
                            autoComplete="off"
                          />
                          {barcodeInput && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBarcodeInput("")}
                              className="absolute right-16 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full text-gray-400 hover:text-gray-600"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBarcodeInput(barcodeInput)}
                          disabled={!barcodeInput}
                          className="w-14 h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white ml-3 shadow-md disabled:bg-gray-300"
                        >
                          <PlusIcon className="h-6 w-6" />
                        </Button>
                      </div>
                      
                      {/* Quick Action Buttons */}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs">
                              F1: Focus Search
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Enter: Add Product
                            </Badge>
                          </div>
                          <div className="text-gray-500">
                            Last Update: {lastUpdateTime.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Live Search Results */}
                    {barcodeInput && barcodeInput.length > 1 && (
                      <div className="bg-white rounded-xl border-2 border-blue-200 shadow-xl max-h-96 overflow-hidden">
                        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-lg">🔍 Search Results</h4>
                              <p className="text-blue-100 text-sm">Click any product to add to cart instantly</p>
                            </div>
                            <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">
                              {mockProductList.filter(product => 
                                product.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
                                product.code.toLowerCase().includes(barcodeInput.toLowerCase())
                              ).length} found
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto">
                          {mockProductList
                            .filter(product => 
                              product.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
                              product.code.toLowerCase().includes(barcodeInput.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((product, index) => (
                              <div
                                key={product.sno}
                                className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer border-b last:border-b-0 transition-all duration-200 hover:shadow-md"
                                onClick={() => {
                                  let actualProduct = {
                                    id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                                    name: product.name,
                                    sku: product.code,
                                    price: product.selfRate.toString(),
                                    cost: product.selfRate.toString(),
                                    stockQuantity: product.stock,
                                    description: product.name,
                                    barcode: product.code,
                                    brand: "",
                                    manufacturer: "",
                                    categoryId: 1,
                                    mrp: product.mrp.toString(),
                                    unit: "PCS",
                                    hsnCode: "",
                                    taxRate: "18",
                                    active: true,
                                    trackInventory: true,
                                    allowNegativeStock: false,
                                    alertThreshold: 10,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };

                                  setSelectedProduct(actualProduct);
                                  setRateInput(actualProduct.price);
                                  setQuantityInput(1);
                                  setBarcodeInput("");

                                  toast({
                                    title: "🎯 Product Selected!",
                                    description: `${actualProduct.name} ready to add to cart`
                                  });
                                }}
                              >
                                <div className="flex items-center flex-1">
                                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mr-4">
                                    <Package2Icon className="h-6 w-6 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-lg text-gray-900 mb-1">{product.name}</div>
                                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                        {product.code}
                                      </span>
                                      <span className="text-green-600 font-medium">
                                        {formatCurrency(product.selfRate)}
                                      </span>
                                      <span className="text-gray-500">
                                        MRP: {formatCurrency(product.mrp)}
                                      </span>
                                    </div>
                                    <div className="flex items-center mt-1 space-x-2">
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {product.category}
                                      </Badge>
                                      {product.trending && (
                                        <Badge variant="default" className="text-xs bg-orange-500 text-white">
                                          🔥 Trending
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <Badge 
                                      variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"} 
                                      className={`text-sm font-bold ${
                                        product.stock > 10 ? "bg-green-500 text-white" : 
                                        product.stock > 0 ? "bg-yellow-500 text-white" : 
                                        "bg-red-500 text-white"
                                      }`}
                                    >
                                      {product.stock > 0 ? `Stock: ${product.stock}` : "Out of Stock"}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 p-0 shadow-md"
                                  >
                                    <PlusIcon className="h-5 w-5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          
                          {mockProductList.filter(product => 
                            product.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
                            product.code.toLowerCase().includes(barcodeInput.toLowerCase())
                          ).length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                              <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4">
                                <SearchIcon className="h-10 w-10 text-gray-300" />
                              </div>
                              <div className="text-xl font-medium mb-2 text-gray-700">No products found</div>
                              <div className="text-sm text-gray-500">
                                Try searching with a different product name or SKU
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBarcodeInput("")}
                                className="mt-4 border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                Clear Search
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Selected Product Display */}
                    {selectedProduct && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-lg">
                        <div className="flex items-center space-x-4 mb-4">
                          <CheckCircleIcon className="h-8 w-8 text-green-600" />
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-green-900">{selectedProduct.name}</h3>
                            <p className="text-green-700 font-medium">
                              SKU: {selectedProduct.sku} • Available Stock: {selectedProduct.stockQuantity}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-400">
                            Ready to Add
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-bold text-green-800">Quantity</Label>
                            <Input
                              type="number"
                              value={quantityInput}
                              onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                              className="h-12 text-center text-xl font-bold border-green-400 focus:border-green-600"
                              min="1"
                              placeholder="Qty"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-bold text-green-800">Rate (₹)</Label>
                            <Input
                              type="number"
                              value={rateInput}
                              onChange={(e) => setRateInput(e.target.value)}
                              className="h-12 text-right text-xl font-bold border-green-400 focus:border-green-600"
                              placeholder="Rate"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-bold text-green-800">Total Amount</Label>
                            <div className="h-12 px-4 border-2 rounded border-green-400 bg-green-100 flex items-center justify-end text-xl font-bold text-green-800">
                              {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                            </div>
                          </div>
                        </div>

                        <Button onClick={addToCart} className="w-full mt-4 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold shadow-lg">
                          <PlusIcon className="h-6 w-6 mr-2" />
                          Add to Cart (Press Enter)
                        </Button>
                      </div>
                    )}

                    {/* Auto Suggestions */}
                    {showAutoSuggestions && autoSuggestions.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-purple-800 flex items-center">
                            🤖 Smart Suggestions
                            <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700">
                              AI Powered
                            </Badge>
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAutoSuggestions(false)}
                            className="text-purple-600 hover:bg-purple-100"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-purple-600 text-sm mb-3">
                          Based on your current cart, customers often buy these items together:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {autoSuggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.sno}
                              className="bg-white border-2 border-purple-200 rounded-lg p-3 hover:shadow-md cursor-pointer transition-all hover:border-purple-400 hover:scale-105"
                              onClick={() => addSuggestedProductToCart(suggestion)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                  {suggestion.category}
                                </Badge>
                                {suggestion.trending && (
                                  <Badge variant="default" className="text-xs bg-orange-500">
                                    HOT
                                  </Badge>
                                )}
                              </div>
                              <h5 className="font-bold text-gray-900 mb-1 text-sm">{suggestion.name}</h5>
                              <div className="flex justify-between items-center">
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(suggestion.selfRate)}
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                  <ZapIcon className="h-3 w-3 mr-1" />
                                  Smart Qty: {getSmartQuantity(suggestion)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAutoSuggestions(cart)}
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <RefreshCwIcon className="h-4 w-4 mr-1" />
                            Refresh Suggestions
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'search' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder="🔍 Search products by name, category, or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 pl-10 text-lg border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    {searchTerm && allProducts && (
                      <div className="max-h-64 overflow-y-auto border-2 rounded-lg border-gray-200">
                        {allProducts
                          .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .slice(0, 15)
                          .map(product => (
                            <div
                              key={product.id}
                              className="p-4 border-b hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-all"
                              onClick={() => {
                                setSelectedProduct(product);
                                setRateInput(product.price);
                                setQuantityInput(1);
                                setActiveTab('scan');
                              }}
                            >
                              <div>
                                <div className="font-bold text-lg">{product.name}</div>
                                <div className="text-sm text-gray-600">{product.sku} • Stock: {product.stockQuantity}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-xl text-blue-600">{formatCurrency(parseFloat(product.price))}</div>
                                <Badge variant="outline" className={product.stockQuantity > 10 ? "border-green-400 text-green-700" : "border-red-400 text-red-700"}>
                                  {product.stockQuantity > 10 ? "In Stock" : "Low Stock"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'browse' && (
                  <div className="space-y-4">
                    {/* Active Items Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-blue-800 flex items-center">
                          <Package2Icon className="h-6 w-6 mr-2" />
                          Product Catalog - Real-time Inventory
                        </h3>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                          Last updated: {lastUpdateTime.toLocaleTimeString()}
                        </Badge>
                      </div>
                      <p className="text-blue-600 text-sm">
                        Click any product to add to cart instantly. {mockProductList.length} products available.
                      </p>
                    </div>

                    {/* Active Items Grid by Category */}
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {/* Dry Fruits Category */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center">
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs mr-2">Dry Fruits</span>
                            Category Products
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {mockProductList.filter(p => p.category === "Dry Fruits").length} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {mockProductList
                            .filter(product => product.category === "Dry Fruits")
                            .slice(0, 4)
                            .map((product) => (
                              <div
                                key={product.sno}
                                className="border-2 rounded-lg p-3 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-br from-white to-orange-50 hover:scale-105"
                                onClick={() => {
                                  let actualProduct = {
                                    id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                                    name: product.name,
                                    sku: product.code,
                                    price: product.selfRate.toString(),
                                    cost: product.selfRate.toString(),
                                    stockQuantity: product.stock,
                                    description: product.name,
                                    barcode: product.code,
                                    brand: "",
                                    manufacturer: "",
                                    categoryId: 1,
                                    mrp: product.mrp.toString(),
                                    unit: "PCS",
                                    hsnCode: "",
                                    taxRate: "18",
                                    active: true,
                                    trackInventory: true,
                                    allowNegativeStock: false,
                                    alertThreshold: 10,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };

                                  setSelectedProduct(actualProduct);
                                  setRateInput(actualProduct.price);
                                  setQuantityInput(1);
                                  setActiveTab('scan');

                                  toast({
                                    title: "🎯 Product Selected!",
                                    description: `${actualProduct.name} ready to add`
                                  });
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                      Dry Fruits
                                    </Badge>
                                    {product.trending && (
                                      <Badge variant="default" className="text-xs bg-red-500 text-white">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={product.stock > 20 ? "default" : product.stock > 10 ? "secondary" : "destructive"} 
                                    className={`text-xs font-bold ${
                                      product.stock > 20 ? "bg-blue-500 text-white" : 
                                      product.stock > 10 ? "bg-yellow-500 text-white" : 
                                      "bg-red-500 text-white"
                                    }`}
                                  >
                                    Stock: {product.stock}
                                  </Badge>
                                </div>
                                <h5 className="font-bold text-gray-900 mb-1 text-sm leading-tight">{product.name}</h5>
                                <p className="text-xs text-gray-600 mb-2">Code: {product.code}</p>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                                    <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                                  </div>
                                  <PlusIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Grains Category */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-2">Grains</span>
                            Category Products
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {mockProductList.filter(p => p.category === "Grains").length} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {mockProductList
                            .filter(product => product.category === "Grains")
                            .slice(0, 4)
                            .map((product) => (
                              <div
                                key={product.sno}
                                className="border-2 rounded-lg p-3 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-br from-white to-blue-50 hover:scale-105"
                                onClick={() => {
                                  let actualProduct = {
                                    id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                                    name: product.name,
                                    sku: product.code,
                                    price: product.selfRate.toString(),
                                    cost: product.selfRate.toString(),
                                    stockQuantity: product.stock,
                                    description: product.name,
                                    barcode: product.code,
                                    brand: "",
                                    manufacturer: "",
                                    categoryId: 1,
                                    mrp: product.mrp.toString(),
                                    unit: "PCS",
                                    hsnCode: "",
                                    taxRate: "18",
                                    active: true,
                                    trackInventory: true,
                                    allowNegativeStock: false,
                                    alertThreshold: 10,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };

                                  setSelectedProduct(actualProduct);
                                  setRateInput(actualProduct.price);
                                  setQuantityInput(1);
                                  setActiveTab('scan');

                                  toast({
                                    title: "🎯 Product Selected!",
                                    description: `${actualProduct.name} ready to add`
                                  });
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                      Grains
                                    </Badge>
                                    {product.trending && (
                                      <Badge variant="default" className="text-xs bg-red-500 text-white">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={product.stock > 30 ? "default" : product.stock > 15 ? "secondary" : "destructive"} 
                                    className={`text-xs font-bold ${
                                      product.stock > 30 ? "bg-blue-500 text-white" : 
                                      product.stock > 15 ? "bg-yellow-500 text-white" : 
                                      "bg-red-500 text-white"
                                    }`}
                                  >
                                    Stock: {product.stock}
                                  </Badge>
                                </div>
                                <h5 className="font-bold text-gray-900 mb-1 text-sm leading-tight">{product.name}</h5>
                                <p className="text-xs text-gray-600 mb-2">Code: {product.code}</p>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                                    <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                                  </div>
                                  <PlusIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Spices Category */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs mr-2">Spices</span>
                            Category Products
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {mockProductList.filter(p => p.category === "Spices").length} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {mockProductList
                            .filter(product => product.category === "Spices")
                            .slice(0, 4)
                            .map((product) => (
                              <div
                                key={product.sno}
                                className="border-2 rounded-lg p-3 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-br from-white to-purple-50 hover:scale-105"
                                onClick={() => {
                                  let actualProduct = {
                                    id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                                    name: product.name,
                                    sku: product.code,
                                    price: product.selfRate.toString(),
                                    cost: product.selfRate.toString(),
                                    stockQuantity: product.stock,
                                    description: product.name,
                                    barcode: product.code,
                                    brand: "",
                                    manufacturer: "",
                                    categoryId: 1,
                                    mrp: product.mrp.toString(),
                                    unit: "PCS",
                                    hsnCode: "",
                                    taxRate: "18",
                                    active: true,
                                    trackInventory: true,
                                    allowNegativeStock: false,
                                    alertThreshold: 10,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };

                                  setSelectedProduct(actualProduct);
                                  setRateInput(actualProduct.price);
                                  setQuantityInput(1);
                                  setActiveTab('scan');

                                  toast({
                                    title: "🎯 Product Selected!",
                                    description: `${actualProduct.name} ready to add`                                  });
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                      Spices
                                    </Badge>
                                    {product.trending && (
                                      <Badge variant="default" className="text-xs bg-red-500 text-white">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={product.stock > 20 ? "default" : product.stock > 10 ? "secondary" : "destructive"} 
                                    className={`text-xs font-bold ${
                                      product.stock > 20 ? "bg-blue-500 text-white" : 
                                      product.stock > 10 ? "bg-yellow-500 text-white" : 
                                      "bg-red-500 text-white"
                                    }`}
                                  >
                                    Stock: {product.stock}
                                  </Badge>
                                </div>
                                <h5 className="font-bold text-gray-900 mb-1 text-sm leading-tight">{product.name}</h5>
                                <p className="text-xs text-gray-600 mb-2">Code: {product.code}</p>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                                    <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                                  </div>
                                  <PlusIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Other Categories */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs mr-2">Other</span>
                            All Categories
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {mockProductList.filter(p => !["Dry Fruits", "Grains", "Spices"].includes(p.category || "")).length} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {mockProductList
                            .filter(product => !["Dry Fruits", "Grains", "Spices"].includes(product.category || ""))
                            .slice(0, 6)
                            .map((product) => (
                              <div
                                key={product.sno}
                                className="border-2 rounded-lg p-3 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-br from-white to-green-50 hover:scale-105"
                                onClick={() => {
                                  let actualProduct = {
                                    id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                                    name: product.name,
                                    sku: product.code,
                                    price: product.selfRate.toString(),
                                    cost: product.selfRate.toString(),
                                    stockQuantity: product.stock,
                                    description: product.name,
                                    barcode: product.code,
                                    brand: "",
                                    manufacturer: "",
                                    categoryId: 1,
                                    mrp: product.mrp.toString(),
                                    unit: "PCS",
                                    hsnCode: "",
                                    taxRate: "18",
                                    active: true,
                                    trackInventory: true,
                                    allowNegativeStock: false,
                                    alertThreshold: 10,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                  };

                                  setSelectedProduct(actualProduct);
                                  setRateInput(actualProduct.price);
                                  setQuantityInput(1);
                                  setActiveTab('scan');

                                  toast({
                                    title: "🎯 Product Selected!",
                                    description: `${actualProduct.name} ready to add`
                                  });
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                      {product.category || "General"}
                                    </Badge>
                                    {product.trending && (
                                      <Badge variant="default" className="text-xs bg-red-500 text-white">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={product.stock > 20 ? "default" : product.stock > 10 ? "secondary" : "destructive"} 
                                    className={`text-xs font-bold ${
                                      product.stock > 20 ? "bg-blue-500 text-white" : 
                                      product.stock > 10 ? "bg-yellow-500 text-white" : 
                                      "bg-red-500 text-white"
                                    }`}
                                  >
                                    Stock: {product.stock}
                                  </Badge>
                                </div>
                                <h5 className="font-bold text-gray-900 mb-1 text-sm leading-tight">{product.name}</h5>
                                <p className="text-xs text-gray-600 mb-2">Code: {product.code}</p>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                                    <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                                  </div>
                                  <PlusIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* View All Products Button */}
                    <Button
                      onClick={() => setShowProductList(true)}
                      className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                      variant="default"
                    >
                      <Package2Icon className="h-5 w-5 mr-2" />
                      View Complete Product Catalog ({mockProductList.length} items)
                    </Button>
                  </div>
                )}

                {activeTab === 'trending' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">🔥 Trending Products</h3>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        {trendingProducts.length} Hot Items
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {trendingProducts.map(product => (
                        <div
                          key={product.sno}
                          className="border-2 rounded-lg p-3 hover:shadow-md cursor-pointer transition-all hover:border-orange-400 bg-gradient-to-br from-white to-orange-50"
                          onClick={() => {
                            let actualProduct = {
                              id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                              name: product.name,
                              sku: product.code,
                              price: product.selfRate.toString(),
                              cost: product.selfRate.toString(),
                              stockQuantity: product.stock,
                              description: product.name,
                              barcode: product.code,
                              brand: "",
                              manufacturer: "",
                              categoryId: 1,
                              mrp: product.mrp.toString(),
                              unit: "PCS",
                              hsnCode: "",
                              taxRate: "18",
                              active: true,
                              trackInventory: true,
                              allowNegativeStock: false,
                              alertThreshold: 10,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            };

                            setSelectedProduct(actualProduct);
                            setRateInput(actualProduct.price);
                            setQuantityInput(1);
                            setActiveTab('scan');
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="default" className="bg-orange-500 text-white text-xs">
                              🔥 TRENDING
                            </Badge>
                            <Badge variant={product.stock > 10 ? "default" : "destructive"} className="text-xs">
                              {product.stock}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 mb-1">{product.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{product.category} • {product.code}</p>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                              <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                            </div>
                            <PlusIcon className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Cart Section */}
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <ShoppingCartIcon className="h-6 w-6 mr-2" />
                  Shopping Cart ({cart.length} items • {totalItems} qty)
                </h2>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSale}
                    className="text-white hover:bg-blue-700 border border-white/30"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Clear All (F11)
                  </Button>
                )}
              </div>
            </div>

            {/* Enhanced Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ShoppingCartIcon className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                    <div className="text-2xl font-medium mb-2">Cart is empty</div>
                    <div className="text-sm mb-4">Scan a product or browse catalog to start billing</div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>🔑 Press F1 to focus scanner</div>
                      <div>📦 Press F2 to browse products</div>
                      <div>🔥 Press F3 for trending items</div>
                      <div>💳 Press F10 to checkout</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {cart.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="bg-gradient-to-r from-white to-blue-50 border-2 rounded-lg p-4 shadow-sm hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 animate-in slide-in-from-right-5 duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md hover:shadow-lg transition-shadow duration-300">
                            #{index + 1}
                          </span>
                          <div className="group">
                            <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{item.name}</h4>
                            <p className="text-sm text-gray-600">{item.sku} • Available: {item.stock || item.stockQuantity}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 transform hover:scale-110 transition-all duration-300 hover:shadow-md"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-3 items-center">
                        <div className="text-center group">
                          <Label className="text-xs text-gray-600 font-medium">Quantity</Label>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transform hover:scale-110 transition-all duration-300"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-blue-600 min-w-[40px] text-center text-lg group-hover:scale-110 transition-transform duration-300 bg-blue-50 px-2 py-1 rounded">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transform hover:scale-110 transition-all duration-300"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-center group">
                          <Label className="text-xs text-gray-600 font-medium">Rate</Label>
                          <div className="font-mono text-sm font-bold mt-1 group-hover:text-blue-600 transition-colors duration-300 bg-gray-50 px-2 py-1 rounded">{formatCurrency(parseFloat(item.price))}</div>
                        </div>
                        <div className="text-center group">
                          <Label className="text-xs text-gray-600 font-medium">M.R.P</Label>
                          <div className="text-xs text-gray-500 mt-1 group-hover:text-gray-700 transition-colors duration-300">{formatCurrency(item.mrp || parseFloat(item.price))}</div>
                        </div>
                        <div className="text-right group">
                          <Label className="text-xs text-gray-600 font-medium">Amount</Label>
                          <div className="font-bold text-green-600 text-xl mt-1 group-hover:scale-110 transition-transform duration-300 bg-green-50 px-2 py-1 rounded">{formatCurrency(item.total)}</div>
                        </div>
                      </div>

                      {/* Dynamic Progress Bar */}
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((item.quantity / (item.stock || 10)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Quick Actions */}
            <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="grid grid-cols-4 gap-2 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-blue-300 hover:bg-blue-50"
                  onClick={() => {
                    if (cart.length > 0) {
                      const holdSale: HoldSale = {
                        id: Date.now().toString(),
                        cart: [...cart],
                        customer: selectedCustomer,
                        timestamp: new Date(),
                        subtotal
                      };
                      setHoldSales(prev => [holdSale, ...prev]);
                      clearSale();
                      toast({ title: "⏸️ Sale Held", description: "Current sale has been held" });
                    }
                  }}
                  title="Alt+H"
                >
                  <SaveIcon className="h-4 w-4 mr-1" />
                  Hold (Alt+H)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-green-300 hover:bg-green-50"
                  onClick={() => setShowHoldSales(true)}
                  title="Alt+R"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-1" />
                  Recall (Alt+R)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-purple-300 hover:bg-purple-50"
                  onClick={() => {
                    setDiscount(discount === 0 ? 10 : 0);
                    toast({ title: "💰 Discount", description: `Discount ${discount === 0 ? 'applied (10%)' : 'removed'}` });
                  }}
                  title="Ctrl+D"
                >
                  <PercentIcon className="h-4 w-4 mr-1" />
                  Discount (Ctrl+D)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-orange-300 hover:bg-orange-50"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  title="F9"
                >
                  <HelpCircleIcon className="h-4 w-4 mr-1" />
                  Help (F9)
                </Button>
              </div>

              {/* Auto Cart Features */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-cyan-300 hover:bg-cyan-50"
                  onClick={() => autoSaveCart()}
                  disabled={cart.length === 0}
                  title="Ctrl+S"
                >
                  <SaveIcon className="h-4 w-4 mr-1" />
                  Auto-Save
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-indigo-300 hover:bg-indigo-50"
                  onClick={() => {
                    if (cartHistory.length > 0) {
                      loadAutoSavedCart(cartHistory[0]);
                    }
                  }}
                  disabled={cartHistory.length === 0}
                  title="Ctrl+R"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-1" />
                  Auto-Recall
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-pink-300 hover:bg-pink-50"
                  onClick={() => generateAutoSuggestions(cart)}
                  disabled={cart.length === 0}
                >
                  <ZapIcon className="h-4 w-4 mr-1" />
                  AI Suggest
                </Button>
              </div>

              {/* Auto Status */}
              {(lastAutoSave || cartHistory.length > 0) && (
                <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded p-2">
                  <div className="flex justify-between items-center">
                    {lastAutoSave && (
                      <span className="flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1 text-green-600" />
                        Last saved: {lastAutoSave.toLocaleTimeString()}
                      </span>
                    )}
                    {cartHistory.length > 0 && (
                      <span className="flex items-center">
                        <Package2Icon className="h-3 w-3 mr-1 text-blue-600" />
                        {cartHistory.length} saved carts
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Dynamic Right Panel - Billing Summary */}
          <div className="w-96 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white flex flex-col shadow-2xl relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
              <div className="absolute bottom-20 right-10 w-16 h-16 bg-yellow-300 rounded-full animate-bounce"></div>
              <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-green-300 rounded-full animate-ping"></div>
            </div>

            {/* Enhanced Dynamic Bill Summary Header */}
            <div className="p-5 border-b border-blue-500 relative z-10">
              <div className="text-center">
                <div className="text-2xl font-bold animate-pulse">💰 Bill Summary</div>
                <div className="text-lg opacity-90 hover:opacity-100 transition-opacity duration-300 cursor-pointer transform hover:scale-105">
                  #{billNumber}
                </div>
                <div className="text-sm opacity-75 mt-1 bg-white/10 backdrop-blur rounded-full px-3 py-1 inline-block">
                  {billDate} • {currentTime.toLocaleTimeString()}
                </div>
                {cart.length > 0 && (
                  <div className="mt-2 animate-in slide-in-from-bottom-2 duration-500">
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                      {cart.length} items in cart
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Dynamic Bill Details */}
            <div className="flex-1 p-4 space-y-4 text-sm overflow-y-auto relative z-10">
              <div className="bg-white/15 backdrop-blur rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-in slide-in-from-left-5 duration-700">
                <h3 className="font-bold mb-3 text-lg flex items-center">
                  📊 Basic Details
                  <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Items Count</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-blue-500/30 px-2 py-1 rounded">{cart.length}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Total Quantity</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-purple-500/30 px-2 py-1 rounded">{totalItems}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Gross Amount</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-green-500/30 px-2 py-1 rounded">{formatCurrency(subtotal)}</span>
                  </div>
                </div>
                {/* Progress indicator */}
                <div className="mt-3 w-full bg-white/20 rounded-full h-1">
                  <div className="bg-gradient-to-r from-green-400 to-blue-400 h-1 rounded-full transition-all duration-1000" style={{ width: `${Math.min((cart.length / 10) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-in slide-in-from-left-5 duration-700" style={{ animationDelay: '200ms' }}>
                <h3 className="font-bold mb-3 text-lg flex items-center">
                  💸 Discounts & Charges
                  <div className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Cash Discount ({discount}%)</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-red-500/30 px-2 py-1 rounded">{formatCurrency(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Taxable Amount</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-blue-500/30 px-2 py-1 rounded">{formatCurrency(taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>GST ({taxRate}%)</span>
                    <span className="font-mono font-bold group-hover:scale-110 transition-transform duration-300 bg-purple-500/30 px-2 py-1 rounded">{formatCurrency(taxAmount)}</span>
                  </div>
                </div>
                {/* Tax visualization */}
                <div className="mt-3 w-full bg-white/20 rounded-full h-1">
                  <div className="bg-gradient-to-r from-yellow-400 to-red-400 h-1 rounded-full transition-all duration-1000" style={{ width: `${(taxAmount / grandTotal) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-in slide-in-from-left-5 duration-700" style={{ animationDelay: '400ms' }}>
                <h3 className="font-bold mb-3 text-lg flex items-center">
                  ➕ Additional Info
                  <div className="ml-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Customer</span>
                    <span className="font-mono group-hover:text-cyan-300 transition-colors duration-300">{customerDetails.name}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Sales Person</span>
                    <span className="font-mono group-hover:text-green-300 transition-colors duration-300">{salesMan}</span>
                  </div>
                  <div className="flex justify-between group hover:bg-white/10 p-2 rounded transition-all duration-300">
                    <span>Payment Method</span>
                    <span className="font-mono capitalize group-hover:text-yellow-300 transition-colors duration-300">{paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Activity Indicator */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur rounded-xl p-3 border border-white/20 animate-in fade-in duration-1000">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">Transaction in progress...</span>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Dynamic Net Amount Display */}
            <div className="p-5 border-t border-blue-500 relative z-10">
              <div className="text-center mb-4 group">
                <div className="text-sm opacity-90 group-hover:opacity-100 transition-opacity duration-300">💰 Net Amount Payable</div>
                <div className="relative">
                  <div className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 bg-clip-text text-transparent hover:scale-110 transition-transform duration-500 cursor-pointer animate-pulse">
                    {formatCurrency(grandTotal)}
                  </div>
                  {grandTotal > 0 && (
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-300/20 to-orange-300/20 rounded-lg blur-lg animate-pulse"></div>
                  )}
                </div>
                {grandTotal > 0 && (
                  <div className="mt-2 flex justify-center">
                    <div className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs animate-bounce">
                      Total: {totalItems} items
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Quick Actions */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSale}
                    disabled={cart.length === 0}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Clear (F11)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCustomerDialog(true)}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <UsersIcon className="h-4 w-4 mr-1" />
                    Customer (F12)
                  </Button>
                </div>

                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                  className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-xl font-bold shadow-xl border-2 border-green-400"
                >
                  <CreditCard className="h-6 w-6 mr-3" />
                  💳 Complete Payment (F10)
                </Button>

                {/* Enhanced Print Last Receipt */}
                {cart.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const sampleReceiptData = {
                        billNumber,
                        billDate,
                        customerDetails,
                        salesMan,
                        items: [],
                        subtotal: 0,
                        discount: 0,
                        discountType: 'percentage' as const,
                        taxRate: 18,
                        taxAmount: 0,
                        grandTotal: 0,
                        amountPaid: 0,
                        changeDue: 0,
                        paymentMethod: "cash",
                        notes: "Sample receipt for testing printer"
                      };
                      printReceipt(sampleReceiptData);
                    }}
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    🖨️ Test Print Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-900 text-white text-xs p-2 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="text-green-400 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              System Ready
            </span>
            <span>👤 User: Admin</span>
            <span>🖥️ Terminal: POS-PRO-01</span>
            <span>📦 Products: {mockProductList.length}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>🔥 Trending: {trendingProducts.length}</span>
            <span>👥 Customers: {customerDatabase.length}</span>
            <span className="font-mono bg-blue-900 px-2 py-1 rounded">⏰ {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Enhanced Product List Dialog */}
        <Dialog open={showProductList} onOpenChange={setShowProductList}>
          <DialogContent className="max-w-7xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl">🛍️ Product Catalog - Real-time Inventory</DialogTitle>
              <DialogDescription className="text-lg">
                Click any product to add to cart instantly. {mockProductList.length} products available. 
                <Badge variant="outline" className="ml-2">Last updated: {lastUpdateTime.toLocaleTimeString()}</Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mockProductList.map((product) => (
                  <div
                    key={product.sno}
                    className="border-2 rounded-xl p-4 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-br from-white to-blue-50 hover:scale-105"
                    onClick={() => {
                      let actualProduct = {
                        id: parseInt(product.code) || Math.floor(Math.random() * 10000),
                        name: product.name,
                        sku: product.code,
                        price: product.selfRate.toString(),
                        cost: product.selfRate.toString(),
                        stockQuantity: product.stock,
                        description: product.name,
                        barcode: product.code,
                        brand: "",
                        manufacturer: "",
                        categoryId: 1,
                        mrp: product.mrp.toString(),
                        unit: "PCS",
                        hsnCode: "",
                        taxRate: "18",
                        active: true,
                        trackInventory: true,
                        allowNegativeStock: false,
                        alertThreshold: 10,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };

                      const existingItem = cart.find(item => item.id === actualProduct.id);
                      if (existingItem) {
                        updateQuantity(actualProduct.id, existingItem.quantity + 1);
                      } else {
                        const newItem: CartItem = {
                          ...actualProduct,
                          quantity: 1,
                          total: parseFloat(actualProduct.price),
                          mrp: parseFloat(actualProduct.mrp || actualProduct.price),
                          stock: actualProduct.stockQuantity
                        };
                        setCart(prev => [...prev, newItem]);
                      }

                      setShowProductList(false);

                      toast({
                        title: "✅ Added to Cart!",
                        description: `${actualProduct.name} x 1 - ${formatCurrency(parseFloat(actualProduct.price))}`
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {product.category}
                        </Badge>
                        {product.trending && (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            🔥 HOT
                          </Badge>
                        )}
                      </div>
                      <Badge variant={product.stock > 10 ? "default" : "destructive"} className="text-xs font-bold">
                        Stock: {product.stock}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2 text-sm leading-tight">{product.name}</h4>
                    <p className="text-xs text-gray-600 mb-3">Code: {product.code}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xl font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                        <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                      </div>
                      <Button size="sm" variant="outline" className="border-blue-300 hover:bg-blue-50">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">💳 Complete Payment</DialogTitle>
              <DialogDescription className="text-lg">
                Finalize the transaction for Bill #{billNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl text-center">
                <div className="text-4xl font-bold text-blue-800 mb-2">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-sm text-gray-600">Total Amount Due</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalItems} items • {cart.length} products
                </div>
              </div>

              <div>
                <Label className="text-lg font-medium">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash Payment</SelectItem>
                    <SelectItem value="card">💳 Card Payment</SelectItem>
                    <SelectItem value="upi">📱 UPI Payment</SelectItem>
                    <SelectItem value="credit">🏷️ Credit Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-lg font-medium">Amount Received (₹)</Label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter received amount..."
                  className="text-right font-mono text-xl h-12"
                  step="0.01"
                />
              </div>

              {changeDue > 0 && (
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
                  <div className="text-2xl font-bold text-green-800 text-center">
                    💰 Change Due: {formatCurrency(changeDue)}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-lg font-medium">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special notes for this sale..."
                  className="h-20"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const receiptData = {
                    billNumber,
                    billDate,
                    customerDetails,
                    salesMan,
                    items: cart,
                    subtotal,
                    discount,
                    discountType,
                    taxRate,
                    taxAmount,
                    grandTotal,
                    amountPaid: parseFloat(amountPaid) || 0,
                    changeDue,
                    paymentMethod,
                    notes
                  };
                  printReceipt(receiptData);
                }}
                disabled={cart.length === 0}
                className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Preview Receipt
              </Button>

              <Button
                onClick={processSale}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Complete & Print
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Keyboard Shortcuts Dialog */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">⌨️ Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Master these shortcuts to boost your efficiency
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{shortcut.action}</span>
                  <Badge variant="outline" className="font-mono font-bold">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Hold Sales Dialog */}
        <Dialog open={showHoldSales} onOpenChange={setShowHoldSales}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl">⏸️ Held Sales</DialogTitle>
              <DialogDescription>
                Recall previously held sales. Press Alt+R to access quickly.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-96">
              {holdSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PauseIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-xl font-medium mb-2">No held sales</div>
                  <div className="text-sm">Use Alt+H to hold current sale</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {holdSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="border-2 rounded-lg p-4 hover:shadow-lg cursor-pointer transition-all hover:border-blue-400 bg-gradient-to-r from-white to-blue-50"
                      onClick={() => {
                        setCart(sale.cart);
                        setSelectedCustomer(sale.customer);
                        setHoldSales(prev => prev.filter(s => s.id !== sale.id));
                        setShowHoldSales(false);
                        toast({
                          title: "📋 Sale Recalled",
                          description: `Sale from ${sale.timestamp.toLocaleTimeString()} restored`
                        });
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg">Sale #{sale.id}</div>
                          <div className="text-sm text-gray-600">
                            {sale.timestamp.toLocaleDateString()} • {sale.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Customer: {sale.customer?.name || "Walk-in Customer"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(sale.subtotal)}</div>
                          <div className="text-sm text-gray-600">{sale.cart.length} items</div>
                        </div>
                      </div>
                      <div className="border-t pt-2">
                        <div className="text-xs text-gray-500 space-y-1">
                          {sale.cart.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{item.quantity} × {formatCurrency(parseFloat(item.price))}</span>
                            </div>
                          ))}
                          {sale.cart.length > 3 && (
                            <div className="text-center">... and {sale.cart.length - 3} more items</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoldSales(prev => prev.filter(s => s.id !== sale.id));
                            toast({
                              title: "🗑️ Sale Deleted",
                              description: "Held sale has been removed"
                            });
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Recall Sale
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced New Customer Dialog */}
        <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">👤 Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile for better service
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Customer Name *</Label>
                <Input
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                  placeholder="Enter customer name..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Phone Number</Label>
                <Input
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                  placeholder="Enter phone number..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Address</Label>
                <Input
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({...newCustomerData, address: e.target.value})}
                  placeholder="Enter address..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Email</Label>
                <Input
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                  placeholder="Enter email address..."
                  className="h-10"
                  type="email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addNewCustomer} className="bg-purple-600 hover:bg-purple-700">
                <UsersIcon className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}