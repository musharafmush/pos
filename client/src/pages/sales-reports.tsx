import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { Calendar, FileText, TrendingUp, DollarSign, ShoppingCart, Users, Download, Filter, BarChart3, PieChart, LineChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '../components/layout/dashboard-layout';

interface SalesReportData {
  totalSales: number;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    sales: number;
    revenue: number;
    transactions: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    revenue: number;
  }>;
  customerInsights: Array<{
    customerId: number;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
  }>;
}

const predefinedRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last Week', value: 'lastWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Last 7 Days', value: 'last7Days' },
  { label: 'Last 30 Days', value: 'last30Days' },
  { label: 'Custom Range', value: 'custom' }
];

export default function SalesReports() {
  const [selectedRange, setSelectedRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportType, setReportType] = useState('summary');

  const getDateRange = () => {
    const now = new Date();
    
    switch (selectedRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'thisWeek':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last7Days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'last30Days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'custom':
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : startOfDay(now),
          end: customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(now)
        };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const dateRange = getDateRange();

  const { data: reportData, isLoading, error } = useQuery<SalesReportData>({
    queryKey: ['/api/reports/sales', selectedRange, customStartDate, customEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      
      const response = await fetch(`/api/reports/sales?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sales report data');
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csvContent = [
      ['Sales Report', `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`],
      [''],
      ['Summary'],
      ['Total Sales', reportData.totalSales.toString()],
      ['Total Revenue', reportData.totalRevenue.toString()],
      ['Total Transactions', reportData.totalTransactions.toString()],
      ['Average Order Value', reportData.averageOrderValue.toString()],
      [''],
      ['Top Products'],
      ['Product Name', 'Quantity Sold', 'Revenue'],
      ...reportData.topProducts.map(p => [p.productName, p.quantity.toString(), p.revenue.toString()]),
      [''],
      ['Payment Methods'],
      ['Method', 'Count', 'Amount'],
      ...reportData.paymentMethodBreakdown.map(pm => [pm.method, pm.count.toString(), pm.amount.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FileText className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reports</h3>
            <p className="text-gray-600">Failed to load sales report data. Please try again.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
                  <p className="text-gray-600">Comprehensive sales analytics and insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={exportReport} disabled={!reportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                <Select value={selectedRange} onValueChange={setSelectedRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedRanges.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRange === 'custom' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Analysis</SelectItem>
                    <SelectItem value="products">Product Performance</SelectItem>
                    <SelectItem value="customers">Customer Insights</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading sales report...</p>
              </div>
            </div>
          ) : reportData ? (
            <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="detailed">Detailed</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.totalRevenue)}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(dateRange.start, 'dd MMM')} - {format(dateRange.end, 'dd MMM yyyy')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {reportData.totalSales.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Units sold</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                      <FileText className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {reportData.totalTransactions.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Orders completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(reportData.averageOrderValue)}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Per transaction</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Methods Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-600" />
                      Payment Methods Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {reportData.paymentMethodBreakdown.map((method, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{method.method}</span>
                            <Badge variant="secondary">{method.count}</Badge>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(method.amount)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {((method.amount / reportData.totalRevenue) * 100).toFixed(1)}% of total
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                      Top Performing Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="text-center">Qty Sold</TableHead>
                          <TableHead className="text-center">Revenue</TableHead>
                          <TableHead className="text-center">Avg Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{product.quantity}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-green-600">
                              {formatCurrency(product.revenue)}
                            </TableCell>
                            <TableCell className="text-center">
                              {formatCurrency(product.revenue / product.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Sales by Category */}
                {reportData.salesByCategory && reportData.salesByCategory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Sales by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.salesByCategory.map((category, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">{category.category}</h4>
                            <div className="text-lg font-bold text-purple-600">
                              {formatCurrency(category.revenue)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {category.sales} units sold
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-6">
                {reportData.customerInsights && reportData.customerInsights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Top Customers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead className="text-center">Total Orders</TableHead>
                            <TableHead className="text-center">Total Spent</TableHead>
                            <TableHead className="text-center">Avg Order Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.customerInsights.map((customer, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{customer.customerName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{customer.totalOrders}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-green-600">
                                {formatCurrency(customer.totalSpent)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatCurrency(customer.totalSpent / customer.totalOrders)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Detailed Tab */}
              <TabsContent value="detailed" className="space-y-6">
                {/* Daily Trends */}
                {reportData.dailyTrends && reportData.dailyTrends.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-orange-600" />
                        Daily Sales Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-center">Units Sold</TableHead>
                            <TableHead className="text-center">Revenue</TableHead>
                            <TableHead className="text-center">Transactions</TableHead>
                            <TableHead className="text-center">Avg Order Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.dailyTrends.map((day, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {format(new Date(day.date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{day.sales}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-green-600">
                                {formatCurrency(day.revenue)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{day.transactions}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {day.transactions > 0 ? formatCurrency(day.revenue / day.transactions) : formatCurrency(0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No sales data found for the selected period.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}