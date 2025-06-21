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
import { Receipt, FileText, Calculator, TrendingUp, Search, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface TaxSummary {
  totalSales: number;
  totalTaxCollected: number;
  cgstCollected: number;
  sgstCollected: number;
  igstCollected: number;
  cessCollected: number;
  totalPurchases: number;
  totalTaxPaid: number;
  netTaxLiability: number;
  taxableTransactions: number;
  exemptTransactions: number;
}

interface TaxBreakdown {
  taxRate: string;
  salesCount: number;
  salesAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTaxAmount: number;
}

interface HSNSummary {
  hsnCode: string;
  description: string;
  quantity: number;
  value: number;
  taxableValue: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
}

interface TaxTransaction {
  id: number;
  type: 'sale' | 'purchase';
  transactionNumber: string;
  date: string;
  customerSupplier: string;
  totalAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  status: string;
}

interface ComplianceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  description: string;
  actionRequired: boolean;
}

interface TaxReportData {
  taxSummary: TaxSummary;
  taxBreakdown: TaxBreakdown[];
  hsnSummary: HSNSummary[];
  recentTransactions: TaxTransaction[];
  complianceAlerts: ComplianceAlert[];
  monthlyTrends: Array<{
    month: string;
    salesTax: number;
    purchaseTax: number;
    netTax: number;
  }>;
}

export default function TaxReports() {
  const [dateRange, setDateRange] = useState('30days');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: reportData, isLoading } = useQuery<TaxReportData>({
    queryKey: ['/api/reports/tax', dateRange],
    enabled: true,
  });

  const getComplianceColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'filed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading tax reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    taxSummary,
    taxBreakdown,
    hsnSummary,
    recentTransactions,
    complianceAlerts,
    monthlyTrends
  } = reportData || {
    taxSummary: {
      totalSales: 0,
      totalTaxCollected: 0,
      cgstCollected: 0,
      sgstCollected: 0,
      igstCollected: 0,
      cessCollected: 0,
      totalPurchases: 0,
      totalTaxPaid: 0,
      netTaxLiability: 0,
      taxableTransactions: 0,
      exemptTransactions: 0
    },
    taxBreakdown: [],
    hsnSummary: [],
    recentTransactions: [],
    complianceAlerts: [],
    monthlyTrends: []
  };

  const filteredTransactions = recentTransactions?.filter(transaction => {
    const matchesSearch = transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.customerSupplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Reports & GST Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive tax reporting for GST compliance and analytics for Last {dateRange === '30days' ? '30 Days' : dateRange === '90days' ? '90 Days' : 'Year'}
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
              Export GST Returns
            </Button>
          </div>
        </div>

        {/* Compliance Alerts */}
        {complianceAlerts && complianceAlerts.length > 0 && (
          <div className="space-y-2">
            {complianceAlerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-lg border ${alert.type === 'error' ? 'border-red-200 bg-red-50' : alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
                <div className="flex items-start space-x-3">
                  {alert.type === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  ) : alert.type === 'warning' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  </div>
                  {alert.actionRequired && (
                    <Badge variant="outline" className="text-xs">Action Required</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Receipt className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.totalSales || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Tax Collected</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.totalTaxCollected || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">CGST</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.cgstCollected || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">SGST</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.sgstCollected || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">IGST</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.igstCollected || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Net Tax Liability</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">₹{Number(taxSummary?.netTaxLiability || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList>
            <TabsTrigger value="breakdown">Tax Breakdown</TabsTrigger>
            <TabsTrigger value="hsn">HSN Summary</TabsTrigger>
            <TabsTrigger value="transactions">Tax Transactions</TabsTrigger>
            <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Rate Breakdown</CardTitle>
                <CardDescription>
                  Analysis of sales by GST tax rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>Sales Count</TableHead>
                      <TableHead>Sales Amount</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxBreakdown?.length > 0 ? (
                      taxBreakdown.map((breakdown, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{breakdown.taxRate}%</TableCell>
                          <TableCell>{breakdown.salesCount}</TableCell>
                          <TableCell>₹{Number(breakdown.salesAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(breakdown.cgstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(breakdown.sgstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(breakdown.igstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">₹{Number(breakdown.totalTaxAmount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No tax breakdown data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hsn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>HSN Code Summary</CardTitle>
                <CardDescription>
                  HSN/SAC wise summary for GST returns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Taxable Value</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnSummary?.length > 0 ? (
                      hsnSummary.map((hsn, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{hsn.hsnCode}</TableCell>
                          <TableCell>{hsn.description}</TableCell>
                          <TableCell>{hsn.quantity}</TableCell>
                          <TableCell>₹{Number(hsn.taxableValue || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(hsn.cgstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(hsn.sgstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(hsn.igstAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">₹{Number(hsn.totalTaxAmount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No HSN data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Transactions</CardTitle>
                <CardDescription>
                  Recent sales and purchase transactions with tax details
                </CardDescription>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sale">Sales</SelectItem>
                      <SelectItem value="purchase">Purchases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer/Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>Total Tax</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions?.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge variant="outline" className={transaction.type === 'sale' ? 'text-green-600' : 'text-blue-600'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                          <TableCell>
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{transaction.customerSupplier}</TableCell>
                          <TableCell>₹{Number(transaction.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(transaction.cgst || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(transaction.sgst || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(transaction.igst || 0).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">₹{Number(transaction.totalTax || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No transactions found
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
                <CardTitle>Monthly Tax Trends</CardTitle>
                <CardDescription>
                  Monthly analysis of tax collection and liability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyTrends?.length > 0 ? (
                    monthlyTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calculator className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{trend.month}</h3>
                            <p className="text-sm text-gray-500">Monthly Summary</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-gray-500">Sales Tax: ₹{Number(trend.salesTax || 0).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">Purchase Tax: ₹{Number(trend.purchaseTax || 0).toFixed(2)}</p>
                          <p className="font-semibold">Net: ₹{Number(trend.netTax || 0).toFixed(2)}</p>
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