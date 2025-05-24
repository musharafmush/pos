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
import { SearchIcon, UserIcon, CreditCardIcon, PrinterIcon, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatCurrency } from "@/lib/currency";
import type { Product, Customer } from "@shared/schema";

interface CartItem extends Product {
  quantity: number;
  total: number;
}

export default function POSClassic() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18); // GST rate
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Filter products based on search
  const filteredProducts = products?.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const netAmount = taxableAmount + taxAmount;

  // Add product to cart
  const addToCart = (product: Product) => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1, total: price }];
      }
    });
  };

  // Update quantity
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          return { ...item, quantity: newQuantity, total: newQuantity * price };
        }
        return item;
      })
    );
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to cart before processing sale",
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
          unitPrice: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
          total: item.total,
        })),
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: netAmount,
        paymentMethod,
        amountPaid: parseFloat(amountPaid) || netAmount,
      };

      await apiRequest("POST", "/api/sales", saleData);

      toast({
        title: "Sale completed successfully! 🎉",
        description: `Sale of ${formatCurrency(netAmount)} processed`,
      });

      // Clear cart and reset form
      setCart([]);
      setSelectedCustomer(null);
      setAmountPaid("");
      setDiscount(0);
      setShowPaymentDialog(false);
      
      // Refresh products to update stock
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    } catch (error: any) {
      toast({
        title: "Sale failed",
        description: error.message || "Failed to process sale",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, product: Product) => {
    if (e.key === 'Enter') {
      addToCart(product);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-screen bg-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-300 border-b-2 border-gray-400 p-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-bold text-gray-800">GOFRUGAL</h1>
              <span className="text-lg text-gray-700">Sales</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Bill No: {Date.now().toString().slice(-6)}</span>
              <span className="text-sm text-gray-700">Date: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 h-full">
          {/* Left Panel - Customer & Product Search */}
          <div className="col-span-8 space-y-2">
            {/* Customer Section */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="py-2 bg-blue-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  QuickEdit Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <Label className="text-xs font-semibold">Code*</Label>
                    <Select onValueChange={(value) => {
                      const customer = customers?.find((c: Customer) => c.id.toString() === value);
                      setSelectedCustomer(customer || null);
                    }}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Name*</Label>
                    <Input 
                      className="h-8" 
                      value={selectedCustomer?.name || ""} 
                      placeholder="Customer Name"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Door/Flat</Label>
                    <Input className="h-8" placeholder="Address" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Street</Label>
                    <Input className="h-8" placeholder="Street" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Search */}
            <Card className="border-2 border-green-200">
              <CardContent className="py-2">
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <Card className="flex-1 border-2 border-gray-200">
              <CardContent className="p-1">
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {filteredProducts.slice(0, 20).map((product: Product) => (
                    <div
                      key={product.id}
                      className="bg-white border rounded p-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                      onClick={() => addToCart(product)}
                      onKeyPress={(e) => handleKeyPress(e, product)}
                      tabIndex={0}
                    >
                      <div className="text-xs font-semibold truncate">{product.name}</div>
                      <div className="text-xs text-gray-600">{product.sku}</div>
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </div>
                      <div className="text-xs text-blue-600">Stock: {product.stockQuantity}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cart Items Table */}
            <Card className="flex-1 border-2 border-orange-200">
              <CardContent className="p-1">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-8 text-center">S.No</TableHead>
                      <TableHead className="h-8">Code</TableHead>
                      <TableHead className="h-8">Description</TableHead>
                      <TableHead className="h-8 text-center">Qty</TableHead>
                      <TableHead className="h-8 text-right">Rate</TableHead>
                      <TableHead className="h-8 text-right">Amount</TableHead>
                      <TableHead className="h-8 text-center">Stock</TableHead>
                      <TableHead className="h-8 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={item.id} className="text-sm">
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-center">{item.stockQuantity}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 w-6 p-0"
                            onClick={() => removeFromCart(item.id)}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cart.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          No items in cart. Click on products to add them.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Billing Details */}
          <div className="col-span-4 space-y-2">
            {/* Delivery & Sales Info */}
            <Card className="border-2 border-purple-200">
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="font-semibold">Sales Man</Label>
                    <Input className="h-6 text-xs" value="Admin" readOnly />
                  </div>
                  <div>
                    <Label className="font-semibold">Delivery Boy</Label>
                    <Select>
                      <SelectTrigger className="h-6">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boy1">Delivery Boy 1</SelectItem>
                        <SelectItem value="boy2">Delivery Boy 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Details */}
            <Card className="flex-1 border-2 border-green-200 bg-gradient-to-b from-green-50 to-blue-50">
              <CardContent className="py-2">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tax Amt (incl)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surcharge (incl)</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Amt</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Item Discount</span>
                    <Input 
                      className="h-6 w-20 text-right" 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Discount</span>
                    <span>{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill Scheme %</span>
                    <span>0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill Scheme amt</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coupon Discount</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Amt</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surcharge</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge %</span>
                    <span>0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freight Amt</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packing charge</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other charge</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra charges</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RoundOff Amt</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R.O.I Avg%</span>
                    <span>0.00</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Album Charge</span>
                    <span className="text-blue-600">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Amount Display */}
            <Card className="border-4 border-blue-500 bg-blue-50">
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-700">Net Amount</div>
                  <div className="text-4xl font-bold text-blue-600">
                    {formatCurrency(netAmount)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowPaymentDialog(true)}
                disabled={cart.length === 0}
              >
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Pay
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCart([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Complete the sale for {formatCurrency(netAmount)}
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
                  placeholder={netAmount.toString()}
                />
              </div>
              
              {paymentMethod === "cash" && parseFloat(amountPaid) > netAmount && (
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-semibold">Change: {formatCurrency(parseFloat(amountPaid) - netAmount)}</div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={processSale}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Calculator className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Complete Sale
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}