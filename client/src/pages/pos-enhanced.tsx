
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
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Receipt,
  UserPlus,
  RotateCcw,
  Monitor,
  Zap,
  Package,
  DollarSign
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
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
          description: "Failed to load products",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) throw new Error("Failed to fetch customers");
        return await response.json();
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
        description: `${product.name} is out of stock`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stockQuantity} items available`,
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
      title: "Added to Cart",
      description: `${product.name} added successfully`,
    });

    setSearchTerm("");
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.id !== productId));
    toast({
      title: "Removed from Cart",
      description: "Item removed successfully",
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
        title: "Insufficient Stock",
        description: `Only ${product.stockQuantity} items available`,
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
    toast({
      title: "Cart Cleared",
      description: "All items removed from cart",
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
        title: "Error",
        description: "Customer name is required",
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
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedCustomer(newCustomer);
      
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setShowNewCustomerDialog(false);

      toast({
        title: "Customer Created",
        description: `${newCustomer.name} has been added successfully`,
      });
      
    } catch (error) {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create customer",
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
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    const paidAmount = parseFloat(amountPaid) || total;
    if (paidAmount < total) {
      toast({
        title: "Error",
        description: "Insufficient payment amount",
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
        title: "Sale Completed",
        description: `Sale processed successfully for ${formatCurrency(total)}`,
      });

      clearCart();
      setShowPaymentDialog(false);
      setBillNumber(`POS${Date.now()}`);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
    } catch (error) {
      console.error("Sale processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      } else if (e.key === "F11") {
        e.preventDefault();
        clearCart();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [cart.length]);

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN');

  return (
    <DashboardLayout>
      <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-800 border-b border-slate-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Enhanced POS System</h1>
                <p className="text-slate-300 text-sm">Professional Point of Sale</p>
              </div>
              
              <div className="flex items-center space-x-2 ml-8">
                <Badge className="bg-green-600 text-white border-green-500">
                  <Zap className="w-3 h-3 mr-1" />
                  Online
                </Badge>
                <Badge className="bg-blue-600 text-white border-blue-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-slate-300">Bill #</div>
                <div className="font-mono font-bold text-white">{billNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">Date & Time</div>
                <div className="font-mono text-sm text-white">{currentDate} • {currentTime}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">Total Amount</div>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(total)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="bg-white text-gray-800 px-6 py-4 border-b">
          <div className="grid grid-cols-4 gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-600">Cashier</label>
              <div className="font-semibold flex items-center">
                <User className="h-4 w-4 mr-1" />
                Admin User
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Customer</label>
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
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <div className="flex items-center">
                {selectedCustomer?.phone ? (
                  <>
                    <Phone className="h-3 w-3 mr-1 text-gray-500" />
                    {selectedCustomer.phone}
                  </>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => setSelectedCustomer(null)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setShowNewCustomerDialog(true)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white text-gray-800 px-6 py-4 border-b">
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => searchInputRef.current?.focus()}
            >
              <Scan className="h-4 w-4 mr-2" />
              Scan (F1)
            </Button>
            <Button variant="outline" className="border-gray-300">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" className="border-gray-300">
              <Package className="h-4 w-4 mr-2" />
              Browse
            </Button>
            <Button 
              variant="outline" 
              className="border-gray-300 ml-auto"
              onClick={() => queryClient.invalidateQueries()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Input
                ref={searchInputRef}
                placeholder="Scan barcode or search products... (Press F1 to focus)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-lg py-3 pl-12"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600">
              Products: {products.length} | Ready
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Cart Section */}
          <div className="flex-1 bg-white text-gray-800 p-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <h2 className="text-lg font-bold">Shopping Cart</h2>
                </div>
                <div className="text-sm">
                  {cart.length} items • {cart.reduce((sum, item) => sum + item.quantity, 0)} qty
                </div>
              </div>
            </div>

            <div className="min-h-96 bg-gray-50 rounded-lg p-6">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingCart className="h-24 w-24 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Cart is empty</h3>
                  <p className="text-gray-500 mb-4">Search and add products to start billing</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>📦 Press F1 to focus search</div>
                    <div>💳 Press F10 to checkout</div>
                    <div>🗑️ Press F11 to clear cart</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(parseFloat(item.price))} each
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-green-600">
                              {formatCurrency(item.total)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between mt-6 p-4 bg-gray-100 rounded-lg">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear (F11)
                </Button>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ● System Ready
                </Badge>
                <span>Terminal: POS-01</span>
                <span>{currentTime}</span>
              </div>
            </div>
          </div>

          {/* Bill Summary Section */}
          <div className="w-80 bg-slate-800 text-white p-6">
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <Receipt className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-bold">Bill Summary</h2>
              </div>
              <div className="text-slate-300 text-sm">#{billNumber}</div>
              <div className="text-slate-300 text-sm">{currentDate}</div>
            </div>

            {/* Calculations */}
            <div className="bg-slate-700 p-4 rounded-lg mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items Count</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantity</span>
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Amount</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <Separator className="bg-slate-600" />
                <div className="flex justify-between items-center">
                  <span>Discount</span>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-12 h-6 text-xs text-black"
                      min="0"
                      max="100"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Discount Amount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span>{formatCurrency(taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              </div>
            </div>

            {/* Net Amount */}
            <div className="bg-yellow-600 text-black p-4 rounded-lg mb-6">
              <div className="text-center">
                <div className="text-sm font-medium">Net Amount Payable</div>
                <div className="text-3xl font-bold mt-2">{formatCurrency(total)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
                onClick={() => setShowPaymentDialog(true)}
                disabled={cart.length === 0}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Payment (F10)
              </Button>

              <Button
                variant="outline" 
                className="w-full bg-red-600 hover:bg-red-700 text-white border-red-500"
                onClick={clearCart}
                disabled={cart.length === 0}
              >
                Clear Cart (F11)
              </Button>

              <Button
                variant="outline"
                className="w-full border-slate-500 text-slate-300 hover:bg-slate-700"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>

        {/* Product Search Results */}
        {searchTerm && filteredProducts.length > 0 && (
          <div className="absolute top-64 left-6 right-96 bg-white text-gray-800 border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
            {filteredProducts.slice(0, 10).map((product: Product) => (
              <div
                key={product.id}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => addToCart(product)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.sku}</p>
                    {product.category && (
                      <p className="text-xs text-blue-600">{product.category.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(parseFloat(product.price))}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {product.stockQuantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Complete Payment
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(total)}
                </div>
                <div className="text-sm text-gray-600">Amount to Pay</div>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="card">💳 Card</SelectItem>
                    <SelectItem value="upi">📱 UPI</SelectItem>
                    <SelectItem value="cheque">📝 Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Amount Paid</label>
                <Input
                  type="number"
                  placeholder={`Minimum: ${formatCurrency(total)}`}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  step="0.01"
                  min={total}
                />
                {parseFloat(amountPaid) > total && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: {formatCurrency(parseFloat(amountPaid) - total)}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
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
              <DialogTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Add New Customer
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  placeholder="Enter customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  placeholder="Enter email address"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-2 pt-4">
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
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isCreatingCustomer ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading State */}
        {productsLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
