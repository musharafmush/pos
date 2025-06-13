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
  category?: {
    name: string;
  };
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

  // Filter products based on search term or barcode
  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle barcode submission
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Empty Barcode",
        description: "Please enter a barcode to scan",
        variant: "destructive",
      });
      return;
    }

    // Search for product by barcode
    const foundProduct = products.find((product: Product) => 
      product.barcode && product.barcode.toLowerCase() === barcodeInput.toLowerCase().trim()
    );

    if (foundProduct) {
      addToCart(foundProduct);
      setBarcodeInput("");
      toast({
        title: "Product Added",
        description: `${foundProduct.name} added via barcode scan`,
        variant: "default",
      });
    } else {
      // If not found by barcode, try SKU
      const foundBySku = products.find((product: Product) => 
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
          title: "Product Not Found",
          description: `No product found with barcode: ${barcodeInput}`,
          variant: "destructive",
        });
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

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    setPaymentMethod("cash");
    setBarcodeInput("");

    if (cart.length > 0) {
      toast({
        title: "Cart Cleared",
        description: "All items have been removed from cart",
      });
    }
  };

  // Calculate totals without tax
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  // Register opening
  const handleOpenRegister = () => {
    const amount = parseFloat(cashAmount);

    if (!amount || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    setOpeningCash(amount);
    setCashInHand(amount);
    setRegisterOpened(true);

    toast({
      title: "Register Opened",
      description: `Register opened with ${formatCurrency(amount)}`,
    });

    setCashAmount("");
    setShowOpenRegister(false);
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

    setCashAmount("");
    setCashReason("");
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

    setWithdrawalAmount("");
    setWithdrawalNote("");
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

      // Reset everything
      clearCart();
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

    // Handle Enter operation (e.g., adding product from search)
    const handleEnterOperation = () => {
      if (searchTerm && filteredProducts.length > 0) {
          // Assuming you want to add the first filtered product to the cart
          addToCart(filteredProducts[0]);
      } else if (barcodeInput.trim()) {
          handleBarcodeSubmit();
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
        clearCart();
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
      } else if (e.key === "Enter") {
          e.preventDefault();
          handleEnterOperation();
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
  }, [cart.length, discount, searchTerm, barcodeInput, filteredProducts]);

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

    const holdId = `HOLD-${Date.now()}`;
    const holdSale = {
      id: holdId,
      cart: [...cart],
      customer: selectedCustomer,
      discount: discount,
      notes: `Held sale at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date(),
      total: total
    };

    setHoldSales(prev => [...prev, holdSale]);
    clearCart();

    toast({
      title: "Sale Held",
      description: `Sale ${holdId} has been held successfully`,
    });
  };

  // Recall held sale
  const recallHeldSale = (holdSale: typeof holdSales[0]) => {
    if (cart.length > 0) {
      toast({
        title: "Cart Not Empty",
        description: "Please clear current cart before recalling a held sale",
        variant: "destructive",
      });
      return;
    }

    setCart(holdSale.cart);
    setSelectedCustomer(holdSale.customer);
    setDiscount(holdSale.discount);

    // Remove from held sales
    setHoldSales(prev => prev.filter(sale => sale.id !== holdSale.id));
    setShowHoldSales(false);

    toast({
      title: "Sale Recalled",
      description: `Sale ${holdSale.id} has been recalled successfully`,
    });
  };

  // Delete held sale
  const deleteHeldSale = (holdId: string) => {
    setHoldSales(prev => prev.filter(sale => sale.id !== holdId));
    toast({
      title: "Sale Deleted",
      description: `Held sale ${holdId} has been deleted`,
    });
  };

  // Initialize bill number and update bill details when bill number changes
  useEffect(() => {
    setBillNumber(`POS${Date.now()}`);
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

            
              
                  
                      
                          
                              
                                  
                                      Search Products (F1)
                                  
                                  
                                      Enter Operation (Enter)
                                  
                                  
                                      Browse Categories
                                  
                                  
                                      Refresh Data
                                  
                              

            <div className="flex items-center space-x-4 mb-4">
                <Button 
                  onClick={() => searchInputRef.current?.focus()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Products (F1)
                </Button>
                <Button 
                  onClick={handleEnterOperation}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Enter Operation (Enter)
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

                

                  
                      
                          Cash (Alt+C)
                      
                          UPI (Alt+U)
                      
                          Discount (Ctrl+D)
                      
                          Hold (Alt+H)
                      
                          
                              Recall (Alt+R)
                              {holdSales.length > 0 && (
                                  <Badge variant="secondary" className="ml-1 text-xs">
                                      {holdSales.length}
                                  </Badge>
                              )}
                          
                      
                          Clear (F12)
                      
                  

                

                  
                      System Online
                  
                  Terminal: POS-01
                  {currentTime}
                
              
            </div>

            {/* Bill Summary Sidebar */}
            <div className="w-96 bg-white border-l border-gray-200 p-6">
              
                
                  
                      Bill Summary
                  
                
                Bill #{billNumber}
                {currentDate}
              

              {/* Bill Details */}
              
                
                  
                      Items:
                      {cart.length}
                  
                  
                      Total Qty:
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  
                  
                      Gross Amount:
                      {formatCurrency(subtotal)}
                  

                  

                      Discount:
                      
                          
                          %
                      
                  

                  {discount > 0 && (
                    
                      Discount Amount:
                      -{formatCurrency(discountAmount)}
                    
                  )}

                
              

              {/* Net Amount Payable */}
              
                
                  
                      Net Amount Payable
                      {formatCurrency(total)}
                  
                
              

              {/* Action Buttons */}
              
                
                  
                      
                          Complete Payment (F10)
                      
                  

                
                  
                      
                          Clear All Items
                      
                  

                
                  
                      
                          Print Receipt
                      
                  
              
            </div>
          

          {/* Product Search Results Overlay */}
          {searchTerm && filteredProducts.length > 0 && (
            
              
                
                  Found {filteredProducts.length} products
                
              
              {filteredProducts.slice(0, 8).map((product: Product) => (
                
                  
                    
                      
                          {product.name}
                          {product.sku}
                          {product.barcode && (
                            📷 {product.barcode}
                          )}
                          {product.category && (
                            
                              {product.category.name}
                            
                          )}
                      
                      
                          {formatCurrency(parseFloat(product.price))}
                          {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                      
                    
                  
                
              ))}
            
          )}

          {/* Open Register Dialog */}
          
            
              
                
                  
                      
                          Open Cash Register
                      
                  
                

                  
                    Enter the opening cash amount you're placing in the register drawer.
                    This will be your starting balance for the day.
                  

                
                  
                      Opening Cash Amount
                      
                          
                              Enter opening amount
                          
                      
                  
                

                
                  
                      Cancel
                      
                          Open Register
                      
                  
                
              
            
          

          {/* Withdrawal Dialog */}
          
            
              
                
                  
                      
                          Cash Withdrawal
                      
                  
                

                  
                    Available Cash: {formatCurrency(cashInHand)}
                    Enter amount to withdraw from register
                  

                
                  
                      Withdrawal Amount
                      
                          
                              Enter withdrawal amount
                          
                      
                  
                

                
                  
                      Note (Optional)
                      
                          
                              e.g., Cash sent to bank
                          
                      
                  
                

                
                  
                      Cancel
                      
                          Process Withdrawal
                      
                  
                
              
            
          

          {/* Close Register Dialog */}
          
            
              
                
                  
                      
                          End of Day Summary
                      
                  
                

                
                  
                    {/* Opening Summary */}
                    
                      
                          Opening
                          
                              Opening Cash:
                              {formatCurrency(openingCash)}
                          
                      
                    

                    {/* Sales Summary */}
                    
                      
                          Sales Received
                          
                              Cash Payments:
                              {formatCurrency(cashReceived)}
                          
                          
                              UPI Payments:
                              {formatCurrency(upiReceived)}
                          
                          
                              Card Payments:
                              {formatCurrency(cardReceived)}
                          
                          
                              Bank Transfer:
                              {formatCurrency(bankReceived)}
                          
                          
                              Cheque:
                              {formatCurrency(chequeReceived)}
                          
                          
                              Other:
                              {formatCurrency(otherReceived)}
                          
                          Total Sales:
                          {formatCurrency(cashReceived + upiReceived + cardReceived + bankReceived + chequeReceived + otherReceived)}
                      
                    

                    {/* Outgoing Summary */}
                    
                      
                          Outgoing
                          
                              Withdrawals:
                              {formatCurrency(totalWithdrawals)}
                          
                          
                              Refunds:
                              {formatCurrency(totalRefunds)}
                          
                      
                    

                    {/* Final Summary */}
                    
                      
                          Final Cash Count
                          
                              Opening Cash:
                              {formatCurrency(openingCash)}
                          
                          
                              + Cash Payments:
                              {formatCurrency(cashReceived)}
                          
                          
                              + UPI (as cash):
                              {formatCurrency(upiReceived)}
                          
                          
                              - Withdrawals:
                              {formatCurrency(totalWithdrawals)}
                          
                          Expected Cash:
                          {formatCurrency(openingCash + cashReceived + upiReceived - totalWithdrawals)}
                          Current Cash:
                          {formatCurrency(cashInHand)}
                      
                    
                  
                

                
                  
                      Keep Open
                      
                          Close Register
                      
                  
                
              
            
          

          {/* Cash Register Management Modal */}
      
        
          
            
              
                
                    
                      
                          Cash Register Management
                      
                      Professional cash & payment tracking system
                    
                    
                        
                        Live System
                        06:29 am
                    
                  
                
              

              
                {/* Current Balance Display */}
                
                  
                      
                          Current Cash Balance
                          {formatCurrency(cashInHand)}
                          
                              
                                  Today's Sales
                                  ₹0
                              
                              
                                  Transactions
                                  0
                              
                          
                      
                  
                

                {/* Cash Payments Section */}
                
                  
                      
                          Cash Payments
                      
                      Quick Add
                  
                  

                      {[100, 500, 1000, 2000, 5000, 10000, 20000, 50000].map((amount) => (
                        
                            
                                
                                ₹{amount >= 1000 ? `${amount/1000}k` : amount}
                            
                        
                      ))}
                  
                

                {/* Digital Payments Section */}
                
                  
                      
                          Digital Payments
                      
                      UPI • Cards
                  
                  

                  {/* UPI Payments */}
                  
                    
                      {[250, 500, 1000, 2000].map((amount) => (
                        
                            
                                
                                ₹{amount}
                                UPI
                            
                        
                      ))}
                    
                  

                  {/* Card Payments */}
                  
                    
                      {[5000, 10000, 25000, 50000].map((amount) => (
                        
                            
                                
                                ₹{amount >= 1000 ? `${amount/1000}k` : amount}
                                Card
                            
                        
                      ))}
                    
                  
                
              

              {/* Transaction Type Selection */}
              
                
                  
                      
                          
                              📋
                          
                          Transaction Type
                      
                  

                  
                    
                      
                        
                            
                                Add Money
                            
                            Increase register balance
                        
                      
                    

                    
                      
                        
                            
                                Remove Money
                            
                            Decrease register balance
                        
                      
                    
                  
                
              

              {/* Cash Removal Section */}
              
                
                  
                      
                          Cash Removal
                      
                      Bank Deposits
                  
                  

                    
                      
                          
                              ₹2,000
                              Bank Deposit
                          
                      

                      
                          
                              ₹5,000
                              Bank Deposit
                          
                      
                  
                
              

              {/* Manual Entry Form */}
              
                
                  
                      Manual Entry
                      
                          
                              Amount (₹)
                              
                                  
                                      Enter amount
                                  
                              
                          
                          
                              Reason
                              
                                  
                                      Enter reason
                                  
                              
                          
                      
                      
                          
                              {cashOperation === 'add' ? 'Add to Register' : cashOperation === 'remove' ? 'Remove from Register' : 'Select Operation'}
                          
                      
                  
                
              
            
          
        
      

          {/* New Customer Dialog */}
          
            
              
                
                  
                      
                          Add New Customer
                      
                  
                

                
                  
                      Customer Name *
                      
                          
                              Enter customer name
                          
                      
                  
                

                
                  
                      Phone Number
                      
                          
                              Enter phone number
                          
                      
                  
                

                
                  
                      Email Address
                      
                          
                              Enter email address
                          
                      
                  
                

                
                  
                      Cancel
                      
                          Create Customer
                      
                  
                
              
            
          

          {/* Hold Sales Dialog */}
          
            
              
                
                  
                      
                          Held Sales ({holdSales.length})
                      
                  
                

                
                  {holdSales.length === 0 ? (
                    
                      
                          
                              No Held Sales
                          
                          Hold a sale using Alt+H to save it for later
                      
                    
                  ) : (
                    
                      {holdSales.map((holdSale) => (
                        
                          
                            
                              
                                
                                  {holdSale.id}
                                  
                                      {holdSale.cart.length} items
                                  
                                  
                                      {holdSale.cart.reduce((sum, item) => sum + item.quantity, 0)} units
                                  
                                

                                
                                  Customer: {holdSale.customer?.name || "Walk-in Customer"}
                                  Time: {holdSale.timestamp.toLocaleString()}
                                  {holdSale.discount > 0 && (
                                    Discount: {holdSale.discount}%
                                  )}
                                

                                
                                  Items: {holdSale.cart.map(item => `${item.name} (${item.quantity})`).join(", ")}
                                
                              

                              
                                
                                  
                                      Recall
                                  
                                  
                                      Delete
                                  
                                
                              
                            
                          
                        
                      ))}
                    
                  )}
                

                
                  
                      Close
                  
                
              
            
          

          {/* Printer Settings Dialog */}
          
            
              
                
                  
                      
                          Receipt & Printer Settings
                      
                  
                

                
                  {/* Settings Form */}
                  
                    
                      
                          Business Name
                          
                              
                                  Your Business Name
                              
                          
                      
                    

                    
                      
                          Business Address
                          
                              
                                  Business Address
                              
                              
                    

                    
                      
                          Phone Number
                          
                              
                                  (123) 456-7890
                              
                          
                      
                    

                    
                      
                          Tax ID / GST Number
                          
                              
                                  Your tax ID number
                              
                          
                      
                    

                    
                      
                          Receipt Footer
                          
                              
                                  Custom message for receipt footer
                              
                              
                    

                    
                      
                          
                              Show Logo on Receipt
                              
                          
                          
                              Auto Print After Sale
                              
                          
                      
                  

                  
                      
                          Default Printer
                          
                              
                                  
                                      Select a printer
                                  
                                  
                                      System Default Printer
                                  
                                  
                                      Thermal Receipt Printer
                                  
                                  
                                      Office Inkjet Printer
                                  
                                  
                                      Laser Printer
                                  
                              
                          
                      
                  
                

                {/* Receipt Preview */}
                
                  
                      Receipt Preview
                      
                        
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
                      
                    
                  

                  
                    
                      
                          
                              Print Test
                          
                      
                    
                  
                
              

              
                
                  
                      Cancel
                      
                          
                              Save Settings
                          
                      
                  
                
              
            
          

          {/* Payment Dialog */}
          
            
              
                
                  
                      
                          Complete Payment
                      
                  
                

                
                  
                      {formatCurrency(total)}
                      Amount to Pay
                  
                

                
                  
                      Payment Method
                      
                          
                              
                                  
                              
                              
                                  💵 Cash Payment
                              
                              
                                  📱 UPI Payment
                              
                              
                                  💳 Card Payment
                              
                              
                                  🏦 Bank Transfer
                              
                              
                                  📝 Cheque Payment
                              
                              
                                  🔄 Other
                              
                          
                      
                  
                

                
                  
                      Amount Received
                      
                          
                              Enter amount (min: {formatCurrency(total)})
                          
                      
                      {amountPaid && parseFloat(amountPaid) < total && (
                        
                          
                            Insufficient amount. Need at least {formatCurrency(total)}
                          
                        
                      )}
                      {amountPaid && parseFloat(amountPaid) > total && (
                        
                          
                            Change to return: {formatCurrency(parseFloat(amountPaid) - total)}
                          
                        
                      )}
                      {amountPaid && parseFloat(amountPaid) === total && (
                        
                          
                            Exact amount - No change required
                          
                        
                      )}
                  
                

                {/* Detailed Payment Options */}
                {paymentMethod === "cash" && (
                  
                    
                      
                          Exact Amount
                      
                      
                          +₹100
                      
                      
                          +₹500
                      
                    
                  
                )}

                
                  
                      Cancel
                      
                          {isProcessing ? "Processing..." : `Complete Sale ${formatCurrency(total)}`}
                      
                  
                
              
            
          
        
    
  
The code adds an "Enter Operation" button with associated functionality and updates the help text.```text