import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  ShoppingCart,
  Scan,
  RefreshCw,
  TrendingUp,
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
  Star,
  Heart,
  Settings,
  Filter,
  Grid,
  List,
  Eye,
  X
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
  const [cashInHand, setCashInHand] = useState(5000);
  const [cashOperation, setCashOperation] = useState<'add' | 'remove'>('add');
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      title: "✅ Added to Cart",
      description: `${product.name} added successfully`,
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

  // Cash register management
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

    toast({
      title: "Cash Updated",
      description: `${cashOperation === 'add' ? 'Added' : 'Removed'} ${formatCurrency(amount)}. Current cash: ${formatCurrency(newCashAmount)}`,
    });

    // Reset form
    setCashAmount("");
    setCashReason("");
    setShowCashRegister(false);
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
  }, [cart.length]);

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

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">

          {/* Modern Top Header */}
          <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-2xl shadow-lg">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Enhanced POS
                    </h1>
                    <p className="text-sm text-gray-500">Professional Point of Sale System</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Real-time Info Cards */}
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                      <div className="text-xs text-green-600 font-medium">Cash in Hand</div>
                      <div className="text-lg font-bold text-green-700">{formatCurrency(cashInHand)}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                      <div className="text-xs text-blue-600 font-medium">Cart Total</div>
                      <div className="text-lg font-bold text-blue-700">{formatCurrency(total)}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 px-4 py-2 rounded-xl">
                      <div className="text-xs text-purple-600 font-medium">Bill No.</div>
                      <div className="text-sm font-bold text-purple-700 font-mono">{billNumber}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setShowCashRegister(true)}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      Cash Register
                    </Button>
                    <Button
                      onClick={toggleFullscreen}
                      variant="outline"
                      size="sm"
                      className="bg-gray-50 hover:bg-gray-100"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-80px)]">

            {/* Left Panel - Products & Search */}
            <div className="flex-1 flex flex-col bg-white border-r border-gray-200">

              {/* Enhanced Search Bar */}
              <div className="p-6 border-b border-gray-100">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Input
                        ref={searchInputRef}
                        placeholder="Search products by name, SKU, or scan barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="text-lg py-4 pl-12 pr-16 border-2 border-gray-200 focus:border-blue-500 rounded-2xl bg-gray-50 focus:bg-white transition-all"
                      />
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="shrink-0"
                    >
                      {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Scan className="h-4 w-4 mr-2" />
                      Barcode Scanner
                    </Button>
                    <Button size="sm" variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Package className="h-4 w-4 mr-2" />
                      Categories
                    </Button>
                    <Button size="sm" variant="outline" className="bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    <div className="flex-1" />
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {products.length} products
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Selection - Compact */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Customer:</span>
                  </div>
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
                    <SelectTrigger className="w-64 bg-white">
                      <SelectValue placeholder="Select Customer">
                        {selectedCustomer?.name || "Walk-in Customer"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                      {customers?.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            {customer.phone && <div className="text-xs text-gray-500">{customer.phone}</div>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Products Grid/List */}
              <div className="flex-1 overflow-auto p-4">
                {searchTerm && filteredProducts.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Search Results ({filteredProducts.length})</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSearchTerm("")}
                        className="text-gray-500"
                      >
                        Clear Search
                      </Button>
                    </div>
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "space-y-2"}>
                      {filteredProducts.slice(0, 12).map((product: Product) => (
                        <Card 
                          key={product.id}
                          className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 group ${
                            viewMode === 'grid' ? 'aspect-square' : 'h-20'
                          }`}
                          onClick={() => addToCart(product)}
                        >
                          <CardContent className={`p-3 h-full flex ${viewMode === 'grid' ? 'flex-col justify-between' : 'items-center space-x-4'}`}>
                            {viewMode === 'grid' ? (
                              <>
                                <div className="text-center flex-1">
                                  <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">{product.name}</h4>
                                  <p className="text-xs text-gray-500 font-mono mb-2">{product.sku}</p>
                                  {product.category && (
                                    <Badge variant="outline" className="text-xs mb-2">
                                      {product.category.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600 mb-1">
                                    {formatCurrency(parseFloat(product.price))}
                                  </div>
                                  <div className={`text-xs ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                                  <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    {formatCurrency(parseFloat(product.price))}
                                  </div>
                                  <div className={`text-xs ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {product.stockQuantity > 0 ? `${product.stockQuantity} stock` : 'Out of stock'}
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : searchTerm ? (
                  <div className="text-center py-20">
                    <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                    <p className="text-gray-500">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Package className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-2xl font-semibold text-gray-600 mb-3">Start Searching</h3>
                    <p className="text-gray-500 mb-6">Use the search bar above to find products</p>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <kbd className="bg-blue-200 px-2 py-1 rounded text-xs">F1</kbd>
                        <p className="mt-1 text-blue-700">Focus search</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <kbd className="bg-green-200 px-2 py-1 rounded text-xs">F10</kbd>
                        <p className="mt-1 text-green-700">Quick checkout</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Cart & Bill */}
            <div className="w-96 bg-white flex flex-col">

              {/* Cart Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-xl">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Cart</h2>
                      <p className="text-sm text-gray-500">
                        {cart.length} items • {cart.reduce((sum, item) => sum + item.quantity, 0)} units
                      </p>
                    </div>
                  </div>
                  {cart.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Your cart is empty</h3>
                    <p className="text-gray-500 text-sm">Search and add products to get started</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-3">
                              <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                              <p className="text-xs text-gray-500 font-mono mb-2">{item.sku}</p>
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(parseFloat(item.price))} each
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-7 w-7 p-0 hover:bg-red-100"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-bold">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-7 w-7 p-0 hover:bg-green-100"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-blue-600">
                                {formatCurrency(item.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Bill Summary & Checkout */}
              {cart.length > 0 && (
                <div className="border-t border-gray-100 p-6 space-y-4">

                  {/* Bill Calculation */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                      <span className="font-semibold">{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Discount</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-16 h-7 text-center text-xs"
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount Amount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-600">GST ({taxRate}%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg py-4 h-auto font-semibold shadow-lg"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <CreditCard className="h-5 w-5 mr-3" />
                    Proceed to Payment
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Modern Cash Register Dialog */}
          <Dialog open={showCashRegister} onOpenChange={setShowCashRegister}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center text-2xl font-bold">
                  <Banknote className="h-8 w-8 mr-3 text-green-600" />
                  Cash Register Management
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Current Balance Display */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl border border-green-200">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">Current Cash in Hand</div>
                    <div className="text-4xl font-bold text-green-700">{formatCurrency(cashInHand)}</div>
                  </div>
                </div>

                {/* Add/Remove Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCashOperation('add')}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      cashOperation === 'add' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <Plus className="h-8 w-8 mx-auto mb-3 text-green-600" />
                    <div className="font-semibold text-green-700">Add Cash</div>
                    <div className="text-sm text-gray-600">Increase register balance</div>
                  </button>
                  <button
                    onClick={() => setCashOperation('remove')}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      cashOperation === 'remove' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <Minus className="h-8 w-8 mx-auto mb-3 text-red-600" />
                    <div className="font-semibold text-red-700">Remove Cash</div>
                    <div className="text-sm text-gray-600">Decrease register balance</div>
                  </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Enter Amount</label>
                  <Input
                    type="number"
                    placeholder="₹ 0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="text-2xl p-4 text-center font-bold rounded-xl"
                  />
                </div>

                {/* Reason Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Reason for Transaction</label>
                  <Input
                    placeholder="Enter reason (e.g., Cash sales, Bank deposit, etc.)"
                    value={cashReason}
                    onChange={(e) => setCashReason(e.target.value)}
                    className="p-3 rounded-xl"
                  />
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Add Cash Buttons */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCashAmount("1000");
                        setCashOperation("add");
                        setCashReason("Cash sales ₹1000");
                      }}
                      className="h-12 bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add ₹1000
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCashAmount("2000");
                        setCashOperation("add");
                        setCashReason("Cash sales ₹2000");
                      }}
                      className="h-12 bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add ₹2000
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCashAmount("5000");
                        setCashOperation("add");
                        setCashReason("UPI payment ₹5000");
                      }}
                      className="h-12 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      UPI ₹5000
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCashAmount("1000");
                        setCashOperation("remove");
                        setCashReason("Bank deposit ₹1000");
                      }}
                      className="h-12 bg-red-50 border-red-200 hover:bg-red-100 text-red-700"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Remove ₹1000
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCashRegister(false)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCashOperation}
                    className={`px-8 font-semibold ${
                      cashOperation === 'add' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {cashOperation === 'add' ? (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cash
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 mr-2" />
                        Remove Cash
                      </>
                    )}
                  </Button>
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
                <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl text-center border border-green-200">
                  <div className="text-4xl font-bold text-green-700 mb-2">
                    {formatCurrency(total)}
                  </div>
                  <div className="text-green-600">Amount to Pay</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash Payment</SelectItem>
                      <SelectItem value="card">💳 Card Payment</SelectItem>
                      <SelectItem value="upi">📱 UPI Payment</SelectItem>
                      <SelectItem value="cheque">📝 Cheque Payment</SelectItem>
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
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAmountPaid(value);
                      }
                    }}
                    step="0.01"
                    min={0}
                    className="text-lg p-3 rounded-xl"
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
                </div>

                {paymentMethod === "cash" && (
                  <div className="grid grid-cols-3 gap-2">
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
                    className="bg-green-600 hover:bg-green-700 text-white px-8"
                  >
                    {isProcessing ? "Processing..." : `Complete Sale`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </div>
  );
}