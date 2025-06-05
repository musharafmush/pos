import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  ShoppingCartIcon, 
  UsersIcon,
  CalendarIcon,
  PercentIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Minus,
  Plus,
  Calculator,
  Clock,
  User,
  RefreshCw
} from 'lucide-react';

interface CashRegister {
  id: string;
  register_id: string;
  user_id: number;
  opening_cash: number;
  current_cash: number;
  status: 'open' | 'closed';
  opened_at: string;
  opened_by: number;
}

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  totalWithdrawals: number;
  totalRefunds: number;
}

export default function SalesDashboard() {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<string>("7");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const formatCurrencyBase = useFormatCurrency();

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    orderNumber: '',
    customerId: '',
    customerName: '',
    total: '',
    paymentMethod: 'cash',
    status: 'completed'
  });

  // Product CRUD state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isDeleteProductDialogOpen, setIsDeleteProductDialogOpen] = useState(false);
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    categoryId: '',
    stockQuantity: '',
    alertThreshold: '5',
    active: true,
    description: '',
    barcode: ''
  });

  // Fetch current register
  const { data: currentRegister, refetch: refetchRegister } = useQuery({
    queryKey: ['current-register'],
    queryFn: async () => {
      const response = await fetch('/api/cash-register/current');
      if (!response.ok) throw new Error('Failed to fetch register');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch sales data for current register
  const { data: salesDataBackend, refetch: refetchSalesData } = useQuery({
    queryKey: ['sales-data', currentRegister?.register_id],
    queryFn: async () => {
      if (!currentRegister?.register_id) return null;
      const response = await fetch(`/api/cash-register/${currentRegister.register_id}/sales-data`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
    enabled: !!currentRegister?.register_id,
    refetchInterval: 5000 // Refresh every 5 seconds for real-time data
  });

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/sales?limit=100');
        if (!response.ok) {
          console.error('Sales API response not ok:', response.status, response.statusText);
          throw new Error(`Failed to fetch sales: ${response.status}`);
        }
        const data = await response.json();
        console.log('Sales data received:', data);
        
        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data && Array.isArray(data.sales)) {
          return data.sales;
        } else if (data && data.data && Array.isArray(data.data)) {
          return data.data;
        } else {
          console.warn('Unexpected sales data format:', data);
          return [];
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 10000 // Refresh every 10 seconds for live data
  });

  const handleCreateSale = async (saleData: any) => {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saleData,
          items: saleData.items || [],
          customerId: saleData.customerId || null,
          userId: 1, // Default user ID
          total: parseFloat(saleData.total || '0'),
          tax: parseFloat(saleData.tax || '0'),
          discount: parseFloat(saleData.discount || '0'),
          status: saleData.status || 'completed'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create sale');
      }

      const result = await response.json();
      console.log('Sale created successfully:', result);
      refetchSales();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Failed to create sale. Please try again.');
    }
  };

  const handleUpdateSale = async (saleId: number, saleData: any) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saleData,
          total: parseFloat(saleData.total || '0'),
          tax: parseFloat(saleData.tax || '0'),
          discount: parseFloat(saleData.discount || '0')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sale');
      }

      const result = await response.json();
      console.log('Sale updated successfully:', result);
      refetchSales();
      setIsEditDialogOpen(false);
      setSelectedSale(null);
      resetForm();
    } catch (error) {
      console.error('Error updating sale:', error);
      alert('Failed to update sale. Please try again.');
    }
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sale');
      }

      console.log('Sale deleted successfully');
      refetchSales();
      setIsDeleteDialogOpen(false);
      setSelectedSale(null);
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale. Please try again.');
    }
  };

  const resetForm = () => {
    setEditForm({
      orderNumber: '',
      customerId: '',
      customerName: '',
      total: '',
      paymentMethod: 'cash',
      status: 'completed'
    });
  };

  const openEditDialog = (sale: any) => {
    setSelectedSale(sale);
    setEditForm({
      orderNumber: sale.orderNumber || '',
      customerId: sale.customerId?.toString() || '',
      customerName: sale.customerName || sale.customer?.name || '',
      total: sale.total?.toString() || '',
      paymentMethod: sale.paymentMethod || 'cash',
      status: sale.status || 'completed'
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (sale: any) => {
    setSelectedSale(sale);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Product CRUD Operations
  const handleCreateProduct = async (productData: any) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          price: parseFloat(productData.price || '0'),
          cost: parseFloat(productData.cost || '0'),
          categoryId: parseInt(productData.categoryId || '1'),
          stockQuantity: parseInt(productData.stockQuantity || '0'),
          alertThreshold: parseInt(productData.alertThreshold || '5'),
          active: productData.active !== false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const result = await response.json();
      console.log('Product created successfully:', result);
      refetchProducts();
      setIsCreateProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  const handleUpdateProduct = async (productId: number, productData: any) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          price: parseFloat(productData.price || '0'),
          cost: parseFloat(productData.cost || '0'),
          categoryId: parseInt(productData.categoryId || '1'),
          stockQuantity: parseInt(productData.stockQuantity || '0'),
          alertThreshold: parseInt(productData.alertThreshold || '5')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      const result = await response.json();
      console.log('Product updated successfully:', result);
      refetchProducts();
      setIsEditProductDialogOpen(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      console.log('Product deleted successfully');
      refetchProducts();
      setIsDeleteProductDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      sku: '',
      price: '',
      cost: '',
      categoryId: '',
      stockQuantity: '',
      alertThreshold: '5',
      active: true,
      description: '',
      barcode: ''
    });
  };

  const openEditProductDialog = (product: any) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      categoryId: product.categoryId?.toString() || '',
      stockQuantity: product.stockQuantity?.toString() || '',
      alertThreshold: product.alertThreshold?.toString() || '5',
      active: product.active !== false,
      description: product.description || '',
      barcode: product.barcode || ''
    });
    setIsEditProductDialogOpen(true);
  };

  const openDeleteProductDialog = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteProductDialogOpen(true);
  };

  const openCreateProductDialog = () => {
    resetProductForm();
    setIsCreateProductDialogOpen(true);
  };

  // Fetch sales chart data
  const { data: salesChartData, isLoading: chartLoading } = useQuery({
    queryKey: ['/api/dashboard/sales-chart', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/dashboard/sales-chart?days=${timeRange}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching chart data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch top selling products
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/reports/top-selling-products', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/top-selling-products?days=${timeRange}&limit=10`);
        if (!response.ok) {
          console.error('Top products API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Top products data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching top products:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch all products for selling products management
  const { data: allProducts, isLoading: allProductsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch categories for product form
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  // Filter products based on search term
  const filteredProducts = allProducts?.filter((product: any) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  ) || [];

  // Process chart data with better error handling
  const chartData = salesChartData?.map((item: any) => {
    const date = item.date || item.createdAt || new Date().toISOString();
    const total = parseFloat(item.total || item.totalAmount || item.amount || 0);
    return {
      date: format(new Date(date), "MMM dd"),
      total: isNaN(total) ? 0 : total,
      sales: item.sales || 0
    };
  }) || [];

  console.log('Processed chart data:', chartData);

  // Calculate metrics with better error handling
  const totalSalesAmount = salesData?.reduce((total: number, sale: any) => {
    const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
    return total + (isNaN(saleTotal) ? 0 : saleTotal);
  }, 0) || 0;

  const totalTransactions = salesData?.length || 0;
  const averageOrderValue = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  // Mock data for additional metrics
  const previousPeriodSales = totalSalesAmount * 0.85; // Simulate 15% growth
  const salesGrowth = totalSalesAmount > 0 ? ((totalSalesAmount - previousPeriodSales) / previousPeriodSales) * 100 : 0;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

  // Product category data for pie chart
  const productCategoryData = topProducts?.reduce((acc: any[], product: any) => {
    const category = product.product.category?.name || "Uncategorized";
    const existingCategory = acc.find((item) => item.name === category);

    if (existingCategory) {
      existingCategory.value += product.soldQuantity;
      existingCategory.revenue += parseFloat(product.revenue || 0);
    } else {
      acc.push({ 
        name: category, 
        value: product.soldQuantity,
        revenue: parseFloat(product.revenue || 0)
      });
    }

    return acc;
  }, []) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenRegister = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/cash-register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: parseFloat(openingAmount) })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Register Opened",
        description: `Register opened with ${formatCurrency(parseFloat(openingAmount))}`,
      });

      setOpeningAmount('');
      setShowOpenDialog(false);
      refetchRegister();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open register",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!currentRegister) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/cash-register/${currentRegister.register_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          closingCash: parseFloat(closingAmount) || 0,
          notes 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Register Closed",
        description: "Cash register has been closed successfully",
      });

      setClosingAmount('');
      setNotes('');
      setShowCloseDialog(false);
      refetchRegister();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to close register",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateCashInDrawer = () => {
    if (!currentRegister || !salesDataBackend) return 0;
    return currentRegister.opening_cash + 
           salesDataBackend.cashSales - 
           salesDataBackend.totalWithdrawals;
  };

  if (!currentRegister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600 text-white p-3 rounded-xl">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
                  <p className="text-gray-500">Open a cash register to start tracking sales</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowOpenDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Open Register
              </Button>
            </div>
          </div>

          {/* No Register Open Message */}
          <Card className="p-12 text-center">
            <CardContent>
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Register Open</h2>
              <p className="text-gray-500 mb-6">Please open a cash register to start tracking sales and transactions</p>
              <Button 
                onClick={() => setShowOpenDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Open Cash Register
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Open Register Dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Open Cash Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">Enter the opening cash amount in the register drawer.</p>
              </div>

              <div>
                <Label htmlFor="openingAmount">Cash In Hand (₹)</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="Enter opening amount"
                  className="mt-1"
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowOpenDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenRegister}
                  disabled={isProcessing || !openingAmount}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Opening..." : "Open Register"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-green-600 text-white p-3 rounded-xl">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
                  <p className="text-gray-500">Real-time sales and cash register management</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchRegister();
                    refetchSalesData();
                  }}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => setShowCloseDialog(true)}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Close Register
                </Button>
              </div>
            </div>
          </div>

          {/* Register Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Register Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-500">Register Status</Label>
                  <Badge variant={currentRegister.status === 'open' ? 'default' : 'secondary'}>
                    {currentRegister.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-gray-500">Cash In Hand</Label>
                  <p className="text-lg font-semibold">{formatCurrency(currentRegister.opening_cash)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-gray-500">Opened At</Label>
                  <p className="text-lg font-semibold">{formatTime(currentRegister.opened_at)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-gray-500">Register ID</Label>
                  <p className="text-sm font-mono">{currentRegister.register_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-Time Sales Overview */}
          {salesDataBackend && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesDataBackend.totalRevenue)}</p>
                      <p className="text-blue-200 text-xs">{salesDataBackend.totalSales} transactions</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Cash Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesDataBackend.cashSales)}</p>
                    </div>
                    <Banknote className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">UPI Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesDataBackend.upiSales)}</p>
                    </div>
                    <Smartphone className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Card Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesDataBackend.cardSales)}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Live Cash Tracker */}
          {salesDataBackend && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-600" />
                  Live Cash Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Opening Cash:</span>
                      <span className="font-mono">{formatCurrency(currentRegister.opening_cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Cash Sales:</span>
                      <span className="font-mono text-green-600">+{formatCurrency(salesDataBackend.cashSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>- Withdrawals:</span>
                      <span className="font-mono text-red-600">-{formatCurrency(salesDataBackend.totalWithdrawals)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Cash In Drawer:</span>
                    <span className="font-mono text-green-600">{formatCurrency(calculateCashInDrawer())}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Other Payments</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(salesDataBackend.otherSales)}</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Total Refunds</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(salesDataBackend.totalRefunds)}</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">Withdrawals</p>
                  <p className="text-xl font-bold text-yellow-700">{formatCurrency(salesDataBackend.totalWithdrawals)}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Current Cash</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(currentRegister.current_cash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Close Register Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5 text-red-600" />
                Close Cash Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  Closing the register will end the current session. Count the cash in the drawer.
                </p>
              </div>

              <div>
                <Label htmlFor="closingAmount">Actual Cash Count (₹)</Label>
                <Input
                  id="closingAmount"
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Enter actual cash count"
                  className="mt-1"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected: {formatCurrency(calculateCashInDrawer())}
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about the closing"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseRegister}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? "Closing..." : "Close Register"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}