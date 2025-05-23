import { useState, useEffect } from "react";
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
  IndianRupeeIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatCurrency } from "@/lib/currency";
import type { Product, Customer } from "@shared/schema";

interface CartItem extends Product {
  quantity: number;
  total: number;
  itemDiscount?: number;
}

interface HoldSale {
  id: string;
  cart: CartItem[];
  customer: Customer | null;
  timestamp: Date;
  subtotal: number;
}

export default function POSEnhanced() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [taxRate, setTaxRate] = useState(18); // GST rate
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [quickSaleMode, setQuickSaleMode] = useState(false);
  const [holdSales, setHoldSales] = useState<HoldSale[]>([]);
  const [showHoldSales, setShowHoldSales] = useState(false);
  const [showItemDiscountDialog, setShowItemDiscountDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [itemDiscountValue, setItemDiscountValue] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Mock products data for demo (replace with actual API when available)
  const products = [
    { id: 1, name: "Smartphone", price: "15000", stockQuantity: 50, sku: "PHONE001", active: true },
    { id: 2, name: "Rice (1kg)", price: "80", stockQuantity: 200, sku: "RICE001", active: true },
    { id: 3, name: "T-Shirt", price: "500", stockQuantity: 30, sku: "TSHIRT001", active: true },
    { id: 4, name: "Headphones", price: "2500", stockQuantity: 15, sku: "AUDIO001", active: true },
    { id: 5, name: "Notebook", price: "150", stockQuantity: 100, sku: "BOOK001", active: true },
  ];

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Enhanced calculation functions
  const calculateItemDiscount = (price: number, discount: number, type: 'percentage' | 'fixed') => {
    if (type === 'percentage') {
      return (price * discount) / 100;
    }
    return discount;
  };

  const calculateTotalDiscount = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = calculateTotalDiscount();
  const taxableAmount = subtotal - totalDiscount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const changeDue = amountPaid ? Math.max(0, parseFloat(amountPaid) - grandTotal) : 0;

  // Enhanced POS functions
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        ...product,
        quantity: 1,
        total: parseFloat(product.price)
      };
      setCart(prev => [...prev, newItem]);
    }
    
    // Clear search in quick sale mode
    if (quickSaleMode) {
      setSearchTerm("");
    }
  };

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

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const holdCurrentSale = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot hold an empty cart"
      });
      return;
    }
    
    const saleId = `HOLD-${Date.now()}`;
    const newHoldSale: HoldSale = {
      id: saleId,
      cart: [...cart],
      customer: selectedCustomer,
      timestamp: new Date(),
      subtotal: subtotal
    };
    
    setHoldSales(prev => [...prev, newHoldSale]);
    clearSale();
    
    toast({
      title: "Sale Held Successfully",
      description: `Sale ${saleId} has been saved`
    });
  };

  const recallHoldSale = (holdSale: HoldSale) => {
    setCart(holdSale.cart);
    setSelectedCustomer(holdSale.customer);
    setHoldSales(prev => prev.filter(sale => sale.id !== holdSale.id));
    setShowHoldSales(false);
    
    toast({
      title: "Sale Recalled",
      description: `Sale ${holdSale.id} loaded successfully`
    });
  };

  const clearSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    setNotes("");
    setLoyaltyPoints(0);
  };

  const applyItemDiscount = () => {
    if (selectedItemIndex >= 0) {
      setCart(prev => prev.map((item, index) => {
        if (index === selectedItemIndex) {
          const discountAmount = calculateItemDiscount(parseFloat(item.price), itemDiscountValue, 'percentage');
          const discountedPrice = parseFloat(item.price) - discountAmount;
          return {
            ...item,
            itemDiscount: itemDiscountValue,
            total: discountedPrice * item.quantity
          };
        }
        return item;
      }));
      
      setShowItemDiscountDialog(false);
      setItemDiscountValue(0);
      setSelectedItemIndex(-1);
    }
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before processing sale"
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
          price: parseFloat(item.price),
          total: item.total
        })),
        subtotal: subtotal,
        discount: totalDiscount,
        tax: taxAmount,
        total: grandTotal,
        paymentMethod,
        amountPaid: parseFloat(amountPaid) || 0,
        notes,
        loyaltyPointsUsed: loyaltyPoints
      };

      const response = await apiRequest("/api/sales", {
        method: "POST",
        body: JSON.stringify(saleData),
      });

      toast({
        title: "Sale Completed",
        description: `Sale processed successfully. Order #${response.orderNumber}`
      });

      // Clear the sale
      clearSale();
      setShowPaymentDialog(false);

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

    } catch (error) {
      toast({
        title: "Sale Failed",
        description: "Failed to process sale. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            holdCurrentSale();
            break;
          case 'p':
            e.preventDefault();
            if (cart.length > 0) setShowPaymentDialog(true);
            break;
          case 'n':
            e.preventDefault();
            clearSale();
            break;
          case 'f':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length]);

  return (
    <DashboardLayout>
      <div className="h-full flex bg-gray-50">
        {/* Left Panel - Products */}
        <div className="w-1/2 bg-white border-r">
          <div className="p-4 border-b bg-blue-50">
            <h2 className="text-xl font-bold text-blue-900 mb-3 flex items-center">
              <ShoppingCartIcon className="mr-2" />
              Enhanced Desktop POS
            </h2>
            
            {/* Search and Quick Actions */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search-input"
                  placeholder="Search products or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={quickSaleMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickSaleMode(!quickSaleMode)}
              >
                Quick Sale
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={holdCurrentSale}
                disabled={cart.length === 0}
              >
                <PauseIcon className="h-4 w-4 mr-1" />
                Hold (Ctrl+H)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHoldSales(true)}
                disabled={holdSales.length === 0}
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                Recall ({holdSales.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSale}
                disabled={cart.length === 0}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Clear (Ctrl+N)
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="p-4 h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(parseFloat(product.price))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Stock: {product.stockQuantity} | SKU: {product.sku}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart and Checkout */}
        <div className="w-1/2 bg-white flex flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-900">Customer</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerSearch(true)}
              >
                <UserIcon className="h-4 w-4 mr-1" />
                Select Customer
              </Button>
            </div>
            {selectedCustomer ? (
              <div className="bg-white p-2 rounded border">
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Walk-in Customer</div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.itemDiscount && (
                        <Badge variant="secondary" className="text-xs">
                          {item.itemDiscount}% off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <MinusIcon className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <PlusIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(item.price))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItemIndex(index);
                            setShowItemDiscountDialog(true);
                          }}
                        >
                          <PercentIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <TrashIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals and Checkout */}
          <div className="p-4 border-t bg-gray-50">
            {/* Discount Section */}
            <div className="flex gap-2 mb-3">
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">% Discount</SelectItem>
                  <SelectItem value="fixed">₹ Fixed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Discount"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24"
              />
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({taxRate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full h-12 text-lg"
              onClick={() => setShowPaymentDialog(true)}
              disabled={cart.length === 0}
            >
              <CreditCardIcon className="mr-2" />
              Checkout (Ctrl+P)
            </Button>
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Complete the sale transaction
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount Paid</Label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              {changeDue > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm font-medium text-green-800">
                    Change Due: {formatCurrency(changeDue)}
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="h-20"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <div className="text-lg font-bold">
                  Total: {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={processSale}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Complete Sale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer Search Dialog */}
        <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerSearch(false);
                }}
              >
                Walk-in Customer
              </Button>
              {customers?.map((customer: Customer) => (
                <Button
                  key={customer.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerSearch(false);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Hold Sales Dialog */}
        <Dialog open={showHoldSales} onOpenChange={setShowHoldSales}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Held Sales ({holdSales.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {holdSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => recallHoldSale(sale)}
                >
                  <div>
                    <div className="font-medium">{sale.id}</div>
                    <div className="text-sm text-gray-500">
                      {sale.cart.length} items • {formatCurrency(sale.subtotal)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {sale.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Recall
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Item Discount Dialog */}
        <Dialog open={showItemDiscountDialog} onOpenChange={setShowItemDiscountDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Item Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Discount Percentage</Label>
                <Input
                  type="number"
                  value={itemDiscountValue}
                  onChange={(e) => setItemDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="Enter discount %"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowItemDiscountDialog(false)}>
                Cancel
              </Button>
              <Button onClick={applyItemDiscount}>
                Apply Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}