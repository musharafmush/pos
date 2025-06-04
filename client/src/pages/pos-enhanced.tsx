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
  Info
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
    if (cart.length === 0) return;

    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from cart",
    });
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

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
      const saleData = {
        customerId: selectedCustomer?.id,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          subtotal: item.total,
        })),
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        paymentMethod,
        amountPaid: paidAmount,
      };

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) throw new Error("Failed to process sale");

      toast({
        title: "Sale Completed!",
        description: `Transaction successful for ${formatCurrency(total)}`,
        variant: "default",
      });

      // Reset everything
      clearCart();
      setShowPaymentDialog(false);
      setBillNumber(`POS${Date.now()}`);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    } catch (error) {
      console.error("Sale processing error:", error);
      toast({
        title: "Transaction Failed",
        description: "Please try again or contact support",
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

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-blue-600' : ''}`}>
      <DashboardLayout>
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
                    onClick={clearCart} 
                    disabled={cart.length === 0}
                    className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                  <Button variant="outline" className="hover:bg-gray-50">
                    <Archive className="h-4 w-4 mr-2" />
                    Hold Sale
                  </Button>
                  <Button variant="outline" className="hover:bg-gray-50">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Recall Sale
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
                    onChange={(e) => setAmountPaid(e.target.value)}
                    step="0.01"
                    min={total}
                    className="text-lg p-3"
                  />
                  {parseFloat(amountPaid) > total && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-700 font-semibold">
                        Change to return: {formatCurrency(parseFloat(amountPaid) - total)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPaymentDialog(false);
                      setAmountPaid("");
                    }}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processSale}
                    disabled={isProcessing || (parseFloat(amountPaid) && parseFloat(amountPaid) < total)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? "Processing..." : "Complete Sale"}
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAmountPaid(total.toString())}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Use Exact Amount
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Customer Dialog */}
          <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
            <DialogContent className="max-w-md">
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
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewCustomerDialog(false);
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                      setNewCustomerEmail("");
                    }}
                    className="flex-1"
                    disabled={isCreatingCustomer}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewCustomer}
                    disabled={isCreatingCustomer || !newCustomerName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingCustomer ? "Creating..." : "Add Customer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Loading Overlay */}
          {(productsLoading || customersLoading) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="p-8">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-lg font-medium">Loading system data...</span>
                </div>
              </Card>
            </div>
          )}

          {/* Error Toast */}
          {productsError && (
            <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load products. Please refresh.</span>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </div>
  );
}