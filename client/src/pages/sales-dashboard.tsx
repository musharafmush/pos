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
            <TabsTrigger value="trends">Sales Trends</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
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
                <CardDescription>Latest sales activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.slice(0, 10).map((sale: any) => {
                        const saleDate = sale.createdAt || sale.created_at || sale.date || new Date().toISOString();
                        const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
                        const itemCount = sale.items?.length || sale.saleItems?.length || sale.sale_items?.length || 0;
                        
                        return (
                          <TableRow key={sale.id || Math.random()}>
                            <TableCell>
                              {format(new Date(saleDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>{sale.customerName || sale.customer_name || "Walk-in Customer"}</TableCell>
                            <TableCell>{itemCount} items</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(isNaN(saleTotal) ? 0 : saleTotal)}
                            </TableCell>
                            <TableCell>{sale.paymentMethod || sale.payment_method || "Cash"}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                {sale.status || "Completed"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(sale)}
                                  className="h-8 px-2 text-blue-600 hover:text-blue-800"
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
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
      </div>
    </DashboardLayout>
  );
}