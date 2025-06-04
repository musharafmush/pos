
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POSRegister } from "@/components/pos/pos-register";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Calculator,
  CreditCard,
  Banknote,
  Users,
  Package,
  BarChart3,
  Settings,
  Keyboard,
  Grid3X3,
  List,
  Filter,
  Star,
  Clock,
  Receipt,
  Save,
  RotateCcw,
  Zap,
  TrendingUp,
  CheckCircle
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
  image?: string;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCashRegister, setShowCashRegister] = useState(false);
  
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

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'F1':
          event.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          event.preventDefault();
          setViewMode(viewMode === 'grid' ? 'list' : 'grid');
          break;
        case 'F3':
          event.preventDefault();
          clearCart();
          break;
        case 'F4':
          event.preventDefault();
          if (cart.length > 0) setShowPaymentDialog(true);
          break;
        case 'F9':
          event.preventDefault();
          setShowShortcuts(true);
          break;
        case 'Escape':
          setShowPaymentDialog(false);
          setShowShortcuts(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, viewMode]);

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      title: "Added to Cart",
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
    toast({
      title: "Cart Cleared",
      description: "All items removed from cart",
    });
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
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

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
        {/* Header */}
        <div className="bg-white border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Professional POS System</h1>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Enhanced Desktop Edition
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShortcuts(true)}
              >
                <Keyboard className="h-4 w-4" />
                Shortcuts
              </Button>
              
              <POSRegister />
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Products Section */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Search and Filters */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products by name or SKU... (F1)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid/List */}
            <div className="flex-1 overflow-auto">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product: Product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg text-green-600">
                            {formatCurrency(parseFloat(product.price))}
                          </span>
                          <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"}>
                            {product.stockQuantity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product: Product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-gray-500">{product.sku}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-bold text-lg text-green-600">
                              {formatCurrency(parseFloat(product.price))}
                            </span>
                            <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"}>
                              Stock: {product.stockQuantity}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="w-96 bg-white border-l flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart ({cart.length})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Customer Selection */}
              <Select 
                value={selectedCustomer?.id.toString() || ""} 
                onValueChange={(value) => {
                  const customer = customers.find((c: Customer) => c.id.toString() === value);
                  setSelectedCustomer(customer || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{item.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-4">
                {/* Discount */}
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Discount"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Payment (F4)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Process Payment
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-center">
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

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "F1", action: "Search Products" },
                { key: "F2", action: "Toggle View Mode" },
                { key: "F3", action: "Clear Cart" },
                { key: "F4", action: "Process Payment" },
                { key: "F9", action: "Show Shortcuts" },
                { key: "Esc", action: "Close Dialogs" },
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm">
                    {shortcut.key}
                  </span>
                  <span className="text-sm">{shortcut.action}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default POSEnhanced;
