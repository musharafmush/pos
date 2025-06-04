
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
  Percent
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
      setAmountPaid("");
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

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN');

  return (
    <div className="h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
      {/* Top Blue Header */}
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between border-b border-blue-500">
        <div className="flex items-center space-x-4">
          <div className="bg-white text-blue-600 p-2 rounded-lg">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Awesome Shop POS Pro</h1>
            <p className="text-blue-100 text-sm">Real-time Point of Sale System</p>
          </div>
          
          <div className="flex items-center space-x-2 ml-8">
            <Badge className="bg-green-500 text-white">
              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
              System Ready
            </Badge>
            <Badge className="bg-blue-500 text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              Product Catalog
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-blue-100">Bill Number</div>
            <div className="font-mono font-bold">{billNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Date & Time</div>
            <div className="font-mono">{currentDate} • {currentTime}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Total Amount</div>
            <div className="text-2xl font-bold text-green-300">{formatCurrency(total)}</div>
          </div>
          <Button variant="outline" className="bg-purple-600 border-purple-400 text-white hover:bg-purple-700">
            Shortcuts (F9)
          </Button>
        </div>
      </div>

      {/* Customer Section */}
      <div className="bg-white text-gray-800 px-6 py-4 border-b">
        <div className="grid grid-cols-5 gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-gray-600">Sales Person</label>
            <div className="font-semibold">Sales Executive</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Customer Search (F4)</label>
            <div className="relative">
              <Input
                placeholder="Search by name, phone..."
                className="bg-gray-50"
                value={selectedCustomer?.name || ""}
                readOnly
              />
              <Button 
                size="sm" 
                className="absolute right-1 top-1 h-6 bg-purple-600 hover:bg-purple-700"
                onClick={() => setSelectedCustomer(null)}
              >
                <UserPlus className="h-3 w-3" />
                New Customer (F12)
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Customer Name</label>
            <div className="font-semibold">{selectedCustomer?.name || "Walk-in Customer"}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone Number</label>
            <div>{selectedCustomer?.phone || "Phone number"}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Address</label>
            <div>{selectedCustomer?.email || "Customer address"}</div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white text-gray-800 px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Scan className="h-4 w-4 mr-2" />
            Scan (F1)
          </Button>
          <Button variant="outline" className="border-gray-300">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button variant="outline" className="border-gray-300">
            <Calendar className="h-4 w-4 mr-2" />
            Browse (F2)
          </Button>
          <Button variant="outline" className="border-gray-300">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending (F3)
          </Button>
          <div className="text-sm text-gray-600">
            Last Update: {currentTime}
          </div>
          <Button variant="outline" className="border-gray-300 ml-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh (F5)
          </Button>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Scan barcode or enter product code... (Press F1 to focus scanner)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg py-3 pl-12"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-gray-400">
              <div className="flex flex-col">
                <div className="w-1 h-3 bg-gray-400"></div>
                <div className="w-1 h-3 bg-gray-400 mt-1"></div>
                <div className="w-1 h-3 bg-gray-400 mt-1"></div>
              </div>
              <Search className="h-4 w-4" />
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
            <Search className="h-4 w-4 mr-2" />
            Find Product
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 bg-white text-gray-800 p-6">
          {/* Shopping Cart Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg mb-4">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-bold">Shopping Cart ({cart.length} items • {cart.reduce((sum, item) => sum + item.quantity, 0)} qty)</h2>
            </div>
          </div>

          {/* Cart Content */}
          <div className="min-h-96 bg-gray-50 rounded-b-lg p-6">
            {cart.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-300 mb-4">
                  <ShoppingCart className="h-24 w-24 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Cart is empty</h3>
                <p className="text-gray-500 mb-4">Scan a product or browse catalog to start billing</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded mr-2">📦</span>
                    Press F1 to focus scanner
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded mr-2">🔍</span>
                    Press F2 to browse products
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded mr-2">📊</span>
                    Press F3 for trending items
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded mr-2">💳</span>
                    Press F10 to checkout
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(parseFloat(item.price))} each</p>
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
                          <div className="font-bold text-lg text-green-600">{formatCurrency(item.total)}</div>
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

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-between mt-6 p-4 bg-gray-100 rounded-lg">
            <div className="flex space-x-2">
              <Button variant="outline" className="text-gray-700">
                <Archive className="h-4 w-4 mr-2" />
                Hold (Alt+H)
              </Button>
              <Button variant="outline" className="text-gray-700">
                <RotateCcw className="h-4 w-4 mr-2" />
                Recall (Alt+R)
              </Button>
              <Button variant="outline" className="text-gray-700">
                <Percent className="h-4 w-4 mr-2" />
                Discount (Ctrl+D)
              </Button>
              <Button variant="outline" className="text-gray-700">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help (F9)
              </Button>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System Ready
              </span>
              <span>User: Admin</span>
              <span>Terminal: POS-PRO-01</span>
              <span>Products: {products.length}</span>
              <span className="text-orange-600">Trending: 8</span>
              <span>Customers: {customers.length}</span>
              <span className="text-red-600">⏰ {currentTime}</span>
            </div>
          </div>
        </div>

        {/* Bill Summary Section */}
        <div className="w-80 bg-gradient-to-b from-purple-600 to-purple-800 text-white p-6">
          <div className="bg-purple-700 p-4 rounded-lg mb-6">
            <div className="flex items-center mb-2">
              <Receipt className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-bold">Bill Summary</h2>
            </div>
            <div className="text-purple-200 text-sm">#{billNumber}</div>
            <div className="text-purple-200 text-sm">{currentDate} • {currentTime}</div>
          </div>

          {/* Basic Details */}
          <div className="bg-purple-700 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-3">
              <Calculator className="h-4 w-4 mr-2" />
              <h3 className="font-semibold">Basic Details</h3>
            </div>
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
            </div>
          </div>

          {/* Discounts & Charges */}
          <div className="bg-purple-700 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-3">
              <Percent className="h-4 w-4 mr-2" />
              <h3 className="font-semibold">Discounts & Charges</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Cash Discount (0%)</span>
                <span>{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>{formatCurrency(taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-purple-700 p-4 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <User className="h-4 w-4 mr-2" />
              <h3 className="font-semibold">Additional Info</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{selectedCustomer?.name || "Walk-in Customer"}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Person</span>
                <span>Sales Executive</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Net Amount */}
          <div className="bg-yellow-500 text-black p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold">💰 Net Amount Payable</span>
            </div>
            <div className="text-3xl font-bold mt-2">{formatCurrency(total)}</div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline" 
              className="w-full bg-red-500 hover:bg-red-600 text-white border-red-400"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear (F11)
            </Button>
            
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setSelectedCustomer(null)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Customer (F12)
            </Button>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
              onClick={() => setShowPaymentDialog(true)}
              disabled={cart.length === 0}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Complete Payment (F10)
            </Button>

            <Button
              variant="outline"
              className="w-full border-white text-white hover:bg-white hover:text-purple-800"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Test Print Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Available Products (when searching) */}
      {searchTerm && (
        <div className="absolute top-64 left-6 right-96 bg-white text-gray-800 border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
          {filteredProducts.map((product: Product) => (
            <div
              key={product.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b"
              onClick={() => {
                addToCart(product);
                setSearchTerm("");
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">{product.name}</h4>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{formatCurrency(parseFloat(product.price))}</div>
                  <div className="text-sm text-gray-500">Stock: {product.stockQuantity}</div>
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
