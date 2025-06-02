
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales', { startDate, endDate }],
    queryFn: async () => {
      const response = await fetch(`/api/sales?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    }
  });

  // Fetch sales chart data
  const { data: salesChartData, isLoading: chartLoading } = useQuery({
    queryKey: ['/api/dashboard/sales-chart', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-chart?days=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch sales chart data');
      return response.json();
    }
  });

  // Fetch top selling products
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/reports/top-selling-products', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/reports/top-selling-products?days=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch top products');
      return response.json();
    }
  });

  // Process chart data
  const chartData = salesChartData?.map((item: { date: string; total: string }) => ({
    date: format(new Date(item.date), "MMM dd"),
    total: parseFloat(item.total),
    sales: parseFloat(item.total)
  })) || [];

  // Calculate metrics
  const totalSalesAmount = salesData?.reduce((total: number, sale: any) => {
    return total + parseFloat(sale.total);
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
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Sales Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor your sales performance and trends</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData?.slice(0, 10).map((sale: any) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {format(new Date(sale.createdAt), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{sale.customerName || "Walk-in Customer"}</TableCell>
                          <TableCell>{sale.items?.length || 0} items</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(sale.total))}
                          </TableCell>
                          <TableCell>{sale.paymentMethod || "Cash"}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Completed
                            </span>
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
      </div>
    </DashboardLayout>
  );
}
