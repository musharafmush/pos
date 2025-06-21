import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Calendar,
  Search,
  Download,
  Filter,
  Star,
  UserCheck,
  Activity
} from "lucide-react";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import DashboardLayout from "@/components/layout/dashboard-layout";

interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  avgOrderValue: number;
  totalRevenue: number;
  repeatCustomerRate: number;
}

interface TopCustomer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  avgOrderValue: number;
  status: 'active' | 'inactive';
}

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgSpent: number;
  description: string;
}

interface CustomerTransaction {
  id: number;
  customerName: string;
  orderNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: string;
  itemsCount: number;
}

interface CustomerGrowth {
  month: string;
  newCustomers: number;
  returningCustomers: number;
  totalRevenue: number;
}

interface CustomerReportData {
  customerSummary: CustomerSummary;
  topCustomers: TopCustomer[];
  customerSegments: CustomerSegment[];
  recentTransactions: CustomerTransaction[];
  customerGrowth: CustomerGrowth[];
}

export default function CustomerReports() {
  const [dateRange, setDateRange] = useState("30days");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("all");

  const { data: reportData, isLoading, error } = useQuery<CustomerReportData>({
    queryKey: ["/api/reports/customers", dateRange],
    enabled: true
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading customer reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <p>Error loading customer reports</p>
            <p className="text-sm mt-1">Please try again later</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reportData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-600">
            <p>No customer data available</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { customerSummary, topCustomers, customerSegments, recentTransactions, customerGrowth } = reportData;

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "90days":
        return "Last 3 Months";
      case "1year":
        return "Last Year";
      default:
        return "Last 30 Days";
    }
  };

  const getCustomerStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const filteredCustomers = topCustomers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Reports</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive customer analytics and insights for {getDateRangeLabel(dateRange)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 3 Months</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {customerSummary?.totalCustomers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {customerSummary?.activeCustomers || 0}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New This Month</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {customerSummary?.newCustomersThisMonth || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    ₹{customerSummary?.avgOrderValue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{customerSummary?.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Repeat Rate</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {customerSummary?.repeatCustomerRate?.toFixed(1) || '0.0'}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers">Top Customers</TabsTrigger>
            <TabsTrigger value="segments">Customer Segments</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="growth">Growth Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>
                      Your most valuable customers ranked by total spending
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Avg Order</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer, index) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                {customer.email && (
                                  <p className="text-sm text-gray-500">{customer.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{customer.totalOrders}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">₹{customer.totalSpent.toFixed(2)}</TableCell>
                          <TableCell>₹{customer.avgOrderValue.toFixed(2)}</TableCell>
                          <TableCell>
                            {format(new Date(customer.lastOrderDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getCustomerStatusColor(customer.status)}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>
                  Customer classification based on purchase behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {customerSegments?.map((segment) => (
                    <Card key={segment.segment}>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <h3 className="font-semibold text-lg">{segment.segment}</h3>
                          <p className="text-3xl font-bold text-blue-600 mt-2">{segment.count}</p>
                          <p className="text-sm text-gray-500 mt-1">{segment.percentage}% of customers</p>
                          <p className="text-sm font-medium mt-2">Avg: ₹{segment.avgSpent.toFixed(2)}</p>
                          <p className="text-xs text-gray-400 mt-1">{segment.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="col-span-4 text-center py-8 text-gray-500">
                      No segment data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Customer Transactions</CardTitle>
                <CardDescription>
                  Latest customer purchase activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No recent transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTransactions?.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.customerName}</TableCell>
                          <TableCell>{transaction.orderNumber}</TableCell>
                          <TableCell>
                            {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">₹{transaction.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{transaction.itemsCount} items</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                transaction.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) || []
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth Analysis</CardTitle>
                <CardDescription>
                  Monthly customer acquisition and retention trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>New Customers</TableHead>
                      <TableHead>Returning Customers</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Growth Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerGrowth?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No growth data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerGrowth?.map((growth, index) => {
                        const prevMonth = customerGrowth[index + 1];
                        const growthRate = prevMonth 
                          ? ((growth.newCustomers - prevMonth.newCustomers) / prevMonth.newCustomers * 100)
                          : 0;
                        
                        return (
                          <TableRow key={growth.month}>
                            <TableCell className="font-medium">{growth.month}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {growth.newCustomers}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {growth.returningCustomers}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">₹{growth.totalRevenue.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                {growthRate > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
                                )}
                                <span className={growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {Math.abs(growthRate).toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) || []
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}