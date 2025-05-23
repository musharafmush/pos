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

export default function POSGofrugal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerDoor, setCustomerDoor] = useState("");
  const [customerStreet, setCustomerStreet] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [salesMan, setSalesMan] = useState("ADMIN");
  const [doorDelivery, setDoorDelivery] = useState("No");
  const [printOption, setPrintOption] = useState("Yes");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredProducts = products?.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * Number(item.price) }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, total: Number(product.price) }];
    });
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity, total: quantity * Number(item.price) }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = cartTotal * 0.18; // 18% GST
  const finalTotal = cartTotal + tax;
  const change = Number(amountPaid) - finalTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const saleData = {
        customerId: selectedCustomer ? parseInt(selectedCustomer) : null,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: cartTotal.toString(),
        tax: tax.toString(),
        total: finalTotal.toString(),
        paymentMethod,
        amountPaid: amountPaid || finalTotal.toString(),
        change: change > 0 ? change.toString() : "0",
        orderNumber: `ORD-${Date.now()}`
      };

      await apiRequest("/api/sales", {
        method: "POST",
        body: JSON.stringify(saleData),
      });

      // Update product stock
      for (const item of cart) {
        await apiRequest(`/api/products/${item.id}/stock`, {
          method: "PATCH",
          body: JSON.stringify({ quantity: -item.quantity }),
        });
      }

      toast({ title: "Success", description: "Sale completed successfully!" });
      setCart([]);
      setSelectedCustomer("");
      setAmountPaid("");
      setShowCheckout(false);
      setCustomerCode("");
      setCustomerName("");
      setCustomerDoor("");
      setCustomerStreet("");
      setCustomerAddress("");
      
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete sale", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, product: Product) => {
    if (e.key === 'Enter' || e.key === ' ') {
      addToCart(product);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-screen bg-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">GOFRUGAL</h1>
              <span className="text-lg">Sales</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span>Bill No: {Date.now().toString().slice(-6)}</span>
              <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
              <span>Time: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 p-3 h-full">
          {/* Left Panel - Customer & Product Search */}
          <div className="col-span-8 space-y-3">
            {/* Customer Section */}
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader className="py-2 bg-blue-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  QuickEdit Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-5 gap-3 text-sm">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Code*</Label>
                    <Input 
                      className="h-8 text-xs border-gray-300" 
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder="Customer Code"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Name*</Label>
                    <Input 
                      className="h-8 text-xs border-gray-300" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Door No.</Label>
                    <Input 
                      className="h-8 text-xs border-gray-300" 
                      value={customerDoor}
                      onChange={(e) => setCustomerDoor(e.target.value)}
                      placeholder="Door Number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Street</Label>
                    <Input 
                      className="h-8 text-xs border-gray-300" 
                      value={customerStreet}
                      onChange={(e) => setCustomerStreet(e.target.value)}
                      placeholder="Street"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Address</Label>
                    <Input 
                      className="h-8 text-xs border-gray-300" 
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Information */}
            <Card className="border-2 border-green-200 shadow-md">
              <CardHeader className="py-2 bg-green-50">
                <CardTitle className="text-sm">Sales Information</CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Sales Man</Label>
                    <Select value={salesMan} onValueChange={setSalesMan}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                        <SelectItem value="SALES1">SALES1</SelectItem>
                        <SelectItem value="SALES2">SALES2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Door Delivery</Label>
                    <Select value={doorDelivery} onValueChange={setDoorDelivery}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Print</Label>
                    <Select value={printOption} onValueChange={setPrintOption}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Search */}
            <Card className="shadow-md">
              <CardHeader className="py-2">
                <div className="flex items-center space-x-2">
                  <SearchIcon className="h-4 w-4" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Products Grid */}
            <Card className="flex-1 shadow-md">
              <CardContent className="p-3">
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {products?.slice(0, 8).map((product: Product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-20 p-2 flex flex-col justify-center text-xs hover:bg-blue-50 border-gray-300"
                      onClick={() => addToCart(product)}
                      onKeyDown={(e) => handleKeyPress(e, product)}
                    >
                      <div className="font-semibold text-center text-gray-800">{product.name}</div>
                      <div className="text-blue-600 font-bold">{formatCurrency(Number(product.price))}</div>
                      <div className="text-gray-500">Stock: {product.stockQuantity || 0}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Cart & Billing */}
          <div className="col-span-4 space-y-3">
            {/* Items Table */}
            <Card className="shadow-md">
              <CardHeader className="py-2 bg-gray-50">
                <CardTitle className="text-sm">Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-xs p-2">S.No</TableHead>
                        <TableHead className="text-xs p-2">Code</TableHead>
                        <TableHead className="text-xs p-2">Description</TableHead>
                        <TableHead className="text-xs p-2">Qty</TableHead>
                        <TableHead className="text-xs p-2">Rate</TableHead>
                        <TableHead className="text-xs p-2">Amount</TableHead>
                        <TableHead className="text-xs p-2">Stock</TableHead>
                        <TableHead className="text-xs p-2">M.R.P</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, index) => (
                        <TableRow key={item.id} className="h-8">
                          <TableCell className="text-xs p-2">{index + 1}</TableCell>
                          <TableCell className="text-xs p-2">{item.sku}</TableCell>
                          <TableCell className="text-xs p-2">{item.name}</TableCell>
                          <TableCell className="text-xs p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="h-6 w-12 text-xs"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-xs p-2">{formatCurrency(Number(item.price))}</TableCell>
                          <TableCell className="text-xs p-2">{formatCurrency(item.total)}</TableCell>
                          <TableCell className="text-xs p-2">{item.stockQuantity || 0}</TableCell>
                          <TableCell className="text-xs p-2">{formatCurrency(Number(item.price))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Billing Details */}
            <Card className="shadow-md">
              <CardHeader className="py-2 bg-gray-50">
                <CardTitle className="text-sm">Billing Details</CardTitle>
              </CardHeader>
              <CardContent className="py-3 space-y-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Sub Total:</span>
                    <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%):</span>
                    <span className="font-semibold">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg font-bold text-blue-600">
                    <span>Net Amount:</span>
                    <span>{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Delivery Boy Section */}
                <div className="mt-4">
                  <Label className="text-xs font-semibold text-gray-700">Delivery Boy</Label>
                  <Select>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Delivery Boy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boy1">Delivery Boy 1</SelectItem>
                      <SelectItem value="boy2">Delivery Boy 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-4">
                  <Button 
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-sm h-8"
                  >
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Complete Sale
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-sm h-8"
                    onClick={() => setCart([])}
                  >
                    Clear Cart
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Function Keys */}
            <Card className="shadow-md">
              <CardContent className="p-2">
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center py-1 bg-gray-100 rounded">F2: Item</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F3: Qty</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F4: Price</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F5: Disc</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F6: Tax</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F7: Print</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F8: Hold</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F9: Recall</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F10: Pay</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F11: Reports</div>
                  <div className="text-center py-1 bg-gray-100 rounded">F12: Exit</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Sale</DialogTitle>
              <DialogDescription>
                Process payment for this sale
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
                  placeholder={finalTotal.toString()}
                />
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
                {amountPaid && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(Math.abs(change))}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckout} disabled={isProcessing}>
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
    </DashboardLayout>
  );
}