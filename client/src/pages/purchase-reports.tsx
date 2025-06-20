import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, TrendingUp, Package, ShoppingCart, DollarSign, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/layout/dashboard-layout';

interface PurchaseReportData {
  totalPurchases: number;
  totalAmount: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    amount: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    purchases: number;
    amount: number;
    transactions: number;
  }>;
  purchasesByCategory: Array<{
    category: string;
    purchases: number;
    amount: number;
  }>;
  supplierInsights: Array<{
    supplierId: number;
    supplierName: string;
    totalOrders: number;
    totalAmount: number;
  }>;
}

export default function PurchaseReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getDateRange = () => {
    const today = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return {
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd')
        };
      case 'this-week':
        return {
          startDate: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case 'last-week':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return {
          startDate: format(lastWeekStart, 'yyyy-MM-dd'),
          endDate: format(lastWeekEnd, 'yyyy-MM-dd')
        };
      case 'this-month':
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'last-month':
        const lastMonth = subDays(startOfMonth(today), 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };
      default:
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
    }
  };

  const { startDate, endDate } = getDateRange();
  const isValidDateRange = startDate && endDate;

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['/api/reports/purchases', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate || '',
        endDate: endDate || ''
      });
      const response = await fetch(`/api/reports/purchases?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchase report data');
      }
      return response.json();
    },
    enabled: !!isValidDateRange,
    refetchOnWindowFocus: false,
  }) as { data: PurchaseReportData | undefined; isLoading: boolean; error: any };

  const handleGenerateReport = () => {
    if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      alert('Please select both start and end dates for custom range');
      return;
    }
    // The query will automatically refetch when dependencies change
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and insights for your purchase data
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isValidDateRange && `${startDate} to ${endDate}`}
            </span>
          </div>
        </div>

        {/* Date Range Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select the date range for your purchase report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'custom' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <Button onClick={handleGenerateReport} className="w-full">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Generating report...</p>
            </div>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-red-600">
                <p>Error loading report data. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData && !isLoading && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalPurchases}</div>
                  <p className="text-xs text-muted-foreground">
                    Items purchased in selected period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total purchase value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Purchase orders processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.averageOrderValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per transaction average
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Reports */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Top Products</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="trends">Daily Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {reportData.paymentMethodBreakdown.map((payment: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium">{payment.method}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatCurrency(payment.amount)}</div>
                              <div className="text-xs text-muted-foreground">{payment.count} orders</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Purchases by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {reportData.purchasesByCategory.map((category: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium">{category.category}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatCurrency(category.amount)}</div>
                              <div className="text-xs text-muted-foreground">{category.purchases} items</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Purchased Products</CardTitle>
                    <CardDescription>Most purchased products in the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProducts.map((product: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suppliers">
                <Card>
                  <CardHeader>
                    <CardTitle>Supplier Performance</CardTitle>
                    <CardDescription>Purchase analysis by supplier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier Name</TableHead>
                          <TableHead className="text-right">Total Orders</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.supplierInsights.map((supplier: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                            <TableCell className="text-right">{supplier.totalOrders}</TableCell>
                            <TableCell className="text-right">{formatCurrency(supplier.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Purchase Trends</CardTitle>
                    <CardDescription>Daily breakdown of purchase activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Purchases</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.dailyTrends.map((day: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-right">{day.purchases}</TableCell>
                            <TableCell className="text-right">{formatCurrency(day.amount)}</TableCell>
                            <TableCell className="text-right">{day.transactions}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}