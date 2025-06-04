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
import {
  Search,
  ShoppingCart,
  Scan,
  RefreshCw,
  TrendingUp,
  User,
  Phone,
  MapPin,
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
  HelpCircle,
  Archive,
  Percent,
  DollarSign,
  Monitor
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

function POSEnhanced() {
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

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cart functions
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
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
      description: `${product.name} added to cart`,
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
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
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

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
        amountPaid: parseFloat(amountPaid) || total,
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

      // Reset everything
      clearCart();
      setShowPaymentDialog(false);
      setBillNumber(`POS${Date.now()}`);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    } catch (error) {
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
      }
      if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      }
      if (e.key === "F11") {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [cart.length]);

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN');

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="bg-white text-blue-600 p-2 rounded-lg">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Awesome Shop POS Pro</h1>
            <p className="text-blue-100 text-sm">Professional Point of Sale System</p>
          </div>

          <div className="flex items-center space-x-2 ml-8">
            <Badge className="bg-green-500 text-white">
              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
              Online
            </Badge>
            <Badge className="bg-blue-500 text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              {products.length} Products
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-sm text-blue-100">Bill #</div>
            <div className="font-mono font-bold">{billNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Date & Time</div>
            <div className="font-mono text-sm">{currentDate} • {currentTime}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Total Amount</div>
            <div className="text-2xl font-bold text-green-300">{formatCurrency(total)}</div>
          </div>
        </div>
      </div>

      {/* Customer & Search Section */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Customer</label>
            <div className="font-semibold">{selectedCustomer?.name || "Walk-in Customer"}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone</label>
            <div>{selectedCustomer?.phone || "No phone"}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Sales Person</label>
            <div>Admin User</div>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => setSelectedCustomer(null)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Select Customer (F4)
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Scan barcode or search products... (Press F1 to focus)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg py-3 pl-12"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
            <Scan className="h-4 w-4 mr-2" />
            Scan (F1)
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh (F5)
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products/Cart Section */}
        <div className="flex-1 p-6 overflow-auto">
          <Card className="h-full">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Shopping Cart ({cart.length} items • {cart.reduce((sum, item) => sum + item.quantity, 0)} qty)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingCart className="h-24 w-24 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Cart is empty</h3>
                  <p className="text-gray-500 mb-6">Search and add products to start billing</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>🔍 Press F1 to focus search</div>
                    <div>💳 Press F10 to checkout</div>
                    <div>🗑️ Press F11 to clear cart</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{item.name}</h4>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(parseFloat(item.price))} each</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right min-w-24">
                            <div className="font-bold text-xl text-green-600">{formatCurrency(item.total)}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bill Summary Section */}
        <div className="w-80 bg-white border-l p-6">
          <Card className="mb-4">
            <CardHeader className="bg-purple-600 text-white">
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>Items Count:</span>
                <span className="font-semibold">{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount ({discount}%):</span>
                <span className="font-semibold text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({taxRate}%):</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline" 
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart (F11)
            </Button>

            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Customer (F4)
            </Button>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
              onClick={() => setShowPaymentDialog(true)}
              disabled={cart.length === 0}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Checkout (F10)
            </Button>
          </div>
        </div>
      </div>

      {/* Product Search Results */}
      {searchTerm && filteredProducts.length > 0 && (
        <div className="absolute top-32 left-6 right-96 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
          {filteredProducts.slice(0, 10).map((product: Product) => (
            <div
              key={product.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center"
              onClick={() => {
                addToCart(product);
                setSearchTerm("");
              }}
            >
              <div>
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-500">{product.sku}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatCurrency(parseFloat(product.price))}</div>
                <div className="text-sm text-gray-500">Stock: {product.stockQuantity}</div>
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
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(total)}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount Paid</label>
              <Input
                type="number"
                placeholder={`Enter amount (min: ${formatCurrency(total)})`}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
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
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={processSale}
                disabled={isProcessing || parseFloat(amountPaid) < total}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default POSEnhanced;