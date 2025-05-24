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
  Cell
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatISO } from "date-fns";
import { PackageIcon, CalendarIcon, DollarSignIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const [timeRange, setTimeRange] = useState<string>("7");
  const [salesDateRange, setSalesDateRange] = useState<string>("7");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Sales Chart Data
  const { data: salesChartData, isLoading: isLoadingSalesChart } = useQuery({
    queryKey: ['/api/dashboard/sales-chart', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-chart?days=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales chart data');
      }
      return response.json();
    }
  });

  // Top Selling Products Data
  const { data: topProducts, isLoading: isLoadingTopProducts } = useQuery({
    queryKey: ['/api/dashboard/top-products', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/top-products?days=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top selling products');
      }
      return response.json();
    }
  });

  // Recent Sales for Sales Report
  const { data: sales, isLoading: isLoadingSales } = useQuery({
    queryKey: ['/api/sales', salesDateRange, startDate, endDate],
    queryFn: async () => {
      let queryParams = '';
      
      // If a predefined range is selected
      if (salesDateRange !== 'custom') {
        let startDateParam;
        const today = new Date();
        
        if (salesDateRange === '7') {
          startDateParam = formatISO(subDays(today, 7));
        } else if (salesDateRange === '30') {
          startDateParam = formatISO(subDays(today, 30));
        } else if (salesDateRange === 'this_week') {
          startDateParam = formatISO(startOfWeek(today));
        } else if (salesDateRange === 'this_month') {
          startDateParam = formatISO(startOfMonth(today));
        }
        
        queryParams = `?startDate=${startDateParam}&endDate=${formatISO(today)}`;
      } else {
        // Custom date range
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        queryParams = `?startDate=${formatISO(parsedStartDate)}&endDate=${formatISO(parsedEndDate)}`;
      }
      
      const response = await fetch(`/api/sales${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      return response.json();
    }
  });

  // Process chart data
  const chartData = salesChartData?.map((item: { date: string; total: string }) => ({
    date: format(new Date(item.date), "EEE"),
    total: parseFloat(item.total)
  })) || [];

  // Create data for product distribution pie chart
  const productCategoryData = topProducts?.reduce((acc: any[], product: any) => {
    const category = product.product.category?.name || "Uncategorized";
    const existingCategory = acc.find((item) => item.name === category);
    
    if (existingCategory) {
      existingCategory.value += product.soldQuantity;
    } else {
      acc.push({ name: category, value: product.soldQuantity });
    }
    
    return acc;
  }, []) || [];

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

  // Calculate total sales amount
  const totalSalesAmount = sales?.reduce((total: number, sale: any) => {
    return total + parseFloat(sale.total);
  }, 0) || 0;

  // Calculate average order value
  const averageOrderValue = sales?.length > 0 
    ? totalSalesAmount / sales.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Reports</h2>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="products">Product Report</TabsTrigger>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sales Trend Chart */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingSalesChart ? (
                    <div className="h-64 flex items-center justify-center">
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          formatter={(value) => [`$${value}`, 'Sales']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Product Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Category Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTopProducts ? (
                    <div className="h-64 flex items-center justify-center">
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={productCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {productCategoryData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} units`, 'Sold']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Selling Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>The best performing products in your inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTopProducts ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading top selling products...
                  </div>
                ) : topProducts && topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Sold Quantity</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.map((item: any) => {
                          const totalRevenue = topProducts.reduce((sum: number, product: any) => {
                            return sum + parseFloat(product.revenue);
                          }, 0);
                          
                          const percentage = (parseFloat(item.revenue) / totalRevenue) * 100;
                          
                          return (
                            <TableRow key={item.product.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    {item.product.image ? (
                                      <img src={item.product.image} alt={item.product.name} className="h-10 w-10 rounded-md object-cover" />
                                    ) : (
                                      <PackageIcon className="h-6 w-6" />
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.product.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.product.sku}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.product.category?.name || "Uncategorized"}
                              </TableCell>
                              <TableCell>{item.soldQuantity} units</TableCell>
                              <TableCell>${parseFloat(item.revenue).toFixed(2)}</TableCell>
                              <TableCell>{percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No top selling products data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sales Report Tab */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>View detailed sales report for a specific time period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Select 
                    value={salesDateRange} 
                    onValueChange={(value) => setSalesDateRange(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {salesDateRange === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full sm:w-auto"
                        />
                      </div>
                      <span className="hidden sm:inline">—</span>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full sm:w-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sales Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</p>
                          <h4 className="text-2xl font-bold mt-1">${totalSalesAmount.toFixed(2)}</h4>
                        </div>
                        <div className="h-12 w-12 bg-primary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center">
                          <DollarSignIcon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                          <h4 className="text-2xl font-bold mt-1">{sales?.length || 0}</h4>
                        </div>
                        <div className="h-12 w-12 bg-secondary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center">
                          <PackageIcon className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Order</p>
                          <h4 className="text-2xl font-bold mt-1">${averageOrderValue.toFixed(2)}</h4>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 rounded-full flex items-center justify-center">
                          <DollarSignIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Sales Table */}
                {isLoadingSales ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading sales data...
                  </div>
                ) : sales && sales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale: any) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                            <TableCell>
                              {sale.createdAt && format(new Date(sale.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              {sale.customer?.name || "Walk-in Customer"}
                            </TableCell>
                            <TableCell>
                              {sale.items?.length || 0} items
                            </TableCell>
                            <TableCell>
                              {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1).replace('_', ' ')}
                            </TableCell>
                            <TableCell className="font-medium text-green-600 dark:text-green-400">
                              ${parseFloat(sale.total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline">
                        Export to CSV
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No sales data found for the selected time period.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Product Report Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Analyze the performance of your products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
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
                
                {isLoadingTopProducts ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading product performance data...
                  </div>
                ) : topProducts && topProducts.length > 0 ? (
                  <div>
                    {/* Product Performance Chart */}
                    <ResponsiveContainer width="100%" height={300} className="mb-6">
                      <BarChart
                        data={topProducts.map((item: any) => ({
                          name: item.product.name,
                          revenue: parseFloat(item.revenue),
                          quantity: item.soldQuantity
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${value}`} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value} units`} />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          yAxisId="left" 
                          dataKey="revenue" 
                          name="Revenue" 
                          fill="hsl(var(--primary))" 
                        />
                        <Bar 
                          yAxisId="right" 
                          dataKey="quantity" 
                          name="Quantity Sold" 
                          fill="hsl(var(--secondary))" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* Product Performance Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Sold Quantity</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProducts.map((item: any) => {
                            const revenue = parseFloat(item.revenue);
                            const cost = parseFloat(item.product.cost) * item.soldQuantity;
                            const profit = revenue - cost;
                            
                            return (
                              <TableRow key={item.product.id}>
                                <TableCell>
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 mr-2">
                                      {item.product.image ? (
                                        <img src={item.product.image} alt={item.product.name} className="h-8 w-8 rounded-md object-cover" />
                                      ) : (
                                        <PackageIcon className="h-4 w-4" />
                                      )}
                                    </div>
                                    <span className="font-medium">{item.product.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{item.product.sku}</TableCell>
                                <TableCell>{item.product.category?.name || "Uncategorized"}</TableCell>
                                <TableCell>{item.soldQuantity} units</TableCell>
                                <TableCell>${revenue.toFixed(2)}</TableCell>
                                <TableCell className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  ${profit.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      
                      <div className="mt-4 flex justify-end">
                        <Button variant="outline">
                          Export to CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No product performance data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
