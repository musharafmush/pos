
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
  XCircleIcon
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

  // Enhanced barcode scanning with product lookup
  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        title: "Empty Input ⚠️",
        description: "Please enter a barcode, SKU, or product code",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim();

    // First try exact matches in actual products
    let product = allProducts?.find(p => 
      p.sku === searchTerm || 
      p.id.toString() === searchTerm ||
      p.barcode === searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // If not found in actual products, check mock product list
    if (!product) {
      const mockProduct = mockProductList.find(p => 
        p.code === searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (mockProduct) {
        // Create a product object from mock data
        product = {
          id: parseInt(mockProduct.code) || Math.floor(Math.random() * 10000),
          name: mockProduct.name,
          sku: mockProduct.code,
          price: mockProduct.selfRate.toString(),
          cost: mockProduct.selfRate.toString(),
          stockQuantity: mockProduct.stock,
          description: mockProduct.name,
          barcode: mockProduct.code,
          brand: "",
          manufacturer: "",
          categoryId: 1,
          mrp: mockProduct.mrp.toString(),
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
        title: "🎯 Product Found!",
        description: (
          <div className="space-y-1">
            <div className="font-medium">{product.name}</div>
            <div className="text-sm">Code: {product.sku} • Stock: {product.stockQuantity}</div>
            <div className="text-sm">Rate: {formatCurrency(parseFloat(product.price))}</div>
          </div>
        )
      });

      // Auto-focus quantity input
      setTimeout(() => {
        const qtyElement = document.querySelector('input[placeholder="Qty"]') as HTMLInputElement;
        qtyElement?.focus();
      }, 100);

    } else {
      toast({
        title: "❌ Product Not Found",
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
      <div className="h-full flex flex-col bg-gray-100">
        {/* Header Section */}
        <div className="bg-white border-b shadow-sm p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BarcodeIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-900">Professional POS System</h1>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                Version 6.5.9.2 SP-65
              </Badge>
            </div>

            <div className="flex items-center space-x-6 text-sm">
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
                <div className="text-xl font-bold text-green-600">{formatCurrency(grandTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="bg-white border-b p-2">
          <div className="grid grid-cols-6 gap-3 text-sm">
            <div>
              <Label className="text-xs text-gray-600">Sales Man</Label>
              <Input value={salesMan} onChange={(e) => setSalesMan(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Customer Name</Label>
              <Input 
                value={customerDetails.name} 
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="h-7 text-xs" 
                placeholder="Walk-in Customer"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Door No</Label>
              <Input 
                value={customerDetails.doorNo} 
                onChange={(e) => setCustomerDetails({...customerDetails, doorNo: e.target.value})}
                className="h-7 text-xs" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Street</Label>
              <Input 
                value={customerDetails.street} 
                onChange={(e) => setCustomerDetails({...customerDetails, street: e.target.value})}
                className="h-7 text-xs" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Address</Label>
              <Input 
                value={customerDetails.address} 
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="h-7 text-xs" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Place</Label>
              <Input 
                value={customerDetails.place} 
                onChange={(e) => setCustomerDetails({...customerDetails, place: e.target.value})}
                className="h-7 text-xs" 
              />
            </div>
          </div>
          
          {/* Additional checkboxes row */}
          <div className="grid grid-cols-6 gap-3 mt-2 text-xs">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="holdBills" className="h-3 w-3" />
              <label htmlFor="holdBills" className="text-gray-600">Hold Bills</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="doorDelivery" className="h-3 w-3" />
              <label htmlFor="doorDelivery" className="text-gray-600">Door Delivery</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="print" className="h-3 w-3" />
              <label htmlFor="print" className="text-gray-600">Print</label>
            </div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Cart & Product Entry */}
          <div className="flex-1 bg-white border-r flex flex-col">
            {/* Cart Header */}
            <div className="p-2 border-b bg-blue-600 text-white">
              <div className="grid grid-cols-8 gap-2 text-xs font-medium">
                <div className="text-center">Sno</div>
                <div>Code</div>
                <div>Description</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Amount</div>
                <div className="text-center">Stock</div>
                <div className="text-right">M.R.P</div>
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
                <div className="space-y-0">
                  {cart.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-8 gap-2 text-xs border-b py-1 px-2 hover:bg-gray-50">
                      <div className="text-center font-bold text-blue-600 flex items-center justify-center">{index + 1}</div>
                      <div className="font-mono text-gray-600 flex items-center">{item.sku}</div>
                      <div className="font-medium truncate flex items-center" title={item.name}>{item.name}</div>
                      <div className="text-center flex items-center justify-center">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusIcon className="h-3 w-3" />
                          </Button>
                          <span className="font-bold text-blue-600 min-w-[20px] text-center">{item.quantity}</span>
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
                      <div className="text-right font-mono flex items-center justify-end">{formatCurrency(parseFloat(item.price))}</div>
                      <div className="text-right font-bold text-green-600 flex items-center justify-end">{formatCurrency(item.total)}</div>
                      <div className="text-center text-blue-600 flex items-center justify-center">{item.stock || item.stockQuantity}</div>
                      <div className="text-right text-gray-600 flex items-center justify-end">{formatCurrency(item.mrp || parseFloat(item.price))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Barcode Scanner Section */}
            <div className="p-3 border-t bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <ScanIcon className="h-4 w-4 text-blue-600" />
                  <Label className="font-medium text-blue-900 text-sm">Barcode Scanner</Label>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <BarcodeIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
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
                      className="pl-8 font-mono border-blue-200 focus:border-blue-500 h-8 text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBarcodeInput(barcodeInput)}
                    disabled={!barcodeInput}
                    className="bg-blue-600 hover:bg-blue-700 h-8"
                  >
                    <SearchIcon className="h-3 w-3 mr-1" />
                    Find
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductList(true)}
                    className="border-blue-200 h-8"
                  >
                    <Package2Icon className="h-3 w-3 mr-1" />
                    Products
                  </Button>
                </div>
              </div>

              {/* Product Entry Section */}
              {selectedProduct && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <Label className="font-medium text-green-900 text-sm">Product Selected</Label>
                  </div>

                  <div className="bg-white p-2 rounded border">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <Label className="text-xs text-gray-600">Code</Label>
                        <div className="font-mono font-bold">{selectedProduct.sku}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Description</Label>
                        <div className="font-medium">{selectedProduct.name}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Stock</Label>
                        <div className="font-bold text-blue-600">{selectedProduct.stockQuantity}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-gray-600">Qty</Label>
                      <Input
                        type="number"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                        className="h-7 text-center font-bold text-xs"
                        min="1"
                        placeholder="Qty"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Rate</Label>
                      <Input
                        type="number"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        className="h-7 text-right font-bold text-xs"
                        placeholder="Rate"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Amount</Label>
                      <div className="h-7 px-2 border rounded bg-gray-50 flex items-center justify-end font-bold text-green-600 text-xs">
                        {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                      </div>
                    </div>
                  </div>

                  <Button onClick={addToCart} size="sm" className="w-full bg-green-600 hover:bg-green-700 h-7 text-xs">
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add to Cart (Enter)
                  </Button>
                </div>
              )}
            </div>

            {/* Function Keys */}
            <div className="p-2 border-t bg-gray-50">
              <div className="grid grid-cols-6 gap-1 text-xs">
                <Button variant="outline" size="sm" className="h-7 text-xs">F1<br/>ItemCode</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowProductList(true)}>F2<br/>SaleHits</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F3<br/>QuickCost</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F4<br/>CashDisc</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F5<br/>Details</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F6<br/>Bills</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F7<br/>CloseScr</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F8<br/>SettleBill</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F9<br/>CashBrd</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPaymentDialog(true)}>F10<br/>SelectKey</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F11<br/>SelectKey</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">F12<br/>Close</Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Billing Details */}
          <div className="w-80 bg-blue-600 text-white flex flex-col">
            {/* Bill Header */}
            <div className="p-3 border-b border-blue-500">
              <div className="text-center">
                <div className="text-lg font-bold">Bill Details</div>
                <div className="text-sm opacity-90">#{billNumber}</div>
              </div>
            </div>

            {/* Bill Amounts */}
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Bill No</span>
                <span className="font-mono">{billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Bill Date</span>
                <span>{billDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amt (Incl)</span>
                <span className="font-mono">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Surcharge (Incl)</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Amt</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Item Discount</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Item Scheme amt</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Disc %</span>
                <span className="font-mono">{discount}%</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Discount</span>
                <span className="font-mono">{formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bill Scheme %</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Bill Scheme amt</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Coupon Discount</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amt</span>
                <span className="font-mono">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Surcharge</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge %</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Freight Amt</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Packing charge</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Other charge</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Extra charges</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>RoundOff Amt</span>
                <span className="font-mono">0.35</span>
              </div>
              <div className="flex justify-between border-t border-blue-500 pt-2 text-lg font-bold">
                <span>R.O.I.Amt</span>
                <span className="font-mono">0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Album Charge</span>
                <span className="font-mono">0.00</span>
              </div>
            </div>

            {/* Net Amount Display */}
            <div className="mt-auto p-3 border-t border-blue-500">
              <div className="text-center">
                <div className="text-sm opacity-90">Net Amount</div>
                <div className="text-3xl font-bold">{formatCurrency(grandTotal)}</div>
              </div>

              {/* Quick denomination buttons */}
              <div className="grid grid-cols-5 gap-1 mt-3 text-xs">
                <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">Rs.50<br/>Ctrl+1</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">Rs.100<br/>Ctrl+2</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">Rs.500<br/>Ctrl+3</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">Rs.1000<br/>Ctrl+4</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">Rs.2000<br/>Ctrl+5</Button>
              </div>

              <div className="flex space-x-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSale}
                  disabled={cart.length === 0}
                  className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CreditCardIcon className="h-3 w-3 mr-1" />
                  Payment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-blue-800 text-white text-xs p-2 flex justify-between items-center">
          <div>Press Delete and enter the date &nbsp;&nbsp;&nbsp; Server: DESKTOP-POS01 &nbsp;&nbsp;&nbsp; User: ADMIN (System Admin) &nbsp;&nbsp;&nbsp; Ver: 6.5.9.2 SP-65</div>
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
                Select a product to add to cart. Records: 1/{mockProductList.length}
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
                        // Find matching product in actual products list or create a mock product
                        let actualProduct = allProducts?.find(p => 
                          p.name.toLowerCase().includes(product.name.toLowerCase()) ||
                          p.sku === product.code
                        );
                        
                        if (!actualProduct) {
                          // Create a mock product from the list data
                          actualProduct = {
                            id: parseInt(product.code) || Math.floor(Math.random() * 10000),
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
                        }
                        
                        // Add directly to cart instead of just selecting
                        const existingItem = cart.find(item => item.id === actualProduct.id);
                        if (existingItem) {
                          updateQuantity(actualProduct.id, existingItem.quantity + 1);
                        } else {
                          const newItem: CartItem = {
                            ...actualProduct,
                            quantity: 1,
                            total: parseFloat(actualProduct.price),
                            mrp: parseFloat(actualProduct.mrp || actualProduct.price),
                            stock: actualProduct.stockQuantity
                          };
                          setCart(prev => [...prev, newItem]);
                        }
                        
                        setShowProductList(false);
                        
                        toast({
                          title: "✅ Product Added to Cart!",
                          description: `${actualProduct.name} x 1 - ₹${actualProduct.price}`
                        });
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
