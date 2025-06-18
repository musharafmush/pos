import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { printReceipt as printReceiptUtil } from "@/components/pos/print-receipt";
import {
  Search,
  ShoppingCart,
  Scan,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  User,
  Phone,
  Calendar,
  Clock,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Receipt,
  UserPlus,
  Calculator,
  RotateCcw,
  Archive,
  Monitor,
  Zap,
  Package,
  CheckCircle,
  AlertCircle,
  Info,
  Banknote,
  DollarSign,
  Smartphone,
  Save,
  List,
  FileText,
  Download,
  Settings,
  Printer
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  mrp: number;
  stockQuantity: number;
  barcode?: string;
  category?: {
    name: string;
  };
  weightUnit?: string;
  weight?: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

export default function POSEnhanced() {
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [showOceanDialog, setShowOceanDialog] = useState(false);
  const [oceanFreight, setOceanFreight] = useState({
    containerNumber: "",
    vesselName: "",
    portOfLoading: "",
    portOfDischarge: "",
    freightCost: "",
    insuranceCost: "",
    customsDuty: "",
    handlingCharges: "",
    totalOceanCost: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [billNumber, setBillNumber] = useState(`POS${Date.now()}`);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCashRegister, setShowCashRegister] = useState(false);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showHoldSales, setShowHoldSales] = useState(false);
  const [holdSales, setHoldSales] = useState<Array<{
    id: string;
    cart: CartItem[];
    customer: Customer | null;
    discount: number;
    notes: string;
    timestamp: Date;
    total: number;
  }>>([]);

  // Printer settings state
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState({
    businessName: "LARAVEL POS SYSTEM",
    address: "1234 Main Street\nCity, State 12345",
    phone: "(123) 456-7890",
    taxId: "",
    receiptFooter: "Thank you for shopping with us!",
    showLogo: false,
    printAutomatically: true,
    defaultPrinter: "default"
  });

  // Cash register state
  const [registerOpened, setRegisterOpened] = useState(false);
  const [activeRegisterId, setActiveRegisterId] = useState<number | null>(null);
  const [openingCash, setOpeningCash] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [upiReceived, setUpiReceived] = useState(0);
  const [cardReceived, setCardReceived] = useState(0);
  const [bankReceived, setBankReceived] = useState(0);
  const [chequeReceived, setChequeReceived] = useState(0);
  const [otherReceived, setOtherReceived] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalRefunds, setTotalRefunds] = useState(0);

  // Form state
  const [cashOperation, setCashOperation] = useState<'add' | 'remove'>('add');
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");

  // Comprehensive form state reset
  const resetCashRegisterForm = () => {
    setCashAmount("");
    setCashReason("");
    setCashOperation('add');
  };

  // Reset all cash register states
  const resetAllCashRegisterStates = () => {
    setCashAmount("");
    setCashReason("");
    setCashOperation('add');
    setWithdrawalAmount("");
    setWithdrawalNote("");
    setShowCashRegister(false);
    setShowOpenRegister(false);
    setShowCloseRegister(false);
    setShowWithdrawal(false);
  };

  // Reset withdrawal form
  const resetWithdrawalForm = () => {
    setWithdrawalAmount("");
    setWithdrawalNote("");
  };

  // Add billDetails state
  const [billDetails, setBillDetails] = useState({
    billNumber: `POS${Date.now()}`,
    billDate: new Date().toISOString().split('T')[0],
    billTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products with error handling
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        console.log("Fetched products:", data);
        return data;
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Error",
          description: "Failed to load products. Please refresh the page.",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch active cash register status
  const { data: activeCashRegister } = useQuery({
    queryKey: ["/api/cash-register/active"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/cash-register/active");
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching active cash register:", error);
        return null;
      }
    },
  });

  // Update register state when active register is loaded
  useEffect(() => {
    if (activeCashRegister) {
      console.log('Loading active cash register:', activeCashRegister);
      setRegisterOpened(true);
      setActiveRegisterId(activeCashRegister.id);
      
      // Handle both camelCase and snake_case properties for compatibility
      const openingCash = parseFloat(activeCashRegister.openingCash || activeCashRegister.opening_cash || '0');
      const currentCash = parseFloat(activeCashRegister.currentCash || activeCashRegister.current_cash || '0');
      const cashReceived = parseFloat(activeCashRegister.cashReceived || activeCashRegister.cash_received || '0');
      const upiReceived = parseFloat(activeCashRegister.upiReceived || activeCashRegister.upi_received || '0');
      const cardReceived = parseFloat(activeCashRegister.cardReceived || activeCashRegister.card_received || '0');
      const bankReceived = parseFloat(activeCashRegister.bankReceived || activeCashRegister.bank_received || '0');
      const chequeReceived = parseFloat(activeCashRegister.chequeReceived || activeCashRegister.cheque_received || '0');
      const otherReceived = parseFloat(activeCashRegister.otherReceived || activeCashRegister.other_received || '0');
      const totalWithdrawals = parseFloat(activeCashRegister.totalWithdrawals || activeCashRegister.total_withdrawals || '0');
      const totalRefunds = parseFloat(activeCashRegister.totalRefunds || activeCashRegister.total_refunds || '0');
      
      setOpeningCash(openingCash);
      setCashInHand(currentCash);
      setCashReceived(cashReceived);
      setUpiReceived(upiReceived);
      setCardReceived(cardReceived);
      setBankReceived(bankReceived);
      setChequeReceived(chequeReceived);
      setOtherReceived(otherReceived);
      setTotalWithdrawals(totalWithdrawals);
      setTotalRefunds(totalRefunds);
      
      console.log('Cash register values loaded:', {
        openingCash,
        currentCash,
        cashInHand: currentCash
      });
    }
  }, [activeCashRegister]);

  // Fetch customers with error handling
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) throw new Error("Failed to fetch customers");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching customers:", error);
        return [];
      }
    },
  });

  // Check if product is suitable for barcode scanning in POS
  const isProductBarcodeEnabled = (product: Product): boolean => {
    // Only allow products with valid barcodes and specific criteria
    return !!(
      product.barcode && 
      product.barcode.trim().length >= 8 && // Minimum barcode length
      product.stockQuantity > 0 && // Must have stock
      product.price && 
      parseFloat(product.price.toString()) > 0 && // Must have valid price
      product.category && // Must have category
      // Additional criteria for POS-suitable products
      (product.weightUnit === 'g' || product.weightUnit === 'kg' || !product.weightUnit) // Weight-based or unit products
    );
  };

  // Filter products based on search term or barcode
  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get only barcode-enabled products for scanner functionality
  const barcodeEnabledProducts = products.filter(isProductBarcodeEnabled);

  // Handle barcode submission with enhanced validation
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Empty Barcode",
        description: "Please enter a barcode to scan",
        variant: "destructive",
      });
      return;
    }

    // First, search only within barcode-enabled products
    const foundProduct = barcodeEnabledProducts.find((product: Product) => 
      product.barcode && product.barcode.toLowerCase() === barcodeInput.toLowerCase().trim()
    );

    if (foundProduct) {
      // Additional validation for POS-specific requirements
      if (!isProductBarcodeEnabled(foundProduct)) {
        toast({
          title: "Product Not POS-Ready",
          description: `${foundProduct.name} is not configured for barcode scanning in POS`,
          variant: "destructive",
        });
        return;
      }

      addToCart(foundProduct);
      setBarcodeInput("");
      toast({
        title: "Product Added",
        description: `${foundProduct.name} (${foundProduct.barcode}) added successfully`,
        variant: "default",
      });
    } else {
      // Check if product exists but is not barcode-enabled
      const existingProduct = products.find((product: Product) => 
        product.barcode && product.barcode.toLowerCase() === barcodeInput.toLowerCase().trim()
      );

      if (existingProduct) {
        toast({
          title: "Barcode Scanning Restricted",
          description: `${existingProduct.name} is not eligible for POS barcode scanning. Use product search instead.`,
          variant: "destructive",
        });
      } else {
        // Try SKU search only for barcode-enabled products
        const foundBySku = barcodeEnabledProducts.find((product: Product) => 
          product.sku.toLowerCase() === barcodeInput.toLowerCase().trim()
        );

        if (foundBySku) {
          addToCart(foundBySku);
          setBarcodeInput("");
          toast({
            title: "Product Added",
            description: `${foundBySku.name} added via SKU scan`,
            variant: "default",
          });
        } else {
          toast({
            title: "Barcode Not Found",
            description: `No POS-eligible product found with barcode: ${barcodeInput}. Only products with valid barcodes, stock, and pricing can be scanned.`,
            variant: "destructive",
          });
        }
      }
    }
  };

  // Cart functions
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${product.stockQuantity} units available for ${product.name}`,
          variant: "destructive",
        });
        return;
      }

      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * parseFloat(item.price) }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: 1, 
        total: parseFloat(product.price) 
      }]);
    }

    toast({
      title: "Item Added",
      description: `${product.name} added to cart successfully`,
      variant: "default",
    });

    // Clear search after adding
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find(cartItem => cartItem.id === productId);
    setCart(cart.filter(cartItem => cartItem.id !== productId));
    toast({
      title: "Item Removed",
      description: `${item?.name || 'Item'} removed from cart`,
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (product && newQuantity > product.stockQuantity) {
      toast({
        title: "Stock Limit Exceeded",
        description: `Maximum ${product.stockQuantity} units available`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * parseFloat(item.price) }
        : item
    ));
  };

  const clearCart = (clearHeldSales = false) => {
    const hadItems = cart.length > 0;
    const heldSalesCount = holdSales.length;

    // Force clear current cart state immediately
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    setPaymentMethod("cash");
    setBarcodeInput("");
    setOceanFreight({
      containerNumber: "",
      vesselName: "",
      portOfLoading: "",
      portOfDischarge: "",
      freightCost: "",
      insuranceCost: "",
      customsDuty: "",
      handlingCharges: "",
      totalOceanCost: 0
    });

    // Handle held sales based on flag
    if (clearHeldSales) {
      setHoldSales([]);
      try {
        localStorage.removeItem('heldSales');
      } catch (error) {
        console.warn("Failed to clear localStorage:", error);
      }
      toast({
        title: "🗑️ All Data Cleared",
        description: "Cart, ocean freight, and all held sales have been permanently cleared",
      });
    } else {
      if (hadItems) {
        toast({
          title: "🛒 Cart Cleared",
          description: `Current cart cleared. ${heldSalesCount} held sales safely preserved.`,
        });
      }
    }

    // Ensure state is completely reset with a small delay
    setTimeout(() => {
      if (!clearHeldSales) {
        // Double-check that held sales are still intact
        const savedHeldSales = localStorage.getItem('heldSales');
        if (savedHeldSales && holdSales.length === 0) {
          try {
            const parsedHeldSales = JSON.parse(savedHeldSales);
            if (Array.isArray(parsedHeldSales) && parsedHeldSales.length > 0) {
              setHoldSales(parsedHeldSales.map(sale => ({
                ...sale,
                timestamp: new Date(sale.timestamp)
              })));
            }
          } catch (error) {
            console.warn("Failed to restore held sales:", error);
          }
        }
      }
    }, 100);
  };

  // Calculate ocean freight total
  const calculateOceanTotal = () => {
    const freight = parseFloat(oceanFreight.freightCost) || 0;
    const insurance = parseFloat(oceanFreight.insuranceCost) || 0;
    const customs = parseFloat(oceanFreight.customsDuty) || 0;
    const handling = parseFloat(oceanFreight.handlingCharges) || 0;
    return freight + insurance + customs + handling;
  };

  // Calculate totals with ocean freight
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const oceanTotal = calculateOceanTotal();
  const total = subtotal - discountAmount + oceanTotal;

  // Register opening
  const handleOpenRegister = async () => {
    // Check if register is already open
    if (registerOpened && activeCashRegister) {
      toast({
        title: "Register Already Open",
        description: `Register ${activeCashRegister.registerId || activeCashRegister.register_id} is already open with ${formatCurrency(parseFloat(activeCashRegister.currentCash || activeCashRegister.current_cash))}`,
        variant: "default",
      });
      setShowOpenRegister(false);
      return;
    }

    const amount = parseFloat(cashAmount);

    if (!amount || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/cash-register/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openingCash: amount,
          notes: `Register opened for POS operations`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Failed to Open Register",
          description: error.error || "Could not open cash register",
          variant: "destructive",
        });
        return;
      }

      const result = await response.json();
      
      setOpeningCash(amount);
      setCashInHand(amount);
      setRegisterOpened(true);
      setActiveRegisterId(result.register.id);

      // Refresh active register data
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });

      toast({
        title: "Register Opened",
        description: `Register ${result.register.registerId || result.register.register_id} opened with ${formatCurrency(amount)}`,
      });

      // Reset form and close dialog
      resetCashRegisterForm();
      setShowOpenRegister(false);

      console.log('💰 Cash register opened and saved to database:', result);
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast({
        title: "Database Error",
        description: "Failed to save register opening to database",
        variant: "destructive",
      });
    }
  };

  // Cash operation handler
  const handleCashOperation = () => {
    const amount = parseFloat(cashAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!cashReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this cash transaction",
        variant: "destructive",
      });
      return;
    }

    const newCashAmount = cashOperation === 'add' 
      ? cashInHand + amount 
      : Math.max(0, cashInHand - amount);

    setCashInHand(newCashAmount);

    if (cashOperation === 'add') {
      setCashReceived(prev => prev + amount);
    }

    toast({
      title: "Cash Updated",
      description: `${cashOperation === 'add' ? 'Added' : 'Removed'} ${formatCurrency(amount)}. Current cash: ${formatCurrency(newCashAmount)}`,
    });

    // Reset form and close dialog
    resetCashRegisterForm();
    setShowCashRegister(false);
  };

  // Withdrawal handler
  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > cashInHand) {
      toast({
        title: "Insufficient Cash",
        description: "Cannot withdraw more than available cash",
        variant: "destructive",
      });
      return;
    }

    setCashInHand(prev => prev - amount);
    setTotalWithdrawals(prev => prev + amount);

    toast({
      title: "Withdrawal Processed",
      description: `Withdrew ${formatCurrency(amount)}. ${withdrawalNote ? `Note: ${withdrawalNote}` : ''}`,
    });

    // Reset withdrawal form and close dialog
    resetWithdrawalForm();
    setShowWithdrawal(false);
  };

  // Update payment tracking when processing sales
  const updatePaymentTracking = (method: string, amount: number) => {
    switch (method.toLowerCase()) {
      case 'cash':
        setCashReceived(prev => prev + amount);
        setCashInHand(prev => prev + amount);
        break;
      case 'upi':
        setUpiReceived(prev => prev + amount);
        setCashInHand(prev => prev + amount); // UPI can be converted to cash
        break;
      case 'card':
        setCardReceived(prev => prev + amount);
        break;
      case 'bank':
      case 'bank transfer':
        setBankReceived(prev => prev + amount);
        break;
      case 'cheque':
        setChequeReceived(prev => prev + amount);
        break;
      default:
        setOtherReceived(prev => prev + amount);
        break;
    }
  };

  // Create new customer
  const createNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCustomer(true);

    try {
      const customerData = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
      };

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) throw new Error("Failed to create customer");

      const newCustomer = await response.json();

      // Refresh customers data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      // Select the newly created customer
      setSelectedCustomer(newCustomer);

      // Reset form and close dialog
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setShowNewCustomerDialog(false);

      toast({
        title: "Customer Added",
        description: `${newCustomer.name} has been created successfully`,
      });

    } catch (error) {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    const paidAmount = parseFloat(amountPaid) || total;
    if (paidAmount < total) {
      toast({
        title: "Insufficient Payment",
        description: `Please pay at least ${formatCurrency(total)}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Validate cart items have valid stock
      for (const item of cart) {
        const product = products.find((p: Product) => p.id === item.id);
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}. Available: ${product?.stockQuantity || 0}, Required: ${item.quantity}`);
        }
      }

      const saleData = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price).toString(),
          subtotal: item.total.toString(),
          price: parseFloat(item.price).toString(),
          total: item.total.toString()
        })),
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        discountPercent: discount,
        total: total.toFixed(2),
        paymentMethod,
        amountPaid: paidAmount.toFixed(2),
        change: (paidAmount - total).toFixed(2),
        notes: `Bill: ${billNumber}`,
        billNumber: billNumber,
        status: "completed"
      };

      console.log("Processing sale with data:", saleData);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Sale API error:", errorText);

        let errorMessage = "Transaction failed";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || "Server error occurred";
        } catch (e) {
          errorMessage = errorText || "Unknown server error";
        }

        throw new Error(errorMessage);
      }

      const saleResult = await response.json();
      console.log("✅ POS Enhanced sale completed successfully:", saleResult);

      // Verify the sale was saved
      if (saleResult.saved !== false && saleResult.id) {
        console.log(`💾 Sale saved to database with ID: ${saleResult.id}`);
      }

      // Update payment tracking
      updatePaymentTracking(paymentMethod, paidAmount);

      // Record transaction to cash register if register is open
      if (registerOpened && activeRegisterId) {
        try {
          await fetch(`/api/cash-register/${activeRegisterId}/transaction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'sale',
              amount: total,
              paymentMethod: paymentMethod,
              reason: `Sale ${saleResult.orderNumber || saleResult.billNumber}`,
              notes: `${cart.length} items, Customer: ${selectedCustomer?.name || 'Walk-in'}`
            })
          });
          console.log('💰 Sale recorded to cash register');
        } catch (regError) {
          console.error('Failed to record sale to cash register:', regError);
        }
      }

      toast({
        title: "✅ Sale Completed & Saved!",
        description: `Transaction ${saleResult.orderNumber || saleResult.billNumber} saved successfully for ${formatCurrency(total)}${paidAmount > total ? `. Change: ${formatCurrency(paidAmount - total)}` : ''}`,
        variant: "default",
      });

      // Print receipt automatically
      try {
        handlePrintReceipt(saleResult);
      } catch (printError) {
        console.error("Print error:", printError);
        toast({
          title: "Print Warning",
          description: "Sale completed but receipt printing failed. You can print manually.",
          variant: "default",
        });
      }

      // Reset everything but preserve held sales
      clearCart(false);
      setShowPaymentDialog(false);
      setAmountPaid("");
      setBillNumber(`POS${Date.now()}`);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });

    } catch (error) {
      console.error("Sale processing error:", error);

      let errorMessage = "Transaction failed. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("stock")) {
          errorMessage = error.message;
        } else if (error.message.includes("Network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection.";
        } else if (error.message.length > 0 && error.message.length < 200) {
          errorMessage = error.message;
        }
      }

      toast({
        title: "❌ Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        toast({
          title: "Fullscreen Error",
          description: "Unable to enter fullscreen mode",
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        // Focus on barcode input first, then search
        const barcodeInput = document.querySelector('input[placeholder*="Scan barcode"]') as HTMLInputElement;
        if (barcodeInput) {
          barcodeInput.focus();
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      } else if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "F12") {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+F12 clears everything including held sales
          clearCart(true);
        } else {
          // F12 only clears current cart
          clearCart(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchTerm("");
        setShowPaymentDialog(false);
        setShowNewCustomerDialog(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } else if (e.altKey && e.key === "c") {
        e.preventDefault();
        setupQuickPayment("cash");
      }
      else if (e.altKey && e.key === "u") {
        e.preventDefault();
        setupQuickPayment("upi");
      }
      else if (e.altKey && e.key === "h") {
        e.preventDefault();
        holdCurrentSale();
      }
      else if (e.altKey && e.key === "r") {
        e.preventDefault();
        setShowHoldSales(true);
      }
      else if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        toggleDiscount();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyPress);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [cart.length, discount]);

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Enhanced receipt printing functionality
  const handlePrintReceipt = (saleData: any) => {
    // Validate cart data before printing
    if (cart.length === 0) {
      toast({
        title: "Print Error",
        description: "No items in cart to print receipt",
        variant: "destructive",
      });
      return;
    }

    try {
      const receiptData = {
        billNumber: billNumber,
        billDate: new Date().toLocaleDateString('en-IN'),
        customerDetails: {
          name: selectedCustomer?.name || "Walk-in Customer",
          doorNo: selectedCustomer?.phone ? `Ph: ${selectedCustomer.phone}` : "",
          street: "",
          address: "",
          place: ""
        },
        salesMan: "Admin User",
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          mrp: item.mrp || parseFloat(item.price)
        })),
        subtotal: subtotal,
        discount: discountAmount,
        discountType: 'percentage' as const,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: total,
        amountPaid: parseFloat(amountPaid) || total,
        changeDue: Math.max(0, (parseFloat(amountPaid) || total) - total),
        paymentMethod: paymentMethod.toUpperCase(),
        notes: `Bill: ${billNumber} | Terminal: POS-Enhanced`
      };

      console.log("📄 Printing receipt with data:", receiptData);
      printReceiptUtil(receiptData);

      toast({
        title: "✅ Receipt Sent to Printer",
        description: `Receipt ${billNumber} sent successfully`,
        variant: "default",
      });

    } catch (error) {
      console.error("Receipt printing error:", error);
      toast({
        title: "❌ Print Failed",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Quick payment setup
  const setupQuickPayment = (method: string) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before using quick payment",
        variant: "destructive",
      });
      return;
    }
    setPaymentMethod(method);
    setAmountPaid(total.toString());
    setShowPaymentDialog(true);
  };

  // Toggle discount
  const toggleDiscount = () => {
    setDiscount(prev => (prev > 0 ? 0 : 10));
  };

  // Hold current sale
  const holdCurrentSale = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot hold an empty cart",
        variant: "destructive",
      });
      return;
    }

    // Validate cart items before holding
    const validCartItems = cart.filter(item => item && item.id && item.quantity > 0);
    if (validCartItems.length === 0) {
      toast({
        title: "Invalid Cart",
        description: "Cart contains no valid items to hold",
        variant: "destructive",
      });
      return;
    }

    const holdId = `HOLD-${Date.now()}`;

    // Create a completely isolated deep copy using JSON parse/stringify to prevent any reference issues
    const cartSnapshot = JSON.parse(JSON.stringify(validCartItems.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
      stockQuantity: item.stockQuantity,
      mrp: item.mrp,
      category: item.category ? { 
        name: item.category.name 
      } : undefined,
      barcode: item.barcode || undefined
    }))));

    const customerSnapshot = selectedCustomer ? JSON.parse(JSON.stringify({
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email
    })) : null;

    const oceanSnapshot = JSON.parse(JSON.stringify({
      containerNumber: oceanFreight.containerNumber || "",
      vesselName: oceanFreight.vesselName || "",
      portOfLoading: oceanFreight.portOfLoading || "",
      portOfDischarge: oceanFreight.portOfDischarge || "",
      freightCost: oceanFreight.freightCost || "",
      insuranceCost: oceanFreight.insuranceCost || "",
      customsDuty: oceanFreight.customsDuty || "",
      handlingCharges: oceanFreight.handlingCharges || "",
      totalOceanCost: oceanFreight.totalOceanCost || 0
    }));

    const holdSale = {
      id: holdId,
      cart: cartSnapshot,
      customer: customerSnapshot,
      discount: discount,
      notes: `Held sale at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date(),
      total: total,
      oceanFreight: oceanSnapshot
    };

    const itemCount = validCartItems.length;

    try {
      // Add to held sales and update localStorage atomically
      setHoldSales(prev => {
        // Remove any existing duplicate holds first
        const filteredPrev = prev.filter(sale => !sale.id.startsWith('HOLD-') || 
          Math.abs(new Date(sale.timestamp).getTime() - Date.now()) > 5000);

        const newHeldSales = [...filteredPrev, holdSale];
        try {
          localStorage.setItem('heldSales', JSON.stringify(newHeldSales));
        } catch (storageError) {
          console.warn("Failed to save to localStorage:", storageError);
        }
        return newHeldSales;
      });

      // Force clear all current state immediately
      setTimeout(() => {
        setCart([]);
        setSelectedCustomer(null);
        setDiscount(0);
        setAmountPaid("");
        setPaymentMethod("cash");
        setBarcodeInput("");
        setOceanFreight({
          containerNumber: "",
          vesselName: "",
          portOfLoading: "",
          portOfDischarge: "",
          freightCost: "",
          insuranceCost: "",
          customsDuty: "",
          handlingCharges: "",
          totalOceanCost: 0
        });
      }, 10);

      toast({
        title: "Sale Held Successfully",
        description: `Sale ${holdId} saved with ${itemCount} items. Cart cleared. Use Alt+R to recall.`,
      });
    } catch (error) {
      console.error("Error holding sale:", error);
      toast({
        title: "Hold Failed",
        description: "Failed to hold the sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Recall held sale
  const recallHeldSale = (holdSale: typeof holdSales[0]) => {
    try {
      // Check if there's a current cart that needs to be cleared
      if (cart.length > 0) {
        const confirmRecall = window.confirm(
          `You have ${cart.length} items in your current cart. Recalling this held sale will clear the current cart. Continue?`
        );
        if (!confirmRecall) {
          return;
        }
      }

      // Use JSON parse/stringify for complete isolation
      const restoredCart = JSON.parse(JSON.stringify(holdSale.cart));
      const restoredCustomer = holdSale.customer ? JSON.parse(JSON.stringify(holdSale.customer)) : null;
      const restoredOceanFreight = holdSale.oceanFreight ? JSON.parse(JSON.stringify(holdSale.oceanFreight)) : {
        containerNumber: "",
        vesselName: "",
        portOfLoading: "",
        portOfDischarge: "",
        freightCost: "",
        insuranceCost: "",
        customsDuty: "",
        handlingCharges: "",
        totalOceanCost: 0
      };

      // Clear current state forcefully
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setAmountPaid("");
      setPaymentMethod("cash");
      setBarcodeInput("");
      setOceanFreight({
        containerNumber: "",
        vesselName: "",
        portOfLoading: "",
        portOfDischarge: "",
        freightCost: "",
        insuranceCost: "",
        customsDuty: "",
        handlingCharges: "",
        totalOceanCost: 0
      });

      // Use multiple frame delays to ensure complete state clearing
      setTimeout(() => {
        // First remove from held sales
        setHoldSales(prev => {
          const updatedHeldSales = prev.filter(sale => sale.id !== holdSale.id);
          try {
            localStorage.setItem('heldSales', JSON.stringify(updatedHeldSales));
          } catch (storageError) {
            console.warn("Failed to update localStorage:", storageError);
          }
          return updatedHeldSales;
        });

        // Then restore the held sale state
        setTimeout(() => {
          setCart(restoredCart);
          setSelectedCustomer(restoredCustomer);
          setDiscount(holdSale.discount || 0);
          setOceanFreight(restoredOceanFreight);

          setShowHoldSales(false);

          toast({
            title: "Sale Recalled Successfully",
            description: `${holdSale.id} restored with ${restoredCart.length} items`,
          });
        }, 50);
      }, 10);

    } catch (error) {
      console.error("Error recalling held sale:", error);
      toast({
        title: "Recall Failed", 
        description: "Failed to recall the held sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete held sale
  const deleteHeldSale = (holdId: string) => {
    setHoldSales(prev => prev.filter(sale => sale.id !== holdId));
    toast({
      title: "Sale Deleted",
      description: `Held sale ${holdId} has been deleted`,
    });
  };

  // Clear all held sales
  const clearAllHeldSales = () => {
    if (holdSales.length === 0) {
      toast({
        title: "No Held Sales",
        description: "There are no held sales to clear",
        variant: "default",
      });
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to clear all ${holdSales.length} held sales? This action cannot be undone.`
    );

    if (!confirmClear) {
      return;
    }

    try {
      const count = holdSales.length;
      setHoldSales([]);
      localStorage.removeItem('heldSales');

      toast({
        title: "All Held Sales Cleared",
        description: `${count} held sales have been permanently cleared`,
      });
    } catch (error) {
      console.error("Error clearing held sales:", error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear all held sales. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clean up empty or invalid held sales
  const cleanupHeldSales = () => {
    const validHeldSales = holdSales.filter(sale => 
      sale && 
      sale.cart && 
      Array.isArray(sale.cart) && 
      sale.cart.length > 0 &&
      sale.id &&
      sale.timestamp
    );

    if (validHeldSales.length !== holdSales.length) {
      setHoldSales(validHeldSales);
      try {
        if (validHeldSales.length > 0) {
          localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
        } else {
          localStorage.removeItem('heldSales');
        }

        const removedCount = holdSales.length - validHeldSales.length;
        if (removedCount > 0) {
          toast({
            title: "Cleaned Up Held Sales",
            description: `Removed ${removedCount} empty or invalid held sales`,
          });
        }
      } catch (error) {
        console.warn("Failed to cleanup held sales:", error);
      }
    }
  };

  // Initialize bill number and load held sales + cash register state from localStorage
  useEffect(() => {
    setBillNumber(`POS${Date.now()}`);

    // Load held sales from localStorage on component mount
    try {
      const savedHeldSales = localStorage.getItem('heldSales');
      if (savedHeldSales) {
        const parsedHeldSales = JSON.parse(savedHeldSales);
        // Validate and restore held sales, but filter out invalid or empty ones
        if (Array.isArray(parsedHeldSales)) {
          const validHeldSales = parsedHeldSales.filter(sale => 
            sale && 
            sale.cart && 
            Array.isArray(sale.cart) && 
            sale.cart.length > 0 &&
            sale.id &&
            sale.timestamp
          ).map(sale => ({
            ...sale,
            timestamp: new Date(sale.timestamp) // Convert timestamp back to Date object
          }));
          setHoldSales(validHeldSales);

          // Update localStorage with cleaned data
          if (validHeldSales.length !== parsedHeldSales.length) {
            localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
          }
        }
      }
    } catch (error) {
      console.error("Error loading held sales from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem('heldSales');
    }

    // Load cash register state from localStorage
    try {
      const savedCashRegister = localStorage.getItem('cashRegisterState');
      if (savedCashRegister) {
        const cashState = JSON.parse(savedCashRegister);
        
        // Restore cash register state
        setRegisterOpened(cashState.registerOpened || false);
        setOpeningCash(cashState.openingCash || 0);
        setCashInHand(cashState.cashInHand || 0);
        setCashReceived(cashState.cashReceived || 0);
        setUpiReceived(cashState.upiReceived || 0);
        setCardReceived(cashState.cardReceived || 0);
        setBankReceived(cashState.bankReceived || 0);
        setChequeReceived(cashState.chequeReceived || 0);
        setOtherReceived(cashState.otherReceived || 0);
        setTotalWithdrawals(cashState.totalWithdrawals || 0);
        setTotalRefunds(cashState.totalRefunds || 0);

        console.log("💰 Cash register state restored from localStorage:", cashState);
      }
    } catch (error) {
      console.error("Error loading cash register state from localStorage:", error);
      localStorage.removeItem('cashRegisterState');
    }

    // Cleanup function to auto-hold current cart when navigating away
    const handleBeforeUnload = () => {
      // Reset cash register forms on navigation
      resetAllCashRegisterStates();
      
      if (cart.length > 0) {
        const autoHoldId = `AUTO-HOLD-${Date.now()}`;
        const autoHoldSale = {
          id: autoHoldId,
          cart: JSON.parse(JSON.stringify(cart)),
          customer: selectedCustomer ? JSON.parse(JSON.stringify(selectedCustomer)) : null,
          discount: discount,
          notes: `Auto-saved before navigation at ${new Date().toLocaleTimeString()}`,
          timestamp: new Date(),
          total: total,
          oceanFreight: JSON.parse(JSON.stringify(oceanFreight))
        };

        try {
          const existingHeldSales = JSON.parse(localStorage.getItem('heldSales') || '[]');
          const updatedHeldSales = [...existingHeldSales, autoHoldSale];
          localStorage.setItem('heldSales', JSON.stringify(updatedHeldSales));
        } catch (error) {
          console.warn("Failed to auto-save cart before navigation:", error);
        }
      }
    };

    // Add event listeners for navigation detection
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Call on component unmount
    };
  }, [cart, selectedCustomer, discount, total, oceanFreight]);

  // Component cleanup effect
  useEffect(() => {
    return () => {
      // Reset forms when component unmounts
      resetAllCashRegisterStates();
    };
  }, []);

  // Update bill details when bill number changes
  useEffect(() => {
    setBillDetails(prev => ({
      ...prev,
      billNumber: billNumber,
      billDate: new Date().toISOString().split('T')[0],
      billTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }));
  }, [billNumber]);

  // Save held sales to localStorage whenever holdSales changes
  useEffect(() => {
    try {
      // Filter out any invalid held sales before saving
      const validHeldSales = holdSales.filter(sale => 
        sale && 
        sale.cart && 
        Array.isArray(sale.cart) && 
        sale.cart.length > 0 &&
        sale.id &&
        sale.timestamp
      );

      if (validHeldSales.length > 0) {
        localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
      } else {
        localStorage.removeItem('heldSales');
      }

      // Update state if we filtered out invalid sales
      if (validHeldSales.length !== holdSales.length) {
        setHoldSales(validHeldSales);
      }
    } catch (error) {
      console.error("Error saving held sales to localStorage:", error);
    }
  }, [holdSales]);

  // Save cash register state to localStorage whenever it changes
  useEffect(() => {
    try {
      const cashRegisterState = {
        registerOpened,
        openingCash,
        cashInHand,
        cashReceived,
        upiReceived,
        cardReceived,
        bankReceived,
        chequeReceived,
        otherReceived,
        totalWithdrawals,
        totalRefunds,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('cashRegisterState', JSON.stringify(cashRegisterState));
    } catch (error) {
      console.error("Error saving cash register state to localStorage:", error);
    }
  }, [
    registerOpened,
    openingCash,
    cashInHand,
    cashReceived,
    upiReceived,
    cardReceived,
    bankReceived,
    chequeReceived,
    otherReceived,
    totalWithdrawals,
    totalRefunds
  ]);

  // Periodic cleanup for old auto-saved held sales
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago

      setHoldSales(prev => {
        const cleaned = prev.filter(sale => {
          // Keep regular holds, but remove old auto-saves
          if (sale.id.includes('AUTO-HOLD') || sale.id.includes('TAB-SWITCH')) {
            const saleTime = new Date(sale.timestamp).getTime();
            return saleTime > oneHourAgo;
          }
          return true;
        });

        return cleaned;
      });
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-blue-600' : ''}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900">
          {/* Modern Header */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Enhanced POS</h1>
                    <p className="text-sm text-gray-500">Professional Point of Sale System</p>
                  </div>

                  <div className="flex items-center space-x-3 ml-8">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      System Ready
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <Zap className="h-3 w-3 mr-1" />
                      Live Mode
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {!registerOpened ? (
                    <Button
                      onClick={() => setShowOpenRegister(true)}
                      variant="outline"
                      size="sm"
                      className="hover:bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Open Register
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setShowCashRegister(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-green-50 border-green-200 text-green-700"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Manage Cash
                      </Button>
                      <Button
                        onClick={() => setShowWithdrawal(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-orange-50 border-orange-200 text-orange-700"
                      >
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Withdrawal
                      </Button>
                      <Button
                        onClick={() => setShowCloseRegister(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 border-red-200 text-red-700"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Close Register
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => setShowPrinterSettings(true)}
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50 border-blue-200 text-blue-700"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Printer Settings
                  </Button>
                  <Button
                    onClick={toggleFullscreen}
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50 border-blue-200"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Fullscreen (F11)
                  </Button>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Bill Number</div>
                    <div className="font-mono font-semibold text-gray-900">{billNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Date & Time</div>
                    <div className="font-mono text-sm text-gray-700">{currentDate} • {currentTime}</div>
                  </div>
                  <div className={`text-right p-3 rounded-lg border ${registerOpened ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-sm font-medium ${registerOpened ? 'text-green-600' : 'text-gray-600'}`}>
                      {registerOpened ? 'Cash in Hand' : 'Register Closed'}
                    </div>
                    <div className={`text-xl font-bold ${registerOpened ? 'text-green-700' : 'text-gray-700'}`}>
                      {registerOpened ? formatCurrency(cashInHand) : '---'}
                    </div>
                  </div>
                  <div className="text-right bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium">Total Amount</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(total)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Selection Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cashier</label>
                <div className="flex items-center text-gray-900 font-medium">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  Admin User
                </div>
              </div>

              <div className="col-span-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer</label>
                <Select 
                  value={selectedCustomer?.id?.toString() || ""} 
                  onValueChange={(value) => {
                    if (value === "walk-in") {
                      setSelectedCustomer(null);
                    } else {
                      const customer = customers.find(c => c.id.toString() === value);
                      setSelectedCustomer(customer || null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer">
                      {selectedCustomer?.name || "Walk-in Customer"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Walk-in Customer
                      </div>
                    </SelectItem>
                    {customers?.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Contact</label>
                <div className="flex items-center text-gray-600">
                  {selectedCustomer?.phone ? (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedCustomer.phone}
                    </>
                  ) : (
                    <span className="text-gray-400">No contact info</span>
                  )}
                </div>
              </div>

              <div className="col-span-3 flex justify-end space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedCustomer(null)}
                  className="hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setShowNewCustomerDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Customer
                </Button>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            {/* Barcode Scanner Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Scan className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Barcode Scanner</h3>
                    <p className="text-sm text-blue-600">Scan or enter product barcode for instant addition</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
                  <Input
                    placeholder="Scan barcode or type product code to add instantly..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeSubmit();
                      }
                    }}
                    className="pl-10 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 h-12"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleBarcodeSubmit}
                  disabled={!barcodeInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                💡 Tip: Use a barcode scanner or manually enter product barcodes/SKU for instant cart addition
              </p>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <Button 
                onClick={() => searchInputRef.current?.focus()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Products (F1)
              </Button>
              <Button variant="outline" className="hover:bg-gray-50">
                <Search className="h-4 w-4 mr-2" />
                Search Products
              </Button>
              <Button variant="outline" className="hover:bg-gray-50">
                <Package className="h-4 w-4 mr-2" />
                Browse Categories
              </Button>
              <div className="flex-1" />
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries()}
                className="hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  placeholder="Type product name, SKU, or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-lg py-3 pl-12 border-2 border-gray-200 focus:border-blue-500"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <Info className="h-4 w-4" />
                <span>{products.length} products available</span>
                {productsLoading && <span className="text-blue-600">• Loading...</span>}
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Main Cart Section */}
            <div className="flex-1 bg-white p-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl mb-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingCart className="h-6 w-6 mr-3" />
                    <h2 className="text-xl font-bold">Shopping Cart</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {cart.length} items • {cart.reduce((sum, item) => sum + item.quantity, 0)} units
                    </div>
                    <div className="text-blue-100 text-sm">
                      Subtotal: {formatCurrency(subtotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-96 bg-gray-50 rounded-xl p-6 border border-gray-200">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingCart className="h-24 w-24 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-2xl font-semibold text-gray-600 mb-3">Cart is Empty</h3>
                    <p className="text-gray-500 mb-6 text-lg">Start by searching for products above</p>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-4xl mx-auto text-sm text-gray-500">
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F1</kbd>
                        <p className="mt-2">Focus barcode scanner</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Enter</kbd>
                        <p className="mt-2">Add scanned item</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F10</kbd>
                        <p className="mt-2">Quick checkout</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F11</kbd>
                        <p className="mt-2">Toggle fullscreen</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F12</kbd>
                        <p className="mt-2">Clear cart</p>
                        <p className="text-xs text-gray-500">Shift+F12: Clear all</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500 font-mono">{item.sku}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(parseFloat(item.price))}
                              </p>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-8 w-8 p-0 hover:bg-red-100"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 p-0 hover:bg-green-100"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right min-w-24">
                              <div className="font-bold text-xl text-green-600">
                                {formatCurrency(item.total)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Total
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between mt-6 p-4 bg-gray-100 rounded-xl border border-gray-200">

                <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setupQuickPayment("cash")}
                  disabled={cart.length === 0}
                  title="Quick cash payment (Alt+C)"
                  className="hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cash (Alt+C)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setupQuickPayment("upi")}
                  disabled={cart.length === 0}
                  title="Quick UPI payment (Alt+U)"
                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  UPI (Alt+U)
                </Button>
                <Button 
                  variant="outline"
                  onClick={toggleDiscount}
                  title="Toggle 10% discount (Ctrl+D)"
                  className={`hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 ${discount > 0 ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Discount (Ctrl+D)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowOceanDialog(true)}
                  title="Enter Ocean Freight & Shipping Costs"
                  className={`hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 ${oceanTotal > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Enter Ocean
                </Button>
                <Button 
                  variant="outline"
                  onClick={holdCurrentSale}
                  disabled={cart.length === 0}
                  title="Hold current sale (Alt+H)"
                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Hold (Alt+H)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowHoldSales(true)}
                  title="Recall held sales (Alt+R)"
                  className="hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"
                >
                  <List className="h-4 w-4 mr-2" />
                  Recall (Alt+R)
                  {holdSales.length > 0 && (
                    <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full">
                      {holdSales.length}
                    </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => clearCart(false)} 
                  disabled={cart.length === 0}
                  className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart (F12)
                </Button>
              </div>

                <div className="flex items-center space-x-4 text-sm">
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    System Online
                  </Badge>
                  <span className="text-gray-600">Terminal: POS-01</span>
                  <span className="text-gray-600 font-mono">{currentTime}</span>
                </div>
              </div>
            </div>

            {/* Bill Summary Sidebar */}
            <div className="w-96 bg-white border-l border-gray-200 p-6">
              {/* Barcode Scanner Status */}
              <Card className="mb-4 border border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Scan className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-900">Barcode Scanner</h3>
                    </div>
                    <Badge 
                      className={`${barcodeEnabledProducts.length > 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                    >
                      {barcodeEnabledProducts.length > 0 ? 'Ready' : 'Limited'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scannable Products:</span>
                      <span className="font-medium text-blue-700">{barcodeEnabledProducts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Products:</span>
                      <span className="font-medium">{products.length}</span>
                    </div>
                    
                    {barcodeEnabledProducts.length === 0 && (
                      <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                        <Info className="h-3 w-3 inline mr-1" />
                        No products have valid barcodes for POS scanning. Add barcodes to products to enable scanner functionality.
                      </div>
                    )}
                    
                    {barcodeEnabledProducts.length > 0 && barcodeEnabledProducts.length < products.length && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Scanner works with products that have valid barcodes (8+ chars), stock, and pricing.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <Receipt className="h-6 w-6 mr-3" />
                  <h2 className="text-xl font-bold">Bill Summary</h2>
                </div>
                <div className="text-purple-100 text-sm">Bill #{billNumber}</div>
                <div className="text-purple-100 text-sm">{currentDate}</div>
              </div>

              {/* Bill Details */}
              <Card className="mb-6 border border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-semibold">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Total Qty:</span>
                    <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Gross Amount:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>



                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount:</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-16 h-8 text-center"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount Amount:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {oceanTotal > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Ocean Freight:</span>
                      <span>+{formatCurrency(oceanTotal)}</span>
                    </div>
                  )}



                </CardContent>
              </Card>

              {/* Net Amount Payable */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="text-center">
                  <div className="text-sm font-medium opacity-90 mb-2">Net Amount Payable</div>
                  <div className="text-4xl font-bold">{formatCurrency(total)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-4 h-auto"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Proceed to Payment (F10)
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Items
                </Button>

                <Button
                  variant="outline"
                  className="wfull hover:bg-gray-50"
                  onClick={() => {
                    if (cart.length > 0) {
                      handlePrintReceipt(null);
                    } else {
                      toast({
                        title: "Empty Cart",
                        description: "Please add items to cart before printing receipt",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={cart.length === 0}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>

          {/* Product Search Results Overlay */}
          {searchTerm && filteredProducts.length > 0 && (
            <div className="absolute top-48 left-6 right-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 max-h-80 overflow-auto">
              <div className="p-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <h3 className="font-semibold text-gray-900">
                  Found {filteredProducts.length} products
                </h3>
              </div>
              {filteredProducts.slice(0, 8).map((product: Product) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                      {product.barcode && (
                        <p className="text-xs text-blue-600 font-mono">📷 {product.barcode}</p>
                      )}
                      {product.category && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {product.category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-lg text-green-600">
                        {formatCurrency(parseFloat(product.price))}
                      </div>
                      <div className={`text-sm ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Open Register Dialog */}
          <Dialog open={showOpenRegister} onOpenChange={(open) => {
            if (!open) {
              resetCashRegisterForm();
            }
            setShowOpenRegister(open);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                  Open Cash Register
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm mb-2">Enter the opening cash amount you're placing in the register drawer.</p>
                  <p className="text-blue-600 text-xs">This will be your starting balance for the day.</p>
                </div>

                <div>
                  <Label htmlFor="openingCash" className="text-sm font-medium">Opening Cash Amount</Label>
                  <Input
                    id="openingCash"
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Enter opening amount"
                    className="mt-1 text-lg"
                    step="0.01"
                    min="0"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCashRegisterForm();
                      setShowOpenRegister(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOpenRegister}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!cashAmount || parseFloat(cashAmount) < 0}
                  >
                    Open Register
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Withdrawal Dialog */}
          <Dialog open={showWithdrawal} onOpenChange={(open) => {
            if (!open) {
              resetWithdrawalForm();
            }
            setShowWithdrawal(open);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                  Cash Withdrawal
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-800 text-sm mb-2">Available Cash: {formatCurrency(cashInHand)}</p>
                  <p className="text-orange-600 text-xs">Enter amount to withdraw from register</p>
                </div>

                <div>
                  <Label htmlFor="withdrawalAmount" className="text-sm font-medium">Withdrawal Amount</Label>
                  <Input
                    id="withdrawalAmount"
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter withdrawal amount"
                    className="mt-1 text-lg"
                    step="0.01"
                    min="0"
                    max={cashInHand}
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="withdrawalNote" className="text-sm font-medium">Note (Optional)</Label>
                  <Input
                    id="withdrawalNote"
                    value={withdrawalNote}
                    onChange={(e) => setWithdrawalNote(e.target.value)}
                    placeholder="e.g., Cash sent to bank"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetWithdrawalForm();
                      setShowWithdrawal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdrawal}
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > cashInHand}
                  >
                    Process Withdrawal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Close Register Dialog */}
          <Dialog open={showCloseRegister} onOpenChange={(open) => {
            if (!open) {
              resetAllCashRegisterStates();
            }
            setShowCloseRegister(open);
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Archive className="h-6 w-6 text-red-600" />
                  End of Day Summary
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Opening Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">Opening</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Opening Cash:</span>
                        <span className="font-semibold">{formatCurrency(openingCash)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales Summary */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3">Sales Received</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-green-700">Cash Payments:</span>
                        <span className="font-semibold">{formatCurrency(cashReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">UPI Payments:</span>
                        <span className="font-semibold">{formatCurrency(upiReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Card Payments:</span>
                        <span className="font-semibold">{formatCurrency(cardReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Bank Transfer:</span>
                        <span className="font-semibold">{formatCurrency(bankReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Cheque:</span>
                        <span className="font-semibold">{formatCurrency(chequeReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Other:</span>
                        <span className="font-semibold">{formatCurrency(otherReceived)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span className="text-green-700">Total Sales:</span>
                        <span>{formatCurrency(cashReceived + upiReceived + cardReceived + bankReceived + chequeReceived + otherReceived)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Outgoing Summary */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-800 mb-3">Outgoing</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-red-700">Withdrawals:</span>
                        <span className="font-semibold">{formatCurrency(totalWithdrawals)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Refunds:</span>
                        <span className="font-semibold">{formatCurrency(totalRefunds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Summary */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-3">Final Cash Count</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Opening Cash:</span>
                        <span>{formatCurrency(openingCash)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">+ Cash Payments:</span>
                        <span>{formatCurrency(cashReceived)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">+ UPI (as cash):</span>
                        <span>{formatCurrency(upiReceived)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">- Withdrawals:</span>
                        <span>{formatCurrency(totalWithdrawals)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-purple-700">Expected Cash:</span>
                        <span className="text-purple-800">{formatCurrency(openingCash + cashReceived + upiReceived - totalWithdrawals)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-purple-700">Current Cash:</span>
                        <span className="text-purple-800">{formatCurrency(cashInHand)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCloseRegister(false)}
                  >
                    Keep Open
                  </Button>
                  <Button
                    onClick={() => {
                      setRegisterOpened(false);
                      setOpeningCash(0);
                      setCashInHand(0);
                      setCashReceived(0);
                      setUpiReceived(0);
                      setCardReceived(0);
                      setBankReceived(0);
                      setChequeReceived(0);
                      setOtherReceived(0);
                      setTotalWithdrawals(0);
                      setTotalRefunds(0);
                      setShowCloseRegister(false);
                      
                      // Clear cash register state from localStorage
                      try {
                        localStorage.removeItem('cashRegisterState');
                      } catch (error) {
                        console.error("Error clearing cash register state:", error);
                      }
                      
                      toast({
                        title: "Register Closed",
                        description: "End of day completed successfully",
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Close Register
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cash Register Management Modal */}
      <Dialog open={showCashRegister} onOpenChange={(open) => {
        if (!open) {
          resetCashRegisterForm();
        }
        setShowCashRegister(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-gray-800">Cash Register Management</div>
                <div className="text-sm text-gray-600 font-normal">Professional cash & payment tracking system</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Live System</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">06:29 am</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-12 gap-6 p-2">
            {/* Current Balance Display */}
            <div className="col-span-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2 opacity-90">Current Cash Balance</h3>
                  <div className="text-4xl font-bold mb-4">{formatCurrency(cashInHand)}</div>
                  <div className="bg-green-400/30 rounded-lg p-3">
                    <div className="flex justify-between"><div className="text-center">
                        <div className="text-sm opacity-80">Today's Sales</div>
                        <div className="font-semibold">₹0</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm opacity-80">Transactions</div>
                        <div className="font-semibold">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Payments Section */}
            <div className="col-span-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-800">Cash Payments</h4>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Quick Add</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[100, 500, 1000, 2000, 5000, 10000, 20000, 50000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Force complete reset first
                        resetCashRegisterForm(true);
                        resetAllCashRegisterStates();
                        
                        // Set new values with multiple attempts to ensure they stick
                        const setValues = () => {
                          setCashAmount(amount.toString());
                          setCashOperation('add');
                          setCashReason(`Cash payment ₹${amount}`);
                        };
                        
                        setValues();
                        setTimeout(setValues, 10);
                        setTimeout(setValues, 50);
                      }}
                      className="border-green-200 text-green-700 hover:bg-green-50 h-12 flex flex-col justify-center"
                    >
                      <Plus className="w-3 h-3 mb-1" />
                      <span className="font-semibold">₹{amount >= 1000 ? `${amount/1000}k` : amount}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Digital Payments Section */}
            <div className="col-span-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-800">Digital Payments</h4>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">UPI • Cards</span>
                </div>

                {/* UPI Payments */}
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[250, 500, 1000, 2000].map((amount) => (
                      <Button
                        key={`upi-${amount}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Complete form reset
                          resetCashRegisterForm(true);
                          resetAllCashRegisterStates();
                          
                          // Set UPI values with persistence
                          const setUpiValues = () => {
                            setCashAmount(amount.toString());
                            setCashOperation('add');
                            setCashReason(`UPI payment ₹${amount}`);
                          };
                          
                          setUpiValues();
                          setTimeout(setUpiValues, 10);
                          setTimeout(setUpiValues, 50);
                        }}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 h-12 flex flex-col justify-center"
                      >
                        <Plus className="w-3 h-3 mb-1" />
                        <span className="font-semibold">₹{amount}</span>
                        <span className="text-xs text-blue-600">UPI</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Card Payments */}
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {[5000, 10000, 25000, 50000].map((amount) => (
                      <Button
                        key={`card-${amount}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Complete form reset
                          resetCashRegisterForm(true);
                          resetAllCashRegisterStates();
                          
                          // Set card values with persistence
                          const setCardValues = () => {
                            setCashAmount(amount.toString());
                            setCashOperation('add');
                            setCashReason(`Card payment ₹${amount}`);
                          };
                          
                          setCardValues();
                          setTimeout(setCardValues, 10);
                          setTimeout(setCardValues, 50);
                        }}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 h-12 flex flex-col justify-center"
                      >
                        <Plus className="w-3 h-3 mb-1" />
                        <span className="font-semibold">₹{amount >= 1000 ? `${amount/1000}k` : amount}</span>
                        <span className="text-xs text-purple-600">Card</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Type Selection */}
            <div className="col-span-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs">📋</span>
                  </div>
                  Transaction Type
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <Card className={`cursor-pointer transition-all border-2 ${cashOperation === 'add' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                        onClick={() => {
                          // Comprehensive form reset when switching operation type
                          resetCashRegisterForm(true);
                          setCashOperation('add');
                        }}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-green-700 mb-1">Add Money</h4>
                      <p className="text-sm text-green-600">Increase register balance</p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all border-2 ${cashOperation === 'remove' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                        onClick={() => {
                          // Comprehensive form reset when switching operation type
                          resetCashRegisterForm(true);
                          setCashOperation('remove');
                        }}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Minus className="w-6 h-6 text-red-600" />
                      </div>
                      <h4 className="font-semibold text-red-700 mb-1">Remove Money</h4>
                      <p className="text-sm text-red-600">Decrease register balance</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Cash Removal Section */}
            <div className="col-span-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-gray-800">Cash Removal</h4>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Bank Deposits</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Complete form reset
                      resetCashRegisterForm(true);
                      resetAllCashRegisterStates();
                      
                      // Set removal values with persistence
                      const setBankValues = () => {
                        setCashAmount("2000");
                        setCashOperation("remove");
                        setCashReason("Bank deposit ₹2000");
                      };
                      
                      setBankValues();
                      setTimeout(setBankValues, 10);
                      setTimeout(setBankValues, 50);
                    }}
                    className="border-red-200 text-red-700 hover:bg-red-50 h-16 flex flex-col justify-center"
                  >
                    <Minus className="w-4 h-4 mb-1" />
                    <span className="font-semibold">₹2,000</span>
                    <span className="text-xs text-red-600">Bank Deposit</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Complete form reset
                      resetCashRegisterForm(true);
                      resetAllCashRegisterStates();
                      
                      // Set removal values with persistence
                      const setBankValues = () => {
                        setCashAmount("5000");
                        setCashOperation("remove");
                        setCashReason("Bank deposit ₹5000");
                      };
                      
                      setBankValues();
                      setTimeout(setBankValues, 10);
                      setTimeout(setBankValues, 50);
                    }}
                    className="border-red-200 text-red-700 hover:bg-red-50 h-16 flex flex-col justify-center"
                  >
                    <Minus className="w-4 h-4 mb-1" />
                    <span className="font-semibold">₹5,000</span>
                    <span className="text-xs text-red-600">Bank Deposit</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Manual Entry Form */}
            <div className="col-span-12">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-4">Manual Entry</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cashAmount" className="text-sm font-medium">Amount (₹)</Label>
                    <Input
                      id="cashAmount"
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cashReason" className="text-sm font-medium">Reason</Label>
                    <Input
                      id="cashReason"
                      value={cashReason}
                      onChange={(e) => setCashReason(e.target.value)}
                      placeholder="Enter reason"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleCashOperation} 
                      className={`w-full h-10 ${
                        cashOperation === 'add' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : cashOperation === 'remove'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-gray-400'
                      }`}
                      disabled={!cashAmount || parseFloat(cashAmount) <= 0 || !cashOperation}
                    >
                      {cashOperation === 'add' ? 'Add to Register' : cashOperation === 'remove' ? 'Remove from Register' : 'Select Operation'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

          {/* New Customer Dialog */}
          <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <UserPlus className="h-6 w-6 mr-3" />
                  Add New Customer
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <Input
                    placeholder="Enter customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <Input
                    placeholder="Enter phone number"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <Input
                    placeholder="Enter email address"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCustomerDialog(false)}
                    disabled={isCreatingCustomer}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewCustomer}
                    disabled={isCreatingCustomer}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingCustomer ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hold Sales Dialog */}
          <Dialog open={showHoldSales} onOpenChange={setShowHoldSales}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <List className="h-6 w-6 text-blue-600" />
                Held Sales ({holdSales.length})
              </DialogTitle>
              {holdSales.some(sale => sale.id.includes('AUTO-HOLD') || sale.id.includes('TAB-SWITCH')) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-blue-800 text-sm">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">Auto-Recovery Available</span>
                  </div>
                  <p className="text-blue-700 text-xs mt-1">
                    Some sales were automatically saved when you navigated away or switched tabs.
                  </p>
                </div>
              )}
            </DialogHeader>

              <div className="space-y-4">
                {holdSales.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Held Sales</h3>
                    <p className="text-gray-500">Hold a sale using Alt+H to save it for later</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {holdSales.map((holdSale) => (
                      <Card key={holdSale.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-semibold text-gray-900">{holdSale.id}</h4>
                        <Badge variant="outline" className="text-xs">
                          {holdSale.cart.length} items
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {holdSale.cart.reduce((sum, item) => sum + item.quantity, 0)} units
                        </Badge>
                        {(holdSale.id.includes('AUTO-HOLD') || holdSale.id.includes('TAB-SWITCH')) && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                            🔄 Auto-Saved
                          </Badge>
                        )}
                      </div>

                            <div className="text-sm text-gray-600 mb-2">
                              <div>Customer: {holdSale.customer?.name || "Walk-in Customer"}</div>
                              <div>Time: {holdSale.timestamp.toLocaleString()}</div>
                              {holdSale.discount > 0 && (
                                <div>Discount: {holdSale.discount}%</div>
                              )}
                            </div>

                            <div className="text-sm text-gray-500">
                              Items: {holdSale.cart.map(item => `${item.name} (${item.quantity})`).join(", ")}
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-green-600 mb-2">
                              {formatCurrency(holdSale.total)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => recallHeldSale(holdSale)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Recall
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteHeldSale(holdSale.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cleanupHeldSales}
                    className="text-blue-600 hover:bg-blue-50 border-blue-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cleanup Empty
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearAllHeldSales}
                    disabled={holdSales.length === 0}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowHoldSales(false)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Printer Settings Dialog */}
          <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Printer className="h-6 w-6 text-blue-600" />
                  Receipt & Printer Settings
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Settings Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input 
                      id="businessName" 
                      placeholder="Your Business Name" 
                      value={receiptSettings.businessName}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Textarea 
                      id="address" 
                      placeholder="Business Address" 
                      value={receiptSettings.address}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="(123) 456-7890" 
                      value={receiptSettings.phone}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / GST Number</Label>
                    <Input 
                      id="taxId" 
                      placeholder="Your tax ID number" 
                      value={receiptSettings.taxId}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, taxId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Receipt Footer</Label>
                    <Textarea 
                      id="receiptFooter" 
                      placeholder="Custom message for receipt footer" 
                      value={receiptSettings.receiptFooter}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, receiptFooter: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLogo">Show Logo on Receipt</Label>
                      <Switch 
                        id="showLogo" 
                        checked={receiptSettings.showLogo}
                        onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, showLogo: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="printAutomatically">Auto Print After Sale</Label>
                      <Switch 
                        id="printAutomatically" 
                        checked={receiptSettings.printAutomatically}
                        onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, printAutomatically: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printerSelect">Default Printer</Label>
                    <Select 
                      value={receiptSettings.defaultPrinter}
                      onValueChange={(value) => setReceiptSettings(prev => ({ ...prev, defaultPrinter: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a printer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default Printer</SelectItem>
                        <SelectItem value="thermal">Thermal Receipt Printer</SelectItem>
                        <SelectItem value="inkjet">Office Inkjet Printer</SelectItem>
                        <SelectItem value="laser">Laser Printer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Receipt Preview */}
                <div className="space-y-4">
                  <div>
                    <Label>Receipt Preview</Label>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 font-mono text-sm overflow-auto max-h-[500px] text-black mt-2">
                      <pre className="whitespace-pre-wrap text-center">
{receiptSettings.businessName}
{receiptSettings.address}
Tel: {receiptSettings.phone}
{receiptSettings.taxId ? `Tax ID: ${receiptSettings.taxId}` : ''}
-------------------------------
RECEIPT #{billNumber}
Date: {new Date().toLocaleDateString()}
Time: {new Date().toLocaleTimeString()}
Cashier: Admin User
Customer: {selectedCustomer?.name || "Walk-in Customer"}
-------------------------------
ITEM             QTY   PRICE   TOTAL
-------------------------------
{cart.length > 0 ? cart.map(item => 
`${item.name.padEnd(16).substring(0, 16)} ${item.quantity.toString().padStart(3)} ${formatCurrency(parseFloat(item.price)).padStart(7)} ${formatCurrency(item.total).padStart(7)}`
).join('\n') : 'Sample Product        1   ₹2.99   ₹2.99'}
-------------------------------
Subtotal:                {formatCurrency(subtotal).padStart(7)}
{discount > 0 ? `Discount (${discount}%):      -${formatCurrency(discountAmount).padStart(7)}` : ''}
-------------------------------
TOTAL:                   {formatCurrency(total).padStart(7)}

Payment Method: {paymentMethod.toUpperCase()}
Amount Paid:             {formatCurrency(parseFloat(amountPaid) || total).padStart(7)}
{(parseFloat(amountPaid) || total) > total ? `Change:                  ${formatCurrency((parseFloat(amountPaid) || total) - total).padStart(7)}` : ''}
-------------------------------
{receiptSettings.receiptFooter}
Terminal: POS-Enhanced
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const printWindow = window.open('', '_blank', 'width=400,height=700');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Test Receipt</title>
                                <style>
                                  body { font-family: monospace; margin: 20px; font-size: 12px; }
                                  pre { white-space: pre-wrap; }
                                </style>
                              </head>
                              <body>
                                <pre>${printWindow.document.querySelector('pre')?.textContent || 'Test Receipt'}</pre>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="flex-1"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Test
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPrinterSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Save receipt settings to localStorage
                    const settingsToSave = {
                      businessName: receiptSettings.businessName,
                      businessAddress: receiptSettings.address,
                      phoneNumber: receiptSettings.phone,
                      taxId: receiptSettings.taxId,
                      receiptFooter: receiptSettings.receiptFooter,
                      showLogo: receiptSettings.showLogo,
                      autoPrint: receiptSettings.printAutomatically,
                      defaultPrinter: receiptSettings.defaultPrinter
                    };

                    localStorage.setItem('receiptSettings', JSON.stringify(settingsToSave));

                    toast({
                      title: "Settings Saved",
                      description: "Receipt and printer settings have been updated successfully",
                    });
                    setShowPrinterSettings(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Ocean Freight Dialog */}
          <Dialog open={showOceanDialog} onOpenChange={setShowOceanDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-6 w-6 text-blue-600" />
                  Enter Ocean Freight & Shipping Costs
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Details */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">Shipping Details</h3>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="containerNumber">Container Number</Label>
                        <Input
                          id="containerNumber"
                          value={oceanFreight.containerNumber}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, containerNumber: e.target.value }))}
                          placeholder="e.g., ABCD1234567"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="vesselName">Vessel Name</Label>
                        <Input
                          id="vesselName"
                          value={oceanFreight.vesselName}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, vesselName: e.target.value }))}
                          placeholder="e.g., MSC Oscar"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="portOfLoading">Port of Loading</Label>
                        <Input
                          id="portOfLoading"
                          value={oceanFreight.portOfLoading}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, portOfLoading: e.target.value }))}
                          placeholder="e.g., Shanghai, China"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="portOfDischarge">Port of Discharge</Label>
                        <Input
                          id="portOfDischarge"
                          value={oceanFreight.portOfDischarge}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, portOfDischarge: e.target.value }))}
                          placeholder="e.g., Mumbai, India"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Details */}
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3">Cost Breakdown</h3>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="freightCost">Ocean Freight Cost</Label>
                        <Input
                          id="freightCost"
                          type="number"
                          value={oceanFreight.freightCost}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, freightCost: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="insuranceCost">Marine Insurance</Label>
                        <Input
                          id="insuranceCost"
                          type="number"
                          value={oceanFreight.insuranceCost}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, insuranceCost: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="customsDuty">Customs Duty</Label>
                        <Input
                          id="customsDuty"
                          type="number"
                          value={oceanFreight.customsDuty}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, customsDuty: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="handlingCharges">Handling Charges</Label>
                        <Input
                          id="handlingCharges"
                          type="number"
                          value={oceanFreight.handlingCharges}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, handlingCharges: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Display */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium opacity-90 mb-2">Total Ocean Freight</div>
                      <div className="text-2xl font-bold">{formatCurrency(calculateOceanTotal())}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOceanFreight({
                      containerNumber: "",
                      vesselName: "",
                      portOfLoading: "",
                      portOfDischarge: "",
                      freightCost: "",
                      insuranceCost: "",
                      customsDuty: "",
                      handlingCharges: "",
                      totalOceanCost: 0
                    });
                  }}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOceanDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowOceanDialog(false);
                    toast({
                      title: "Ocean Freight Added",
                      description: `Total ocean costs: ${formatCurrency(calculateOceanTotal())}`,
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply Ocean Costs
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <CreditCard className="h-6 w-6 mr-3" />
                  Complete Payment
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="p-6 bg-green-50 rounded-xl text-center border border-green-200">
                  <div className="text-3xl font-bold text-green-700">
                    {formatCurrency(total)}
                  </div>
                  <div className="text-green-600 mt-1">Amount to Pay</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash Payment</SelectItem>
                      <SelectItem value="upi">📱 UPI Payment</SelectItem>
                      <SelectItem value="card">💳 Card Payment</SelectItem>
                      <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="cheque">📝 Cheque Payment</SelectItem>
                      <SelectItem value="other">🔄 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
                  <Input
                    type="number"
                    placeholder={`Enter amount (min: ${formatCurrency(total)})`}
                    value={amountPaid}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string or valid decimal numbers
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAmountPaid(value);
                      }
                    }}
                    step="0.01"
                    min={0}
                    className="text-lg p-3"
                    autoFocus
                  />
                  {amountPaid && parseFloat(amountPaid) < total && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-700 font-semibold">
                        Insufficient amount. Need at least {formatCurrency(total)}
                      </p>
                    </div>
                  )}
                  {amountPaid && parseFloat(amountPaid) > total && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-700 font-semibold">
                        Change to return: {formatCurrency(parseFloat(amountPaid) - total)}
                      </p>
                    </div>
                  )}
                  {amountPaid && parseFloat(amountPaid) === total && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-700 font-semibold">
                        Exact amount - No change required
                      </p>
                    </div>
                  )}
                </div>

                {/* Detailed Payment Options */}
                {paymentMethod === "cash" && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAmountPaid(total.toString())}
                      className="text-sm"
                    >
                      Exact Amount
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAmountPaid((total + 100).toString())}
                      className="text-sm"
                    >
                      +₹100
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAmountPaid((total + 500).toString())}
                      className="text-sm"
                    >
                      +₹500
                    </Button>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processSale}
                    disabled={isProcessing || !amountPaid || parseFloat(amountPaid) < total}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? "Processing..." : `Complete Sale ${formatCurrency(total)}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    </div>
  );
}