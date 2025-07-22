import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { printReceipt as printReceiptUtil } from "@/components/pos/print-receipt";
import {
  Search,
  ShoppingCart,
  Scan,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  User,
  Phone,
  Calendar,
  Clock,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Receipt,
  UserPlus,
  Calculator,
  RotateCcw,
  Archive,
  Monitor,
  Zap,
  Package,
  CheckCircle,
  AlertCircle,
  Info,
  Banknote,
  DollarSign,
  Smartphone,
  Save,
  List,
  FileText,
  Download,
  Settings,
  Printer,
  Star,
  Gift
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  mrp: number;
  cost?: string;
  stockQuantity: number;
  barcode?: string;
  category?: {
    name: string;
  };
  weightUnit?: string;
  weight?: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
  isWeightBased?: boolean;
  actualWeight?: number;
  pricePerKg?: number;
  productId?: number;
  productName?: string;
  productSku?: string;
  unitPrice?: number;
  subtotal?: number;
}

export default function POSEnhanced() {
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [discount, setDiscount] = useState(0);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [enteredWeight, setEnteredWeight] = useState("");
  const [showOceanDialog, setShowOceanDialog] = useState(false);

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<any>(null);
  const [oceanFreight, setOceanFreight] = useState({
    containerNumber: "",
    vesselName: "",
    portOfLoading: "",
    portOfDischarge: "",
    freightCost: "",
    insuranceCost: "",
    customsDuty: "",
    handlingCharges: "",
    totalOceanCost: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [billNumber, setBillNumber] = useState(`POS${Date.now()}`);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCashRegister, setShowCashRegister] = useState(false);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showHoldSales, setShowHoldSales] = useState(false);
  const [holdSales, setHoldSales] = useState<Array<{
    id: string;
    cart: CartItem[];
    customer: Customer | null;
    discount: number;
    notes: string;
    timestamp: Date;
    total: number;
    oceanFreight?: any;
  }>>([]);

  // Printer settings state
  const [receiptSettings, setReceiptSettings] = useState({
    businessName: "LARAVEL POS SYSTEM",
    address: "1234 Main Street\nCity, State 12345",
    phone: "(123) 456-7890",
    taxId: "",
    receiptFooter: "Thank you for shopping with us!",
    showLogo: false,
    printAutomatically: true,
    defaultPrinter: "default"
  });

  // Cash register state
  const [registerOpened, setRegisterOpened] = useState(false);
  const [activeRegisterId, setActiveRegisterId] = useState<number | null>(null);
  const [openingCash, setOpeningCash] = useState(0);

  // Loyalty management state
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [redeemedPointsForTransaction, setRedeemedPointsForTransaction] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [upiReceived, setUpiReceived] = useState(0);
  const [cardReceived, setCardReceived] = useState(0);
  const [bankReceived, setBankReceived] = useState(0);
  const [chequeReceived, setChequeReceived] = useState(0);
  const [otherReceived, setOtherReceived] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalRefunds, setTotalRefunds] = useState(0);

  // Form state
  const [cashOperation, setCashOperation] = useState<'add' | 'remove'>('add');
  const [cashReason, setCashReason] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");

  // Comprehensive form state reset
  const resetCashRegisterForm = () => {
    setCashAmount("");
    setCashReason("");
    setCashOperation('add');
  };

  // Reset all cash register states
  const resetAllCashRegisterStates = () => {
    setCashAmount("");
    setCashReason("");
    setCashOperation('add');
    setWithdrawalAmount("");
    setWithdrawalNote("");
    setShowCashRegister(false);
    setShowOpenRegister(false);
    setShowCloseRegister(false);
    setShowWithdrawal(false);
  };

  // Reset withdrawal form
  const resetWithdrawalForm = () => {
    setWithdrawalAmount("");
    setWithdrawalNote("");
  };

  // Add billDetails state
  const [billDetails, setBillDetails] = useState({
    billNumber: `POS${Date.now()}`,
    billDate: new Date().toISOString().split('T')[0],
    billTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products with error handling
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        console.log("Fetched products:", data);
        return data;
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Error",
          description: "Failed to load products. Please refresh the page.",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Fetch active cash register status
  const { data: activeCashRegister } = useQuery({
    queryKey: ["/api/cash-register/active"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/cash-register/active");
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching active cash register:", error);
        return null;
      }
    },
  });

  // Fetch printer settings dynamically for bill printing
  const { data: dynamicPrinterSettings, isLoading: printerSettingsLoading } = useQuery({
    queryKey: ["/api/settings/receipt"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/receipt");
        if (!response.ok) {
          console.warn('Failed to fetch printer settings, using defaults');
          return null;
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching printer settings:', error);
        return null;
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update register state when active register is loaded
  useEffect(() => {
    if (activeCashRegister) {
      console.log('Loading active cash register:', activeCashRegister);
      setRegisterOpened(true);
      setActiveRegisterId(activeCashRegister.id);
      
      // Handle both camelCase and snake_case properties for compatibility
      const openingCash = parseFloat(activeCashRegister.openingCash || activeCashRegister.opening_cash || '0');
      const currentCash = parseFloat(activeCashRegister.currentCash || activeCashRegister.current_cash || '0');
      const cashReceived = parseFloat(activeCashRegister.cashReceived || activeCashRegister.cash_received || '0');
      const upiReceived = parseFloat(activeCashRegister.upiReceived || activeCashRegister.upi_received || '0');
      const cardReceived = parseFloat(activeCashRegister.cardReceived || activeCashRegister.card_received || '0');
      const bankReceived = parseFloat(activeCashRegister.bankReceived || activeCashRegister.bank_received || '0');
      const chequeReceived = parseFloat(activeCashRegister.chequeReceived || activeCashRegister.cheque_received || '0');
      const otherReceived = parseFloat(activeCashRegister.otherReceived || activeCashRegister.other_received || '0');
      const totalWithdrawals = parseFloat(activeCashRegister.totalWithdrawals || activeCashRegister.total_withdrawals || '0');
      const totalRefunds = parseFloat(activeCashRegister.totalRefunds || activeCashRegister.total_refunds || '0');
      
      setOpeningCash(openingCash);
      setCashInHand(currentCash);
      setCashReceived(cashReceived);
      setUpiReceived(upiReceived);
      setCardReceived(cardReceived);
      setBankReceived(bankReceived);
      setChequeReceived(chequeReceived);
      setOtherReceived(otherReceived);
      setTotalWithdrawals(totalWithdrawals);
      setTotalRefunds(totalRefunds);
      
      console.log('Cash register values loaded:', {
        openingCash,
        currentCash,
        cashInHand: currentCash
      });
    }
  }, [activeCashRegister]);

  // Fetch customers with error handling
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/customers");
        if (!response.ok) throw new Error("Failed to fetch customers");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching customers:", error);
        return [];
      }
    },
  });

  // Fetch customer loyalty data when customer is selected
  const fetchCustomerLoyalty = async (customerId: number) => {
    try {
      console.log('Fetching loyalty data for customer:', customerId);
      const response = await fetch(`/api/loyalty/customer/${customerId}`);
      
      if (response.ok) {
        const loyaltyData = await response.json();
        console.log('Loyalty data received:', loyaltyData);
        console.log('Available points:', loyaltyData.availablePoints);
        console.log('Total points:', loyaltyData.totalPoints);
        setCustomerLoyalty(loyaltyData);
        
        toast({
          title: "Loyalty Points Loaded",
          description: `Customer has ${loyaltyData.availablePoints || loyaltyData.totalPoints || 0} loyalty points`,
          duration: 2000,
        });
      } else if (response.status === 404) {
        console.log('Creating new loyalty record for customer:', customerId);
        // Create loyalty record if doesn't exist
        const createResponse = await fetch('/api/loyalty/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId })
        });
        
        if (createResponse.ok) {
          const newLoyalty = await createResponse.json();
          console.log('New loyalty record created:', newLoyalty);
          setCustomerLoyalty(newLoyalty);
          
          toast({
            title: "Loyalty Account Created",
            description: "New loyalty account created for customer",
            duration: 2000,
          });
        } else {
          console.error('Failed to create loyalty record');
          setCustomerLoyalty(null);
        }
      } else {
        console.error('Failed to fetch loyalty data:', response.status);
        setCustomerLoyalty(null);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      setCustomerLoyalty(null);
      
      toast({
        title: "Loyalty Error",
        description: "Failed to load loyalty points. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Reset loyalty state when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerLoyalty(selectedCustomer.id);
    } else {
      setCustomerLoyalty(null);
      setLoyaltyPointsToRedeem(0);
      setLoyaltyDiscount(0);
    }
  }, [selectedCustomer]);

  // Calculate points to earn from current purchase
  const calculatePointsToEarn = (total: number) => {
    // 1 point per 100 rupees spent (0.01 points per rupee)
    return Math.round((total * 0.01) * 100) / 100; // Round to 2 decimal places
  };

  // Handle loyalty point redemption
  const handleLoyaltyRedemption = async () => {
    console.log('Handling loyalty redemption:', {
      customerLoyalty,
      loyaltyPointsToRedeem,
      cartLength: cart.length,
      subtotal: cart.reduce((sum, item) => sum + item.total, 0)
    });

    if (!customerLoyalty || loyaltyPointsToRedeem <= 0) {
      toast({
        title: "Invalid Redemption",
        description: "Please enter valid points to redeem",
        variant: "destructive",
      });
      return;
    }
    
    if (loyaltyPointsToRedeem > parseFloat(customerLoyalty.availablePoints)) {
      toast({
        title: "Insufficient Points",
        description: `Customer only has ${parseFloat(customerLoyalty.availablePoints)} points available`,
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before redeeming points",
        variant: "destructive",
      });
      return;
    }

    // 1 point = ₹1 discount
    const discountFromPoints = loyaltyPointsToRedeem;
    const currentSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
    
    if (discountFromPoints > currentSubtotal) {
      toast({
        title: "Discount Too High",
        description: `Maximum discount allowed is ₹${currentSubtotal} for current cart`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Call backend API to redeem points
      const response = await fetch('/api/loyalty/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          points: loyaltyPointsToRedeem
        })
      });

      if (!response.ok) {
        throw new Error('Failed to redeem points');
      }

      const result = await response.json();
      console.log('Backend redemption result:', result);

      // Apply the loyalty discount
      setLoyaltyDiscount(discountFromPoints);
      
      // Track redeemed points for this transaction
      setRedeemedPointsForTransaction(loyaltyPointsToRedeem);
      
      // Update customer loyalty points display with actual backend data
      if (result.success && result.loyalty) {
        const updatedLoyalty = {
          ...customerLoyalty,
          totalPoints: parseFloat(result.loyalty.totalPoints || '0'),
          availablePoints: parseFloat(result.loyalty.availablePoints || '0'),
          usedPoints: parseFloat(result.loyalty.usedPoints || '0')
        };
        setCustomerLoyalty(updatedLoyalty);
      } else {
        // Fallback local update if backend doesn't return loyalty data
        const updatedLoyalty = {
          ...customerLoyalty,
          totalPoints: customerLoyalty.totalPoints - loyaltyPointsToRedeem,
          availablePoints: customerLoyalty.availablePoints - loyaltyPointsToRedeem,
          usedPoints: parseFloat(customerLoyalty.usedPoints.toString()) + loyaltyPointsToRedeem
        };
        setCustomerLoyalty(updatedLoyalty);
      }
      
      setShowLoyaltyDialog(false);
      setLoyaltyPointsToRedeem(0);
      
      console.log('Loyalty redemption successful:', {
        pointsRedeemed: loyaltyPointsToRedeem, 
        discountApplied: discountFromPoints,
        newLoyaltyDiscount: discountFromPoints,
        updatedCustomerLoyalty: customerLoyalty
      });
      
      toast({
        title: "Points Redeemed Successfully",
        description: `${loyaltyPointsToRedeem} points redeemed for ₹${discountFromPoints} discount`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      toast({
        title: "Redemption Failed",
        description: "Failed to redeem loyalty points. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Award loyalty points after successful sale
  const awardLoyaltyPoints = async (customerId: number, points: number, saleId: number) => {
    try {
      await fetch('/api/loyalty/add-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          points,
          reason: `Purchase - Sale #${saleId}`
        })
      });
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
    }
  };

  // Redeem loyalty points during checkout
  const redeemLoyaltyPoints = async (customerId: number, points: number) => {
    try {
      await fetch('/api/loyalty/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          points
        })
      });
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      throw error;
    }
  };

  // Check if product is suitable for barcode scanning in POS
  const isProductBarcodeEnabled = (product: Product): boolean => {
    // Only allow products with valid barcodes and specific criteria
    return !!(
      product.barcode && 
      product.barcode.trim().length >= 8 && // Minimum barcode length
      product.stockQuantity > 0 && // Must have stock
      product.price && 
      parseFloat(product.price.toString()) > 0 && // Must have valid price
      product.category && // Must have category
      // Additional criteria for POS-suitable products
      (product.weightUnit === 'g' || product.weightUnit === 'kg' || !product.weightUnit) // Weight-based or unit products
    );
  };

  // Filter products based on search term or barcode
  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get only barcode-enabled products for scanner functionality
  const barcodeEnabledProducts = products.filter(isProductBarcodeEnabled);

  // Handle barcode submission with enhanced validation
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Empty Barcode",
        description: "Please enter a barcode to scan",
        variant: "destructive",
      });
      return;
    }

    // Search from the same filtered products that are currently displayed
    const searchableProducts = filteredProducts.filter(product => isProductBarcodeEnabled(product));

    if (searchableProducts.length === 0) {
      toast({
        title: "No Scannable Products",
        description: "No products in current search results are eligible for barcode scanning. Try a different search term or clear filters.",
        variant: "destructive",
      });
      return;
    }

    // First try barcode search from filtered products
    const foundProduct = searchableProducts.find((product: Product) => 
      product.barcode && product.barcode.toLowerCase() === barcodeInput.toLowerCase().trim()
    );

    if (foundProduct) {
      addToCart(foundProduct);
      setBarcodeInput("");
      toast({
        title: "Product Added",
        description: `${foundProduct.name} (${foundProduct.barcode}) added successfully`,
        variant: "default",
      });
    } else {
      // Try SKU search from filtered products
      const foundBySku = searchableProducts.find((product: Product) => 
        product.sku.toLowerCase() === barcodeInput.toLowerCase().trim()
      );

      if (foundBySku) {
        addToCart(foundBySku);
        setBarcodeInput("");
        toast({
          title: "Product Added",
          description: `${foundBySku.name} added via SKU scan`,
          variant: "default",
        });
      } else {
        toast({
          title: "Barcode Not Found",
          description: `No product found with barcode/SKU: ${barcodeInput} in current search results. Try searching for the product first.`,
          variant: "destructive",
        });
      }
    }
  };

  // Check if product is suitable for weight-based selling
  const isWeightBasedProduct = (product: Product) => {
    // Exclude repackaged items - they are packaged products, not loose weight items
    if (product.itemPreparationsStatus === 'Repackage' || product.itemPreparationsStatus === 'Bulk') {
      return false;
    }
    
    return product.name.toLowerCase().includes('loose') ||
           product.name.toLowerCase().includes('bulk') ||
           product.name.toLowerCase().includes('per kg') ||
           (product.weightUnit === 'kg' && parseFloat(product.weight?.toString() || "0") >= 1);
  };

  // Handle weight-based product addition
  const handleWeightBasedAddition = (product: Product) => {
    setWeightProduct(product);
    setShowWeightDialog(true);
  };

  // Add weight-based item to cart
  const addWeightBasedToCart = () => {
    if (!weightProduct || !enteredWeight) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    const weight = parseFloat(enteredWeight);
    if (weight <= 0 || weight > 50) { // Max 50kg limit
      toast({
        title: "Invalid Weight",
        description: "Weight must be between 0.1kg and 50kg",
        variant: "destructive",
      });
      return;
    }

    const pricePerKg = parseFloat(weightProduct.price);
    const totalPrice = weight * pricePerKg;

    const cartItem: CartItem = {
      ...weightProduct,
      quantity: weight, // Use actual weight as quantity for proper unit counting
      total: totalPrice,
      isWeightBased: true,
      actualWeight: weight,
      pricePerKg: pricePerKg,
      mrp: parseFloat(weightProduct.mrp) || 0,
    };

    setCart(prev => [...prev, cartItem]);
    setShowWeightDialog(false);
    setEnteredWeight("");
    setWeightProduct(null);

    toast({
      title: "Product Added",
      description: `${weight}kg of ${weightProduct.name} added for ${formatCurrency(totalPrice)}`,
    });
  };

  // Cart functions
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    // Check if this is a weight-based product
    if (isWeightBasedProduct(product)) {
      handleWeightBasedAddition(product);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id && !item.isWeightBased);

    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${product.stockQuantity} units available for ${product.name}`,
          variant: "destructive",
        });
        return;
      }

      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * parseFloat(item.price) }
          : item
      ));
    } else {
      const cartItem = { 
        ...product, 
        quantity: 1, 
        total: parseFloat(product.price),
        mrp: parseFloat(product.mrp) || 0
      };
      console.log('📦 Adding product to cart:', product.name, 'MRP:', product.mrp, '→', cartItem.mrp);
      setCart([...cart, cartItem]);
    }

    toast({
      title: "Item Added",
      description: `${product.name} added to cart successfully`,
      variant: "default",
    });

    // Clear search after adding
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const removeFromCart = (productId: number, isWeightBased?: boolean) => {
    const item = cart.find(cartItem => cartItem.id === productId && 
      (isWeightBased ? cartItem.isWeightBased : !cartItem.isWeightBased));
    
    setCart(cart.filter(cartItem => !(cartItem.id === productId && 
      (isWeightBased ? cartItem.isWeightBased : !cartItem.isWeightBased))));
    
    const description = item?.isWeightBased 
      ? `${item.actualWeight}kg of ${item.name} removed from cart`
      : `${item?.name || 'Item'} removed from cart`;
    
    toast({
      title: "Item Removed",
      description: description,
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (product && newQuantity > product.stockQuantity) {
      toast({
        title: "Stock Limit Exceeded",
        description: `Maximum ${product.stockQuantity} units available`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * parseFloat(item.price) }
        : item
    ));
  };

  // Update cart item quantity (for Ocean freight dialog)
  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (product && newQuantity > product.stockQuantity) {
      toast({
        title: "Stock Limit Exceeded",
        description: `Maximum ${product.stockQuantity} units available`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * parseFloat(item.price) }
        : item
    ));
  };

  // Update cart item weight (for weight-based products)
  const updateCartItemWeight = (productId: number, newWeight: number) => {
    if (newWeight <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.id === productId && item.isWeightBased
        ? { 
            ...item, 
            actualWeight: newWeight, 
            quantity: newWeight,
            total: newWeight * (item.pricePerKg || parseFloat(item.price))
          }
        : item
    ));
  };

  // Update cart item price
  const updateCartItemPrice = (productId: number, newPrice: number) => {
    if (newPrice < 0) {
      toast({
        title: "Invalid Price",
        description: "Price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        if (item.isWeightBased) {
          return { 
            ...item, 
            pricePerKg: newPrice,
            price: newPrice.toString(),
            total: (item.actualWeight || 1) * newPrice
          };
        } else {
          return { 
            ...item, 
            price: newPrice.toString(),
            total: item.quantity * newPrice
          };
        }
      }
      return item;
    }));
  };

  // Voice recognition functionality
  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsVoiceSearching(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCustomerSearchTerm(transcript);
        setIsVoiceSearching(false);
        
        toast({
          title: "Voice Search Complete",
          description: `Searching for: "${transcript}"`,
        });
      };
      
      recognition.onerror = () => {
        setIsVoiceSearching(false);
        toast({
          title: "Voice Search Error",
          description: "Please try again or use text search",
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsVoiceSearching(false);
      };
      
      setVoiceRecognition(recognition);
    }
  };

  // Start voice search
  const startVoiceSearch = () => {
    if (voiceRecognition) {
      voiceRecognition.start();
    } else {
      initializeVoiceRecognition();
      setTimeout(() => {
        if (voiceRecognition) {
          voiceRecognition.start();
        }
      }, 100);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) => {
    const searchLower = customerSearchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.includes(customerSearchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      customer.id.toString().includes(customerSearchTerm)
    );
  });

  const clearCart = (clearHeldSales = false) => {
    const hadItems = cart.length > 0;
    const heldSalesCount = holdSales.length;

    // Force clear current cart state immediately
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid("");
    setPaymentMethod("cash");
    setBarcodeInput("");
    
    // Clear loyalty state
    setCustomerLoyalty(null);
    setLoyaltyPointsToRedeem(0);
    setLoyaltyDiscount(0);
    setOceanFreight({
      containerNumber: "",
      vesselName: "",
      portOfLoading: "",
      portOfDischarge: "",
      freightCost: "",
      insuranceCost: "",
      customsDuty: "",
      handlingCharges: "",
      totalOceanCost: 0
    });

    // Handle held sales based on flag
    if (clearHeldSales) {
      setHoldSales([]);
      try {
        localStorage.removeItem('heldSales');
      } catch (error) {
        console.warn("Failed to clear localStorage:", error);
      }
      toast({
        title: "🗑️ All Data Cleared",
        description: "Cart, ocean freight, and all held sales have been permanently cleared",
      });
    } else {
      if (hadItems) {
        toast({
          title: "🛒 Cart Cleared",
          description: `Current cart cleared. ${heldSalesCount} held sales safely preserved.`,
        });
      }
    }

    // Ensure state is completely reset with a small delay
    setTimeout(() => {
      if (!clearHeldSales) {
        // Double-check that held sales are still intact
        const savedHeldSales = localStorage.getItem('heldSales');
        if (savedHeldSales && holdSales.length === 0) {
          try {
            const parsedHeldSales = JSON.parse(savedHeldSales);
            if (Array.isArray(parsedHeldSales) && parsedHeldSales.length > 0) {
              setHoldSales(parsedHeldSales.map(sale => ({
                ...sale,
                timestamp: new Date(sale.timestamp)
              })));
            }
          } catch (error) {
            console.warn("Failed to restore held sales:", error);
          }
        }
      }
    }, 100);
  };

  // Calculate ocean freight total
  const calculateOceanTotal = () => {
    const freight = parseFloat(oceanFreight.freightCost) || 0;
    const insurance = parseFloat(oceanFreight.insuranceCost) || 0;
    const customs = parseFloat(oceanFreight.customsDuty) || 0;
    const handling = parseFloat(oceanFreight.handlingCharges) || 0;
    return freight + insurance + customs + handling;
  };

  // Calculate totals with ocean freight and loyalty discount
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const oceanTotal = calculateOceanTotal();
  const total = subtotal - discountAmount - loyaltyDiscount + oceanTotal;

  // Register opening
  const handleOpenRegister = async () => {
    // Check if register is already open
    if (registerOpened && activeCashRegister) {
      toast({
        title: "Register Already Open",
        description: `Register ${activeCashRegister.registerId || activeCashRegister.register_id} is already open with ${formatCurrency(parseFloat(activeCashRegister.currentCash || activeCashRegister.current_cash))}`,
        variant: "default",
      });
      setShowOpenRegister(false);
      return;
    }

    const amount = parseFloat(cashAmount);

    if (!amount || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/cash-register/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openingCash: amount,
          notes: `Register opened for POS operations`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Failed to Open Register",
          description: error.error || "Could not open cash register",
          variant: "destructive",
        });
        return;
      }

      const result = await response.json();
      
      setOpeningCash(amount);
      setCashInHand(amount);
      setRegisterOpened(true);
      setActiveRegisterId(result.register.id);

      // Refresh active register data
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });

      toast({
        title: "Register Opened",
        description: `Register ${result.register.registerId || result.register.register_id} opened with ${formatCurrency(amount)}`,
      });

      // Reset form and close dialog
      resetCashRegisterForm();
      setShowOpenRegister(false);

      console.log('💰 Cash register opened and saved to database:', result);
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast({
        title: "Database Error",
        description: "Failed to save register opening to database",
        variant: "destructive",
      });
    }
  };

  // Cash operation handler
  const handleCashOperation = () => {
    const amount = parseFloat(cashAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!cashReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this cash transaction",
        variant: "destructive",
      });
      return;
    }

    const newCashAmount = cashOperation === 'add' 
      ? cashInHand + amount 
      : Math.max(0, cashInHand - amount);

    setCashInHand(newCashAmount);

    if (cashOperation === 'add') {
      setCashReceived(prev => prev + amount);
    }

    toast({
      title: "Cash Updated",
      description: `${cashOperation === 'add' ? 'Added' : 'Removed'} ${formatCurrency(amount)}. Current cash: ${formatCurrency(newCashAmount)}`,
    });

    // Reset form and close dialog
    resetCashRegisterForm();
    setShowCashRegister(false);
  };

  // Withdrawal handler
  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > cashInHand) {
      toast({
        title: "Insufficient Cash",
        description: "Cannot withdraw more than available cash",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update local state immediately
      const newCashInHand = cashInHand - amount;
      const newTotalWithdrawals = totalWithdrawals + amount;
      
      setCashInHand(newCashInHand);
      setTotalWithdrawals(newTotalWithdrawals);

      // Record withdrawal transaction to cash register if active
      if (registerOpened && activeRegisterId) {
        try {
          await fetch(`/api/cash-register/${activeRegisterId}/transaction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'withdrawal',
              amount: amount,
              paymentMethod: 'cash',
              reason: withdrawalNote || 'Cash withdrawal',
              notes: `Withdrawal processed from POS Enhanced`
            })
          });
          console.log('💰 Withdrawal recorded to cash register');
        } catch (regError) {
          console.error('Failed to record withdrawal to cash register:', regError);
        }
      }

      // Force localStorage update immediately
      const updatedCashRegisterState = {
        registerOpened,
        activeRegisterId,
        openingCash,
        cashInHand: newCashInHand,
        cashReceived,
        upiReceived,
        cardReceived,
        bankReceived,
        chequeReceived,
        otherReceived,
        totalWithdrawals: newTotalWithdrawals,
        totalRefunds,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('cashRegisterState', JSON.stringify(updatedCashRegisterState));

      toast({
        title: "Withdrawal Processed",
        description: `Withdrew ${formatCurrency(amount)}. New balance: ${formatCurrency(newCashInHand)}${withdrawalNote ? `. Note: ${withdrawalNote}` : ''}`,
      });

      // Reset withdrawal form and close dialog
      resetWithdrawalForm();
      setShowWithdrawal(false);

      // Force a small delay to ensure state updates propagate
      setTimeout(() => {
        // Double-check the state is correctly updated
        setCashInHand(newCashInHand);
        console.log(`💰 Cash withdrawal completed: ${formatCurrency(amount)}, Current balance: ${formatCurrency(newCashInHand)}`);
      }, 100);

    } catch (error) {
      console.error('Withdrawal processing error:', error);
      toast({
        title: "Withdrawal Failed",
        description: "Failed to process withdrawal. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update payment tracking when processing sales
  const updatePaymentTracking = (method: string, amount: number) => {
    switch (method.toLowerCase()) {
      case 'cash':
        setCashReceived(prev => prev + amount);
        setCashInHand(prev => prev + amount);
        break;
      case 'upi':
        setUpiReceived(prev => prev + amount);
        setCashInHand(prev => prev + amount); // UPI can be converted to cash
        break;
      case 'card':
        setCardReceived(prev => prev + amount);
        break;
      case 'bank':
      case 'bank transfer':
        setBankReceived(prev => prev + amount);
        break;
      case 'cheque':
        setChequeReceived(prev => prev + amount);
        break;
      default:
        setOtherReceived(prev => prev + amount);
        break;
    }
  };

  // Create new customer
  const createNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCustomer(true);

    try {
      const customerData = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
      };

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) throw new Error("Failed to create customer");

      const newCustomer = await response.json();

      // Refresh customers data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      // Select the newly created customer
      setSelectedCustomer(newCustomer);

      // Automatically fetch and display loyalty information
      await fetchCustomerLoyalty(newCustomer.id);

      // Reset form and close dialog
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setShowNewCustomerDialog(false);

      toast({
        title: "Customer Added",
        description: `${newCustomer.name} has been created successfully with loyalty account`,
      });

    } catch (error) {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    const paidAmount = parseFloat(amountPaid) || total;
    if (paidAmount < total) {
      toast({
        title: "Insufficient Payment",
        description: `Please pay at least ${formatCurrency(total)}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Validate cart items have valid stock
      for (const item of cart) {
        const product = products.find((p: Product) => p.id === item.id);
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}. Available: ${product?.stockQuantity || 0}, Required: ${item.quantity}`);
        }
      }

      // Process loyalty point redemption before creating sale
      if (selectedCustomer && loyaltyPointsToRedeem > 0) {
        await redeemLoyaltyPoints(selectedCustomer.id, loyaltyPointsToRedeem);
      }

      const saleData = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price).toString(),
          subtotal: item.total.toString(),
          price: parseFloat(item.price).toString(),
          total: item.total.toString(),
          mrp: Number(item.mrp) || 0,
          name: item.name,
          sku: item.sku
        })),
        subtotal: subtotal.toFixed(2),
        discount: (discountAmount + loyaltyDiscount).toFixed(2),
        discountPercent: discount,
        total: total.toFixed(2),
        paymentMethod: paymentMethod === "split" ? "cash+upi" : paymentMethod,
        amountPaid: paidAmount.toFixed(2),
        change: (paidAmount - total).toFixed(2),
        notes: `Bill: ${billNumber}${loyaltyPointsToRedeem > 0 ? `, Loyalty: ${loyaltyPointsToRedeem} points redeemed` : ''}${paymentMethod === "split" ? `, Cash: ₹${cashAmount}, UPI: ₹${upiAmount}` : ''}`,
        billNumber: billNumber,
        status: "completed",
        ...(paymentMethod === "split" && {
          cashAmount: parseFloat(cashAmount) || 0,
          upiAmount: parseFloat(upiAmount) || 0
        })
      };

      console.log("Processing sale with data:", saleData);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Sale API error:", errorText);

        let errorMessage = "Transaction failed";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || "Server error occurred";
        } catch (e) {
          errorMessage = errorText || "Unknown server error";
        }

        throw new Error(errorMessage);
      }

      const saleResult = await response.json();
      console.log("✅ POS Enhanced sale completed successfully:", saleResult);

      // Verify the sale was saved
      if (saleResult.saved !== false && saleResult.id) {
        console.log(`💾 Sale saved to database with ID: ${saleResult.id}`);
        
        // Award loyalty points to customer after successful sale
        if (selectedCustomer) {
          const pointsToEarn = calculatePointsToEarn(total);
          console.log(`🎯 Loyalty calculation: ₹${total} × 0.01 = ${pointsToEarn} points`);
          if (pointsToEarn > 0) {
            await awardLoyaltyPoints(selectedCustomer.id, pointsToEarn, saleResult.id);
            
            // Refresh customer loyalty data
            await fetchCustomerLoyalty(selectedCustomer.id);
          }
        }
      }

      // Update payment tracking
      updatePaymentTracking(paymentMethod, paidAmount);

      // Record transaction to cash register if register is open
      if (registerOpened && activeRegisterId) {
        try {
          await fetch(`/api/cash-register/${activeRegisterId}/transaction`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'sale',
              amount: total,
              paymentMethod: paymentMethod,
              reason: `Sale ${saleResult.orderNumber || saleResult.billNumber}`,
              notes: `${cart.length} items, Customer: ${selectedCustomer?.name || 'Walk-in'}`
            })
          });
          console.log('💰 Sale recorded to cash register');
        } catch (regError) {
          console.error('Failed to record sale to cash register:', regError);
        }
      }

      toast({
        title: "✅ Sale Completed & Saved!",
        description: `Transaction ${saleResult.orderNumber || saleResult.billNumber} saved successfully for ${formatCurrency(total)}${paidAmount > total ? `. Change: ${formatCurrency(paidAmount - total)}` : ''}`,
        variant: "default",
      });

      // Automatically print receipt without dialog
      const completedSaleData = {
        id: saleResult.id,
        billNumber: saleResult.billNumber || saleResult.orderNumber,
        orderNumber: saleResult.orderNumber || saleResult.billNumber,
        total: total,
        subtotal: subtotal,
        discount: discountAmount + loyaltyDiscount,
        paymentMethod: paymentMethod,
        amountPaid: paidAmount,
        change: Math.max(0, paidAmount - total),
        customer: selectedCustomer,
        customerPhone: selectedCustomer?.phone,
        customerEmail: selectedCustomer?.email,
        selectedCustomer: selectedCustomer,
        // Enhanced customer data for receipt with comprehensive phone data
        customerDetails: {
          name: selectedCustomer?.name || 'Walk-in Customer',
          phone: selectedCustomer?.phone || '',
          email: selectedCustomer?.email || '',
          // Additional phone field for thermal receipt compatibility
          doorNo: selectedCustomer?.phone ? `Ph: ${selectedCustomer.phone}` : ''
        },
        // Multiple phone/email references for maximum receipt compatibility
        phone: selectedCustomer?.phone,
        email: selectedCustomer?.email,
        customer_phone: selectedCustomer?.phone,
        customer_email: selectedCustomer?.email,
        // Raw customer object preservation
        rawCustomer: selectedCustomer,
        loyaltyDiscount: loyaltyDiscount,
        loyaltyPointsRedeemed: redeemedPointsForTransaction,
        loyaltyInfo: customerLoyalty ? {
          pointsEarned: calculatePointsToEarn(total),
          totalPoints: parseFloat(customerLoyalty.totalPoints || '0'),
          availablePoints: parseFloat(customerLoyalty.availablePoints || '0'),
          pointsRedeemed: redeemedPointsForTransaction
        } : null,
        items: cart.map(item => ({
          id: item.id,
          productId: item.id,
          name: item.name,
          productName: item.name,
          sku: item.sku || `ITM${String(item.id).padStart(6, '0')}`,
          productSku: item.sku || `ITM${String(item.id).padStart(6, '0')}`,
          quantity: item.quantity,
          price: parseFloat(item.price),
          unitPrice: parseFloat(item.price),
          total: item.total,
          subtotal: item.total,
          mrp: Number(item.mrp) || 0
        })),
        createdAt: new Date().toISOString(), // Current timestamp for receipt
        status: 'completed'
      };

      // Direct Bill Printing - Automatic thermal receipt generation
      console.log("🖨️ Starting direct bill printing process...");
      console.log("📞 Customer phone data for receipt:", {
        selectedCustomer: selectedCustomer,
        customerPhone: selectedCustomer?.phone,
        customerData: completedSaleData.customer,
        customerDetails: completedSaleData.customerDetails
      });
      setTimeout(() => {
        handleDirectBillPrint(completedSaleData, saleResult);
      }, 500);

      // Reset everything but preserve held sales
      clearCart(false);
      setShowPaymentDialog(false);
      setAmountPaid("");
      setBillNumber(`POS${Date.now()}`);
      
      // Reset loyalty-related state for next transaction
      setLoyaltyPointsToRedeem(0);
      setLoyaltyDiscount(0);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });

    } catch (error) {
      console.error("Sale processing error:", error);

      let errorMessage = "Transaction failed. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("stock")) {
          errorMessage = error.message;
        } else if (error.message.includes("Network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection.";
        } else if (error.message.length > 0 && error.message.length < 200) {
          errorMessage = error.message;
        }
      }

      toast({
        title: "❌ Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        toast({
          title: "Fullscreen Error",
          description: "Unable to enter fullscreen mode",
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        // Focus on barcode input first, then search
        const barcodeInput = document.querySelector('input[placeholder*="Scan barcode"]') as HTMLInputElement;
        if (barcodeInput) {
          barcodeInput.focus();
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === "F10") {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      } else if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "F12") {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+F12 clears everything including held sales
          clearCart(true);
        } else {
          // F12 only clears current cart
          clearCart(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchTerm("");
        setShowPaymentDialog(false);
        setShowNewCustomerDialog(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } else if (e.altKey && e.key === "c") {
        e.preventDefault();
        setupQuickPayment("cash");
      }
      else if (e.altKey && e.key === "u") {
        e.preventDefault();
        setupQuickPayment("upi");
      }
      else if (e.altKey && e.key === "h") {
        e.preventDefault();
        holdCurrentSale();
      }
      else if (e.altKey && e.key === "r") {
        e.preventDefault();
        setShowHoldSales(true);
      }
      else if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        toggleDiscount();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyPress);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [cart.length, discount]);

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Enhanced receipt printing functionality
  const handlePrintReceipt = (saleData: any, options?: any) => {
    try {
      // Use actual sale data if provided, otherwise use current cart state
      let itemsForReceipt = cart;
      let receiptBillNumber = billNumber;
      let receiptCustomer = selectedCustomer;
      let receiptSubtotal = subtotal;
      let receiptTotal = total;
      let receiptDiscount = discountAmount;
      let receiptPaymentMethod = paymentMethod;
      let receiptAmountPaid = parseFloat(amountPaid) || total;
      
      // If saleData is provided from a completed transaction, use that instead
      if (saleData && saleData.items) {
        itemsForReceipt = saleData.items;
        receiptBillNumber = saleData.billNumber || saleData.orderNumber;
        receiptCustomer = saleData.customer;
        receiptSubtotal = saleData.subtotal || saleData.total;
        receiptTotal = saleData.total;
        receiptDiscount = saleData.discount || 0;
        receiptPaymentMethod = saleData.paymentMethod || 'cash';
        receiptAmountPaid = saleData.amountPaid || saleData.total;
      }

      // Ensure we have valid items for printing
      if (!itemsForReceipt || itemsForReceipt.length === 0) {
        // Only use sample data for manual testing when no sale data is provided
        if (!saleData) {
          itemsForReceipt = [
            {
              id: 1,
              productId: 1,
              name: "Sample Product",
              productName: "Sample Product",
              sku: "SAMPLE-001",
              productSku: "SAMPLE-001",
              price: "30",
              unitPrice: "30",
              quantity: 1,
              total: 30,
              subtotal: 30,
              mrp: 50
            }
          ];
          receiptBillNumber = `TEST${Date.now()}`;
          receiptTotal = 30;
          receiptSubtotal = 30;
          receiptAmountPaid = 30;
          
          toast({
            title: "Demo Receipt",
            description: "Printing test receipt with sample data",
            variant: "default",
          });
        } else {
          toast({
            title: "No Items to Print",
            description: "Cannot print receipt without items",
            variant: "destructive",
          });
          return;
        }
      }

      const receiptData = {
        billNumber: receiptBillNumber,
        orderNumber: receiptBillNumber,
        billDate: new Date().toISOString(),
        createdAt: new Date().toISOString(), // Always current timestamp
        customerDetails: {
          name: receiptCustomer?.name || selectedCustomer?.name || "Walk-in Customer",
          phone: receiptCustomer?.phone || selectedCustomer?.phone || "",
          email: receiptCustomer?.email || selectedCustomer?.email || "",
          doorNo: receiptCustomer?.phone ? `Ph: ${receiptCustomer.phone}` : selectedCustomer?.phone ? `Ph: ${selectedCustomer.phone}` : "",
          street: "",
          address: "",
          place: ""
        },
        customer: {
          name: receiptCustomer?.name || selectedCustomer?.name || "Walk-in Customer"
        },
        user: {
          name: "Admin User"
        },
        salesMan: "Admin User",
        items: itemsForReceipt.map(item => ({
          id: item.id || item.productId,
          productId: item.id || item.productId,
          name: item.name || item.productName,
          productName: item.name || item.productName,
          sku: item.sku || item.productSku || `ITM${String(item.id || item.productId).padStart(6, '0')}`,
          productSku: item.sku || item.productSku || `ITM${String(item.id || item.productId).padStart(6, '0')}`,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || item.unitPrice || "0"),
          unitPrice: parseFloat(item.price || item.unitPrice || "0"),
          total: item.total || item.subtotal || (item.quantity * parseFloat(item.price || item.unitPrice || "0")),
          subtotal: item.total || item.subtotal || (item.quantity * parseFloat(item.price || item.unitPrice || "0")),
          mrp: Number(item.mrp) || 0
        })),
        subtotal: receiptSubtotal,
        discount: receiptDiscount,
        discountType: 'fixed' as const,
        taxRate: 0,
        tax: 0,
        taxAmount: 0,
        grandTotal: receiptTotal,
        total: receiptTotal,
        amountPaid: receiptAmountPaid,
        changeDue: Math.max(0, receiptAmountPaid - receiptTotal),
        change: Math.max(0, receiptAmountPaid - receiptTotal),
        paymentMethod: receiptPaymentMethod.toUpperCase(),
        status: 'completed',
        notes: `Bill: ${receiptBillNumber} | Terminal: POS-Enhanced`,
        loyaltyInfo: selectedCustomer?.id ? {
          pointsEarned: Math.floor(receiptTotal * 0.01), // 1% of total as points
          totalPoints: 0, // Will be fetched from loyalty system
          availablePoints: 0 // Will be fetched from loyalty system
        } : undefined,
        loyaltyPointsRedeemed: redeemedPointsForTransaction
      };

      console.log("Printing receipt with data:", receiptData);
      
      // Use the print receipt utility with proper thermal settings
      const printSettings = {
        paperWidth: options?.paperWidth || 'thermal80',
        fontSize: 'medium',
        currencySymbol: '₹',
        businessName: 'M MART',
        businessAddress: '123 Business Street, City, State',
        taxId: '33GSPDB3311F1ZZ',
        phoneNumber: '+91-9876543210',
        thermalOptimized: options?.printerType === 'thermal',
        autoPrint: options?.autoPrint || false
      };
      
      printReceiptUtil(receiptData, printSettings);

      toast({
        title: "Receipt Sent to Printer",
        description: `Receipt ${receiptBillNumber} processed successfully`,
        variant: "default",
      });

    } catch (error) {
      console.error("Receipt printing error:", error);
      toast({
        title: "Print Failed",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Direct Bill Printing - Enhanced automatic printing with error handling
  const handleDirectBillPrint = async (saleData: any, saleResult: any) => {
    try {
      console.log("🖨️ Direct Bill Print: Starting automatic receipt generation...");
      console.log("🏷️ Customer data for receipt:", saleData.customer);
      console.log("👤 Selected Customer:", selectedCustomer);
      console.log("📦 Sale items with MRP data:", saleData.items);
      
      // Validate sale data
      if (!saleData || !saleData.billNumber) {
        throw new Error("Invalid sale data for printing");
      }

      // Prepare enhanced receipt data with all transaction details - Use current date
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const currentDate = `${day}/${month}/${year}`;
      
      const receiptData = {
        billNumber: saleData.billNumber,
        billDate: currentDate,
        orderNumber: saleData.orderNumber,
        customerDetails: { 
          name: saleData.customer?.name || saleData.customerName || selectedCustomer?.name || 'Walk-in Customer',
          phone: saleData.customer?.phone || saleData.customerPhone || selectedCustomer?.phone || '',
          email: saleData.customer?.email || saleData.customerEmail || selectedCustomer?.email || ''
        },
        customer: {
          name: saleData.customer?.name || saleData.customerName || selectedCustomer?.name || 'Walk-in Customer',
          phone: saleData.customer?.phone || saleData.customerPhone || selectedCustomer?.phone || '',
          email: saleData.customer?.email || saleData.customerEmail || selectedCustomer?.email || ''
        },
        customerPhone: saleData.customer?.phone || saleData.customerPhone || selectedCustomer?.phone || '',
        customerEmail: saleData.customer?.email || saleData.customerEmail || selectedCustomer?.email || '',
        selectedCustomer: selectedCustomer,
        salesMan: 'POS System',
        items: saleData.items.map((item: any) => ({
          id: item.id || item.productId,
          name: item.name || item.productName,
          sku: item.sku || item.productSku || `ITM${String(item.id || item.productId).padStart(6, '0')}`,
          quantity: item.quantity,
          price: (item.price || item.unitPrice || 0).toString(),
          unitPrice: item.price || item.unitPrice || 0,
          total: item.total || item.subtotal || 0,
          subtotal: item.total || item.subtotal || 0,
          mrp: Number(item.mrp) || 0
        })),
        subtotal: saleData.subtotal || saleData.total,
        discount: saleData.discount || 0,
        discountType: 'fixed' as const,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: saleData.total,
        total: saleData.total,
        amountPaid: saleData.amountPaid || saleData.total,
        changeDue: saleData.change || Math.max(0, (saleData.amountPaid || saleData.total) - saleData.total),
        change: saleData.change || Math.max(0, (saleData.amountPaid || saleData.total) - saleData.total),
        paymentMethod: (saleData.paymentMethod || 'CASH').toUpperCase(),
        status: 'completed',
        notes: saleData.notes || `Transaction completed successfully`,
        loyaltyInfo: selectedCustomer?.id && customerLoyalty ? {
          pointsEarned: calculatePointsToEarn(saleData.total),
          totalPoints: parseFloat(customerLoyalty.totalPoints || '0'),
          availablePoints: parseFloat(customerLoyalty.availablePoints || '0'),
          pointsRedeemed: redeemedPointsForTransaction
        } : selectedCustomer?.id ? {
          pointsEarned: calculatePointsToEarn(saleData.total),
          totalPoints: 0,
          availablePoints: 0,
          pointsRedeemed: 0
        } : undefined,
        loyaltyDiscount: loyaltyDiscount,
        loyaltyPointsRedeemed: redeemedPointsForTransaction,
        createdAt: new Date().toISOString() // Always use current date/time for printing
      };

      // Enhanced print settings using unified printer settings
      const printSettings = {
        paperWidth: (dynamicPrinterSettings?.paperWidth === '77mm' ? 'thermal77' : 
                     dynamicPrinterSettings?.paperWidth === '80mm' ? 'thermal80' : 
                     dynamicPrinterSettings?.paperWidth === '58mm' ? 'thermal58' : 
                     dynamicPrinterSettings?.paperWidth === '72mm' ? 'thermal72' : 'thermal77') as const,
        fontSize: (dynamicPrinterSettings?.fontSize || 'medium') as const,
        fontFamily: (dynamicPrinterSettings?.fontFamily || 'courier') as const,
        thermalOptimized: dynamicPrinterSettings?.thermalOptimized ?? true,
        businessName: dynamicPrinterSettings?.businessName || receiptSettings.businessName || 'M MART',
        businessAddress: dynamicPrinterSettings?.businessAddress || receiptSettings.address || 'Professional Retail Solution\n123 Business Street, City',
        phoneNumber: dynamicPrinterSettings?.phoneNumber || receiptSettings.phone || '+91-9876543210',
        taxId: dynamicPrinterSettings?.taxId || receiptSettings.taxId || '33GSPDB3311F1ZZ',
        receiptFooter: dynamicPrinterSettings?.receiptFooter || receiptSettings.receiptFooter || 'Thank you for shopping with us!\nVisit again soon',
        autoPrint: dynamicPrinterSettings?.enableAutoPrint ?? true,
        showInstructions: false,
        directPrint: true,
        showLogo: dynamicPrinterSettings?.showLogo ?? true,
        showCustomerDetails: dynamicPrinterSettings?.showCustomerDetails ?? true,
        showItemSKU: dynamicPrinterSettings?.showItemSKU ?? false,
        showMRP: dynamicPrinterSettings?.showMRP ?? true,
        showSavings: dynamicPrinterSettings?.showSavings ?? true,
        headerStyle: dynamicPrinterSettings?.headerStyle || 'center',
        boldTotals: dynamicPrinterSettings?.boldTotals ?? true,
        separatorStyle: dynamicPrinterSettings?.separatorStyle || 'dashed'
      };

      console.log("🖨️ Direct Bill Print: Sending to thermal printer...");
      console.log("📄 Receipt Data:", receiptData);
      console.log("⚙️ Print Settings:", printSettings);

      // Send to thermal printer with enhanced error handling
      try {
        printReceiptUtil(receiptData, printSettings);
        
        console.log("✅ Direct Bill Print: Receipt sent to printer successfully");
        
        // Success notification
        toast({
          title: "🖨️ Bill Printed",
          description: `Receipt ${receiptData.billNumber} sent to thermal printer automatically`,
          variant: "default",
        });

        // Optional: Track print statistics
        localStorage.setItem('lastPrintedBill', JSON.stringify({
          billNumber: receiptData.billNumber,
          timestamp: new Date().toISOString(),
          total: receiptData.total,
          customer: receiptData.customerDetails.name
        }));

      } catch (printError) {
        console.error("❌ Direct Bill Print: Thermal printing failed:", printError);
        
        // Fallback: Show print dialog instead of failing silently
        setTimeout(() => {
          console.log("🔄 Direct Bill Print: Attempting fallback print...");
          try {
            handlePrintReceipt(saleData);
          } catch (fallbackError) {
            console.error("Fallback print also failed:", fallbackError);
          }
        }, 1000);

        toast({
          title: "Print Issue",
          description: "Automatic printing failed. Print dialog opened as backup.",
          variant: "default",
        });
      }

    } catch (error) {
      console.error("❌ Direct Bill Print: Critical error:", error);
      
      // Fallback to manual print dialog
      toast({
        title: "Direct Print Failed",
        description: "Unable to print automatically. Please use manual print option.",
        variant: "destructive",
      });
      
      // Store failed print for retry
      localStorage.setItem('failedPrint', JSON.stringify({
        saleData,
        timestamp: new Date().toISOString(),
        error: error.message
      }));
    }
  };

  // Retry failed prints
  const retryFailedPrint = () => {
    try {
      const failedPrint = localStorage.getItem('failedPrint');
      if (failedPrint) {
        const { saleData } = JSON.parse(failedPrint);
        try {
          handlePrintReceipt(saleData);
        } catch (retryError) {
          console.error("Print retry failed:", retryError);
        }
        localStorage.removeItem('failedPrint');
        
        toast({
          title: "Print Retry",
          description: "Attempting to print previously failed receipt",
        });
      }
    } catch (error) {
      console.error("Failed print retry error:", error);
    }
  };

  // Quick payment setup
  const setupQuickPayment = (method: string) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before using quick payment",
        variant: "destructive",
      });
      return;
    }
    setPaymentMethod(method);
    setAmountPaid(total.toString());
    setShowPaymentDialog(true);
  };

  // Toggle discount
  const toggleDiscount = () => {
    setDiscount(prev => (prev > 0 ? 0 : 10));
  };

  // Hold current sale
  const holdCurrentSale = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot hold an empty cart",
        variant: "destructive",
      });
      return;
    }

    // Validate cart items before holding
    const validCartItems = cart.filter(item => item && item.id && item.quantity > 0);
    if (validCartItems.length === 0) {
      toast({
        title: "Invalid Cart",
        description: "Cart contains no valid items to hold",
        variant: "destructive",
      });
      return;
    }

    const holdId = `HOLD-${Date.now()}`;

    // Create a completely isolated deep copy using JSON parse/stringify to prevent any reference issues
    const cartSnapshot = JSON.parse(JSON.stringify(validCartItems.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
      stockQuantity: item.stockQuantity,
      mrp: item.mrp,
      category: item.category ? { 
        name: item.category.name 
      } : undefined,
      barcode: item.barcode || undefined
    }))));

    const customerSnapshot = selectedCustomer ? JSON.parse(JSON.stringify({
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email
    })) : null;

    const oceanSnapshot = JSON.parse(JSON.stringify({
      containerNumber: oceanFreight.containerNumber || "",
      vesselName: oceanFreight.vesselName || "",
      portOfLoading: oceanFreight.portOfLoading || "",
      portOfDischarge: oceanFreight.portOfDischarge || "",
      freightCost: oceanFreight.freightCost || "",
      insuranceCost: oceanFreight.insuranceCost || "",
      customsDuty: oceanFreight.customsDuty || "",
      handlingCharges: oceanFreight.handlingCharges || "",
      totalOceanCost: oceanFreight.totalOceanCost || 0
    }));

    const holdSale = {
      id: holdId,
      cart: cartSnapshot,
      customer: customerSnapshot,
      discount: discount,
      notes: `Held sale at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date(),
      total: total,
      oceanFreight: oceanSnapshot
    };

    const itemCount = validCartItems.length;

    try {
      // Add to held sales and update localStorage atomically
      setHoldSales(prev => {
        // Remove any existing duplicate holds first
        const filteredPrev = prev.filter(sale => !sale.id.startsWith('HOLD-') || 
          Math.abs(new Date(sale.timestamp).getTime() - Date.now()) > 5000);

        const newHeldSales = [...filteredPrev, holdSale];
        try {
          localStorage.setItem('heldSales', JSON.stringify(newHeldSales));
        } catch (storageError) {
          console.warn("Failed to save to localStorage:", storageError);
        }
        return newHeldSales;
      });

      // Force clear all current state immediately
      setTimeout(() => {
        setCart([]);
        setSelectedCustomer(null);
        setDiscount(0);
        setAmountPaid("");
        setPaymentMethod("cash");
        setBarcodeInput("");
        setLoyaltyDiscount(0);
        setRedeemedPointsForTransaction(0);
        setCustomerLoyalty(null);
        setOceanFreight({
          containerNumber: "",
          vesselName: "",
          portOfLoading: "",
          portOfDischarge: "",
          freightCost: "",
          insuranceCost: "",
          customsDuty: "",
          handlingCharges: "",
          totalOceanCost: 0
        });
      }, 10);

      toast({
        title: "Sale Held Successfully",
        description: `Sale ${holdId} saved with ${itemCount} items. Cart cleared. Use Alt+R to recall.`,
      });
    } catch (error) {
      console.error("Error holding sale:", error);
      toast({
        title: "Hold Failed",
        description: "Failed to hold the sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Recall held sale
  const recallHeldSale = (holdSale: typeof holdSales[0]) => {
    try {
      // Check if there's a current cart that needs to be cleared
      if (cart.length > 0) {
        const confirmRecall = window.confirm(
          `You have ${cart.length} items in your current cart. Recalling this held sale will clear the current cart. Continue?`
        );
        if (!confirmRecall) {
          return;
        }
      }

      // Use JSON parse/stringify for complete isolation
      const restoredCart = JSON.parse(JSON.stringify(holdSale.cart));
      const restoredCustomer = holdSale.customer ? JSON.parse(JSON.stringify(holdSale.customer)) : null;
      const restoredOceanFreight = holdSale.oceanFreight ? JSON.parse(JSON.stringify(holdSale.oceanFreight)) : {
        containerNumber: "",
        vesselName: "",
        portOfLoading: "",
        portOfDischarge: "",
        freightCost: "",
        insuranceCost: "",
        customsDuty: "",
        handlingCharges: "",
        totalOceanCost: 0
      };

      // Clear current state forcefully
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setAmountPaid("");
      setPaymentMethod("cash");
      setBarcodeInput("");
      setOceanFreight({
        containerNumber: "",
        vesselName: "",
        portOfLoading: "",
        portOfDischarge: "",
        freightCost: "",
        insuranceCost: "",
        customsDuty: "",
        handlingCharges: "",
        totalOceanCost: 0
      });

      // Use multiple frame delays to ensure complete state clearing
      setTimeout(() => {
        // First remove from held sales
        setHoldSales(prev => {
          const updatedHeldSales = prev.filter(sale => sale.id !== holdSale.id);
          try {
            localStorage.setItem('heldSales', JSON.stringify(updatedHeldSales));
          } catch (storageError) {
            console.warn("Failed to update localStorage:", storageError);
          }
          return updatedHeldSales;
        });

        // Then restore the held sale state
        setTimeout(async () => {
          setCart(restoredCart);
          setSelectedCustomer(restoredCustomer);
          setDiscount(holdSale.discount || 0);
          setOceanFreight(restoredOceanFreight);

          // Automatically fetch loyalty information if customer exists
          if (restoredCustomer) {
            await fetchCustomerLoyalty(restoredCustomer.id);
          }

          setShowHoldSales(false);

          toast({
            title: "Sale Recalled Successfully",
            description: `${holdSale.id} restored with ${restoredCart.length} items${restoredCustomer ? ' and loyalty data' : ''}`,
          });
        }, 50);
      }, 10);

    } catch (error) {
      console.error("Error recalling held sale:", error);
      toast({
        title: "Recall Failed", 
        description: "Failed to recall the held sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete held sale
  const deleteHeldSale = (holdId: string) => {
    setHoldSales(prev => prev.filter(sale => sale.id !== holdId));
    toast({
      title: "Sale Deleted",
      description: `Held sale ${holdId} has been deleted`,
    });
  };

  // Clear all held sales
  const clearAllHeldSales = () => {
    if (holdSales.length === 0) {
      toast({
        title: "No Held Sales",
        description: "There are no held sales to clear",
        variant: "default",
      });
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to clear all ${holdSales.length} held sales? This action cannot be undone.`
    );

    if (!confirmClear) {
      return;
    }

    try {
      const count = holdSales.length;
      setHoldSales([]);
      localStorage.removeItem('heldSales');

      toast({
        title: "All Held Sales Cleared",
        description: `${count} held sales have been permanently cleared`,
      });
    } catch (error) {
      console.error("Error clearing held sales:", error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear all held sales. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clean up empty or invalid held sales
  const cleanupHeldSales = () => {
    const validHeldSales = holdSales.filter(sale => 
      sale && 
      sale.cart && 
      Array.isArray(sale.cart) && 
      sale.cart.length > 0 &&
      sale.id &&
      sale.timestamp
    );

    if (validHeldSales.length !== holdSales.length) {
      setHoldSales(validHeldSales);
      try {
        if (validHeldSales.length > 0) {
          localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
        } else {
          localStorage.removeItem('heldSales');
        }

        const removedCount = holdSales.length - validHeldSales.length;
        if (removedCount > 0) {
          toast({
            title: "Cleaned Up Held Sales",
            description: `Removed ${removedCount} empty or invalid held sales`,
          });
        }
      } catch (error) {
        console.warn("Failed to cleanup held sales:", error);
      }
    }
  };

  // Initialize bill number and load held sales + cash register state from localStorage
  useEffect(() => {
    setBillNumber(`POS${Date.now()}`);

    // Load held sales from localStorage on component mount
    try {
      const savedHeldSales = localStorage.getItem('heldSales');
      if (savedHeldSales) {
        const parsedHeldSales = JSON.parse(savedHeldSales);
        // Validate and restore held sales, but filter out invalid or empty ones
        if (Array.isArray(parsedHeldSales)) {
          const validHeldSales = parsedHeldSales.filter(sale => 
            sale && 
            sale.cart && 
            Array.isArray(sale.cart) && 
            sale.cart.length > 0 &&
            sale.id &&
            sale.timestamp
          ).map(sale => ({
            ...sale,
            timestamp: new Date(sale.timestamp) // Convert timestamp back to Date object
          }));
          setHoldSales(validHeldSales);

          // Update localStorage with cleaned data
          if (validHeldSales.length !== parsedHeldSales.length) {
            localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
          }
        }
      }
    } catch (error) {
      console.error("Error loading held sales from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem('heldSales');
    }

    // Load cash register state from localStorage
    try {
      const savedCashRegister = localStorage.getItem('cashRegisterState');
      if (savedCashRegister) {
        const cashState = JSON.parse(savedCashRegister);
        
        // Restore cash register state
        setRegisterOpened(cashState.registerOpened || false);
        setOpeningCash(cashState.openingCash || 0);
        setCashInHand(cashState.cashInHand || 0);
        setCashReceived(cashState.cashReceived || 0);
        setUpiReceived(cashState.upiReceived || 0);
        setCardReceived(cashState.cardReceived || 0);
        setBankReceived(cashState.bankReceived || 0);
        setChequeReceived(cashState.chequeReceived || 0);
        setOtherReceived(cashState.otherReceived || 0);
        setTotalWithdrawals(cashState.totalWithdrawals || 0);
        setTotalRefunds(cashState.totalRefunds || 0);

        console.log("💰 Cash register state restored from localStorage:", cashState);
      }
    } catch (error) {
      console.error("Error loading cash register state from localStorage:", error);
      localStorage.removeItem('cashRegisterState');
    }

    // Cleanup function to auto-hold current cart when navigating away
    const handleBeforeUnload = () => {
      // Reset cash register forms on navigation
      resetAllCashRegisterStates();
      
      if (cart.length > 0) {
        const autoHoldId = `AUTO-HOLD-${Date.now()}`;
        const autoHoldSale = {
          id: autoHoldId,
          cart: JSON.parse(JSON.stringify(cart)),
          customer: selectedCustomer ? JSON.parse(JSON.stringify(selectedCustomer)) : null,
          discount: discount,
          notes: `Auto-saved before navigation at ${new Date().toLocaleTimeString()}`,
          timestamp: new Date(),
          total: total,
          oceanFreight: JSON.parse(JSON.stringify(oceanFreight))
        };

        try {
          const existingHeldSales = JSON.parse(localStorage.getItem('heldSales') || '[]');
          const updatedHeldSales = [...existingHeldSales, autoHoldSale];
          localStorage.setItem('heldSales', JSON.stringify(updatedHeldSales));
        } catch (error) {
          console.warn("Failed to auto-save cart before navigation:", error);
        }
      }
    };

    // Add event listeners for navigation detection
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Call on component unmount
    };
  }, [cart, selectedCustomer, discount, total, oceanFreight]);

  // Component cleanup effect
  useEffect(() => {
    return () => {
      // Reset forms when component unmounts
      resetAllCashRegisterStates();
    };
  }, []);

  // Update bill details when bill number changes
  useEffect(() => {
    setBillDetails(prev => ({
      ...prev,
      billNumber: billNumber,
      billDate: new Date().toISOString().split('T')[0],
      billTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }));
  }, [billNumber]);

  // Save held sales to localStorage whenever holdSales changes
  useEffect(() => {
    try {
      // Filter out any invalid held sales before saving
      const validHeldSales = holdSales.filter(sale => 
        sale && 
        sale.cart && 
        Array.isArray(sale.cart) && 
        sale.cart.length > 0 &&
        sale.id &&
        sale.timestamp
      );

      if (validHeldSales.length > 0) {
        localStorage.setItem('heldSales', JSON.stringify(validHeldSales));
      } else {
        localStorage.removeItem('heldSales');
      }

      // Update state if we filtered out invalid sales
      if (validHeldSales.length !== holdSales.length) {
        setHoldSales(validHeldSales);
      }
    } catch (error) {
      console.error("Error saving held sales to localStorage:", error);
    }
  }, [holdSales]);

  // Save cash register state to localStorage whenever it changes
  useEffect(() => {
    try {
      const cashRegisterState = {
        registerOpened,
        openingCash,
        cashInHand,
        cashReceived,
        upiReceived,
        cardReceived,
        bankReceived,
        chequeReceived,
        otherReceived,
        totalWithdrawals,
        totalRefunds,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('cashRegisterState', JSON.stringify(cashRegisterState));
    } catch (error) {
      console.error("Error saving cash register state to localStorage:", error);
    }
  }, [
    registerOpened,
    openingCash,
    cashInHand,
    cashReceived,
    upiReceived,
    cardReceived,
    bankReceived,
    chequeReceived,
    otherReceived,
    totalWithdrawals,
    totalRefunds
  ]);

  // Periodic cleanup for old auto-saved held sales
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago

      setHoldSales(prev => {
        const cleaned = prev.filter(sale => {
          // Keep regular holds, but remove old auto-saves
          if (sale.id.includes('AUTO-HOLD') || sale.id.includes('TAB-SWITCH')) {
            const saleTime = new Date(sale.timestamp).getTime();
            return saleTime > oneHourAgo;
          }
          return true;
        });

        return cleaned;
      });
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden' : ''}`}>
        <div className={`${isFullscreen ? 'h-full overflow-y-auto' : 'min-h-screen'} bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900`}>
          {/* Modern Header */}
          <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-xl">
            <div className={`${isFullscreen ? 'px-4 py-3' : 'px-8 py-6'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-2xl shadow-lg">
                    <Monitor className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Enhanced POS</h1>
                    <p className="text-sm text-gray-600 font-medium">Professional Point of Sale System</p>
                  </div>

                  <div className="flex items-center space-x-4 ml-12">
                    <Badge className="bg-green-100/80 text-green-800 border-green-200 px-4 py-2 shadow-sm backdrop-blur">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      System Ready
                    </Badge>
                    <Badge className="bg-blue-100/80 text-blue-800 border-blue-200 px-4 py-2 shadow-sm backdrop-blur">
                      <Zap className="h-4 w-4 mr-2" />
                      Live Mode
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {!registerOpened ? (
                    <Button
                      onClick={() => setShowOpenRegister(true)}
                      variant="outline"
                      size="sm"
                      className="hover:bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Open Register
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setShowCashRegister(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-green-50 border-green-200 text-green-700"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Manage Cash
                      </Button>
                      <Button
                        onClick={() => setShowWithdrawal(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-orange-50 border-orange-200 text-orange-700"
                      >
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Withdrawal
                      </Button>
                      <Button
                        onClick={() => setShowCloseRegister(true)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 border-red-200 text-red-700"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Close Register
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={() => window.open('/printer-settings', '_blank')}
                    variant="outline"
                    size="sm"
                    className="hover:bg-purple-50 border-purple-200 text-purple-700"
                    title="Open printer settings"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Printer Settings
                  </Button>

                  <Button
                    onClick={toggleFullscreen}
                    variant="outline"
                    size="sm"
                    className="hover:bg-blue-50 border-blue-200"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Fullscreen (F11)
                  </Button>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Bill Number</div>
                    <div className="font-mono font-semibold text-gray-900">{billNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Date & Time</div>
                    <div className="font-mono text-sm text-gray-700">{currentDate} • {currentTime}</div>
                  </div>
                  <div className={`text-right p-3 rounded-lg border ${registerOpened ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-sm font-medium ${registerOpened ? 'text-green-600' : 'text-gray-600'}`}>
                      {registerOpened ? 'Cash in Hand' : 'Register Closed'}
                    </div>
                    <div className={`text-xl font-bold ${registerOpened ? 'text-green-700' : 'text-gray-700'}`}>
                      {registerOpened ? formatCurrency(cashInHand) : '---'}
                    </div>
                  </div>
                  <div className="text-right bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium">Total Amount</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(total)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Selection Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cashier</label>
                <div className="flex items-center text-gray-900 font-medium">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  Admin User
                </div>
              </div>

              <div className="col-span-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer</label>
                <Select 
                  value={selectedCustomer?.id?.toString() || ""} 
                  onValueChange={(value) => {
                    if (value === "walk-in") {
                      setSelectedCustomer(null);
                    } else {
                      const customer = customers.find(c => c.id.toString() === value);
                      setSelectedCustomer(customer || null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer">
                      {selectedCustomer?.name || "Walk-in Customer"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Walk-in Customer
                      </div>
                    </SelectItem>
                    {customers?.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Contact</label>
                <div className="flex items-center text-gray-600">
                  {selectedCustomer?.phone ? (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedCustomer.phone}
                    </>
                  ) : (
                    <span className="text-gray-400">No contact info</span>
                  )}
                </div>
              </div>

              <div className="col-span-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Loyalty Points</label>
                <div className="flex items-center space-x-2">
                  {selectedCustomer && customerLoyalty ? (
                    <>
                      <div className="flex items-center text-green-600 font-medium">
                        <Star className="h-4 w-4 mr-1" />
                        {Math.round((parseFloat(customerLoyalty.availablePoints) || 0) * 100) / 100}
                      </div>
                      {(parseFloat(customerLoyalty.availablePoints) || 0) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowLoyaltyDialog(true)}
                          className="text-xs px-2 py-1 h-7 hover:bg-green-50 border-green-200 text-green-700"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Redeem
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">No points</span>
                  )}
                </div>
              </div>

              <div className="col-span-3 flex justify-end space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedCustomer(null)}
                  className="hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setShowNewCustomerDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Customer
                </Button>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4 mb-4">
              <Button 
                onClick={() => searchInputRef.current?.focus()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Products (F1)
              </Button>
              <Button variant="outline" className="hover:bg-gray-50">
                <Package className="h-4 w-4 mr-2" />
                Browse Categories
              </Button>
              <div className="flex-1" />
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries()}
                className="hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>

            {/* Unified Search and Barcode Scanner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">Product Search & Barcode Scanner</h3>
                    <p className="text-sm text-blue-600">Search products or scan barcodes for instant addition</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <div className="flex items-center gap-2 absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Search className="h-5 w-5 text-blue-600" />
                    <Scan className="h-4 w-4 text-blue-600" />
                  </div>
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products by name, SKU or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setBarcodeInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchTerm.trim()) {
                          handleBarcodeSubmit();
                        }
                      }
                    }}
                    className="text-lg py-3 pl-20 pr-24 border-2 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {products.length} products
                    </span>
                    <Button
                      onClick={handleBarcodeSubmit}
                      disabled={!searchTerm.trim()}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-blue-600 mt-3">
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>Type to search products or scan barcode. Press Enter or click Add to add to cart</span>
                </div>
                <div className="flex items-center gap-1">
                  <Scan className="h-3 w-3" />
                  <span>Scanner works with products that have valid barcodes, stock, and pricing</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex ${isFullscreen ? 'h-[calc(100vh-160px)]' : ''}`}>
            {/* Main Cart Section */}
            <div className={`flex-1 bg-white/90 backdrop-blur-sm ${isFullscreen ? 'p-4 overflow-y-auto' : 'p-8'}`}>
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-6 rounded-2xl mb-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl mr-4">
                      <ShoppingCart className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Shopping Cart</h2>
                      <p className="text-blue-100 text-sm">Professional Point of Sale</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {cart.length} items • {(() => {
                        const regularItems = cart.filter(item => !item.isWeightBased);
                        const weightItems = cart.filter(item => item.isWeightBased);
                        const regularCount = regularItems.reduce((sum, item) => sum + item.quantity, 0);
                        const weightTotal = weightItems.reduce((sum, item) => sum + (item.actualWeight || item.quantity), 0);
                        
                        if (weightItems.length > 0 && regularItems.length > 0) {
                          return `${regularCount} units + ${weightTotal.toFixed(1)} kg`;
                        } else if (weightItems.length > 0) {
                          return `${weightTotal.toFixed(1)} kg`;
                        } else {
                          return `${regularCount} units`;
                        }
                      })()}
                    </div>
                    <div className="text-blue-100 text-lg font-medium">
                      Subtotal: {formatCurrency(subtotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-96 bg-gradient-to-br from-gray-50/80 to-blue-50/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-xl">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingCart className="h-24 w-24 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-2xl font-semibold text-gray-600 mb-3">Cart is Empty</h3>
                    <p className="text-gray-500 mb-6 text-lg">Start by searching for products above</p>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-4xl mx-auto text-sm text-gray-500">
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F1</kbd>
                        <p className="mt-2">Focus barcode scanner</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Enter</kbd>
                        <p className="mt-2">Add scanned item</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F10</kbd>
                        <p className="mt-2">Quick checkout</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F11</kbd>
                        <p className="mt-2">Toggle fullscreen</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F12</kbd>
                        <p className="mt-2">Clear cart</p>
                        <p className="text-xs text-gray-500">Shift+F12: Clear all</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500 font-mono">{item.sku || 'No SKU'}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex flex-col">
                                <p className="text-lg font-bold text-green-600">
                                  Sell: {formatCurrency(parseFloat(item.price))}
                                </p>
                                {item.cost && (
                                  <p className="text-sm text-blue-600">
                                    Cost: {formatCurrency(parseFloat(item.cost))}
                                  </p>
                                )}
                                {item.mrp && parseFloat(item.mrp) > parseFloat(item.price) && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500 line-through">
                                      MRP: {formatCurrency(parseFloat(item.mrp))}
                                    </span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      {Math.round(((parseFloat(item.mrp) - parseFloat(item.price)) / parseFloat(item.mrp)) * 100)}% OFF
                                    </span>
                                  </div>
                                )}
                                {item.cost && item.price && (
                                  <div className="text-xs text-purple-600 mt-1">
                                    Margin: {formatCurrency(parseFloat(item.price) - parseFloat(item.cost))} 
                                    ({Math.round(((parseFloat(item.price) - parseFloat(item.cost)) / parseFloat(item.price)) * 100)}%)
                                  </div>
                                )}
                              </div>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  {item.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {item.isWeightBased ? (
                              <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                                <div className="text-sm font-medium text-green-800 mb-1">Weight-based Item</div>
                                <div className="text-lg font-bold text-green-700">{item.actualWeight} kg</div>
                                <div className="text-xs text-green-600">@ {formatCurrency(item.pricePerKg!)}/kg</div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="h-8 w-8 p-0 hover:bg-red-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    if (newQuantity >= 1 && newQuantity <= 999) {
                                      updateQuantity(item.id, newQuantity);
                                    }
                                  }}
                                  className="w-16 h-8 text-center font-bold text-lg border-0 bg-transparent p-0"
                                  min="1"
                                  max="999"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-8 w-8 p-0 hover:bg-green-100"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}

                            <div className="text-right min-w-24">
                              <div className="font-bold text-xl text-green-600">
                                {formatCurrency(item.total)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Total
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id, item.isWeightBased)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between mt-6 p-4 bg-gray-100 rounded-xl border border-gray-200">

                <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setupQuickPayment("cash")}
                  disabled={cart.length === 0}
                  title="Quick cash payment (Alt+C)"
                  className="hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cash (Alt+C)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setupQuickPayment("upi")}
                  disabled={cart.length === 0}
                  title="Quick UPI payment (Alt+U)"
                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  UPI (Alt+U)
                </Button>
                <Button 
                  variant="outline"
                  onClick={toggleDiscount}
                  title="Toggle 10% discount (Ctrl+D)"
                  className={`hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 ${discount > 0 ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Discount (Ctrl+D)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowOceanDialog(true)}
                  title="Enter Ocean Freight & Shipping Costs"
                  className={`hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 ${oceanTotal > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Enter Ocean
                </Button>
                <Button 
                  variant="outline"
                  onClick={holdCurrentSale}
                  disabled={cart.length === 0}
                  title="Hold current sale (Alt+H)"
                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Hold (Alt+H)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowHoldSales(true)}
                  title="Recall held sales (Alt+R)"
                  className="hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"
                >
                  <List className="h-4 w-4 mr-2" />
                  Recall (Alt+R)
                  {holdSales.length > 0 && (
                    <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full">
                      {holdSales.length}
                    </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => clearCart(false)} 
                  disabled={cart.length === 0}
                  className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart (F12)
                </Button>
              </div>

                <div className="flex items-center space-x-4 text-sm">
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    System Online
                  </Badge>
                  <span className="text-gray-600">Terminal: POS-01</span>
                  <span className="text-gray-600 font-mono">{currentTime}</span>
                </div>
              </div>
            </div>

            {/* Bill Summary Sidebar */}
            <div className={`${isFullscreen ? 'w-80 p-3' : 'w-96 p-6'} bg-white border-l border-gray-200 ${isFullscreen ? 'overflow-y-auto' : ''}`}>
              {/* Barcode Scanner Status */}
              <Card className="mb-4 border border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Scan className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-900">Barcode Scanner</h3>
                    </div>
                    <Badge 
                      className={`${barcodeEnabledProducts.length > 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                    >
                      {barcodeEnabledProducts.length > 0 ? 'Ready' : 'Limited'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scannable Products:</span>
                      <span className="font-medium text-blue-700">{barcodeEnabledProducts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Products:</span>
                      <span className="font-medium">{products.length}</span>
                    </div>
                    
                    {barcodeEnabledProducts.length === 0 && (
                      <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                        <Info className="h-3 w-3 inline mr-1" />
                        No products have valid barcodes for POS scanning. Add barcodes to products to enable scanner functionality.
                      </div>
                    )}
                    
                    {barcodeEnabledProducts.length > 0 && barcodeEnabledProducts.length < products.length && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Scanner works with products that have valid barcodes (8+ chars), stock, and pricing.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <Receipt className="h-6 w-6 mr-3" />
                  <h2 className="text-xl font-bold">Bill Summary</h2>
                </div>
                <div className="text-purple-100 text-sm">Bill #{billNumber}</div>
                <div className="text-purple-100 text-sm">{currentDate}</div>
              </div>

              {/* Bill Details */}
              <Card className="mb-6 border border-gray-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-semibold">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Total Qty:</span>
                    <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Gross Amount:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>



                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount:</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-16 h-8 text-center"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount Amount:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-1" />
                        Loyalty Discount:
                      </span>
                      <span>-{formatCurrency(loyaltyDiscount)}</span>
                    </div>
                  )}

                  {oceanTotal > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Ocean Freight:</span>
                      <span>+{formatCurrency(oceanTotal)}</span>
                    </div>
                  )}

                  {selectedCustomer && total > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200 mt-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-800 font-medium flex items-center">
                          <Gift className="h-4 w-4 mr-1" />
                          Points to Earn:
                        </span>
                        <span className="text-green-700 font-bold">{calculatePointsToEarn(total)} pts</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Customer: {selectedCustomer.name}
                      </div>
                    </div>
                  )}



                </CardContent>
              </Card>

              {/* Net Amount Payable */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl mb-6 shadow-lg">
                <div className="text-center">
                  <div className="text-sm font-medium opacity-90 mb-2">Net Amount Payable</div>
                  <div className="text-4xl font-bold">{formatCurrency(total)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Ocean Freight Management Button */}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-4 h-auto"
                  onClick={() => {
                    // Auto-add test items if cart is empty
                    if (cart.length === 0) {
                      const testItems = [
                        {
                          id: 10,
                          name: "SUGAR BULK",
                          sku: "SUGAR-BULK-001",
                          price: "45",
                          mrp: 50,
                          stockQuantity: 100,
                          isWeightBased: true,
                          pricePerKg: 45,
                          actualWeight: 2.5,
                          quantity: 1,
                          total: 112.5,
                          weightUnit: "kg"
                        }
                      ];
                      setCart(testItems);
                      
                      // Auto-select Amit Patel
                      const amitPatel = customers.find((c: Customer) => c.name === "Amit Patel");
                      if (amitPatel) {
                        setSelectedCustomer(amitPatel);
                      }
                      
                      toast({
                        title: "Demo Setup Complete",
                        description: "Test products and customer added for Ocean freight demo",
                      });
                    }
                    setShowOceanDialog(true);
                  }}
                >
                  <Package className="h-5 w-5 mr-3" />
                  Enter Ocean Freight Management
                </Button>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-4 h-auto"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Proceed to Payment (F10)
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Items
                </Button>

                <Button
                  variant="outline"
                  className="w-full hover:bg-gray-50"
                  onClick={() => handlePrintReceipt(null)}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>

          {/* Product Search Results Overlay */}
          {searchTerm && searchTerm.length > 0 && filteredProducts.length > 0 && (
            <div className="absolute top-48 left-6 right-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 max-h-80 overflow-auto">
              <div className="p-3 bg-gray-50 border-b border-gray-200 rounded-t-xl flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Found {filteredProducts.length} products
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchTerm("")}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  ×
                </Button>
              </div>
              {filteredProducts.slice(0, 8).map((product: Product) => (
                <div
                  key={product.id}
                  className={`p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                    isWeightBasedProduct(product) ? 'bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        {isWeightBasedProduct(product) && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              Weight-based Item
                            </Badge>
                            {product.weight && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                {product.weight} {product.weightUnit || 'kg'}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
                      {product.barcode && (
                        <p className="text-xs text-blue-600 font-mono">📷 {product.barcode}</p>
                      )}
                      {isWeightBasedProduct(product) && (
                        <div className="mt-1">
                          {product.weight && (
                            <p className="text-sm font-semibold text-green-700">
                              {product.weight} {product.weightUnit || 'kg'}
                            </p>
                          )}
                          <p className="text-xs text-green-600 font-medium">
                            Click to enter weight for loose selling
                          </p>
                        </div>
                      )}
                      {product.category && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {product.category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-lg text-green-600">
                          Sell: {formatCurrency(parseFloat(product.price))}
                        </div>
                        {product.cost && (
                          <div className="text-sm text-blue-600">
                            Cost: {formatCurrency(parseFloat(product.cost))}
                          </div>
                        )}
                        {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 line-through">
                              MRP: {formatCurrency(parseFloat(product.mrp))}
                            </span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              {Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100)}% OFF
                            </span>
                          </div>
                        )}
                        {product.cost && product.price && (
                          <div className="text-xs text-purple-600 mt-1">
                            Margin: {formatCurrency(parseFloat(product.price) - parseFloat(product.cost))}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm mt-1 ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Open Register Dialog */}
          <Dialog open={showOpenRegister} onOpenChange={(open) => {
            if (!open) {
              resetCashRegisterForm();
            }
            setShowOpenRegister(open);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                  Open Cash Register
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm mb-2">Enter the opening cash amount you're placing in the register drawer.</p>
                  <p className="text-blue-600 text-xs">This will be your starting balance for the day.</p>
                </div>

                <div>
                  <Label htmlFor="openingCash" className="text-sm font-medium">Opening Cash Amount</Label>
                  <Input
                    id="openingCash"
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Enter opening amount"
                    className="mt-1 text-lg"
                    step="0.01"
                    min="0"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCashRegisterForm();
                      setShowOpenRegister(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOpenRegister}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!cashAmount || parseFloat(cashAmount) < 0}
                  >
                    Open Register
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Withdrawal Dialog */}
          <Dialog open={showWithdrawal} onOpenChange={(open) => {
            if (!open) {
              resetWithdrawalForm();
            }
            setShowWithdrawal(open);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                  Cash Withdrawal
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-800 text-sm mb-2">Available Cash: {formatCurrency(cashInHand)}</p>
                  <p className="text-orange-600 text-xs">Enter amount to withdraw from register</p>
                </div>

                <div>
                  <Label htmlFor="withdrawalAmount" className="text-sm font-medium">Withdrawal Amount</Label>
                  <Input
                    id="withdrawalAmount"
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter withdrawal amount"
                    className="mt-1 text-lg"
                    step="0.01"
                    min="0"
                    max={cashInHand}
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="withdrawalNote" className="text-sm font-medium">Note (Optional)</Label>
                  <Input
                    id="withdrawalNote"
                    value={withdrawalNote}
                    onChange={(e) => setWithdrawalNote(e.target.value)}
                    placeholder="e.g., Cash sent to bank"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetWithdrawalForm();
                      setShowWithdrawal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdrawal}
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > cashInHand}
                  >
                    Process Withdrawal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Close Register Dialog */}
          <Dialog open={showCloseRegister} onOpenChange={(open) => {
            if (!open) {
              resetAllCashRegisterStates();
            }
            setShowCloseRegister(open);
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Archive className="h-6 w-6 text-red-600" />
                  End of Day Summary
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Opening Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">Opening</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Opening Cash:</span>
                        <span className="font-semibold">{formatCurrency(openingCash)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales Summary */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3">Sales Received</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-green-700">Cash Payments:</span>
                        <span className="font-semibold">{formatCurrency(cashReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">UPI Payments:</span>
                        <span className="font-semibold">{formatCurrency(upiReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Card Payments:</span>
                        <span className="font-semibold">{formatCurrency(cardReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Bank Transfer:</span>
                        <span className="font-semibold">{formatCurrency(bankReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Cheque:</span>
                        <span className="font-semibold">{formatCurrency(chequeReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Other:</span>
                        <span className="font-semibold">{formatCurrency(otherReceived)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span className="text-green-700">Total Sales:</span>
                        <span>{formatCurrency(cashReceived + upiReceived + cardReceived + bankReceived + chequeReceived + otherReceived)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Outgoing Summary */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-800 mb-3">Outgoing</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-red-700">Withdrawals:</span>
                        <span className="font-semibold">{formatCurrency(totalWithdrawals)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Refunds:</span>
                        <span className="font-semibold">{formatCurrency(totalRefunds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Summary */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-3">Final Cash Count</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Opening Cash:</span>
                        <span>{formatCurrency(openingCash)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">+ Cash Payments:</span>
                        <span>{formatCurrency(cashReceived)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">+ UPI (as cash):</span>
                        <span>{formatCurrency(upiReceived)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">- Withdrawals:</span>
                        <span>{formatCurrency(totalWithdrawals)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-purple-700">Expected Cash:</span>
                        <span className="text-purple-800">{formatCurrency(openingCash + cashReceived + upiReceived - totalWithdrawals)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-purple-700">Current Cash:</span>
                        <span className="text-purple-800">{formatCurrency(cashInHand)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCloseRegister(false)}
                  >
                    Keep Open
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        // Close register in database if we have an active register
                        if (activeCashRegister?.id) {
                          const response = await fetch(`/api/cash-register/${activeCashRegister.id}/close`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              notes: 'Register closed from POS Enhanced'
                            })
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to close register');
                          }

                          console.log('✅ Register closed in database');
                        }

                        // Clear local state
                        setRegisterOpened(false);
                        setOpeningCash(0);
                        setCashInHand(0);
                        setCashReceived(0);
                        setUpiReceived(0);
                        setCardReceived(0);
                        setBankReceived(0);
                        setChequeReceived(0);
                        setOtherReceived(0);
                        setTotalWithdrawals(0);
                        setTotalRefunds(0);
                        setShowCloseRegister(false);
                        
                        // Clear cash register state from localStorage
                        try {
                          localStorage.removeItem('cashRegisterState');
                        } catch (error) {
                          console.error("Error clearing cash register state:", error);
                        }

                        // Refresh active register data to show closed state
                        queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
                        
                        toast({
                          title: "Register Closed Successfully",
                          description: "End of day completed and saved to database",
                        });
                      } catch (error) {
                        console.error('Error closing register:', error);
                        toast({
                          title: "Failed to Close Register",
                          description: error instanceof Error ? error.message : "Could not close register in database",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Close Register
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cash Register Management Modal */}
      <Dialog open={showCashRegister} onOpenChange={(open) => {
        if (!open) {
          resetCashRegisterForm();
        }
        setShowCashRegister(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <DialogHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white p-6 rounded-2xl shadow-xl mb-6">
            <DialogTitle className="flex items-center gap-4 text-2xl">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Banknote className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-2xl">Cash Register Management</div>
                <div className="text-green-100 font-medium">Professional cash & payment tracking system</div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-100 font-medium">Live System</span>
                </div>
                <span className="text-sm bg-blue-500/30 backdrop-blur-sm text-blue-100 px-3 py-2 rounded-xl font-medium">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-12 gap-6 p-2">
            {/* Current Balance Display */}
            <div className="col-span-4">
              <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white p-8 rounded-3xl shadow-2xl border border-white/20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Banknote className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-green-100">Current Cash Balance</h3>
                  <div className="text-5xl font-bold mb-6 text-white drop-shadow-lg">{formatCurrency(cashInHand)}</div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-green-100 font-medium">Today's Sales</div>
                        <div className="text-2xl font-bold text-white">₹0</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-green-100 font-medium">Transactions</div>
                        <div className="text-2xl font-bold text-white">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Payments Section */}
            <div className="col-span-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-lg">Cash Payments</h4>
                  </div>
                  <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm px-4 py-2 rounded-xl font-medium shadow-sm">Quick Add</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[100, 500, 1000, 2000, 5000, 10000, 20000, 50000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Force complete reset first
                        resetCashRegisterForm(true);
                        resetAllCashRegisterStates();
                        
                        // Set new values with multiple attempts to ensure they stick
                        const setValues = () => {
                          setCashAmount(amount.toString());
                          setCashOperation('add');
                          setCashReason(`Cash payment ₹${amount}`);
                        };
                        
                        setValues();
                        setTimeout(setValues, 10);
                        setTimeout(setValues, 50);
                      }}
                      className="border-green-200/70 text-green-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 h-14 flex flex-col justify-center shadow-sm hover:shadow-md transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4 mb-1" />
                      <span className="font-bold text-lg">₹{amount >= 1000 ? `${amount/1000}k` : amount}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Digital Payments Section */}
            <div className="col-span-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-800">Digital Payments</h4>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">UPI • Cards</span>
                </div>

                {/* UPI Payments */}
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[250, 500, 1000, 2000].map((amount) => (
                      <Button
                        key={`upi-${amount}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Complete form reset
                          resetCashRegisterForm(true);
                          resetAllCashRegisterStates();
                          
                          // Set UPI values with persistence
                          const setUpiValues = () => {
                            setCashAmount(amount.toString());
                            setCashOperation('add');
                            setCashReason(`UPI payment ₹${amount}`);
                          };
                          
                          setUpiValues();
                          setTimeout(setUpiValues, 10);
                          setTimeout(setUpiValues, 50);
                        }}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 h-12 flex flex-col justify-center"
                      >
                        <Plus className="w-3 h-3 mb-1" />
                        <span className="font-semibold">₹{amount}</span>
                        <span className="text-xs text-blue-600">UPI</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Card Payments */}
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {[5000, 10000, 25000, 50000].map((amount) => (
                      <Button
                        key={`card-${amount}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Complete form reset
                          resetCashRegisterForm(true);
                          resetAllCashRegisterStates();
                          
                          // Set card values with persistence
                          const setCardValues = () => {
                            setCashAmount(amount.toString());
                            setCashOperation('add');
                            setCashReason(`Card payment ₹${amount}`);
                          };
                          
                          setCardValues();
                          setTimeout(setCardValues, 10);
                          setTimeout(setCardValues, 50);
                        }}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 h-12 flex flex-col justify-center"
                      >
                        <Plus className="w-3 h-3 mb-1" />
                        <span className="font-semibold">₹{amount >= 1000 ? `${amount/1000}k` : amount}</span>
                        <span className="text-xs text-purple-600">Card</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Type Selection */}
            <div className="col-span-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs">📋</span>
                  </div>
                  Transaction Type
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <Card className={`cursor-pointer transition-all border-2 ${cashOperation === 'add' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                        onClick={() => {
                          // Comprehensive form reset when switching operation type
                          resetCashRegisterForm(true);
                          setCashOperation('add');
                        }}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Plus className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-green-700 mb-1">Add Money</h4>
                      <p className="text-sm text-green-600">Increase register balance</p>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all border-2 ${cashOperation === 'remove' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                        onClick={() => {
                          // Comprehensive form reset when switching operation type
                          resetCashRegisterForm(true);
                          setCashOperation('remove');
                        }}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Minus className="w-6 h-6 text-red-600" />
                      </div>
                      <h4 className="font-semibold text-red-700 mb-1">Remove Money</h4>
                      <p className="text-sm text-red-600">Decrease register balance</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Cash Removal Section */}
            <div className="col-span-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-gray-800">Cash Removal</h4>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Bank Deposits</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Complete form reset
                      resetCashRegisterForm(true);
                      resetAllCashRegisterStates();
                      
                      // Set removal values with persistence
                      const setBankValues = () => {
                        setCashAmount("2000");
                        setCashOperation("remove");
                        setCashReason("Bank deposit ₹2000");
                      };
                      
                      setBankValues();
                      setTimeout(setBankValues, 10);
                      setTimeout(setBankValues, 50);
                    }}
                    className="border-red-200 text-red-700 hover:bg-red-50 h-16 flex flex-col justify-center"
                  >
                    <Minus className="w-4 h-4 mb-1" />
                    <span className="font-semibold">₹2,000</span>
                    <span className="text-xs text-red-600">Bank Deposit</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Complete form reset
                      resetCashRegisterForm(true);
                      resetAllCashRegisterStates();
                      
                      // Set removal values with persistence
                      const setBankValues = () => {
                        setCashAmount("5000");
                        setCashOperation("remove");
                        setCashReason("Bank deposit ₹5000");
                      };
                      
                      setBankValues();
                      setTimeout(setBankValues, 10);
                      setTimeout(setBankValues, 50);
                    }}
                    className="border-red-200 text-red-700 hover:bg-red-50 h-16 flex flex-col justify-center"
                  >
                    <Minus className="w-4 h-4 mb-1" />
                    <span className="font-semibold">₹5,000</span>
                    <span className="text-xs text-red-600">Bank Deposit</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Manual Entry Form */}
            <div className="col-span-12">
              <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-8 rounded-3xl shadow-xl border border-gray-200/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg">✏️</span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-xl">Manual Entry</h4>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="cashAmount" className="text-sm font-bold text-gray-700 mb-2 block">Amount (₹)</Label>
                    <Input
                      id="cashAmount"
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-1 h-12 text-lg font-medium border-2 focus:border-blue-500 rounded-xl shadow-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cashReason" className="text-sm font-bold text-gray-700 mb-2 block">Reason</Label>
                    <Input
                      id="cashReason"
                      value={cashReason}
                      onChange={(e) => setCashReason(e.target.value)}
                      placeholder="Enter reason"
                      className="mt-1 h-12 text-lg font-medium border-2 focus:border-blue-500 rounded-xl shadow-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleCashOperation} 
                      className={`w-full h-12 text-lg font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                        cashOperation === 'add' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white' 
                          : cashOperation === 'remove'
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                          : 'bg-gray-400 text-gray-600'
                      }`}
                      disabled={!cashAmount || parseFloat(cashAmount) <= 0 || !cashOperation}
                    >
                      {cashOperation === 'add' ? 'Add to Register' : cashOperation === 'remove' ? 'Remove from Register' : 'Select Operation'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

          {/* New Customer Dialog */}
          <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <UserPlus className="h-6 w-6 mr-3" />
                  Add New Customer
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                  <Input
                    placeholder="Enter customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <Input
                    placeholder="Enter phone number"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <Input
                    placeholder="Enter email address"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCustomerDialog(false)}
                    disabled={isCreatingCustomer}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewCustomer}
                    disabled={isCreatingCustomer}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingCustomer ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hold Sales Dialog */}
          <Dialog open={showHoldSales} onOpenChange={setShowHoldSales}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <List className="h-6 w-6 text-blue-600" />
                Held Sales ({holdSales.length})
              </DialogTitle>
              {holdSales.some(sale => sale.id.includes('AUTO-HOLD') || sale.id.includes('TAB-SWITCH')) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-blue-800 text-sm">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">Auto-Recovery Available</span>
                  </div>
                  <p className="text-blue-700 text-xs mt-1">
                    Some sales were automatically saved when you navigated away or switched tabs.
                  </p>
                </div>
              )}
            </DialogHeader>

              <div className="space-y-4">
                {holdSales.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Held Sales</h3>
                    <p className="text-gray-500">Hold a sale using Alt+H to save it for later</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {holdSales.map((holdSale) => (
                      <Card key={holdSale.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-semibold text-gray-900">{holdSale.id}</h4>
                        <Badge variant="outline" className="text-xs">
                          {holdSale.cart.length} items
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {holdSale.cart.reduce((sum, item) => sum + item.quantity, 0)} units
                        </Badge>
                        {(holdSale.id.includes('AUTO-HOLD') || holdSale.id.includes('TAB-SWITCH')) && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                            🔄 Auto-Saved
                          </Badge>
                        )}
                      </div>

                            <div className="text-sm text-gray-600 mb-2">
                              <div>Customer: {holdSale.customer?.name || "Walk-in Customer"}</div>
                              <div>Time: {holdSale.timestamp.toLocaleString()}</div>
                              {holdSale.discount > 0 && (
                                <div>Discount: {holdSale.discount}%</div>
                              )}
                            </div>

                            <div className="text-sm text-gray-500">
                              Items: {holdSale.cart.map(item => `${item.name} (${item.quantity})`).join(", ")}
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-green-600 mb-2">
                              {formatCurrency(holdSale.total)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => recallHeldSale(holdSale)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Recall
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteHeldSale(holdSale.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cleanupHeldSales}
                    className="text-blue-600 hover:bg-blue-50 border-blue-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cleanup Empty
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearAllHeldSales}
                    disabled={holdSales.length === 0}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowHoldSales(false)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>



          {/* Enhanced Ocean Freight & Cart Management Dialog */}
          <Dialog open={showOceanDialog} onOpenChange={setShowOceanDialog}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-6 w-6 text-blue-600" />
                  Ocean Freight Management & Cart Editor
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Customer Search & Selection */}
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer Search & Selection
                    </h3>
                    
                    {/* Enhanced Search Input with Voice */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search: name, phone, email, ID (e.g., 'Amit', '9876543212', 'amit@email.com', '3')"
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          className="pr-12 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={startVoiceSearch}
                          disabled={isVoiceSearching}
                          className={`absolute right-1 top-1 h-8 w-8 p-0 ${isVoiceSearching ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}
                          title="Voice Search - Say customer name or number"
                        >
                          {isVoiceSearching ? (
                            <div className="flex items-center justify-center">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                            </div>
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Search Examples */}
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Search Examples:</strong></p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span>• Name: "Amit Patel"</span>
                          <span>• Phone: "+91-9876543212"</span>
                          <span>• Email: "amit@email.com"</span>
                          <span>• ID: "3"</span>
                        </div>
                        <div className="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                          <p className="font-medium text-blue-800">Voice Commands:</p>
                          <p className="text-blue-700">"Find Amit Patel" or "Customer number three"</p>
                        </div>
                      </div>
                      
                      {isVoiceSearching && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                          Listening... Speak customer name or number
                        </div>
                      )}
                    </div>

                    {/* Current Selected Customer */}
                    {selectedCustomer && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-green-800">{selectedCustomer.name}</h4>
                            <p className="text-sm text-green-600">ID: {selectedCustomer.id}</p>
                            {selectedCustomer.phone && (
                              <p className="text-sm text-green-600">📞 {selectedCustomer.phone}</p>
                            )}
                            {selectedCustomer.email && (
                              <p className="text-sm text-green-600">✉️ {selectedCustomer.email}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCustomer(null)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Customer Search Results */}
                    {customerSearchTerm && (
                      <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                        <h4 className="text-sm font-medium text-purple-800 mb-2">
                          Search Results ({filteredCustomers.length})
                        </h4>
                        {filteredCustomers.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No customers found</p>
                            <p className="text-xs">Try searching by name, phone, or ID</p>
                          </div>
                        ) : (
                          filteredCustomers.slice(0, 5).map((customer: Customer) => (
                            <div
                              key={customer.id}
                              className="p-3 bg-white border border-purple-100 rounded cursor-pointer hover:bg-purple-50 transition-colors"
                              onClick={async () => {
                                setSelectedCustomer(customer);
                                setCustomerSearchTerm("");
                                
                                // Automatically fetch loyalty information
                                await fetchCustomerLoyalty(customer.id);
                                
                                toast({
                                  title: "Customer Selected",
                                  description: `${customer.name} selected with loyalty information loaded`,
                                });
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 text-sm">{customer.name}</h5>
                                  <p className="text-xs text-gray-600">ID: {customer.id}</p>
                                  {customer.phone && (
                                    <p className="text-xs text-blue-600">📞 {customer.phone}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Select
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-purple-200 space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // Auto-select Amit Patel and add test products for demo
                          const amitPatel = customers.find((c: Customer) => c.name === "Amit Patel");
                          if (amitPatel) {
                            setSelectedCustomer(amitPatel);
                            
                            // Automatically fetch loyalty information
                            await fetchCustomerLoyalty(amitPatel.id);
                            
                            // Add test products to cart
                            const testItems = [
                              {
                                id: 10,
                                name: "SUGAR BULK",
                                sku: "SUGAR-BULK-001",
                                price: "45",
                                mrp: 50,
                                stockQuantity: 100,
                                isWeightBased: true,
                                pricePerKg: 45,
                                actualWeight: 2.5,
                                quantity: 1,
                                total: 112.5,
                                weightUnit: "kg"
                              },
                              {
                                id: 7,
                                name: "Sugar (250g Pack)",
                                sku: "SUGAR-250G",
                                price: "25",
                                mrp: 30,
                                stockQuantity: 50,
                                isWeightBased: false,
                                quantity: 3,
                                total: 75
                              }
                            ];
                            setCart(testItems);
                            
                            toast({
                              title: "Demo Setup Complete",
                              description: "Amit Patel selected with loyalty and test products",
                            });
                          }
                        }}
                        className="w-full text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Demo: Setup Cart & Customer
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewCustomerDialog(true)}
                        className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add New Customer
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Middle Panel: Cart Items Editor */}
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart Items ({cart.length})
                    </h3>
                    
                    <div className="max-h-80 overflow-y-auto space-y-3">
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No items in cart</p>
                        </div>
                      ) : (
                        cart.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                                <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                                {item.isWeightBased && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Weight-based Item
                                    </Badge>
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {item.actualWeight}kg @ ₹{item.pricePerKg}/kg
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-gray-600 flex items-center gap-1">
                                  {item.isWeightBased ? 'Weight (kg)' : 'Quantity'}
                                  {item.isWeightBased && (
                                    <span className="text-xs text-green-600 font-medium">
                                      (0.25kg steps)
                                    </span>
                                  )}
                                </Label>
                                <div className="flex items-center gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (item.isWeightBased) {
                                        const currentWeight = item.actualWeight || 1;
                                        const decrement = currentWeight >= 1 ? 0.25 : 0.1;
                                        const newWeight = Math.max(0.1, currentWeight - decrement);
                                        updateCartItemWeight(item.id, newWeight);
                                      } else {
                                        updateCartItemQuantity(item.id, Math.max(1, item.quantity - 1));
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.isWeightBased ? item.actualWeight || 1 : item.quantity}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      if (item.isWeightBased) {
                                        updateCartItemWeight(item.id, Math.max(0.1, value));
                                      } else {
                                        updateCartItemQuantity(item.id, Math.max(1, Math.floor(value)));
                                      }
                                    }}
                                    className="h-8 text-center text-sm"
                                    step={item.isWeightBased ? "0.25" : "1"}
                                    min={item.isWeightBased ? "0.1" : "1"}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (item.isWeightBased) {
                                        const currentWeight = item.actualWeight || 1;
                                        const increment = currentWeight >= 1 ? 0.25 : 0.1;
                                        const newWeight = currentWeight + increment;
                                        updateCartItemWeight(item.id, newWeight);
                                      } else {
                                        updateCartItemQuantity(item.id, item.quantity + 1);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs text-gray-600">Unit Price</Label>
                                <Input
                                  type="number"
                                  value={item.isWeightBased ? item.pricePerKg || parseFloat(item.price) : parseFloat(item.price)}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    updateCartItemPrice(item.id, newPrice);
                                  }}
                                  className="h-8 text-sm mt-1"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Item Total:</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(item.total)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {cart.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-orange-200">
                        <div className="flex justify-between items-center text-lg font-semibold text-orange-800">
                          <span>Cart Subtotal:</span>
                          <span>{formatCurrency(cart.reduce((sum, item) => sum + item.total, 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Ocean Freight Details */}
                <div className="space-y-4">
                  {/* Shipping Details */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">Shipping Details</h3>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="containerNumber" className="text-sm">Container Number</Label>
                        <Input
                          id="containerNumber"
                          value={oceanFreight.containerNumber}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, containerNumber: e.target.value }))}
                          placeholder="e.g., ABCD1234567"
                          className="mt-1 h-9"
                        />
                      </div>

                      <div>
                        <Label htmlFor="vesselName" className="text-sm">Vessel Name</Label>
                        <Input
                          id="vesselName"
                          value={oceanFreight.vesselName}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, vesselName: e.target.value }))}
                          placeholder="e.g., MSC Oscar"
                          className="mt-1 h-9"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="portOfLoading" className="text-sm">Port of Loading</Label>
                          <Input
                            id="portOfLoading"
                            value={oceanFreight.portOfLoading}
                            onChange={(e) => setOceanFreight(prev => ({ ...prev, portOfLoading: e.target.value }))}
                            placeholder="Shanghai, China"
                            className="mt-1 h-9"
                          />
                        </div>

                        <div>
                          <Label htmlFor="portOfDischarge" className="text-sm">Port of Discharge</Label>
                          <Input
                            id="portOfDischarge"
                            value={oceanFreight.portOfDischarge}
                            onChange={(e) => setOceanFreight(prev => ({ ...prev, portOfDischarge: e.target.value }))}
                            placeholder="Mumbai, India"
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost Details */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3">Cost Breakdown</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="freightCost" className="text-sm">Ocean Freight</Label>
                        <Input
                          id="freightCost"
                          type="number"
                          value={oceanFreight.freightCost}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, freightCost: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 h-9"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="insuranceCost" className="text-sm">Marine Insurance</Label>
                        <Input
                          id="insuranceCost"
                          type="number"
                          value={oceanFreight.insuranceCost}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, insuranceCost: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 h-9"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="customsDuty" className="text-sm">Customs Duty</Label>
                        <Input
                          id="customsDuty"
                          type="number"
                          value={oceanFreight.customsDuty}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, customsDuty: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 h-9"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="handlingCharges" className="text-sm">Handling Charges</Label>
                        <Input
                          id="handlingCharges"
                          type="number"
                          value={oceanFreight.handlingCharges}
                          onChange={(e) => setOceanFreight(prev => ({ ...prev, handlingCharges: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 h-9"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Display */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium opacity-90 mb-2">Total Ocean Freight</div>
                      <div className="text-2xl font-bold">{formatCurrency(calculateOceanTotal())}</div>
                    </div>
                  </div>

                  {/* Combined Total */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium opacity-90 mb-2">Grand Total (Cart + Ocean)</div>
                      <div className="text-3xl font-bold">
                        {formatCurrency(cart.reduce((sum, item) => sum + item.total, 0) + calculateOceanTotal())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOceanFreight({
                        containerNumber: "",
                        vesselName: "",
                        portOfLoading: "",
                        portOfDischarge: "",
                        freightCost: "",
                        insuranceCost: "",
                        customsDuty: "",
                        handlingCharges: "",
                        totalOceanCost: 0
                      });
                    }}
                    size="sm"
                  >
                    Clear Ocean Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCart([])}
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Clear Cart
                  </Button>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOceanDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowOceanDialog(false);
                      toast({
                        title: "Ocean Freight Applied",
                        description: `Ocean costs: ${formatCurrency(calculateOceanTotal())} | Cart updated successfully`,
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Apply Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Weight Input Dialog */}
          <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <Package className="h-6 w-6 mr-3 text-green-600" />
                  Enter Weight for Loose Sale
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {weightProduct && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">{weightProduct.name}</h3>
                    <div className="text-sm text-green-700">
                      <div>Price per kg: {formatCurrency(parseFloat(weightProduct.price))}</div>
                      <div>Available stock: {weightProduct.stockQuantity} kg</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <Input
                    type="number"
                    placeholder="Enter weight in kilograms"
                    value={enteredWeight}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setEnteredWeight(value);
                      }
                    }}
                    step="0.1"
                    min="0.1"
                    max="50"
                    className="text-lg p-3"
                    autoFocus
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum: 0.1kg, Maximum: 50kg
                  </div>
                </div>

                {enteredWeight && weightProduct && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700">
                      <div>Weight: {enteredWeight} kg</div>
                      <div>Rate: {formatCurrency(parseFloat(weightProduct.price))}/kg</div>
                      <div className="font-semibold text-lg text-blue-800 mt-2">
                        Total: {formatCurrency(parseFloat(enteredWeight) * parseFloat(weightProduct.price))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">Quick Weight Selection:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("0.25")}
                      className="text-sm"
                    >
                      0.25 kg
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("0.5")}
                      className="text-sm"
                    >
                      0.5 kg
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("1")}
                      className="text-sm bg-green-50 border-green-200 text-green-700"
                    >
                      1 kg
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("1.5")}
                      className="text-sm"
                    >
                      1.5 kg
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("2")}
                      className="text-sm"
                    >
                      2 kg
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEnteredWeight("5")}
                      className="text-sm"
                    >
                      5 kg
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWeightDialog(false);
                    setEnteredWeight("");
                    setWeightProduct(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addWeightBasedToCart}
                  disabled={!enteredWeight || parseFloat(enteredWeight) <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Add to Cart
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <CreditCard className="h-6 w-6 mr-3" />
                  Complete Payment
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="p-6 bg-green-50 rounded-xl text-center border border-green-200">
                  <div className="text-3xl font-bold text-green-700">
                    {formatCurrency(total)}
                  </div>
                  <div className="text-green-600 mt-1">Amount to Pay</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash Payment</SelectItem>
                      <SelectItem value="upi">📱 UPI Payment</SelectItem>
                      <SelectItem value="split">💰 Cash + UPI Split</SelectItem>
                      <SelectItem value="card">💳 Card Payment</SelectItem>
                      <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="cheque">📝 Cheque Payment</SelectItem>
                      <SelectItem value="other">🔄 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "split" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-800 mb-3">Split Payment: Cash + UPI</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">💵 Cash Amount</label>
                          <Input
                            type="number"
                            placeholder="Cash amount"
                            value={cashAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setCashAmount(value);
                                const cash = parseFloat(value) || 0;
                                const remaining = Math.max(0, total - cash);
                                setUpiAmount(remaining > 0 ? remaining.toFixed(2) : "");
                                setAmountPaid((cash + remaining).toFixed(2));
                              }
                            }}
                            step="0.01"
                            min={0}
                            className="text-lg p-3"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">📱 UPI Amount</label>
                          <Input
                            type="number"
                            placeholder="UPI amount"
                            value={upiAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setUpiAmount(value);
                                const upi = parseFloat(value) || 0;
                                const remaining = Math.max(0, total - upi);
                                setCashAmount(remaining > 0 ? remaining.toFixed(2) : "");
                                setAmountPaid((upi + remaining).toFixed(2));
                              }
                            }}
                            step="0.01"
                            min={0}
                            className="text-lg p-3"
                          />
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="flex justify-between text-sm">
                          <span>Cash: {formatCurrency(parseFloat(cashAmount) || 0)}</span>
                          <span>UPI: {formatCurrency(parseFloat(upiAmount) || 0)}</span>
                          <span className="font-semibold">Total: {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
                    <Input
                      type="number"
                      placeholder={`Enter amount (min: ${formatCurrency(total)})`}
                      value={amountPaid}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string or valid decimal numbers
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setAmountPaid(value);
                        }
                      }}
                      step="0.01"
                      min={0}
                      className="text-lg p-3"
                      autoFocus
                    />
                  </div>
                )}
                {paymentMethod !== "split" && (
                  <>
                    {amountPaid && parseFloat(amountPaid) < total && (
                      <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-700 font-semibold">
                          Insufficient amount. Need at least {formatCurrency(total)}
                        </p>
                      </div>
                    )}
                    {amountPaid && parseFloat(amountPaid) > total && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-700 font-semibold">
                          Change to return: {formatCurrency(parseFloat(amountPaid) - total)}
                        </p>
                      </div>
                    )}
                    {amountPaid && parseFloat(amountPaid) === total && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-700 font-semibold">
                          Exact amount - No change required
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {paymentMethod === "split" && (
                  <>
                    {((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)) < total && (
                      <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-700 font-semibold">
                          Insufficient amount. Need {formatCurrency(total - ((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)))} more
                        </p>
                      </div>
                    )}
                    {((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)) > total && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-700 font-semibold">
                          Change to return: {formatCurrency(((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)) - total)}
                        </p>
                      </div>
                    )}
                    {((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)) === total && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-700 font-semibold">
                          ✅ Perfect split payment - No change required
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Quick Payment Options */}
                {paymentMethod === "cash" && (
                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid(total.toString())}
                        className="text-sm bg-green-50 hover:bg-green-100"
                      >
                        Exact ₹{total}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid((total + 50).toString())}
                        className="text-sm"
                      >
                        +₹50
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid((total + 100).toString())}
                        className="text-sm"
                      >
                        +₹100
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid("200")}
                        className="text-sm"
                      >
                        ₹200
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid("500")}
                        className="text-sm"
                      >
                        ₹500
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAmountPaid("1000")}
                        className="text-sm"
                      >
                        ₹1000
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processSale}
                    disabled={
                      isProcessing || 
                      (paymentMethod === "split" 
                        ? ((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)) < total
                        : !amountPaid || parseFloat(amountPaid) < total
                      )
                    }
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? "Processing..." : `Complete Sale ${formatCurrency(total)}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>



          {/* Loyalty Point Redemption Dialog */}
          <Dialog open={showLoyaltyDialog} onOpenChange={setShowLoyaltyDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Star className="h-6 w-6 text-green-600" />
                  Redeem Loyalty Points
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-800 font-medium">Available Points:</span>
                    <span className="text-green-700 font-bold text-lg">{Math.round((parseFloat(customerLoyalty?.availablePoints?.toString() || '0')) * 100) / 100}</span>
                  </div>
                  <p className="text-green-600 text-sm">1 point = ₹1 discount</p>
                </div>

                <div>
                  <Label htmlFor="loyaltyPointsInput" className="text-sm font-medium">Points to Redeem</Label>
                  <Input
                    id="loyaltyPointsInput"
                    type="number"
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => setLoyaltyPointsToRedeem(parseInt(e.target.value) || 0)}
                    placeholder="Enter points to redeem"
                    className="mt-1 text-lg"
                    min="0"
                    max={customerLoyalty?.availablePoints || 0}
                    autoFocus
                  />
                  
                  {/* Quick Selection Buttons */}
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-2">Quick Select:</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((points) => (
                        <Button
                          key={points}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxPoints = customerLoyalty?.availablePoints || 0;
                            const pointsToSet = Math.min(points, maxPoints);
                            setLoyaltyPointsToRedeem(pointsToSet);
                          }}
                          disabled={!customerLoyalty || customerLoyalty.availablePoints < points}
                          className="text-xs h-8"
                        >
                          {points}
                        </Button>
                      ))}
                    </div>
                    
                    {customerLoyalty && customerLoyalty.availablePoints > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLoyaltyPointsToRedeem(Math.floor(parseFloat(customerLoyalty.availablePoints.toString())))}
                        className="w-full mt-2 text-xs h-8 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      >
                        Use All Points ({Math.floor(parseFloat(customerLoyalty.availablePoints.toString()))})
                      </Button>
                    )}
                  </div>
                </div>

                {loyaltyPointsToRedeem > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-800 font-medium">Discount Amount:</span>
                      <span className="text-blue-700 font-bold">{formatCurrency(loyaltyPointsToRedeem)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600">Points After Redemption:</span>
                      <span className="text-blue-700 font-medium">
                        {Math.max(0, (parseFloat(customerLoyalty?.availablePoints?.toString() || '0')) - loyaltyPointsToRedeem)} points
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLoyaltyPointsToRedeem(0)}
                      className="w-full mt-2 text-xs h-6 text-red-600 hover:bg-red-50"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLoyaltyDialog(false);
                      setLoyaltyPointsToRedeem(0);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLoyaltyRedemption}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loyaltyPointsToRedeem <= 0 || loyaltyPointsToRedeem > (parseFloat(customerLoyalty?.availablePoints?.toString() || '0'))}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Redeem Points
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    </div>
  );
}