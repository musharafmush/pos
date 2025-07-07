import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Package, DollarSign, Users, ShoppingCart, Search, Download } from 'lucide-react';

interface SupplierSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPurchaseValue: number;
  avgPurchaseValue: number;
  totalPurchases: number;
  topSupplierSpending: number;
}

interface TopSupplier {
  id: number;
  name: string;
  contact: string;
  email?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate: string;
  avgPurchaseValue: number;
  status: 'active' | 'inactive';
  performance: number;
}

interface SupplierCategory {
  category: string;
  count: number;
  percentage: number;
  totalSpent: number;
  description: string;
}

interface SupplierTransaction {
  id: number;
  supplierName: string;
  purchaseNumber: string;
  date: string;
  amount: number;
  paymentStatus: string;
  itemsCount: number;
}

interface SupplierTrend {
  month: string;
  totalPurchases: number;
  totalAmount: number;
  supplierCount: number;
}

interface SupplierReportData {
  supplierSummary: SupplierSummary;
  topSuppliers: TopSupplier[];
  supplierCategories: SupplierCategory[];
  recentTransactions: SupplierTransaction[];
  supplierTrends: SupplierTrend[];
}

export default function SupplierReports() {
  const [dateRange, setDateRange] = useState('30days');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reportData, isLoading } = useQuery<SupplierReportData>({
    queryKey: ['/api/reports/suppliers', dateRange],
    enabled: true,
  });

  const getSupplierStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return 'text-green-600';
    if (performance >= 75) return 'text-blue-600';
    if (performance >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading supplier reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    supplierSummary,
    topSuppliers,
    supplierCategories,
    recentTransactions,
    supplierTrends
  } = reportData || {
    supplierSummary: {
      totalSuppliers: 0,
      activeSuppliers: 0,
      totalPurchaseValue: 0,
      avgPurchaseValue: 0,
      totalPurchases: 0,
      topSupplierSpending: 0
    },
    topSuppliers: [],
    supplierCategories: [],
    recentTransactions: [],
    supplierTrends: []
  };

  const filteredSuppliers = topSuppliers?.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive supplier analytics and insights for Last {dateRange === '30days' ? '30 Days' : dateRange === '90days' ? '90 Days' : 'Year'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Suppliers</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{supplierSummary?.totalSuppliers || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Suppliers</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{supplierSummary?.activeSuppliers || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{supplierSummary?.totalPurchases || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Purchase Value</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(supplierSummary?.totalPurchaseValue || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Purchase Value</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(supplierSummary?.avgPurchaseValue || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Top Supplier Value</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(supplierSummary?.topSupplierSpending || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">Top Suppliers</TabsTrigger>
            <TabsTrigger value="categories">Supplier Categories</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="trends">Purchase Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers</CardTitle>
                <CardDescription>
                  Your most valuable suppliers ranked by total spending
                </CardDescription>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Purchases</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Avg Order</TableHead>
                      <TableHead>Last Purchase</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers?.length > 0 ? (
                      filteredSuppliers.map((supplier, index) => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{supplier.name}</p>
                                {supplier.email && (
                                  <p className="text-sm text-gray-500">{supplier.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{supplier.contact}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{supplier.totalPurchases}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">₹{Number(supplier.totalSpent || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(supplier.avgPurchaseValue || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {supplier.lastPurchaseDate ? 
                              format(new Date(supplier.lastPurchaseDate), 'MMM dd, yyyy') : 
                              'No purchases'
                            }
                          </TableCell>
                          <TableCell>
                            <span className={getPerformanceColor(supplier.performance || 0)}>
                              {supplier.performance || 0}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSupplierStatusColor(supplier.status)}>
                              {supplier.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No suppliers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Categories</CardTitle>
                <CardDescription>
                  Supplier classification based on purchase behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {supplierCategories?.map((category) => (
                    <Card key={category.category}>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h3 className="font-semibold text-lg">{category.category}</h3>
                          <p className="text-3xl font-bold text-purple-600 mt-2">{category.count}</p>
                          <p className="text-sm text-gray-500 mt-1">{category.percentage}% of suppliers</p>
                          <p className="text-sm font-medium mt-2">Total: ₹{Number(category.totalSpent || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-400 mt-1">{category.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="col-span-4 text-center py-8 text-gray-500">
                      No supplier categories available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Purchase Transactions</CardTitle>
                <CardDescription>
                  Latest purchase orders and transactions with suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions?.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.supplierName}</TableCell>
                          <TableCell>{transaction.purchaseNumber}</TableCell>
                          <TableCell>
                            {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">₹{Number(transaction.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.paymentStatus}</Badge>
                          </TableCell>
                          <TableCell>{transaction.itemsCount} items</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No recent transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Trends Analysis</CardTitle>
                <CardDescription>
                  Monthly purchase trends and supplier growth analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supplierTrends?.length > 0 ? (
                    supplierTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{trend.month}</h3>
                            <p className="text-sm text-gray-500">{trend.supplierCount} active suppliers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{Number(trend.totalAmount || 0).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">{trend.totalPurchases} purchases</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No trend data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}