import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function SalesDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const formatCurrency = useFormatCurrency();

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

  // Fetch sales data with enhanced customer billing details
  const { data: salesData, isLoading: salesLoading, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/sales?limit=100&include=customer,items,billing');
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

  // Fetch detailed customer billing data with enhanced information
  const { data: customerBillingData, isLoading: billingLoading } = useQuery({
    queryKey: ['/api/reports/customer-billing', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-billing?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer billing API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer billing data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer billing data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch detailed customer transaction history
  const { data: customerTransactionHistory, isLoading: transactionLoading } = useQuery({
    queryKey: ['/api/reports/customer-transactions', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-transactions?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer transactions API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer transaction history:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer transaction history:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch customer demographics and segmentation data
  const { data: customerDemographics, isLoading: demographicsLoading } = useQuery({
    queryKey: ['/api/reports/customer-demographics', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-demographics?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer demographics API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer demographics data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer demographics:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch payment method analytics
  const { data: paymentAnalytics, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/reports/payment-analytics', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/payment-analytics?days=${timeRange}`);
        if (!response.ok) {
          console.error('Payment analytics API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Payment analytics data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching payment analytics data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // CRUD Operations
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Sales Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400">Monitor your sales performance and trends • Real-time POS integration</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live Data
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                className="flex items-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>New Sale</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>POS System</span>
              </Button>
            </div>
          </div>

          {/* Loading and Error States */}
          {salesLoading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Loading sales data...</p>
            </div>
          )}

          {salesError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">Error loading sales data. Please try refreshing the page.</p>
            </div>
          )}

          {!salesLoading && !salesError && (!salesData || salesData.length === 0) && (
            <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Ready for Sales!</h3>
                  <p className="text-blue-700">Your POS system is connected and ready to track sales data</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-blue-600">
                <div>📊 Real-time sales tracking enabled</div>
                <div>🛒 Start making sales in POS Enhanced to see live analytics</div>
                <div>📈 All transaction data will appear here instantly</div>
              </div>
              <Button
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                Open POS System
              </Button>
            </div>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSalesAmount)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {salesGrowth >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={salesGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(salesGrowth).toFixed(1)}%
                </span>
                <span className="ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Sales transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground">
                Per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
              <PercentIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topProducts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active products
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
            <TabsTrigger value="payment-analytics">Payment Analytics</TabsTrigger>
            <TabsTrigger value="trends">Sales Trends</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="selling-products">Selling Products</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Sales Overview</h3>
              <Select
                value={timeRange}
                onValueChange={(value) => setTimeRange(value)}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm bg-gray-50 dark:bg-gray-700">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                  <CardDescription>Daily sales performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Product category distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {productCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customer Billing Tab */}
          <TabsContent value="customer-billing" className="space-y-6">
            {/* Billing Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customerBillingData?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Active billing customers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      customerBillingData?.reduce((sum: number, customer: any) => 
                        sum + parseFloat(customer.totalBilled || customer.totalAmount || 0), 0
                      ) || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">From all customers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      customerBillingData?.length > 0 
                        ? customerBillingData.reduce((sum: number, customer: any) => 
                            sum + parseFloat(customer.totalBilled || customer.totalAmount || 0), 0
                          ) / customerBillingData.length
                        : 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Per customer</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row```text
 items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customerBillingData?.reduce((sum: number, customer: any) => 
                      sum + (customer.orderCount || 0), 0
                    ) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">All customer orders</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Billing Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Customer Billing Details</CardTitle>
                  <CardDescription>Comprehensive billing information for all customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Total Billed</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Avg Order</TableHead>
                          <TableHead className="text-right">Frequency</TableHead>
                          <TableHead>Last Purchase</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerBillingData?.map((customer: any) => {
                          const totalBilled = parseFloat(customer.totalBilled || customer.totalAmount || 0);
                          const orderCount = customer.orderCount || 0;
                          const avgOrderValue = orderCount > 0 ? totalBilled / orderCount : 0;
                          const isHighValue = totalBilled > 5000;
                          const isFrequent = orderCount > 5;

                          return (
                            <TableRow key={customer.customerId || customer.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isHighValue ? 'bg-yellow-100 text-yellow-600' : 
                                    isFrequent ? 'bg-green-100 text-green-600' : 
                                    'bg-blue-100 text-blue-600'
                                  }`}>
                                    <UsersIcon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{customer.customerName || customer.name || "Walk-in Customer"}</div>
                                    <div className="text-xs text-gray-500">ID: {customer.customerId || customer.id}</div>
                                    {isHighValue && <div className="text-xs text-yellow-600 font-medium">VIP Customer</div>}
                                    {isFrequent && <div className="text-xs text-green-600 font-medium">Frequent Buyer</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {customer.phone && <div className="font-medium">{customer.phone}</div>}
                                  {customer.email && <div className="text-gray-500 text-xs">{customer.email}</div>}
                                  {!customer.phone && !customer.email && <span className="text-gray-400">No contact</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-semibold">{formatCurrency(totalBilled)}</div>
                                <div className="text-xs text-gray-500">
                                  {totalBilled > 0 && `${((totalBilled / (customerBillingData?.reduce((sum: number, c: any) => 
                                    sum + parseFloat(c.totalBilled || c.totalAmount || 0), 0) || 1)) * 100).toFixed(1)}% of total`}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">{orderCount}</div>
                                <div className="text-xs text-gray-500">orders</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">{formatCurrency(avgOrderValue)}</div>
                                <div className="text-xs text-gray-500">per order</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="text-sm">
                                  {orderCount > 10 ? "Very High" : 
                                   orderCount > 5 ? "High" : 
                                   orderCount > 2 ? "Medium" : "Low"}
                                </div>
                                <div className="text-xs text-gray-500">{orderCount} orders</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), "MMM dd, yyyy") : "Never"}
                                </div>
                                {customer.lastPurchaseDate && (
                                  <div className="text-xs text-gray-500">
                                    {Math.floor((new Date().getTime() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isHighValue ? 'bg-yellow-100 text-yellow-800' :
                                  isFrequent ? 'bg-green-100 text-green-800' :
                                  orderCount > 0 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isHighValue ? 'VIP' : isFrequent ? 'Frequent' : orderCount > 0 ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // View customer details logic
                                      console.log('View customer:', customer);
                                    }}
                                    className="h-8 px-2 text-blue-600 hover:text-blue-800"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Generate billing statement logic
                                      console.log('Generate statement for:', customer);
                                    }}
                                    className="h-8 px-2 text-green-600 hover:text-green-800"
                                  >
                                    Statement
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Send reminder logic
                                      console.log('Send reminder to:', customer);
                                    }}
                                    className="h-8 px-2 text-orange-600 hover:text-orange-800"
                                  >
                                    Remind
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Insights and Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>Customer behavior and analytics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Customers */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Top Customers by Value</h4>
                    <div className="space-y-3">
                      {customerBillingData?.slice(0, 5).map((customer: any, index: number) => (
                        <div key={customer.customerId || customer.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{customer.customerName || customer.name || "Walk-in"}</div>
                              <div className="text-xs text-gray-500">{customer.orderCount || 0} orders</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(parseFloat(customer.totalBilled || 0))}</div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(parseFloat(customer.averageOrderValue || 0))} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Segmentation */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Customer Segmentation</h4>
                    <div className="space-y-2">
                      {(() => {
                        const vipCustomers = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000).length || 0;
                        const frequentCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5).length || 0;
                        const newCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) === 1).length || 0;
                        const totalCustomers = customerBillingData?.length || 0;

                        return (
                          <>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">VIP Customers (&gt;₹5000)</span>
                              <span className="text-xs font-medium text-yellow-600">{vipCustomers} ({totalCustomers > 0 ? ((vipCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">Frequent Buyers (&gt;5 orders)</span>
                              <span className="text-xs font-medium text-green-600">{frequentCustomers} ({totalCustomers > 0 ? ((frequentCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">New Customers (1 order)</span>
                              <span className="text-xs font-medium text-blue-600">{newCustomers} ({totalCustomers > 0 ? ((newCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          console.log('Export customer data');
                        }}
                      >
                        📊 Export Customer Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-green-600 hover:text-green-800"
                        onClick={() => {
                          console.log('Send bulk statements');
                        }}
                      >
                        📄 Send Bulk Statements
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-purple-600 hover:text-purple-800"
                        onClick={() => {
                          console.log('Customer loyalty program');
                        }}
                      >
                        🎁 Loyalty Program
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Billing Trends and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Purchase Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Purchase Trends</CardTitle>
                  <CardDescription>Top customers by purchase volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerBillingData?.slice(0, 8) || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="customerName" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'totalBilled' ? formatCurrency(Number(value)) : value,
                            name === 'totalBilled' ? 'Total Billed' : 'Orders'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="totalBilled" fill="#3b82f6" name="Total Billed" />
                        <Bar dataKey="orderCount" fill="#10b981" name="Order Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Value Distribution</CardTitle>
                  <CardDescription>Revenue distribution by customer segments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            const vipRevenue = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const frequentRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const regularRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;

                            return [
                              { name: 'VIP Customers', value: vipRevenue, color: '#fbbf24' },
                              { name: 'Frequent Buyers', value: frequentRevenue, color: '#10b981' },
                              { name: 'Regular Customers', value: regularRevenue, color: '#3b82f6' }
                            ].filter(item => item.value > 0);
                          })()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(() => {
                            const vipRevenue = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const frequentRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const regularRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;

                            const data = [
                              { name: 'VIP Customers', value: vipRevenue, color: '#fbbf24' },
                              { name: 'Frequent Buyers', value: frequentRevenue, color: '#10b981' },
                              { name: 'Regular Customers', value: regularRevenue, color: '#3b82f6' }
                            ].filter(item => item.value > 0);

                            return data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ));
                          })()}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Billing Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Billing Summary</CardTitle>
                <CardDescription>Detailed financial overview by customer segments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {(() => {
                    const vipCustomers = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000) || [];
                    const frequentCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000) || [];
                    const regularCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000) || [];

                    const vipRevenue = vipCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);
                    const frequentRevenue = frequentCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);
                    const regularRevenue = regularCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);

                    return (
                      <>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-yellow-800">VIP Customers</h4>
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Premium</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-yellow-900">{vipCustomers.length}</div>
                            <div className="text-sm text-yellow-700">Total Revenue: {formatCurrency(vipRevenue)}</div>
                            <div className="text-xs text-yellow-600">Avg: {formatCurrency(vipCustomers.length > 0 ? vipRevenue / vipCustomers.length : 0)}</div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-green-800">Frequent Buyers</h4>
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-green-900">{frequentCustomers.length}</div>
                            <div className="text-sm text-green-700">Total Revenue: {formatCurrency(frequentRevenue)}</div>
                            <div className="text-xs text-green-600">Avg: {formatCurrency(frequentCustomers.length > 0 ? frequentRevenue / frequentCustomers.length : 0)}</div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-blue-800">Regular Customers</h4>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Standard</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-blue-900">{regularCustomers.length}</div>
                            <div className="text-sm text-blue-700">Total Revenue: {formatCurrency(regularRevenue)}</div>
                            <div className="text-xs text-blue-600">Avg: {formatCurrency(regularCustomers.length > 0 ? regularRevenue / regularCustomers.length : 0)}</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Analytics Tab */}
          <TabsContent value="payment-analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Method Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Distribution</CardTitle>
                  <CardDescription>Breakdown of payment methods used</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentAnalytics}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {paymentAnalytics?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Trends</CardTitle>
                  <CardDescription>Daily payment method usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total Sales" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Details</CardTitle>
                <CardDescription>Detailed breakdown by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Average Transaction</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentAnalytics?.map((payment: any) => {
                        const percentage = ((payment.amount / totalSalesAmount) * 100).toFixed(1);
                        return (
                          <TableRow key={payment.paymentMethod}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[paymentAnalytics.indexOf(payment) % COLORS.length] }}></div>
                                <span className="capitalize">{payment.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{payment.transactionCount}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(parseFloat(payment.amount || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(payment.amount || 0) / (payment.transactionCount || 1))}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">{percentage}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Sales Analysis</CardTitle>
                <div className="flex space-x-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Daily Sales"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Performance Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Quantity Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts?.map((product: any) => (
                        <TableRow key={product.product.id}>
                          <TableCell className="font-medium">
                            {product.product.name}
                          </TableCell>
                          <TableCell>{product.product.sku}</TableCell>
                          <TableCell>{product.product.category?.name || "Uncategorized"}</TableCell>
                          <TableCell className="text-right">{product.soldQuantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(product.revenue || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales Transactions</CardTitle>
                <CardDescription>Latest sales activity with detailed billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Invoice#</TableHead>
                        <TableHead>Customer Details</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.slice(0, 10).map((sale: any) => {
                        const saleDate = sale.createdAt || sale.created_at || sale.date || new Date().toISOString();
                        const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
                        const saleSubtotal = parseFloat(sale.subtotal || sale.total || 0);
                        const saleTax = parseFloat(sale.tax || sale.taxAmount || 0);
                        const saleDiscount = parseFloat(sale.discount || sale.discountAmount || 0);
                        const itemCount = sale.items?.length || sale.saleItems?.length || sale.sale_items?.length || 0;

                        return (
                          <TableRow key={sale.id || Math.random()}>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{format(new Date(saleDate), "MMM dd, yyyy")}</div>
                                <div className="text-gray-500">{format(new Date(saleDate), "hh:mm a")}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {sale.orderNumber || sale.invoiceNumber || `INV-${sale.id}`}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{sale.customerName || sale.customer_name || "Walk-in Customer"}</div>
                                {sale.customerPhone && (
                                  <div className="text-gray-500">{sale.customerPhone}</div>
                                )}
                                {sale.customerEmail && (
                                  <div className="text-gray-500 text-xs">{sale.customerEmail}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{itemCount} items</div>
                                <div className="text-gray-500">
                                  {sale.items?.slice(0, 2).map((item: any, index: number) => (
                                    <div key={index} className="text-xs">
                                      {item.productName || item.name} x{item.quantity}
                                    </div>
                                  ))}
                                  {itemCount > 2 && (
                                    <div className="text-xs text-blue-600">+{itemCount - 2} more</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(isNaN(saleSubtotal) ? saleTotal : saleSubtotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(isNaN(saleTax) ? 0 : saleTax)}
                            </TableCell>
                            <TableCell className="text-right">
                              {saleDiscount > 0 ? formatCurrency(saleDiscount) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(isNaN(saleTotal) ? 0 : saleTotal)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="capitalize font-medium">{sale.paymentMethod || sale.payment_method || "Cash"}</div>
                                {sale.paymentReference && (
                                  <div className="text-gray-500 text-xs">Ref: {sale.paymentReference}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {sale.status || "Completed"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // View detailed invoice
                                    console.log('View invoice:', sale);
                                  }}
                                  className="h-8 px-2 text-blue-600 hover:text-blue-800"
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Print receipt
                                    window.print();
                                  }}
                                  className="h-8 px-2 text-green-600 hover:text-green-800"
                                >
                                  Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(sale)}
                                  className="h-8 px-2 text-orange-600 hover:text-orange-800"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(sale)}
                                  className="h-8 px-2 text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) || (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground">
                            No sales data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Selling Products CRUD Tab */}
          <TabsContent value="selling-products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Selling Products Management</CardTitle>
                    <CardDescription>Manage products for sales operations</CardDescription>
                  </div>
                  <Button
                    onClick={openCreateProductDialog}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span>Add Product</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search products by name, SKU, or category..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts?.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
                              </div>
                              <span>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>{product.category?.name || "Uncategorized"}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(product.price || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`${product.stockQuantity <= product.alertThreshold ? 'text-red-600 font-semibold' : ''}`}>
                              {product.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditProductDialog(product)}
                                className="h-8 px-2 text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteProductDialog(product)}
                                className="h-8 px-2 text-red-600 hover:text-red-800"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Sale Dialog */}
        {isCreateDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Sale</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Order Number</label>
                  <Input
                    type="text"
                    value={editForm.orderNumber}
                    onChange={(e) => setEditForm({...editForm, orderNumber: e.target.value})}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name</label>
                  <Input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                    placeholder="Walk-in Customer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total Amount</label>
                  <Input
                    type="number"
                    value={editForm.total}
                    onChange={(e) => setEditForm({...editForm, total: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <Select
                    value={editForm.paymentMethod}
                    onValueChange={(value) => setEditForm({...editForm, paymentMethod: value})}
                  >
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
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({...editForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreateSale({
                    ...editForm,
                    items: [], // Empty items for now - you can extend this
                    orderNumber: editForm.orderNumber || `SALE-${Date.now()}`
                  })}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Sale
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Sale Dialog */}
        {isEditDialogOpen && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit Sale</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Order Number</label>
                  <Input
                    type="text"
                    value={editForm.orderNumber}
                    onChange={(e) => setEditForm({...editForm, orderNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name</label>
                  <Input
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total Amount</label>
                  <Input
                    type="number"
                    value={editForm.total}
                    onChange={(e) => setEditForm({...editForm, total: e.target.value})}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <Select
                    value={editForm.paymentMethod}
                    onValueChange={(value) => setEditForm({...editForm, paymentMethod: value})}
                  >
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
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({...editForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedSale(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateSale(selectedSale.id, editForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Sale
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Delete Sale</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete sale #{selectedSale.orderNumber || selectedSale.id}? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setSelectedSale(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteSale(selectedSale.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Sale
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Product Dialog */}
        {isCreateProductDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <Input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU *</label>
                  <Input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Selling Price *</label>
                  <Input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cost Price</label>
                  <Input
                    type="number"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({...productForm, cost: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={(value) => setProductForm({...productForm, categoryId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                  <Input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({...productForm, stockQuantity: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alert Threshold</label>
                  <Input
                    type="number"
                    value={productForm.alertThreshold}
                    onChange={(e) => setProductForm({...productForm, alertThreshold: e.target.value})}
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Barcode</label>
                  <Input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                    placeholder="Enter barcode"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    type="text"
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Product description"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={productForm.active}
                      onChange={(e) => setProductForm({...productForm, active: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Active Product</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateProductDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreateProduct(productForm)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Product
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Dialog */}
        {isEditProductDialogOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <Input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU *</label>
                  <Input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Selling Price *</label>
                  <Input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cost Price</label>
                  <Input
                    type="number"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({...productForm, cost: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={(value) => setProductForm({...productForm, categoryId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                  <Input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({...productForm, stockQuantity: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alert Threshold</label>
                  <Input
                    type="number"
                    value={productForm.alertThreshold}
                    onChange={(e) => setProductForm({...productForm, alertThreshold: e.target.value})}
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Barcode</label>
                  <Input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                    placeholder="Enter barcode"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    type="text"
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Product description"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={productForm.active}
                      onChange={(e) => setProductForm({...productForm, active: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Active Product</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditProductDialogOpen(false);
                    setSelectedProduct(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateProduct(selectedProduct.id, productForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Product
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Product Confirmation Dialog */}
        {isDeleteProductDialogOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Delete Product</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{selectedProduct.name}"? 
                This action cannot be undone and may affect existing sales records.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteProductDialogOpen(false);
                    setSelectedProduct(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteProduct(selectedProduct.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Product
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}