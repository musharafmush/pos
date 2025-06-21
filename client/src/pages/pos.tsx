import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchIcon, PlusIcon, MinusIcon, XIcon, CreditCardIcon, ReceiptIcon, PrinterIcon, Scan, Gift } from "lucide-react";
import { OfferEngine } from "@/components/pos/offer-engine";
import { BarcodeScanner } from "@/components/pos/barcode-scanner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatCurrency } from "@/lib/currency";

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  price: string | number;
  stockQuantity: number;
  image?: string;
  category?: {
    name: string;
  };
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

export default function POS() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerNote, setCustomerNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>();
  const [appliedOffers, setAppliedOffers] = useState<any[]>([]);
  const [totalOfferDiscount, setTotalOfferDiscount] = useState(0);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });

  const { data: searchResults } = useQuery({
    queryKey: ['/api/products/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to search products');
      }
      return response.json();
    },
    enabled: searchTerm.length > 0
  });

  // Fetch customers for offer eligibility
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  });

  // Fetch business settings for receipt header
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/settings/business'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/settings/business');
        if (!response.ok) {
          return {
            businessName: "Awesome Shop",
            address: "",
            phone: "",
            email: "",
            taxNumber: ""
          };
        }
        return response.json();
      } catch (error) {
        return {
          businessName: "Awesome Shop",
          address: "",
          phone: "",
          email: "",
          taxNumber: ""
        };
      }
    }
  });

  useEffect(() => {
    // Focus on barcode input when component mounts
    const barcodeInputElement = document.getElementById("barcode-input");
    if (barcodeInputElement) {
      barcodeInputElement.focus();
    }

    // Set up event listener for barcode scanner
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement === barcodeInputElement) {
        e.preventDefault();
        handleBarcodeSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [barcodeInput]);

  const handleBarcodeSubmit = async () => {
    if (!barcodeInput.trim()) return;

    try {
      // First check if the barcode matches a product in our local state
      const product = products?.find((p: Product) => 
        p.barcode === barcodeInput || p.sku === barcodeInput
      );

      if (product) {
        addToCart(product);
      } else {
        toast({
          title: "Product not found",
          description: `No product found with barcode or SKU: ${barcodeInput}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast({
        title: "Error",
        description: "Failed to process barcode input",
        variant: "destructive"
      });
    } finally {
      setBarcodeInput("");
    }
  };

  // Handle offer calculations when cart changes
  const handleOffersCalculated = (offers: any[], totalDiscount: number) => {
    setAppliedOffers(offers);
    setTotalOfferDiscount(totalDiscount);
  };

  // Handle barcode scanner product addition
  const handleProductScanned = (product: any, triggeredOffers?: any[]) => {
    addToCart(product);
    if (triggeredOffers && triggeredOffers.length > 0) {
      toast({
        title: "Special Offers Activated!",
        description: `${triggeredOffers.length} offer(s) triggered by scanning ${product.name}`,
      });
    }
  };

  // Handle offers triggered by barcode scanning
  const handleOfferTriggered = (offers: any[]) => {
    toast({
      title: "Barcode Offer Activated!",
      description: `Special promotion activated: ${offers.map(o => o.name).join(', ')}`,
    });
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Item exists, increase quantity
        const updatedCart = [...prevCart];
        const item = updatedCart[existingItemIndex];
        
        if (item.stockQuantity <= item.quantity) {
          toast({
            title: "Stock limit reached",
            description: `Only ${item.stockQuantity} units available for ${item.name}`,
            variant: "destructive"
          });
          return prevCart;
        }
        
        const newQuantity = item.quantity + 1;
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price);
        
        updatedCart[existingItemIndex] = {
          ...item,
          quantity: newQuantity,
          total: price * newQuantity
        };
        
        return updatedCart;
      } else {
        // New item, add to cart
        if (product.stockQuantity <= 0) {
          toast({
            title: "Out of stock",
            description: `${product.name} is out of stock`,
            variant: "destructive"
          });
          return prevCart;
        }
        
        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
        
        return [
          ...prevCart,
          {
            ...product,
            quantity: 1,
            total: price
          }
        ];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          if (newQuantity > item.stockQuantity) {
            toast({
              title: "Stock limit reached",
              description: `Only ${item.stockQuantity} units available for ${item.name}`,
              variant: "destructive"
            });
            return item;
          }
          
          const price = typeof item.price === 'number' ? item.price : parseFloat(item.price);
          return {
            ...item,
            quantity: newQuantity,
            total: price * newQuantity
          };
        }
        return item;
      });
    });
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    // Assuming 7% tax rate
    return calculateSubtotal() * 0.07;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generateReceipt = (saleData: any) => {
    const now = new Date();
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt - ${saleData.orderNumber}</title>
    <style>
        @page { 
            size: 80mm auto; 
            margin: 0; 
        }
        body { 
            font-family: monospace; 
            font-size: 12px; 
            margin: 5mm; 
            line-height: 1.4;
        }
        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .header { margin-bottom: 10px; }
        .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total-section { margin-top: 10px; }
        .thank-you { margin-top: 15px; text-align: center; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header center">
        <div class="bold" style="font-size: 16px;">${businessSettings?.businessName || 'Awesome Shop'}</div>
        ${businessSettings?.address ? `<div>${businessSettings.address}</div>` : ''}
        ${businessSettings?.phone ? `<div>Phone: ${businessSettings.phone}</div>` : ''}
        ${businessSettings?.email ? `<div>Email: ${businessSettings.email}</div>` : ''}
        ${businessSettings?.taxNumber ? `<div>Tax ID: ${businessSettings.taxNumber}</div>` : ''}
    </div>
    
    <div class="line"></div>
    
    <div>
        <div><strong>Receipt #:</strong> ${saleData.orderNumber}</div>
        <div><strong>Date:</strong> ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')}</div>
        <div><strong>Cashier:</strong> ${saleData.cashier || 'Admin'}</div>
        ${saleData.customer ? `<div><strong>Customer:</strong> ${saleData.customer}</div>` : ''}
    </div>
    
    <div class="line"></div>
    
    <div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
        </div>
        <div class="line"></div>
        ${cart.map(item => `
            <div>
                <div>${item.name}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span>SKU: ${item.sku}</span>
                    <span>${item.quantity}</span>
                    <span>${formatCurrency(item.price)}</span>
                    <span>${formatCurrency(item.total)}</span>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="line"></div>
    
    <div class="total-section">
        <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${formatCurrency(calculateSubtotal())}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Tax (7%):</span>
            <span>${formatCurrency(calculateTax())}</span>
        </div>
        <div class="line"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(calculateTotal())}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span>Payment Method:</span>
            <span>${paymentMethod.toUpperCase()}</span>
        </div>
    </div>
    
    ${customerNote ? `
    <div class="line"></div>
    <div>
        <strong>Note:</strong> ${customerNote}
    </div>
    ` : ''}
    
    <div class="thank-you">
        <div>Thank you for your business!</div>
        <div>Visit us again soon</div>
        ${businessSettings?.phone ? `<div>Call us: ${businessSettings.phone}</div>` : ''}
    </div>
</body>
</html>
    `;
    
    return receiptContent;
  };

  const printReceipt = (saleData: any) => {
    const receiptContent = generateReceipt(saleData);
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      
      toast({
        title: "Receipt printed",
        description: "Receipt has been sent to printer",
      });
    } else {
      toast({
        title: "Print blocked",
        description: "Please allow popups to print receipts",
        variant: "destructive"
      });
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to the cart before checking out",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Prepare sale data
      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: typeof item.price === 'string' ? parseFloat(item.price) : item.price
        })),
        tax: calculateTax(),
        discount: 0,
        paymentMethod,
        note: customerNote
      };
      
      // Create sale
      const response = await apiRequest("POST", "/api/sales", saleData);
      const saleResult = await response.json();
      
      // Store sale data for printing
      const completedSale = {
        ...saleResult,
        items: cart,
        cashier: 'Admin'
      };
      setLastSaleData(completedSale);
      
      toast({
        title: "Sale complete",
        description: "Sale has been successfully processed",
      });
      
      // Clear cart and close dialog
      setCart([]);
      setCheckoutDialogOpen(false);
      
      // Show print dialog
      setShowPrintDialog(true);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/recent'] });
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto h-full">
        <div className="flex flex-col h-[calc(100vh-120px)] md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Product Search & Selection Panel */}
          <div className="md:w-2/3 flex flex-col h-full">
            <Card className="flex-1 h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Point of Sale</CardTitle>
                <div className="w-full relative mt-2">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input 
                    placeholder="Search products by name, SKU, or barcode"
                    className="w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto">
                {searchTerm ? (
                  // Search results
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {searchResults?.map((product: Product) => (
                      <button
                        key={product.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center text-center cursor-pointer border border-gray-200 dark:border-gray-700"
                        onClick={() => addToCart(product)}
                      >
                        <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center mb-2">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover rounded-md" />
                          ) : (
                            <span className="text-3xl text-gray-400">🛒</span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {product.category?.name || "Uncategorized"}
                        </p>
                        <p className="font-bold text-primary mt-1">
                          {formatCurrency(product.price)}
                        </p>
                      </button>
                    ))}
                    {searchResults?.length === 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                        No products found matching your search.
                      </div>
                    )}
                  </div>
                ) : (
                  // All products display (categorized)
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {products?.map((product: Product) => (
                      <button
                        key={product.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center text-center cursor-pointer border border-gray-200 dark:border-gray-700"
                        onClick={() => addToCart(product)}
                      >
                        <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center mb-2">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover rounded-md" />
                          ) : (
                            <span className="text-3xl text-gray-400">🛒</span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {product.category?.name || "Uncategorized"}
                        </p>
                        <p className="font-bold text-primary mt-1">
                          {formatCurrency(product.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Shopping Cart Panel */}
          <div className="md:w-1/3 flex flex-col h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Current Sale</span>
                </CardTitle>
                <div className="mt-2 flex">
                  <Input 
                    id="barcode-input"
                    placeholder="Scan barcode or enter SKU"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    className="ml-2" 
                    onClick={handleBarcodeSubmit}
                    variant="secondary"
                  >
                    Add
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto">
                {cart.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-gray-800 dark:text-gray-200">{item.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <MinusIcon className="h-3 w-3" />
                              </Button>
                              <span className="mx-2">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <PlusIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 dark:text-red-400"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No items in cart</p>
                    <p className="text-sm mt-2">Scan a barcode or search for products to add</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="w-full space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax (7%)</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Total</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
                
                <div className="w-full mt-4 space-y-2">
                  {lastSaleData && (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => printReceipt(lastSaleData)}
                    >
                      <PrinterIcon className="h-4 w-4" />
                      Print Last Receipt
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full">
                      Clear Sale
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={() => setCheckoutDialogOpen(true)}
                      disabled={cart.length === 0}
                    >
                      Checkout
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Finalize the sale with the following payment method.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Note (Optional)</label>
              <Input 
                placeholder="Add note about this sale"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-800 dark:text-gray-100">Total Amount</span>
                <span className="font-bold text-primary">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
              className="gap-2"
            >
              {paymentMethod === 'cash' ? (
                <ReceiptIcon className="h-4 w-4" />
              ) : (
                <CreditCardIcon className="h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Receipt Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon className="h-5 w-5" />
              Sale Completed Successfully
            </DialogTitle>
            <DialogDescription>
              Your sale has been processed. Would you like to print a receipt for the customer?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {lastSaleData && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Receipt #:</span>
                  <span>{lastSaleData.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-primary">{formatCurrency(lastSaleData.total || calculateTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span className="capitalize">{paymentMethod}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPrintDialog(false)}
            >
              Skip Printing
            </Button>
            <Button 
              onClick={() => {
                if (lastSaleData) {
                  printReceipt(lastSaleData);
                }
                setShowPrintDialog(false);
              }}
              className="gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
