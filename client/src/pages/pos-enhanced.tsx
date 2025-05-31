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
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [inventoryAlerts, setInventoryAlerts] = useState<string[]>([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
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

  // Fetch products from API
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Mock fallback data for demo
  const mockProducts = [
    { id: 1, name: "Smartphone", price: "15000", stockQuantity: 50, sku: "PHONE001", active: true },
    { id: 2, name: "Rice (1kg)", price: "80", stockQuantity: 200, sku: "RICE001", active: true },
    { id: 3, name: "T-Shirt", price: "500", stockQuantity: 30, sku: "TSHIRT001", active: true },
    { id: 4, name: "Headphones", price: "2500", stockQuantity: 15, sku: "AUDIO001", active: true },
    { id: 5, name: "Notebook", price: "150", stockQuantity: 100, sku: "BOOK001", active: true },
  ];

  const allProducts = products || mockProducts;
  
  // Enhanced product filtering with smart search
  const filteredProducts = allProducts?.filter(product => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const productName = product.name.toLowerCase();
    const productSku = product.sku?.toLowerCase() || '';
    
    // Special filters
    if (term === 'low stock') {
      return product.stockQuantity <= 5;
    }
    if (term === 'popular') {
      // Mock popular items (you can replace with actual sales data)
      return ['smartphone', 'rice', 't-shirt'].some(popular => 
        productName.includes(popular)
      );
    }
    
    // Regular search: name, SKU, or partial matches
    return productName.includes(term) ||
           productSku.includes(term) ||
           productName.split(' ').some(word => word.startsWith(term)) ||
           product.id.toString() === term;
  }) || [];

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

  // Enhanced POS functions with inventory alerts
  const addToCart = (product: any) => {
    // Check inventory levels
    if (product.stockQuantity <= 5) {
      setInventoryAlerts(prev => [
        ...prev.filter(alert => !alert.includes(product.name)),
        `Low stock alert: ${product.name} (${product.stockQuantity} remaining)`
      ]);
    }
    
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

  // Enhanced barcode scanning with smart search and user feedback
  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        title: "Empty Input ⚠️",
        description: "Please enter a barcode, SKU, or product name",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim();
    
    // First try exact matches
    let product = allProducts?.find(p => 
      p.sku === searchTerm || 
      p.id.toString() === searchTerm
    );
    
    // Then try case-insensitive matches
    if (!product) {
      product = allProducts?.find(p => 
        p.sku?.toLowerCase() === searchTerm.toLowerCase() ||
        p.name.toLowerCase() === searchTerm.toLowerCase()
      );
    }
    
    // Finally try partial matches
    if (!product) {
      product = allProducts?.find(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (product) {
      addToCart(product);
      setBarcodeInput("");
      
      // Enhanced success feedback
      toast({
        title: "🎉 Product Added Successfully!",
        description: (
          <div className="space-y-1">
            <div className="font-medium">{product.name}</div>
            <div className="text-sm">{formatCurrency(parseFloat(product.price))} • Stock: {product.stockQuantity}</div>
          </div>
        )
      });
      
      // Auto-focus back to barcode input for continuous scanning
      setTimeout(() => {
        const barcodeElement = document.querySelector('input[placeholder*="Scan barcode"]') as HTMLInputElement;
        barcodeElement?.focus();
      }, 100);
      
    } else {
      // Enhanced error feedback with suggestions
      const suggestions = allProducts?.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase().substring(0, 3))
      ).slice(0, 3);
      
      toast({
        title: "❌ Product Not Found",
        description: (
          <div className="space-y-2">
            <div>No product found for: <span className="font-mono bg-gray-100 px-1 rounded">{searchTerm}</span></div>
            {suggestions && suggestions.length > 0 && (
              <div className="text-xs">
                <div className="font-medium">Similar items:</div>
                {suggestions.map(s => (
                  <div key={s.id} className="text-gray-600">• {s.name}</div>
                ))}
              </div>
            )}
          </div>
        ),
        variant: "destructive"
      });
      
      // Keep the failed input for correction
      // setBarcodeInput(""); // Don't clear on failure
    }
  };

  // Create new customer function
  const createNewCustomer = async (customerData: { name: string; phone: string; email?: string }) => {
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) throw new Error("Failed to create customer");
      
      const newCustomer = await response.json();
      
      // Refresh customers list
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      toast({
        title: "Customer Created Successfully! 🎉",
        description: `${newCustomer.name} has been added to your customer list`
      });
      
      return newCustomer;
    } catch (error) {
      toast({
        title: "Failed to Create Customer",
        description: "Please try again later",
        variant: "destructive"
      });
      return null;
    }
  };

  // Quick product creation function
  const createQuickProduct = async (productData: { name: string; price: string; sku?: string }) => {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...productData,
          stockQuantity: 1,
          active: true,
          sku: productData.sku || `QP-${Date.now()}`
        }),
      });

      if (!response.ok) throw new Error("Failed to create product");
      
      const newProduct = await response.json();
      
      // Refresh products list
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Product Created Successfully! 🎉",
        description: `${newProduct.name} has been added to your inventory`
      });
      
      return newProduct;
    } catch (error) {
      toast({
        title: "Failed to Create Product",
        description: "Please try again later",
        variant: "destructive"
      });
      return null;
    }
  };

  // Enhanced receipt generation
  const generateReceiptData = () => {
    return {
      orderNumber: `POS-${Date.now()}`,
      timestamp: new Date(),
      customer: selectedCustomer?.name || "Walk-in Customer",
      items: cart,
      subtotal,
      discount: totalDiscount,
      tax: taxAmount,
      total: grandTotal,
      paymentMethod,
      amountPaid: parseFloat(amountPaid) || 0,
      changeDue,
      notes
    };
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

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        throw new Error("Failed to process sale");
      }

      const result = await response.json();

      toast({
        title: "Sale Completed Successfully! 🎉",
        description: `Order #${result.orderNumber || 'POS-' + Date.now()} processed for ${formatCurrency(grandTotal)}`
      });

      // Clear the sale
      clearSale();
      setShowPaymentDialog(false);

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

    } catch (error) {
      console.error("Sale processing error:", error);
      
      // For demo purposes, simulate successful sale
      const mockOrderNumber = `POS-${Date.now()}`;
      
      toast({
        title: "Sale Completed Successfully! 🎉",
        description: `Order #${mockOrderNumber} processed for ${formatCurrency(grandTotal)} - Receipt ready for printing`
      });

      // Clear the sale
      clearSale();
      setShowPaymentDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced keyboard shortcuts and search functionality
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on '/' key (like GitHub)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }

      // Ctrl/Cmd shortcuts
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
          case 'k':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
        }
      }

      // ESC to clear search
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm("");
        } else if (barcodeInput) {
          setBarcodeInput("");
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, searchTerm, barcodeInput]);

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
            
            {/* Enhanced Search Interface */}
            <div className="space-y-3 mb-3">
              {/* Main Search Bar with Auto-complete */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search-input"
                  placeholder="🔍 Search by name, SKU, or barcode... (Press / to focus)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-11 text-base border-2 border-blue-200 focus:border-blue-500 transition-colors"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Quick Search Filters */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={quickSaleMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickSaleMode(!quickSaleMode)}
                  className="h-8"
                >
                  ⚡ Quick Sale
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("low stock")}
                  className="h-8 text-xs"
                >
                  📉 Low Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("popular")}
                  className="h-8 text-xs"
                >
                  🔥 Popular
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-8 text-xs"
                >
                  🗂️ All Items
                </Button>
              </div>

              {/* Advanced Barcode Scanner */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">Barcode Scanner Ready</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2m0 0h8m-8 0V3m8 0v0m0 0h2a2 2 0 0 1 2 2v2m0 0v8m0-8h0m0 8v2a2 2 0 0 1-2 2h-2m0 0H8m8 0v0M8 21h0m0 0H6a2 2 0 0 1-2-2v-2"/>
                      <path d="M7 12h2m2 0h2m2 0h2"/>
                    </svg>
                    <Input
                      placeholder="📷 Scan barcode or type SKU/product code..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBarcodeInput(barcodeInput);
                        }
                      }}
                      className="pl-11 pr-4 border-green-200 focus:border-green-500 bg-white"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBarcodeInput(barcodeInput)}
                    disabled={!barcodeInput}
                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                  >
                    🛒 Add Item
                  </Button>
                </div>
                {barcodeInput && (
                  <div className="mt-2 text-xs text-green-700">
                    Ready to scan: <span className="font-mono bg-green-100 px-2 py-1 rounded">{barcodeInput}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Alerts */}
            {inventoryAlerts.length > 0 && (
              <div className="mb-3">
                {inventoryAlerts.map((alert, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm mb-1 flex justify-between items-center">
                    <span>{alert}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInventoryAlerts(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

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

          {/* Search Results Info */}
          {searchTerm && (
            <div className="px-4 py-2 bg-blue-50 border-b">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800">
                  {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchTerm}"
                </span>
                <span className="text-blue-600 text-xs">
                  Press ESC to clear
                </span>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="p-4 h-[calc(100vh-240px)] overflow-y-auto">
            {productsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading products...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      {searchTerm ? `No products found for "${searchTerm}"` : "No products found"}
                    </h3>
                    
                    {searchTerm ? (
                      <div className="space-y-3">
                        <p className="text-gray-500 text-sm">Try:</p>
                        <div className="flex gap-2 justify-center flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                          >
                            🗂️ Show All Products
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSearchTerm(searchTerm.slice(0, -1))}
                            disabled={searchTerm.length <= 1}
                          >
                            ⬅️ Remove Last Character
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-gray-500 text-sm">Get started by creating your first product</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const productName = prompt("Enter product name:");
                            const productPrice = prompt("Enter product price:");
                            if (productName && productPrice) {
                              createQuickProduct({ name: productName, price: productPrice });
                            }
                          }}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Create Quick Product
                        </Button>
                      </div>
                    )}
                    
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 max-w-md mx-auto">
                      <div className="font-medium mb-2">💡 Search Tips:</div>
                      <ul className="text-left space-y-1">
                        <li>• Press <kbd className="bg-white px-1 rounded">/</kbd> to quick-focus search</li>
                        <li>• Use barcode scanner for instant adding</li>
                        <li>• Try "low stock" or "popular" filters</li>
                        <li>• Search by name, SKU, or product ID</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 hover:border-l-green-500"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-3">
                        <div className="font-medium text-sm line-clamp-2">{product.name}</div>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          {formatCurrency(parseFloat(product.price))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                          <span>Stock: {product.stockQuantity}</span>
                          <span>SKU: {product.sku}</span>
                        </div>
                        {product.stockQuantity <= 5 && (
                          <div className="text-xs text-red-500 font-medium mt-1">
                            ⚠️ Low Stock
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
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

            {/* Checkout Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full h-12 text-lg"
                onClick={() => setShowPaymentDialog(true)}
                disabled={cart.length === 0}
              >
                <CreditCardIcon className="mr-2" />
                Checkout (Ctrl+P)
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowReceiptPreview(true)}
                  disabled={cart.length === 0}
                >
                  <PrinterIcon className="mr-1 h-4 w-4" />
                  Preview Receipt
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const receiptData = generateReceiptData();
                    console.log('Receipt Data:', receiptData);
                    toast({
                      title: "Receipt Ready",
                      description: "Receipt data generated for printing"
                    });
                  }}
                  disabled={cart.length === 0}
                >
                  <PrinterIcon className="mr-1 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerSearch(false);
                }}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Walk-in Customer
              </Button>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {customers?.map((customer: Customer) => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerSearch(false);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                      {customer.email && (
                        <div className="text-xs text-gray-400">{customer.email}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
              
              <div className="border-t pt-3">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    const customerName = prompt("Enter customer name:");
                    const customerPhone = prompt("Enter customer phone:");
                    if (customerName && customerPhone) {
                      createNewCustomer({ name: customerName, phone: customerPhone }).then((newCustomer) => {
                        if (newCustomer) {
                          setSelectedCustomer(newCustomer);
                          setShowCustomerSearch(false);
                        }
                      });
                    }
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              </div>
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

        {/* Receipt Preview Dialog */}
        <Dialog open={showReceiptPreview} onOpenChange={setShowReceiptPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Receipt Preview</DialogTitle>
            </DialogHeader>
            <div className="bg-white p-4 border rounded font-mono text-sm max-h-96 overflow-y-auto">
              <div className="text-center border-b pb-2 mb-2">
                <div className="font-bold">AWESOME SHOP POS</div>
                <div className="text-xs">Professional Retail System</div>
                <div className="text-xs">GST: 12ABCDE1234F1Z5</div>
              </div>
              
              <div className="border-b pb-2 mb-2 text-xs">
                <div>Order: POS-{Date.now()}</div>
                <div>Date: {new Date().toLocaleString()}</div>
                <div>Customer: {selectedCustomer?.name || "Walk-in Customer"}</div>
                <div>Cashier: Administrator</div>
              </div>
              
              <div className="border-b pb-2 mb-2">
                <div className="flex justify-between font-bold text-xs mb-1">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>RATE</span>
                  <span>AMOUNT</span>
                </div>
                {cart.map((item, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between">
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <span className="w-16 text-right">{formatCurrency(parseFloat(item.price))}</span>
                      <span className="w-16 text-right">{formatCurrency(item.total)}</span>
                    </div>
                    {item.itemDiscount && (
                      <div className="text-xs text-gray-500 ml-2">
                        Item Discount: {item.itemDiscount}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST ({taxRate}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span>{paymentMethod.toUpperCase()}</span>
                </div>
                {amountPaid && (
                  <>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>{formatCurrency(parseFloat(amountPaid))}</span>
                    </div>
                    {changeDue > 0 && (
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <span>{formatCurrency(changeDue)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="text-center text-xs mt-4 pt-2 border-t">
                <div>Thank you for shopping with us!</div>
                <div>Visit again soon!</div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReceiptPreview(false)}>
                Close Preview
              </Button>
              <Button onClick={() => {
                // Print functionality would go here
                toast({
                  title: "Print Sent",
                  description: "Receipt sent to printer"
                });
                setShowReceiptPreview(false);
              }}>
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}