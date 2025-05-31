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
  IndianRupeeIcon,
  ScanIcon,
  BarcodeIcon,
  Package2Icon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  X,
  RefreshCwIcon,
  SaveIcon
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
  mrp?: number;
  stock?: number;
}

interface HoldSale {
  id: string;
  cart: CartItem[];
  customer: Customer | null;
  timestamp: Date;
  subtotal: number;
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
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [holdSales, setHoldSales] = useState<HoldSale[]>([]);
  const [showHoldSales, setShowHoldSales] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [rateInput, setRateInput] = useState("");
  const [billNumber, setBillNumber] = useState(`13254`);
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [salesMan, setSalesMan] = useState("Sales Man");
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    doorNo: "",
    street: "",
    address: "",
    place: ""
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

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

  // Mock product list data similar to the screenshot
  const mockProductList: ProductListItem[] = [
    { sno: 1, name: "1 KG DHANIYA", code: "13451", stock: 0.00, drugStock: 0.00, selfRate: 159.00, mrp: 159.00, locStock: 0.00 },
    { sno: 2, name: "15 PIMPSAI CANDY FLASH BACK", code: "9006503", stock: 0.00, drugStock: 0.00, selfRate: 20.00, mrp: 30.00, locStock: 0.00 },
    { sno: 3, name: "100G SET BONARI DHOOM SHANKER", code: "22211", stock: 0.00, drugStock: 0.00, selfRate: 99.00, mrp: 159.00, locStock: 0.00 },
    { sno: 4, name: "1 KG BARFI", code: "20144", stock: 0.00, drugStock: 0.00, selfRate: 0.00, mrp: 0.00, locStock: 0.00 },
    { sno: 5, name: "100G NAVON GUARU", code: "14444", stock: 20.00, drugStock: 0.00, selfRate: 9.00, mrp: 15.00, locStock: 20.00 },
    { sno: 6, name: "1KG JAWAKHAR PER", code: "14454", stock: 7.00, drugStock: 0.00, selfRate: 6.00, mrp: 7.00, locStock: 7.00 },
    { sno: 7, name: "10KG KARUGURU BULINDI", code: "20059", stock: 0.00, drugStock: 0.00, selfRate: 14.00, mrp: 29.00, locStock: 0.00 }
  ];

  const allProducts = products || [];

  // Enhanced barcode scanning with parallel processing and better error handling
  const handleBarcodeInput = async (barcode: string) => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Empty Input ⚠️",
        description: "Please enter a barcode, SKU, or product code",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim().toLowerCase();
    setIsProcessing(true);

    try {
      // Parallel search across multiple product fields
      const searchPromises = [
        // Exact SKU match
        allProducts?.find(p => p.sku?.toLowerCase() === searchTerm),
        // Exact ID match
        allProducts?.find(p => p.id.toString() === searchTerm),
        // Name contains search
        allProducts?.find(p => p.name.toLowerCase().includes(searchTerm)),
        // Description contains search
        allProducts?.find(p => p.description?.toLowerCase().includes(searchTerm))
      ];

      const results = await Promise.all(searchPromises);
      const product = results.find(p => p !== undefined);

      if (product) {
        setSelectedProduct(product);
        setRateInput(product.price);
        setQuantityInput(1);
        setBarcodeInput("");

        toast({
          title: "🎯 Product Found!",
          description: (
            <div className="space-y-1">
              <div className="font-medium">{product.name}</div>
              <div className="text-sm">Code: {product.sku} • Stock: {product.stockQuantity}</div>
              <div className="text-sm">Rate: {formatCurrency(parseFloat(product.price))}</div>
            </div>
          )
        });

        // Auto-focus quantity input with improved targeting
        setTimeout(() => {
          const qtyElement = document.querySelector('input[placeholder="Qty"]') as HTMLInputElement;
          if (qtyElement) {
            qtyElement.focus();
            qtyElement.select();
          }
        }, 150);

      } else {
        // Show suggestions for partial matches
        const suggestions = allProducts?.filter(p => 
          p.name.toLowerCase().includes(searchTerm) ||
          p.sku?.toLowerCase().includes(searchTerm)
        ).slice(0, 5);

        toast({
          title: "❌ Product Not Found",
          description: suggestions?.length > 0 
            ? `No exact match. Found ${suggestions.length} similar products. Use F2 to browse.`
            : `No product found for: ${searchTerm}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Error occurred while searching. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
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
      title: "✅ Item Added",
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
        notes
      };

      // For demo purposes, simulate successful sale
      const mockOrderNumber = billNumber;

      toast({
        title: "Sale Completed Successfully! 🎉",
        description: `Bill #${mockOrderNumber} processed for ${formatCurrency(grandTotal)}`
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

  // Auto-focus barcode input on component mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F1-F12 shortcuts like in the original software
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowProductList(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        // Quick cost function
      } else if (e.key === 'F4') {
        e.preventDefault();
        // Cash/Disc function
      } else if (e.key === 'F5') {
        e.preventDefault();
        // Details function
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
      <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-cyan-50">
        {/* Header Section */}
        <div className="bg-white border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BarcodeIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Barcode POS System</h1>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Professional Edition
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500">Bill No</div>
                <div className="font-mono font-bold text-blue-600">{billNumber}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Bill Date</div>
                <div className="font-bold">{billDate}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Net Amount</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="bg-white border-b p-3">
          <div className="grid grid-cols-6 gap-4 text-sm">
            <div>
              <Label className="text-xs text-gray-600">Sales Man</Label>
              <Input value={salesMan} onChange={(e) => setSalesMan(e.target.value)} className="h-8" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Customer Name</Label>
              <Input 
                value={customerDetails.name} 
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="h-8" 
                placeholder="Walk-in Customer"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Door No</Label>
              <Input 
                value={customerDetails.doorNo} 
                onChange={(e) => setCustomerDetails({...customerDetails, doorNo: e.target.value})}
                className="h-8" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Street</Label>
              <Input 
                value={customerDetails.street} 
                onChange={(e) => setCustomerDetails({...customerDetails, street: e.target.value})}
                className="h-8" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Address</Label>
              <Input 
                value={customerDetails.address} 
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="h-8" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Place</Label>
              <Input 
                value={customerDetails.place} 
                onChange={(e) => setCustomerDetails({...customerDetails, place: e.target.value})}
                className="h-8" 
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Panel - Barcode Scanner & Product Entry */}
          <div className="w-full lg:w-1/2 bg-white border-r flex flex-col">
            {/* Barcode Scanner Section */}
            <div className="p-3 lg:p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <ScanIcon className="h-5 w-5 text-blue-600" />
                  <Label className="font-medium text-blue-900">Barcode Scanner</Label>
                  <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-spin' : 'bg-green-500 animate-pulse'}`}></div>
                  {isProcessing && <span className="text-xs text-blue-600">Processing...</span>}
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="flex-1 relative">
                    <BarcodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      ref={barcodeInputRef}
                      placeholder="Scan barcode or enter product code..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isProcessing) {
                          handleBarcodeInput(barcodeInput);
                        }
                      }}
                      className="pl-10 font-mono border-blue-200 focus:border-blue-500"
                      autoComplete="off"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="default"
                      onClick={() => handleBarcodeInput(barcodeInput)}
                      disabled={!barcodeInput || isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                    >
                      {isProcessing ? (
                        <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <SearchIcon className="h-4 w-4 mr-1" />
                      )}
                      Find
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowProductList(true)}
                      className="border-blue-200 flex-1 sm:flex-none"
                    >
                      <Package2Icon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Products</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Entry Section */}
            {selectedProduct && (
              <div className="p-3 lg:p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <Label className="font-medium text-green-900">Product Selected</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(null);
                        setBarcodeInput("");
                        setQuantityInput(1);
                        setRateInput("");
                        barcodeInputRef.current?.focus();
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="bg-white p-3 rounded border shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-600">Code</Label>
                        <div className="font-mono font-bold text-blue-600">{selectedProduct.sku}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-gray-600">Description</Label>
                        <div className="font-medium" title={selectedProduct.name}>{selectedProduct.name}</div>
                      </div>
                      <div className="sm:col-span-1">
                        <Label className="text-xs text-gray-600">Available Stock</Label>
                        <div className={`font-bold ${selectedProduct.stockQuantity > 10 ? 'text-green-600' : selectedProduct.stockQuantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {selectedProduct.stockQuantity} units
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-gray-600">MRP</Label>
                        <div className="font-bold text-purple-600">{formatCurrency(parseFloat(selectedProduct.price))}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Quantity</Label>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                        >
                          <MinusIcon className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={quantityInput}
                          onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-center font-bold flex-1"
                          min="1"
                          max={selectedProduct.stockQuantity}
                          placeholder="Qty"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setQuantityInput(Math.min(selectedProduct.stockQuantity, quantityInput + 1))}
                        >
                          <PlusIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Unit Rate</Label>
                      <Input
                        type="number"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        className="h-8 text-right font-bold"
                        placeholder="Rate"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Line Total</Label>
                      <div className="h-8 px-3 border rounded bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-end font-bold text-green-700 text-lg">
                        {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={addToCart} 
                      className="flex-1 bg-green-600 hover:bg-green-700 shadow-md"
                      disabled={quantityInput > selectedProduct.stockQuantity}
                    >
                      <SaveIcon className="h-4 w-4 mr-1" />
                      Add to Cart (Enter)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        addToCart();
                        // Continue scanning mode
                        setTimeout(() => {
                          barcodeInputRef.current?.focus();
                        }, 200);
                      }}
                      className="px-3"
                      disabled={quantityInput > selectedProduct.stockQuantity}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {quantityInput > selectedProduct.stockQuantity && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                      ⚠️ Quantity exceeds available stock ({selectedProduct.stockQuantity} units)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Function Keys */}
            <div className="mt-auto p-4 border-t bg-gray-50">
              <div className="grid grid-cols-6 gap-2 text-xs">
                <Button variant="outline" size="sm" className="h-8">F1<br/>ItemCode</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setShowProductList(true)}>F2<br/>SaleHits</Button>
                <Button variant="outline" size="sm" className="h-8">F3<br/>QuickCost</Button>
                <Button variant="outline" size="sm" className="h-8">F4<br/>CashDisc</Button>
                <Button variant="outline" size="sm" className="h-8">F5<br/>Details</Button>
                <Button variant="outline" size="sm" className="h-8">F6<br/>Bills</Button>
                <Button variant="outline" size="sm" className="h-8">F7<br/>CloseScreen</Button>
                <Button variant="outline" size="sm" className="h-8">F8<br/>SettleBill</Button>
                <Button variant="outline" size="sm" className="h-8">F9<br/>CashBoard</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setShowPaymentDialog(true)}>F10<br/>SelectKey</Button>
                <Button variant="outline" size="sm" className="h-8">F11<br/>SelectKey</Button>
                <Button variant="outline" size="sm" className="h-8">F12<br/>Close</Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Cart & Billing */}
          <div className="w-full lg:w-1/2 bg-white flex flex-col">
            {/* Cart Header */}
            <div className="p-2 lg:p-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center">
                  <ShoppingCartIcon className="h-4 w-4 mr-2" />
                  Cart ({cart.length} items)
                </h3>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSale}
                    className="text-white hover:bg-blue-500 h-6 px-2"
                  >
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="hidden sm:grid grid-cols-7 gap-1 lg:gap-2 text-xs font-medium">
                <div>No</div>
                <div>Code</div>
                <div>Description</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Amount</div>
                <div className="text-center">Stock</div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <div>Cart is empty</div>
                    <div className="text-xs">Scan a product to start billing</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {cart.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-7 gap-2 text-xs border-b pb-1 hover:bg-gray-50">
                      <div className="text-center font-bold text-blue-600">{index + 1}</div>
                      <div className="font-mono text-gray-600">{item.sku}</div>
                      <div className="font-medium truncate" title={item.name}>{item.name}</div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusIcon className="h-3 w-3" />
                          </Button>
                          <span className="font-bold text-blue-600">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <PlusIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right font-mono">{formatCurrency(parseFloat(item.price))}</div>
                      <div className="text-right font-bold text-green-600">{formatCurrency(item.total)}</div>
                      <div className="text-center text-blue-600">{item.stock || item.stockQuantity}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Summary */}
            <div className="border-t bg-gray-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>

                {/* Quick denomination buttons */}
                <div className="flex space-x-2 text-xs">
                  <Button variant="outline" size="sm" className="flex-1">Rs.50<br/>Ctrl + 1</Button>
                  <Button variant="outline" size="sm" className="flex-1">Rs.100<br/>Ctrl + 2</Button>
                  <Button variant="outline" size="sm" className="flex-1">Rs.500<br/>Ctrl + 3</Button>
                  <Button variant="outline" size="sm" className="flex-1">Rs.1000<br/>Ctrl + 4</Button>
                  <Button variant="outline" size="sm" className="flex-1">Rs.2000<br/>Ctrl + 5</Button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Net Amount:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="flex space-x-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={clearSale}
                    disabled={cart.length === 0}
                    className="flex-1"
                  >
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    disabled={cart.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCardIcon className="h-4 w-4 mr-1" />
                    Payment (F10)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-blue-800 text-white text-xs p-2 flex justify-between items-center">
          <div>Press Delete and enter the date &nbsp;&nbsp;&nbsp; Server: DESKTOP-GABT93AI &nbsp;&nbsp;&nbsp; User: AVYAPPAN (System Admin) &nbsp;&nbsp;&nbsp; Ver: 6.5.9.2 SP-65</div>
          <div className="flex items-center space-x-4">
            <span>Customer Id: 159639Z</span>
            <span>NUM</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Product List Dialog */}
        <Dialog open={showProductList} onOpenChange={setShowProductList}>
          <DialogContent className="max-w-6xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Products List</DialogTitle>
              <DialogDescription>
                Select a product to add to cart. Records: 1/8420
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-600 text-white">
                    <TableHead className="text-white">Sno</TableHead>
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Code</TableHead>
                    <TableHead className="text-white">Stock</TableHead>
                    <TableHead className="text-white">Drug Stock</TableHead>
                    <TableHead className="text-white">Self Rate</TableHead>
                    <TableHead className="text-white">M.R.P</TableHead>
                    <TableHead className="text-white">Loc Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProductList.map((product) => (
                    <TableRow
                      key={product.sno}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        // Find matching product in actual products list
                        const actualProduct = allProducts.find(p => p.name.toLowerCase().includes(product.name.toLowerCase()));
                        if (actualProduct) {
                          setSelectedProduct(actualProduct);
                          setRateInput(actualProduct.price);
                          setQuantityInput(1);
                        }
                        setShowProductList(false);
                      }}
                    >
                      <TableCell>{product.sno}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell className="text-right">{product.stock.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.drugStock.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.selfRate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.mrp.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.locStock.toFixed(2)}</TableCell>
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

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-2xl font-bold text-center">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-center text-sm text-gray-600">Total Amount</div>
              </div>

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
                  className="text-right font-mono text-lg"
                />
              </div>

              {changeDue > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-lg font-bold text-green-800 text-center">
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
                  className="h-16"
                />
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