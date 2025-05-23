import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatCurrency } from "@/lib/currency";
import type { Product, Customer } from "@shared/schema";

interface CartItem extends Product {
  quantity: number;
  total: number;
}

export default function POSGofrugal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
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

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 18; // GST rate
  const taxAmount = (subtotal * taxRate) / 100;
  const netAmount = subtotal + taxAmount;

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
        discount: 0,
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

  return (
    <div className="h-screen bg-gray-100 font-sans text-sm overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gray-300 border border-gray-400 h-8 flex items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <span className="font-bold text-gray-800">GOFRUGAL</span>
          <span className="text-gray-700">Sales</span>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <span>₹</span>
          <button className="bg-gray-200 border border-gray-400 px-2 py-1">_</button>
          <button className="bg-gray-200 border border-gray-400 px-2 py-1">□</button>
          <button className="bg-gray-200 border border-gray-400 px-2 py-1">×</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full">
        {/* Left Section */}
        <div className="flex-1 p-2">
          {/* Customer Information Panel */}
          <div className="bg-blue-100 border border-gray-400 mb-2">
            <div className="bg-blue-200 border-b border-gray-400 px-2 py-1 text-xs font-semibold">
              QuickEdit Customer
            </div>
            <div className="p-2 grid grid-cols-4 gap-2 text-xs">
              <div>
                <Label className="text-xs">Code*</Label>
                <Select onValueChange={(value) => {
                  const customer = customers?.find((c: Customer) => c.id.toString() === value);
                  setSelectedCustomer(customer || null);
                }}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="15643" />
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
                <Label className="text-xs">Name*</Label>
                <Input 
                  className="h-6 text-xs" 
                  value={selectedCustomer?.name || "SURYA"} 
                  placeholder="SURYA"
                />
              </div>
              <div>
                <Label className="text-xs">Door/No</Label>
                <Input className="h-6 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Street</Label>
                <Input className="h-6 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Select>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="address1">Address 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Sales Man</Label>
                  <Input className="h-6 text-xs" value="HoldSkills" readOnly />
                </div>
                <div>
                  <Label className="text-xs">Door Delivery</Label>
                  <Select defaultValue="no">
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Print</Label>
                  <Select defaultValue="yes">
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-gray-400 flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-200 text-xs h-8">
                  <TableHead className="border-r border-gray-400 text-center w-12">S.No</TableHead>
                  <TableHead className="border-r border-gray-400 text-center w-20">Code</TableHead>
                  <TableHead className="border-r border-gray-400">Description</TableHead>
                  <TableHead className="border-r border-gray-400 text-center w-16">Qty</TableHead>
                  <TableHead className="border-r border-gray-400 text-center w-20">Rate</TableHead>
                  <TableHead className="border-r border-gray-400 text-center w-24">Amount</TableHead>
                  <TableHead className="border-r border-gray-400 text-center w-16">Stock</TableHead>
                  <TableHead className="text-center w-16">M.R.P</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, index) => (
                  <TableRow key={item.id} className="text-xs h-6">
                    <TableCell className="border-r border-gray-300 text-center">{index + 1}</TableCell>
                    <TableCell className="border-r border-gray-300">{item.sku}</TableCell>
                    <TableCell className="border-r border-gray-300">{item.name}</TableCell>
                    <TableCell className="border-r border-gray-300 text-center">
                      <Input 
                        className="h-5 text-xs text-center border-0 p-0"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="border-r border-gray-300 text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="border-r border-gray-300 text-right">{formatCurrency(item.total)}</TableCell>
                    <TableCell className="border-r border-gray-300 text-center">{item.stockQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                  </TableRow>
                ))}
                {/* Empty rows to fill space */}
                {Array.from({ length: Math.max(0, 15 - cart.length) }, (_, i) => (
                  <TableRow key={`empty-${i}`} className="text-xs h-6">
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell className="border-r border-gray-300"></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Function Keys */}
          <div className="bg-gray-200 border border-gray-400 p-1 mt-2">
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div className="text-center">
                <div>F6</div>
                <div>Rs.100</div>
                <div>Ctrl = 1</div>
              </div>
              <div className="text-center">
                <div>F7</div>
                <div>Rs.500</div>
                <div>Ctrl = 2</div>
              </div>
              <div className="text-center">
                <div>F8</div>
                <div>Rs.1000</div>
                <div>Ctrl = 4</div>
              </div>
              <div className="text-center">
                <div>F9</div>
                <div>Rs.2000</div>
                <div>Ctrl = 5</div>
              </div>
              <div className="col-span-2"></div>
            </div>
          </div>

          {/* Product Selection Area */}
          <div className="bg-blue-100 border border-gray-400 p-2 mt-2">
            <div className="text-xs">Ctrl + W/H/S/T/O - Enter Name or press Enter</div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {products?.slice(0, 8).map((product: Product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-8 text-xs p-1 justify-start"
                  onClick={() => addToCart(product)}
                >
                  {product.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Function Key Bar */}
          <div className="bg-blue-800 text-white p-1 mt-2 grid grid-cols-12 gap-1 text-xs">
            <div className="text-center">F2<br/>ItemCode</div>
            <div className="text-center">F3<br/>SalesHis</div>
            <div className="text-center">F4<br/>QuikAdd Cust</div>
            <div className="text-center">F5<br/>CashDisc</div>
            <div className="text-center">F6<br/>ViewBills</div>
            <div className="text-center">F7<br/>Tender</div>
            <div className="text-center">F8<br/>ClearScreen</div>
            <div className="text-center">F9<br/>ReprintBill</div>
            <div className="text-center">F10<br/>CashHand</div>
            <div className="text-center">F11<br/>HoldBill</div>
            <div className="text-center">F12<br/>SelectCust</div>
            <div className="text-center">Close</div>
          </div>
        </div>

        {/* Right Section - Billing Details */}
        <div className="w-80 bg-gray-100 border-l border-gray-400 p-2">
          {/* Delivery Boy Section */}
          <div className="bg-blue-100 border border-gray-400 mb-2">
            <div className="bg-blue-200 border-b border-gray-400 px-2 py-1 text-xs font-semibold">
              DELIVERY BOY
            </div>
            <div className="p-2 text-xs">
              <Select>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="D" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="d1">Delivery Boy 1</SelectItem>
                  <SelectItem value="d2">Delivery Boy 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-gray-200 border border-gray-400 mb-2 p-2 text-xs">
            <div className="flex justify-between">
              <span>Bill No</span>
              <span className="font-bold">{Date.now().toString().slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bill Date</span>
              <span>{new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Billing Details */}
          <div className="bg-blue-100 border border-gray-400 flex-1">
            <div className="space-y-1 p-2 text-xs">
              <div className="flex justify-between">
                <span>Tax Amt (incl)</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Surcharge (incl)</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Gross Amt</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Item Discount</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Item Scheme amt</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Cash Bag %</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Cash Discount</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Bill Scheme %</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Bill Scheme amt</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Coupon Discount</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amt</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Surcharge</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge %</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Freight Amt</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Packing charge</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Other charge</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>Extra charges</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>RoundOff Amt</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>R.O.I Avg%</span>
                <span></span>
              </div>
              <div className="flex justify-between font-bold bg-blue-200 px-1">
                <span>Album Charge</span>
                <span>{formatCurrency(netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Net Amount Display */}
          <div className="bg-white border-2 border-blue-600 mt-4 p-4 text-center">
            <div className="text-lg font-bold text-blue-600">Net Amount</div>
            <div className="text-4xl font-bold text-blue-600">
              {formatCurrency(netAmount)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 mb-2"
              onClick={() => setShowPaymentDialog(true)}
              disabled={cart.length === 0}
            >
              Process Sale
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => setCart([])}
            >
              Clear Cart
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
              {isProcessing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}