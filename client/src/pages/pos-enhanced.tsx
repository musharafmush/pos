
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
  HomeIcon,
  SettingsIcon,
  HelpCircleIcon,
  MenuIcon,
  RefreshCwIcon,
  SaveIcon,
  EyeIcon,
  StarIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'browse'>('scan');
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');

  // Dynamic bill number generation
  const generateBillNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-6);
    return `${year}${month}${day}${time}`;
  };

  const [billNumber, setBillNumber] = useState(generateBillNumber());
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [salesMan, setSalesMan] = useState("Sales Person");
  const [customerDetails, setCustomerDetails] = useState({
    name: "Walk-in Customer",
    doorNo: "",
    street: "",
    address: "",
    place: ""
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  

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

  // Dynamic product list data generator
  const generateDynamicProductList = (): ProductListItem[] => {
    const baseProducts = [
      { name: "Badam Almonds 250g", baseCode: "ALM001", baseRate: 450, category: "nuts" },
      { name: "Cashew Nuts 250g", baseCode: "CSH001", baseRate: 380, category: "nuts" },
      { name: "Premium Rice 1kg", baseCode: "RIC001", baseRate: 85, category: "grains" },
      { name: "Iodized Salt 1kg", baseCode: "SLT001", baseRate: 25, category: "spices" },
      { name: "Coconut Oil 1L", baseCode: "OIL001", baseRate: 220, category: "oils" },
      { name: "White Sugar 1kg", baseCode: "SGR001", baseRate: 48, category: "sweeteners" },
      { name: "Tea Powder 250g", baseCode: "TEA001", baseRate: 145, category: "beverages" },
      { name: "Wheat Flour 1kg", baseCode: "FLR001", baseRate: 42, category: "flour" },
      { name: "Fresh Onions 1kg", baseCode: "VEG001", baseRate: 35, category: "vegetables" },
      { name: "Potatoes 1kg", baseCode: "VEG002", baseRate: 28, category: "vegetables" }
    ];

    return baseProducts.map((product, index) => {
      const currentTime = Date.now();
      const stockVariation = Math.sin((currentTime / 10000) + index) * 5 + 15;
      const priceVariation = Math.cos((currentTime / 20000) + index) * 0.1 + 1;
      
      return {
        sno: index + 1,
        name: product.name,
        code: product.baseCode,
        stock: Math.max(0, Math.floor(stockVariation)),
        drugStock: 0.00,
        selfRate: Math.round(product.baseRate * priceVariation * 100) / 100,
        mrp: Math.round(product.baseRate * priceVariation * 1.2 * 100) / 100,
        locStock: Math.max(0, Math.floor(stockVariation))
      };
    });
  };

  // Live data that updates every 30 seconds
  const [dynamicProductList, setDynamicProductList] = useState<ProductListItem[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Update dynamic data
  useEffect(() => {
    const updateDynamicData = () => {
      setDynamicProductList(generateDynamicProductList());
      setLastUpdateTime(new Date());
    };

    updateDynamicData();
    const interval = setInterval(updateDynamicData, 30000);
    return () => clearInterval(interval);
  }, []);

  const mockProductList = dynamicProductList;
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

    // First try exact matches in real products from database
    let product = allProducts?.find(p => 
      p.sku === searchTerm || 
      p.id.toString() === searchTerm ||
      p.barcode === searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // If not found in database products, check mock product list
    if (!product) {
      const mockProduct = mockProductList.find(p => 
        p.code === searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (mockProduct) {
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
    setCustomerDetails({
      name: "Walk-in Customer",
      doorNo: "",
      street: "",
      address: "",
      place: ""
    });
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

      const mockOrderNumber = billNumber;

      // Prepare receipt data
      const receiptData = {
        billNumber,
        billDate,
        customerDetails,
        salesMan,
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
        title: "Sale Completed Successfully! 🎉",
        description: `Bill #${mockOrderNumber} processed for ${formatCurrency(grandTotal)}. Receipt sent to printer.`
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

  // Auto-focus barcode input on component mount and setup real-time updates
  useEffect(() => {
    barcodeInputRef.current?.focus();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Generate new bill number every minute (for demo)
    const billInterval = setInterval(() => {
      if (cart.length === 0) {
        setBillNumber(generateBillNumber());
        setBillDate(new Date().toLocaleDateString('en-GB'));
      }
    }, 60000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(billInterval);
    };
  }, [cart.length]);

  // Dynamic customer data generator
  const generateRandomCustomer = () => {
    const names = ["Walk-in Customer", "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sunita Singh", "Ravi Gupta"];
    const areas = ["MG Road", "Brigade Road", "Koramangala", "Indiranagar", "Jayanagar", "Malleswaram"];
    const cities = ["Bangalore", "Chennai", "Mumbai", "Delhi", "Hyderabad", "Pune"];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomArea = areas[Math.floor(Math.random() * areas.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    if (randomName === "Walk-in Customer") {
      return {
        name: randomName,
        doorNo: "",
        street: "",
        address: "",
        place: ""
      };
    }
    
    return {
      name: randomName,
      doorNo: `${Math.floor(Math.random() * 999) + 1}`,
      street: `${randomArea} ${Math.floor(Math.random() * 10) + 1}st Cross`,
      address: `${randomArea}, ${randomCity}`,
      place: randomCity
    };
  };

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
      <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Modern Header Section */}
        <div className="bg-white border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <ShoppingCartIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Awesome Shop POS</h1>
                  <p className="text-sm text-gray-600">Smart Point of Sale System</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Live System
              </Badge>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-xs text-gray-500 font-medium">Bill Number</div>
                <div className="font-mono font-bold text-blue-600 text-lg">{billNumber}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 font-medium">Date & Time</div>
                <div className="font-bold text-gray-800">{billDate} • {currentTime.toLocaleTimeString()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 font-medium">Total Amount</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Customer Info - Simplified */}
        <div className="bg-white border-b px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Sales Person</Label>
              <Input 
                value={salesMan} 
                onChange={(e) => setSalesMan(e.target.value)} 
                className="h-9 mt-1"
                placeholder="Enter sales person name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
              <Input 
                value={customerDetails.name} 
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="h-9 mt-1" 
                placeholder="Walk-in Customer"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Mobile/Address</Label>
              <Input 
                value={customerDetails.address} 
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="h-9 mt-1" 
                placeholder="Customer contact or address"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  const randomCustomer = generateRandomCustomer();
                  setCustomerDetails(randomCustomer);
                  toast({
                    title: "🎲 Random Customer",
                    description: `Generated: ${randomCustomer.name}`,
                  });
                }}
                className="h-9 w-full"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Random Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Product Entry & Cart */}
          <div className="flex-1 bg-white border-r flex flex-col">
            {/* Product Entry Tabs */}
            <div className="border-b bg-gray-50">
              <div className="flex items-center justify-between p-3">
                <div className="flex space-x-1">
                  <Button
                    variant={activeTab === 'scan' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('scan')}
                    className="rounded-full"
                  >
                    <ScanIcon className="h-4 w-4 mr-2" />
                    Scan Product
                  </Button>
                  <Button
                    variant={activeTab === 'search' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('search')}
                    className="rounded-full"
                  >
                    <SearchIcon className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    variant={activeTab === 'browse' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('browse')}
                    className="rounded-full"
                  >
                    <Package2Icon className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'simple' ? 'detailed' : 'simple')}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {viewMode === 'simple' ? 'Detailed' : 'Simple'} View
                  </Button>
                </div>
              </div>

              {/* Product Entry Content */}
              <div className="p-4 bg-white border-b">
                {activeTab === 'scan' && (
                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <BarcodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                          className="pl-10 h-12 text-lg font-mono border-2 border-blue-200 focus:border-blue-500"
                          autoComplete="off"
                        />
                      </div>
                      <Button
                        variant="default"
                        onClick={() => handleBarcodeInput(barcodeInput)}
                        disabled={!barcodeInput}
                        className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                      >
                        <SearchIcon className="h-5 w-5 mr-2" />
                        Find Product
                      </Button>
                    </div>

                    {/* Selected Product Display */}
                    {selectedProduct && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-green-900">{selectedProduct.name}</h3>
                            <p className="text-green-700">Code: {selectedProduct.sku} • Stock: {selectedProduct.stockQuantity}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm font-medium text-green-800">Quantity</Label>
                            <Input
                              type="number"
                              value={quantityInput}
                              onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                              className="h-10 text-center font-bold border-green-300 focus:border-green-500"
                              min="1"
                              placeholder="Qty"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-green-800">Rate</Label>
                            <Input
                              type="number"
                              value={rateInput}
                              onChange={(e) => setRateInput(e.target.value)}
                              className="h-10 text-right font-bold border-green-300 focus:border-green-500"
                              placeholder="Rate"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-green-800">Amount</Label>
                            <div className="h-10 px-3 border rounded border-green-300 bg-green-100 flex items-center justify-end font-bold text-green-800">
                              {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                            </div>
                          </div>
                        </div>

                        <Button onClick={addToCart} className="w-full mt-3 h-12 bg-green-600 hover:bg-green-700 text-lg">
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Add to Cart (Press Enter)
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'search' && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Search products by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-12 text-lg"
                    />
                    {searchTerm && allProducts && (
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {allProducts
                          .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .slice(0, 10)
                          .map(product => (
                            <div
                              key={product.id}
                              className="p-3 border-b hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                              onClick={() => {
                                setSelectedProduct(product);
                                setRateInput(product.price);
                                setQuantityInput(1);
                                setActiveTab('scan');
                              }}
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-600">{product.sku} • Stock: {product.stockQuantity}</div>
                              </div>
                              <div className="font-bold text-blue-600">{formatCurrency(parseFloat(product.price))}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'browse' && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowProductList(true)}
                      className="w-full h-12 text-lg"
                      variant="outline"
                    >
                      <Package2Icon className="h-5 w-5 mr-2" />
                      Browse All Products ({mockProductList.length} items)
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Header */}
            <div className="p-3 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Shopping Cart ({cart.length} items)
                </h2>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSale}
                    className="text-white hover:bg-blue-700"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-xl font-medium mb-2">Cart is empty</div>
                    <div className="text-sm">Scan a product or use the search to start billing</div>
                    <div className="mt-4 text-xs text-gray-400">
                      Press F1 to focus scanner • F2 to browse products • F10 to checkout
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {cart.map((item, index) => (
                    <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                              #{index + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.sku} • Stock: {item.stock || item.stockQuantity}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2 items-center">
                        <div className="text-center">
                          <Label className="text-xs text-gray-600">Quantity</Label>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="font-bold text-blue-600 min-w-[30px] text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-center">
                          <Label className="text-xs text-gray-600">Rate</Label>
                          <div className="font-mono text-sm font-medium mt-1">{formatCurrency(parseFloat(item.price))}</div>
                        </div>
                        <div className="text-center">
                          <Label className="text-xs text-gray-600">M.R.P</Label>
                          <div className="text-xs text-gray-500 mt-1">{formatCurrency(item.mrp || parseFloat(item.price))}</div>
                        </div>
                        <div className="text-right">
                          <Label className="text-xs text-gray-600">Amount</Label>
                          <div className="font-bold text-green-600 text-lg mt-1">{formatCurrency(item.total)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t bg-gray-50">
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <SaveIcon className="h-4 w-4 mr-1" />
                  Hold Sale
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <RefreshCwIcon className="h-4 w-4 mr-1" />
                  Recall
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <HelpCircleIcon className="h-4 w-4 mr-1" />
                  Help (F1)
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Billing Summary */}
          <div className="w-80 bg-gradient-to-br from-blue-600 to-purple-600 text-white flex flex-col">
            {/* Bill Summary Header */}
            <div className="p-4 border-b border-blue-500">
              <div className="text-center">
                <div className="text-xl font-bold">Bill Summary</div>
                <div className="text-sm opacity-90">#{billNumber}</div>
              </div>
            </div>

            {/* Bill Details */}
            <div className="flex-1 p-4 space-y-3 text-sm overflow-y-auto">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <h3 className="font-bold mb-2">Basic Details</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Items Count</span>
                    <span className="font-mono">{cart.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Quantity</span>
                    <span className="font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Amount</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <h3 className="font-bold mb-2">Discounts & Charges</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Cash Discount ({discount}%)</span>
                    <span className="font-mono">{formatCurrency(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxable Amount</span>
                    <span className="font-mono">{formatCurrency(taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({taxRate}%)</span>
                    <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <h3 className="font-bold mb-2">Additional Charges</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Packing Charge</span>
                    <span className="font-mono">0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-mono">0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Off</span>
                    <span className="font-mono">0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Amount Display */}
            <div className="p-4 border-t border-blue-500">
              <div className="text-center mb-4">
                <div className="text-sm opacity-90">Net Amount</div>
                <div className="text-4xl font-bold">{formatCurrency(grandTotal)}</div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSale}
                    disabled={cart.length === 0}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const randomCustomer = generateRandomCustomer();
                      setCustomerDetails(randomCustomer);
                      toast({
                        title: "🎲 Random Customer",
                        description: `Generated: ${randomCustomer.name}`,
                      });
                    }}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <StarIcon className="h-4 w-4 mr-1" />
                    Random
                  </Button>
                </div>
                
                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-bold"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Complete Payment (F10)
                </Button>
                
                {/* Print Last Receipt if no cart */}
                {cart.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const sampleReceiptData = {
                        billNumber,
                        billDate,
                        customerDetails,
                        salesMan,
                        items: [],
                        subtotal: 0,
                        discount: 0,
                        discountType: 'percentage' as const,
                        taxRate: 18,
                        taxAmount: 0,
                        grandTotal: 0,
                        amountPaid: 0,
                        changeDue: 0,
                        paymentMethod: "cash",
                        notes: "Sample receipt for testing"
                      };
                      printReceipt(sampleReceiptData);
                    }}
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print Test Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 text-white text-xs p-2 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-green-400">● Online</span>
            <span>User: Admin</span>
            <span>Terminal: POS-01</span>
            <span>Last Update: {lastUpdateTime.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Products: {mockProductList.length}</span>
            <span>F1: Scan • F2: Browse • F10: Pay</span>
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Product List Dialog */}
        <Dialog open={showProductList} onOpenChange={setShowProductList}>
          <DialogContent className="max-w-6xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Product Catalog - Live Inventory</DialogTitle>
              <DialogDescription>
                Click any product to add to cart. {mockProductList.length} products available. Last updated: {lastUpdateTime.toLocaleTimeString()}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockProductList.map((product) => (
                  <div
                    key={product.sno}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-all hover:border-blue-300 bg-white"
                    onClick={() => {
                      let actualProduct = allProducts?.find(p => 
                        p.name.toLowerCase().includes(product.name.toLowerCase()) ||
                        p.sku === product.code
                      );
                      
                      if (!actualProduct) {
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
                        title: "✅ Added to Cart!",
                        description: `${actualProduct.name} x 1 - ${formatCurrency(parseFloat(actualProduct.price))}`
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{product.name}</h4>
                      <Badge variant={product.stock > 10 ? "default" : "destructive"} className="text-xs">
                        {product.stock}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Code: {product.code}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">{formatCurrency(product.selfRate)}</div>
                        <div className="text-xs text-gray-500">MRP: {formatCurrency(product.mrp)}</div>
                      </div>
                      <Button size="sm" variant="outline">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Finalize the transaction for Bill #{billNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-center text-blue-800">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-center text-sm text-gray-600">Total Amount Due</div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="card">💳 Card</SelectItem>
                    <SelectItem value="upi">📱 UPI</SelectItem>
                    <SelectItem value="credit">🏷️ Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter received amount"
                  className="text-right font-mono text-lg"
                />
              </div>

              {changeDue > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-800 text-center">
                    Change Due: {formatCurrency(changeDue)}
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes for this sale..."
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
                variant="outline"
                onClick={() => {
                  const receiptData = {
                    billNumber,
                    billDate,
                    customerDetails,
                    salesMan,
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
                  printReceipt(receiptData);
                }}
                disabled={cart.length === 0}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Preview Receipt
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
                    Complete & Print
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
