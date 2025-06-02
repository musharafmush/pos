import { useState, useEffect, useRef } from "react";
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
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  IndianRupeeIcon,
  ScanIcon,
  BarcodeIcon,
  Package2Icon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  RefreshCwIcon,
  CalculatorIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { Product, Customer } from "@shared/schema";
import { printReceipt } from "@/components/pos/print-receipt";

interface CartItem extends Product {
  quantity: number;
  total: number;
  itemDiscount?: number;
  mrp?: number;
  stock?: number;
}

interface ProductListItem {
  sno: number;
  name: string;
  code: string;
  stock: number;
  drugStock: number;
  selfRate: number;
  mrp: number;
  locStock: number;
}

export default function POSEnhanced() {
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
  const [notes, setNotes] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [rateInput, setRateInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [billNumber, setBillNumber] = useState(generateBillNumber());
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    doorNo: "",
    street: "",
    address: "",
    place: ""
  });
  const [salesMan, setSalesMan] = useState("Sales Man");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Dynamic bill number generation
  const generateBillNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-6);
    return `POS${year}${month}${day}${time}`;
  };

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
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

  // Generate sample products for demo
  const generateSampleProducts = (): ProductListItem[] => {
    const baseProducts = [
      { name: "Rice 1KG", baseCode: "RIC001", baseRate: 80, category: "grains" },
      { name: "Sugar 1KG", baseCode: "SUG001", baseRate: 45, category: "sweeteners" },
      { name: "Tea Powder 250g", baseCode: "TEA001", baseRate: 120, category: "beverages" },
      { name: "Coconut Oil 1L", baseCode: "OIL001", baseRate: 250, category: "oils" },
      { name: "Wheat Flour 1KG", baseCode: "WHE001", baseRate: 35, category: "flour" },
      { name: "Milk 1L", baseCode: "MIL001", baseRate: 55, category: "dairy" },
      { name: "Bread 400g", baseCode: "BRD001", baseRate: 35, category: "bakery" },
      { name: "Eggs 12pcs", baseCode: "EGG001", baseRate: 80, category: "dairy" },
      { name: "Onion 1KG", baseCode: "ONI001", baseRate: 30, category: "vegetables" },
      { name: "Potato 1KG", baseCode: "POT001", baseRate: 25, category: "vegetables" }
    ];

    return baseProducts.map((product, index) => ({
      sno: index + 1,
      name: product.name,
      code: product.baseCode,
      stock: Math.floor(Math.random() * 100) + 10,
      drugStock: 0,
      selfRate: product.baseRate,
      mrp: Math.round(product.baseRate * 1.2),
      locStock: Math.floor(Math.random() * 100) + 10
    }));
  };

  const [sampleProducts] = useState<ProductListItem[]>(generateSampleProducts());

  // Enhanced barcode scanning
  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter a barcode or product code",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim();

    // Try to find in real products first
    let product = products?.find(p => 
      p.sku === searchTerm || 
      p.id.toString() === searchTerm ||
      p.barcode === searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // If not found, check sample products
    if (!product) {
      const sampleProduct = sampleProducts.find(p => 
        p.code === searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (sampleProduct) {
        product = {
          id: Math.floor(Math.random() * 10000),
          name: sampleProduct.name,
          sku: sampleProduct.code,
          price: sampleProduct.selfRate.toString(),
          cost: sampleProduct.selfRate.toString(),
          stockQuantity: sampleProduct.stock,
          description: sampleProduct.name,
          barcode: sampleProduct.code,
          brand: "",
          manufacturer: "",
          categoryId: 1,
          mrp: sampleProduct.mrp.toString(),
          unit: "PCS",
          hsnCode: "",
          taxRate: "18",
          active: true,
          trackInventory: true,
          allowNegativeStock: false,
          alertThreshold: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (product) {
      setSelectedProduct(product);
      setRateInput(product.price);
      setQuantityInput(1);
      setBarcodeInput("");

      toast({
        title: "Product Found!",
        description: `${product.name} - Stock: ${product.stockQuantity}`,
      });
    } else {
      toast({
        title: "Product Not Found",
        description: `No product found for: ${searchTerm}`,
        variant: "destructive"
      });
    }
  };

  // Add product to cart
  const addToCart = () => {
    if (!selectedProduct) {
      toast({
        title: "No Product Selected",
        description: "Please scan or select a product first",
        variant: "destructive"
      });
      return;
    }

    if (quantityInput <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const rate = parseFloat(rateInput) || parseFloat(selectedProduct.price);
    const existingItem = cart.find(item => item.id === selectedProduct.id);

    if (existingItem) {
      updateQuantity(selectedProduct.id, existingItem.quantity + quantityInput);
    } else {
      const newItem: CartItem = {
        ...selectedProduct,
        quantity: quantityInput,
        total: rate * quantityInput,
        price: rate.toString(),
        mrp: parseFloat(selectedProduct.price),
        stock: selectedProduct.stockQuantity
      };
      setCart(prev => [...prev, newItem]);
    }

    // Reset inputs
    setSelectedProduct(null);
    setBarcodeInput("");
    setQuantityInput(1);
    setRateInput("");

    // Focus back to barcode input
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);

    toast({
      title: "Item Added",
      description: `${selectedProduct.name} x ${quantityInput} added to cart`
    });
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const taxableAmount = subtotal - totalDiscount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const changeDue = amountPaid ? Math.max(0, parseFloat(amountPaid) - grandTotal) : 0;

  // Update quantity
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

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Clear sale
  const clearSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    setNotes("");
    setSelectedProduct(null);
    setBarcodeInput("");
    setQuantityInput(1);
    setRateInput("");
    setBillNumber(generateBillNumber());
    setCustomerDetails({ name: "", doorNo: "", street: "", address: "", place: "" });
    setSalesMan("Sales Man");
  };

  // Process sale
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
      const receiptData = {
        billNumber,
        billDate,
        customerDetails: selectedCustomer ? {
          name: selectedCustomer.name,
          doorNo: "",
          street: "",
          address: selectedCustomer.address || "",
          place: ""
        } : { name: "Walk-in Customer", doorNo: "", street: "", address: "", place: "" },
        salesMan: "Sales Person",
        items: cart,
        subtotal,
        discount,
        discountType,
        taxRate,
        taxAmount,
        grandTotal,
        amountPaid: parseFloat(amountPaid) || 0,
        changeDue,
        paymentMethod,
        notes
      };

      // Print receipt
      printReceipt(receiptData);

      toast({
        title: "Sale Completed!",
        description: `Bill #${billNumber} processed for ${formatCurrency(grandTotal)}`
      });

      // Clear the sale
      clearSale();
      setShowPaymentDialog(false);

    } catch (error) {
      console.error("Sale processing error:", error);
      toast({
        title: "Sale Processing Error",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Update time every second
  useEffect(() => {
    barcodeInputRef.current?.focus();

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowProductList(true);
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      } else if (e.key === 'Enter' && selectedProduct && document.activeElement !== barcodeInputRef.current) {
        e.preventDefault();
        addToCart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedProduct]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-lg border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BarcodeIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Enhanced POS System</h1>
                  <p className="text-sm text-gray-600">Professional Point of Sale</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Bill No</div>
                  <div className="text-lg font-bold text-blue-600">{billNumber}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Date</div>
                  <div className="text-lg font-semibold">{billDate}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Time</div>
                  <div className="text-lg font-mono font-semibold text-purple-600">
                    {currentTime.toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6 p-6">
          {/* Left Panel - Barcode Scanner & Product Selection */}
          <div className="w-1/3 space-y-6">
            {/* Barcode Scanner Card */}
            <Card className="shadow-lg border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-blue-700">
                  <ScanIcon className="h-5 w-5" />
                  <span>Barcode Scanner</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <BarcodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Scan barcode or enter product code..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleBarcodeInput(barcodeInput);
                      }
                    }}
                    className="pl-10 h-12 text-lg font-mono border-blue-300 focus:border-blue-500"
                    autoComplete="off"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleBarcodeInput(barcodeInput)}
                    disabled={!barcodeInput}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <SearchIcon className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowProductList(true)}
                    className="border-blue-300"
                  >
                    <Package2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected Product Card */}
            {selectedProduct && (
              <Card className="shadow-lg border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-green-700">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Selected Product</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-600">Product</div>
                    <div className="font-semibold text-lg">{selectedProduct.name}</div>
                    <div className="text-sm text-gray-500">Code: {selectedProduct.sku}</div>
                    <div className="text-sm text-blue-600">Stock: {selectedProduct.stockQuantity}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-gray-600">Quantity</Label>
                      <Input
                        type="number"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                        className="text-center font-bold"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Rate</Label>
                      <Input
                        type="number"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        className="text-right font-bold"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Amount</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                    </div>
                  </div>

                  <Button onClick={addToCart} className="w-full bg-green-600 hover:bg-green-700 h-12">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add to Cart (Enter)
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-700">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setShowProductList(true)}
                  className="w-full justify-start"
                >
                  <Package2Icon className="h-4 w-4 mr-2" />
                  Browse Products (F2)
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSale}
                  disabled={cart.length === 0}
                  className="w-full justify-start"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Clear Sale
                </Button>
                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Checkout (F10)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Cart & Billing */}
          <div className="flex-1 space-y-6">
            {/* Cart */}
            <Card className="shadow-lg">
              <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingCartIcon className="h-5 w-5" />
                    <span>Shopping Cart</span>
                  </div>
                  <Badge variant="secondary" className="bg-white text-blue-600">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <div className="text-xl font-medium">Cart is empty</div>
                      <div className="text-sm">Scan a product to start billing</div>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.sku}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <MinusIcon className="h-3 w-3" />
                                </Button>
                                <span className="font-bold text-blue-600 min-w-[40px] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <PlusIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(parseFloat(item.price))}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Summary */}
            {cart.length > 0 && (
              <Card className="shadow-lg border-green-200">
                <CardHeader className="bg-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <CalculatorIcon className="h-5 w-5" />
                    <span>Billing Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount ({discount}{discountType === 'percentage' ? '%' : ''}):</span>
                      <span className="font-mono text-red-600">-{formatCurrency(totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({taxRate}%):</span>
                      <span className="font-mono">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold">Grand Total:</span>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={clearSale}
                      className="flex-1"
                    >
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      onClick={() => setShowPaymentDialog(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Product List Dialog */}
        <Dialog open={showProductList} onOpenChange={setShowProductList}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Product Catalog</DialogTitle>
              <DialogDescription>
                Select a product to add to cart. Showing {sampleProducts.length} products.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleProducts.map((product) => (
                    <TableRow
                      key={product.sno}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        const mockProduct = {
                          id: product.sno,
                          name: product.name,
                          sku: product.code,
                          price: product.selfRate.toString(),
                          cost: product.selfRate.toString(),
                          stockQuantity: product.stock,
                          description: product.name,
                          barcode: product.code,
                          brand: "",
                          manufacturer: "",
                          categoryId: 1,
                          mrp: product.mrp.toString(),
                          unit: "PCS",
                          hsnCode: "",
                          taxRate: "18",
                          active: true,
                          trackInventory: true,
                          allowNegativeStock: false,
                          alertThreshold: 10,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };

                        setSelectedProduct(mockProduct);
                        setRateInput(mockProduct.price);
                        setQuantityInput(1);
                        setShowProductList(false);

                        toast({
                          title: "Product Selected",
                          description: `${mockProduct.name} selected`
                        });
                      }}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.selfRate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.mrp)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.stock > 50 ? "default" : "destructive"}>
                          {product.stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Complete the sale transaction for Bill #{billNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-sm text-gray-600">Total Amount</div>
              </div>

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
                  <Label>Amount Received</Label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Enter amount received"
                    className="text-right font-mono text-lg h-12"
                  />
                </div>

                {changeDue > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-700">
                      Change: {formatCurrency(changeDue)}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    className="h-20"
                  />
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
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
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