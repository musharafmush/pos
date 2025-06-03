import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  SearchIcon, 
  PlusIcon,
  Package2Icon,
  ScanIcon,
  CheckCircleIcon,
  ShoppingCartIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@shared/schema";

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
  category?: string;
  trending?: boolean;
}

export default function POSEnhanced() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [rateInput, setRateInput] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Static product list for demo
  const generateDynamicProductList = (): ProductListItem[] => {
    const baseProducts = [
      { name: "Badam Almonds Premium 250g", baseCode: "ALM001", baseRate: 450, category: "Dry Fruits", trending: true, stock: 25 },
      { name: "Cashew Nuts W240 250g", baseCode: "CSH001", baseRate: 380, category: "Dry Fruits", trending: false, stock: 30 },
      { name: "Organic Basmati Rice 1kg", baseCode: "RIC001", baseRate: 85, category: "Grains", trending: true, stock: 50 },
      { name: "Himalayan Pink Salt 1kg", baseCode: "SLT001", baseRate: 25, category: "Spices", trending: false, stock: 40 },
      { name: "Cold Pressed Coconut Oil 1L", baseCode: "OIL001", baseRate: 220, category: "Oils", trending: true, stock: 20 },
      { name: "Organic Jaggery 1kg", baseCode: "SGR001", baseRate: 48, category: "Sweeteners", trending: false, stock: 35 },
      { name: "Assam Tea Powder 250g", baseCode: "TEA001", baseRate: 145, category: "Beverages", trending: true, stock: 28 },
      { name: "Whole Wheat Flour 1kg", baseCode: "FLR001", baseRate: 42, category: "Flour", trending: false, stock: 60 },
      { name: "Farm Fresh Onions 1kg", baseCode: "VEG001", baseRate: 35, category: "Vegetables", trending: true, stock: 45 },
      { name: "Organic Potatoes 1kg", baseCode: "VEG002", baseRate: 28, category: "Vegetables", trending: false, stock: 55 }
    ];

    return baseProducts.map((product, index) => {
      return {
        sno: index + 1,
        name: product.name,
        code: product.baseCode,
        stock: product.stock,
        drugStock: 0.00,
        selfRate: product.baseRate,
        mrp: Math.round(product.baseRate * 1.15 * 100) / 100,
        locStock: product.stock,
        category: product.category,
        trending: product.trending
      };
    });
  };

  const [mockProductList] = useState<ProductListItem[]>(generateDynamicProductList());
  const allProducts = products || [];

  // Enhanced barcode scanning with smart product lookup
  const handleBarcodeInput = (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        title: "⚠️ Empty Barcode",
        description: "Please scan or enter a valid barcode/product code",
        variant: "destructive"
      });
      return;
    }

    const searchTerm = barcode.trim().toLowerCase();

    // Multi-layer product search
    let product = allProducts?.find(p => 
      p.sku?.toLowerCase() === searchTerm || 
      p.id.toString() === searchTerm ||
      p.barcode?.toLowerCase() === searchTerm ||
      p.name.toLowerCase().includes(searchTerm)
    );

    // Fallback to mock products
    if (!product) {
      const mockProduct = mockProductList.find(p => 
        p.code.toLowerCase() === searchTerm || 
        p.name.toLowerCase().includes(searchTerm)
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
            <div className="font-bold text-green-700">{product.name}</div>
            <div className="text-sm">SKU: {product.sku} • Stock: {product.stockQuantity}</div>
            <div className="text-sm font-medium">Rate: {formatCurrency(parseFloat(product.price))}</div>
          </div>
        )
      });
    } else {
      toast({
        title: "❌ Product Not Found",
        description: `No product found for: "${barcode}"`,
        variant: "destructive"
      });
    }
  };

  // Add product to cart
  const addToCart = () => {
    if (!selectedProduct) {
      toast({
        title: "⚠️ No Product Selected",
        description: "Please scan or select a product first",
        variant: "destructive"
      });
      return;
    }

    if (quantityInput <= 0) {
      toast({
        title: "⚠️ Invalid Quantity",
        description: "Quantity must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const rate = parseFloat(rateInput) || parseFloat(selectedProduct.price);
    const existingItem = cart.find(item => item.id === selectedProduct.id);

    if (existingItem) {
      setCart(prev => prev.map(item => 
        item.id === selectedProduct.id 
          ? { ...item, quantity: item.quantity + quantityInput, total: (item.quantity + quantityInput) * parseFloat(item.price) }
          : item
      ));
      toast({
        title: "🔄 Quantity Updated",
        description: `${selectedProduct.name} quantity updated to ${existingItem.quantity + quantityInput}`
      });
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

      toast({
        title: "✅ Item Added to Cart",
        description: (
          <div className="space-y-1">
            <div className="font-medium">{selectedProduct.name}</div>
            <div className="text-sm">Qty: {quantityInput} × {formatCurrency(rate)} = {formatCurrency(rate * quantityInput)}</div>
          </div>
        )
      });
    }

    // Reset inputs and focus barcode scanner
    setSelectedProduct(null);
    setBarcodeInput("");
    setQuantityInput(1);
    setRateInput("");

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        {/* Header */}
        <div className="bg-white border-b shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <ShoppingCartIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Add Product to Cart</h1>
                  <p className="text-sm text-gray-600">Scan or search products to add to cart</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Product Entry Panel */}
          <div className="flex-1 bg-white border-r flex flex-col p-6">
            {/* Barcode Scanning Interface */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanIcon className="h-5 w-5 text-blue-600" />
                  Product Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
                    <div className="flex items-center p-2">
                      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mr-3">
                        <SearchIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="flex-1 relative">
                        <Input
                          ref={barcodeInputRef}
                          placeholder="Enter Product name / SKU / Scan bar code"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleBarcodeInput(barcodeInput);
                            }
                          }}
                          className="h-12 text-lg border-0 focus:ring-0 focus:outline-none bg-transparent"
                          autoComplete="off"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBarcodeInput(barcodeInput)}
                        disabled={!barcodeInput}
                        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white mr-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Live Search Results */}
                  {barcodeInput && barcodeInput.length > 2 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg max-h-80 overflow-y-auto">
                      <div className="p-3 border-b bg-gray-50">
                        <h4 className="font-medium text-gray-900">Search Results</h4>
                        <p className="text-sm text-gray-600">Click any product to select</p>
                      </div>
                      {mockProductList
                        .filter(product => 
                          product.name.toLowerCase().includes(barcodeInput.toLowerCase()) ||
                          product.code.toLowerCase().includes(barcodeInput.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((product, index) => (
                          <div
                            key={product.sno}
                            className="flex items-center justify-between p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-all"
                            onClick={() => {
                              let actualProduct = {
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

                              setSelectedProduct(actualProduct);
                              setRateInput(actualProduct.price);
                              setQuantityInput(1);
                              setBarcodeInput("");

                              toast({
                                title: "🎯 Product Selected!",
                                description: `${actualProduct.name} ready to add`
                              });
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-600">
                                Price: {formatCurrency(product.selfRate)} • Stock: {product.stock}
                              </div>
                              <div className="text-xs text-gray-500">{product.code}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Selected Product Display */}
                  {selectedProduct && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center space-x-4 mb-4">
                        <CheckCircleIcon className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-green-900">{selectedProduct.name}</h3>
                          <p className="text-green-700 font-medium">
                            SKU: {selectedProduct.sku} • Available Stock: {selectedProduct.stockQuantity}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-bold text-green-800">Quantity</Label>
                          <Input
                            type="number"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                            className="h-12 text-center text-xl font-bold border-green-400 focus:border-green-600"
                            min="1"
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold text-green-800">Rate (₹)</Label>
                          <Input
                            type="number"
                            value={rateInput}
                            onChange={(e) => setRateInput(e.target.value)}
                            className="h-12 text-right text-xl font-bold border-green-400 focus:border-green-600"
                            placeholder="Rate"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold text-green-800">Total Amount</Label>
                          <div className="h-12 px-4 border-2 rounded border-green-400 bg-green-100 flex items-center justify-end text-xl font-bold text-green-800">
                            {formatCurrency((parseFloat(rateInput) || parseFloat(selectedProduct.price)) * quantityInput)}
                          </div>
                        </div>
                      </div>

                      <Button onClick={addToCart} className="w-full mt-4 h-14 bg-green-600 hover:bg-green-700 text-xl font-bold shadow-lg">
                        <PlusIcon className="h-6 w-6 mr-2" />
                        Add to Cart (Press Enter)
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart Panel */}
          <div className="w-96 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white flex flex-col shadow-2xl">
            <div className="p-5 border-b border-blue-500">
              <div className="text-center">
                <div className="text-2xl font-bold">🛒 Shopping Cart</div>
                <div className="text-lg opacity-90">{cart.length} items</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <ShoppingCartIcon className="h-20 w-20 mx-auto mb-4 opacity-50" />
                    <div className="text-xl font-medium mb-2">Cart is empty</div>
                    <div className="text-sm opacity-75">Scan a product to start adding items</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={item.id} className="bg-white/15 backdrop-blur rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(item.total)}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-xs opacity-75">{item.sku}</p>
                        <div className="flex justify-between mt-1 text-xs">
                          <span>Qty: {item.quantity}</span>
                          <span>Rate: {formatCurrency(parseFloat(item.price))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-blue-500">
              <div className="text-center">
                <div className="text-sm opacity-90">Total Amount</div>
                <div className="text-3xl font-bold">
                  {formatCurrency(cart.reduce((sum, item) => sum + item.total, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}