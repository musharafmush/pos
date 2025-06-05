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
  Download
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
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

  // Filter products based on search term
  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    if (cart.length > 0) {
      toast({
        title: "Cart Cleared",
        description: "All items have been removed from cart",
      });
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

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
        tax: taxAmount.toFixed(2),
        taxRate: taxRate,
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
      console.log("Sale completed successfully:", saleResult);

      // Update payment tracking
      updatePaymentTracking(paymentMethod, paidAmount);

      toast({
        title: "✅ Sale Completed!",
        description: `Transaction successful for ${formatCurrency(total)}${paidAmount > total ? `. Change: ${formatCurrency(paidAmount - total)}` : ''}`,
        variant: "default",
      });

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
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

  // Printing receipt functionality
  const printReceipt = (receiptData: any) => {
    const receiptContent = `
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: monospace; }
          .receipt { width: 280px; padding: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .line { border-bottom: 1px dashed #000; margin: 5px 0; }
          .item-row { display: flex; justify-content: space-between; }
          .item-row .item { flex: 2; }
          .item-row .qty { flex: 1; text-align: center; }
          .item-row .price { flex: 1; text-align: right; }
          .footer { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="text-center">
            <h2>Receipt</h2>
            <p>Bill Number: ${receiptData.billNumber}</p>
            <p>Date: ${receiptData.billDate}</p>
          </div>
          <div class="line"></div>
          <div>
            <p>Customer: ${receiptData.customerDetails.name}</p>
            <p>Salesman: ${receiptData.salesMan}</p>
          </div>
          <div class="line"></div>
          ${receiptData.items.map((item: any) => `
            <div class="item-row">
              <div class="item">${item.name}</div>
              <div class="qty">${item.quantity} x ${item.price}</div>
              <div class="price">${formatCurrency(item.total)}</div>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="text-right">
            <p>Subtotal: ${formatCurrency(receiptData.subtotal)}</p>
            <p>Discount: ${formatCurrency(receiptData.discount)}</p>
            <p>Tax (${receiptData.taxRate}%): ${formatCurrency(receiptData.taxAmount)}</p>
            <h3 style="margin-top: 10px;">Total: ${formatCurrency(receiptData.grandTotal)}</h3>
          </div>
          <div class="line"></div>
          <div class="text-right footer">
            <p>Amount Paid: ${formatCurrency(receiptData.amountPaid)}</p>
            <p>Change Due: ${formatCurrency(receiptData.changeDue)}</p>
            <p>Payment Method: ${receiptData.paymentMethod}</p>
          </div>
          <div class="line"></div>
          <div class="text-center">
            <p>Thank you!</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to print the receipt.",
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
          <div className="bg-white border-b border-gray-200px-6 py-4">
            <div className="flex items-center space-x-4 mb-4">
              <Button 
                onClick={() => searchInputRef.current?.focus()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan Barcode (F1)
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm text-gray-500">
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F1</kbd>
                        <p className="mt-2">Focus search bar</p>
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
                            ```python
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
                  <Banknote className="h-4 w-4 mr-2" />
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
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear (F12)
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

                  <Separator />

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

                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxable Amount:</span>
                    <span>{formatCurrency(taxableAmount)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">GST ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Net Amount */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="text-center">
                  <div className="text-sm font-medium opacity-90">Net Amount Payable</div>
                  <div className="text-4xl font-bold mt-2">{formatCurrency(total)}</div>
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
                  className="w-full hover:bg-gray-50"
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
          <Dialog open={showOpenRegister} onOpenChange={setShowOpenRegister}>
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
                    onClick={() => setShowOpenRegister(false)}
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
          <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
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
                    onClick={() => setShowWithdrawal(false)}
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
          <Dialog open={showCloseRegister} onOpenChange={setShowCloseRegister}>
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
      <Dialog open={showCashRegister} onOpenChange={setShowCashRegister}>
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
                    <div className="flex justify-between">
                      <div className="text-center">
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
                        setCashAmount(amount.toString());
                        setCashOperation('add');
                        setCashReason(`Cash payment ₹${amount}`);
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
                          setCashAmount(amount.toString());
                          setCashOperation('add');
                          setCashReason(`UPI payment ₹${amount}`);
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
                          setCashAmount(amount.toString());
                          setCashOperation('add');
                          setCashReason(`Card payment ₹${amount}`);
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
                        onClick={() => setCashOperation('add')}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-green-700 mb-1">Add Money</h4>
                      <p className="text-sm text-green-600">Increase register balance</p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all border-2 ${cashOperation === 'remove' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                        onClick={() => setCashOperation('remove')}>
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
                      setCashAmount("2000");
                      setCashOperation("remove");
                      setCashReason("Bank deposit ₹2000");
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
                      setCashAmount("5000");
                      setCashOperation("remove");
                      setCashReason("Bank deposit ₹5000");
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

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHoldSales(false)}
                >
                  Close
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