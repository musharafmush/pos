
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  PercentIcon,
  ShoppingCartIcon,
  PackageIcon,
  BarChart3Icon,
  PieChartIcon,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Settings
} from "lucide-react";
import { useFormatCurrency } from "@/lib/currency";

export default function ProfitManagement() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [profitFilter, setProfitFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const formatCurrency = useFormatCurrency();

  // Fetch profit data
  const { data: profitData, isLoading: profitLoading, error, refetch } = useQuery({
    queryKey: ['/api/reports/profit-analysis', timeRange, profitFilter, categoryFilter],
    queryFn: async () => {
      console.log('🔍 Fetching profit data...');
      const response = await fetch(`/api/reports/profit-analysis?days=${timeRange}&filter=${profitFilter}&category=${categoryFilter}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('📊 Profit data received:', data);
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Calculate metrics
  const totalRevenue = profitData?.overview?.totalRevenue || 0;
  const totalCost = profitData?.overview?.totalCost || 0;
  const grossProfit = profitData?.overview?.grossProfit || 0;
  const netProfit = profitData?.overview?.netProfit || 0;
  const profitMargin = profitData?.overview?.profitMargin || 0;
  const growthRate = profitData?.overview?.growthRate || 0;

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (profitLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profit analysis...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Failed to load profit data</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Profit & Loss Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive profit analysis, loss tracking, and margin optimization
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <TrendingUpIcon className="w-3 h-3 mr-1" />
                +{growthRate.toFixed(1)}% Growth
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Real-time Data
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Total Revenue</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>+8.2% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Total Cost</CardTitle>
              <Calculator className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">{formatCurrency(totalCost)}</div>
              <div className="flex items-center text-xs text-red-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>+5.1% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Gross Profit</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{formatCurrency(grossProfit)}</div>
              <div className="flex items-center text-xs text-blue-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>+12.5% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Net Profit</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{formatCurrency(netProfit)}</div>
              <div className="flex items-center text-xs text-purple-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>+15.2% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Profit Margin</CardTitle>
              <PercentIcon className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800">{profitMargin.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-yellow-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>+2.3% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700">Growth Rate</CardTitle>
              <BarChart3Icon className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-800">+{growthRate.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-indigo-600 mt-1">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span>Quarterly growth</span>
              </div>
            </CardContent>
          </Card>

          {/* Loss Management Cards */}
          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Total Losses</CardTitle>
              <TrendingDownIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">{formatCurrency(totalCost * 0.15)}</div>
              <div className="flex items-center text-xs text-red-600 mt-1">
                <TrendingDownIcon className="h-3 w-3 mr-1" />
                <span>-2.1% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Loss Prevention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">₹{(totalCost * 0.08).toFixed(0)}</div>
              <div className="flex items-center text-xs text-orange-600 mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>Prevented this month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="timeRange" className="text-sm font-medium">Time Period</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="profitFilter" className="text-sm font-medium">Profit Filter</Label>
            <Select value={profitFilter} onValueChange={setProfitFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select profit filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="high">High Margin (&gt;25%)</SelectItem>
                <SelectItem value="medium">Medium Margin (15-25%)</SelectItem>
                <SelectItem value="low">Low Margin (&lt;15%)</SelectItem>
                <SelectItem value="negative">Loss Making</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="categoryFilter" className="text-sm font-medium">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="groceries">Groceries</SelectItem>
                <SelectItem value="beverages">Beverages</SelectItem>
                <SelectItem value="personal-care">Personal Care</SelectItem>
                <SelectItem value="household">Household</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => refetch()}
              disabled={profitLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${profitLoading ? 'animate-spin' : ''}`} />
              {profitLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Profit Trends</TabsTrigger>
            <TabsTrigger value="products">Product Analysis</TabsTrigger>
            <TabsTrigger value="categories">Category Performance</TabsTrigger>
            <TabsTrigger value="losses">Loss Management</TabsTrigger>
            <TabsTrigger value="prevention">Loss Prevention</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3Icon className="h-5 w-5 text-blue-600" />
                    Profit Trend Analysis
                  </CardTitle>
                  <CardDescription>Daily profit performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={profitData?.trends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), "MMM dd")}
                        />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value, name) => [formatCurrency(Number(value)), name]}
                          labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stackId="1"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.6}
                          name="Revenue"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cost" 
                          stackId="2"
                          stroke="#ef4444" 
                          fill="#ef4444" 
                          fillOpacity={0.6}
                          name="Cost"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          name="Profit"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Profit Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-purple-600" />
                    Profit by Category
                  </CardTitle>
                  <CardDescription>Profit distribution across product categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={profitData?.categoryProfits || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="profit"
                        >
                          {profitData?.categoryProfits?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Profit']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Top Performing Product</p>
                      <p className="text-lg font-bold text-green-800">Rice 1kg</p>
                      <p className="text-xs text-green-600">30.0% margin • {formatCurrency(4500)} profit</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Needs Attention</p>
                      <p className="text-lg font-bold text-yellow-800">3 Products</p>
                      <p className="text-xs text-yellow-600">Below 15% margin threshold</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Profit Opportunity</p>
                      <p className="text-lg font-bold text-blue-800">{formatCurrency(5200)}</p>
                      <p className="text-xs text-blue-600">Potential additional profit</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Analysis Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Profitability Analysis</CardTitle>
                    <CardDescription>Detailed profit breakdown for all products</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData?.productProfitability?.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <PackageIcon className="h-4 w-4 text-gray-400" />
                              <span>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{product.unitsSold}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(product.revenue)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(product.cost)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-600">
                            {formatCurrency(product.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${
                              product.margin >= 25 ? 'text-green-600' :
                              product.margin >= 15 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {product.margin.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {product.trend === 'up' && (
                                <TrendingUpIcon className="h-4 w-4 text-green-500" />
                              )}
                              {product.trend === 'down' && (
                                <TrendingDownIcon className="h-4 w-4 text-red-500" />
                              )}
                              {product.trend === 'stable' && (
                                <div className="w-4 h-0.5 bg-gray-400"></div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-3 w-3" />
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

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Profit Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Products Needing Attention
                  </CardTitle>
                  <CardDescription>Products with low profit margins that need optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profitData?.lowProfitProducts?.map((product: any) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <div className="font-medium text-gray-800">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            Margin: <span className="font-semibold text-red-600">{product.margin}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">{product.action}</div>
                          <Button size="sm" variant="outline">
                            Optimize
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Profit Optimization Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Optimization Recommendations
                  </CardTitle>
                  <CardDescription>AI-powered suggestions to improve profitability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-800">Price Optimization</h4>
                          <p className="text-sm text-blue-600 mt-1">
                            Increase prices for high-demand, low-margin products
                          </p>
                          <p className="text-xs text-blue-500 mt-2">
                            Potential impact: +{formatCurrency(2100)} monthly profit
                          </p>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Apply
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-green-800">Supplier Negotiation</h4>
                          <p className="text-sm text-green-600 mt-1">
                            Negotiate better rates for high-volume products
                          </p>
                          <p className="text-xs text-green-500 mt-2">
                            Potential impact: +{formatCurrency(1800)} monthly profit
                          </p>
                        </div>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Review
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-purple-800">Product Mix Optimization</h4>
                          <p className="text-sm text-purple-600 mt-1">
                            Focus on promoting high-margin products
                          </p>
                          <p className="text-xs text-purple-500 mt-2">
                            Potential impact: +{formatCurrency(1300)} monthly profit
                          </p>
                        </div>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Implement
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profit Goals and Targets */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Goals & Targets</CardTitle>
                <CardDescription>Set and track profit objectives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyTarget">Monthly Profit Target</Label>
                    <Input
                      id="monthlyTarget"
                      type="number"
                      placeholder="35000"
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marginTarget">Target Profit Margin (%)</Label>
                    <Input
                      id="marginTarget"
                      type="number"
                      placeholder="28.0"
                      className="text-right"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full">
                      <Target className="h-4 w-4 mr-2" />
                      Set Targets
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Current Progress</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Monthly Target</span>
                        <span>92.8%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '92.8%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Margin Target</span>
                        <span>87.1%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87.1%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Profit Trends</CardTitle>
                <CardDescription>Comprehensive profit analysis over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitData?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), "MMM dd")}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value, name) => [formatCurrency(Number(value)), name]}
                        labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Revenue"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Cost"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Profit"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Analysis</CardTitle>
                <CardDescription>Profit performance by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead className="text-right">% of Total Profit</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData?.categoryProfits?.map((category: any) => {
                        const totalProfit = profitData.categoryProfits.reduce((sum: number, cat: any) => sum + cat.profit, 0);
                        const profitPercentage = (category.profit / totalProfit) * 100;
                        
                        return (
                          <TableRow key={category.name}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(category.revenue)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(category.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${
                                category.margin >= 25 ? 'text-green-600' :
                                category.margin >= 15 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {category.margin.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {profitPercentage.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {category.margin >= 25 ? (
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Excellent</span>
                                  </div>
                                ) : category.margin >= 15 ? (
                                  <div className="flex items-center text-yellow-600">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Good</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-red-600">
                                    <TrendingDownIcon className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Needs Improvement</span>
                                  </div>
                                )}
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
          </TabsContent>

          {/* Loss Management Tab */}
          <TabsContent value="losses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDownIcon className="h-5 w-5 text-red-600" />
                    Loss Analysis Overview
                  </CardTitle>
                  <CardDescription>Comprehensive breakdown of losses and their impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-sm font-medium text-red-700">Product Losses</div>
                        <div className="text-2xl font-bold text-red-800">{formatCurrency(totalCost * 0.08)}</div>
                        <div className="text-xs text-red-600">Expired, damaged, stolen</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-sm font-medium text-orange-700">Operational Losses</div>
                        <div className="text-2xl font-bold text-orange-800">{formatCurrency(totalCost * 0.05)}</div>
                        <div className="text-xs text-orange-600">Overstocking, markdowns</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-sm font-medium text-yellow-700">Margin Losses</div>
                        <div className="text-2xl font-bold text-yellow-800">{formatCurrency(totalCost * 0.02)}</div>
                        <div className="text-xs text-yellow-600">Discount abuse, pricing errors</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm font-medium text-purple-700">Customer Losses</div>
                        <div className="text-2xl font-bold text-purple-800">{formatCurrency(totalCost * 0.03)}</div>
                        <div className="text-xs text-purple-600">Returns, refunds, disputes</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-red-600" />
                    Loss Distribution
                  </CardTitle>
                  <CardDescription>Visual breakdown of loss sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Product Losses', value: totalCost * 0.08, color: '#ef4444' },
                          { name: 'Operational Losses', value: totalCost * 0.05, color: '#f97316' },
                          { name: 'Margin Losses', value: totalCost * 0.02, color: '#eab308' },
                          { name: 'Customer Losses', value: totalCost * 0.03, color: '#8b5cf6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Product Losses', value: totalCost * 0.08, color: '#ef4444' },
                          { name: 'Operational Losses', value: totalCost * 0.05, color: '#f97316' },
                          { name: 'Margin Losses', value: totalCost * 0.02, color: '#eab308' },
                          { name: 'Customer Losses', value: totalCost * 0.03, color: '#8b5cf6' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  High-Risk Loss Categories
                </CardTitle>
                <CardDescription>Products and categories with highest loss potential</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product/Category</TableHead>
                        <TableHead className="text-right">Loss Amount</TableHead>
                        <TableHead className="text-right">Loss %</TableHead>
                        <TableHead className="text-right">Risk Level</TableHead>
                        <TableHead>Primary Cause</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Dairy Products</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(totalCost * 0.025)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-red-600">12.5%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">High</Badge>
                        </TableCell>
                        <TableCell>Expiration dates</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Monitor
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Fresh Produce</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(totalCost * 0.02)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-red-600">10.2%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">High</Badge>
                        </TableCell>
                        <TableCell>Spoilage, damage</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Monitor
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Electronics</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(totalCost * 0.015)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-orange-600">7.8%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">Medium</Badge>
                        </TableCell>
                        <TableCell>Theft, returns</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Monitor
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loss Prevention Tab */}
          <TabsContent value="prevention" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Prevention Measures
                  </CardTitle>
                  <CardDescription>Active loss prevention strategies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-800">Inventory Monitoring</div>
                        <div className="text-sm text-green-600">Real-time stock tracking</div>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="font-medium text-blue-800">Expiry Alerts</div>
                        <div className="text-sm text-blue-600">Automated expiry notifications</div>
                      </div>
                      <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium text-yellow-800">Price Validation</div>
                        <div className="text-sm text-yellow-600">Prevent pricing errors</div>
                      </div>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <div className="font-medium text-purple-800">Quality Checks</div>
                        <div className="text-sm text-purple-600">Regular product inspection</div>
                      </div>
                      <Badge variant="default" className="bg-purple-100 text-purple-800">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Prevention Metrics
                  </CardTitle>
                  <CardDescription>Loss prevention performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{formatCurrency(totalCost * 0.12)}</div>
                      <div className="text-sm text-gray-600">Total Losses Prevented</div>
                      <div className="text-xs text-green-600">This month</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Prevention Rate</span>
                        <span className="font-bold text-green-600">87.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Alert Response Time</span>
                        <span className="font-bold text-blue-600">2.3 hrs</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Prevention Accuracy</span>
                        <span className="font-bold text-purple-600">94.2%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Current Alerts
                  </CardTitle>
                  <CardDescription>Active loss prevention alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-red-800">Expiry Warning</div>
                          <div className="text-sm text-red-600">5 products expire in 2 days</div>
                        </div>
                        <Badge variant="destructive">High</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-orange-800">Low Stock Alert</div>
                          <div className="text-sm text-orange-600">12 products below threshold</div>
                        </div>
                        <Badge variant="secondary">Medium</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-yellow-800">Price Anomaly</div>
                          <div className="text-sm text-yellow-600">3 products with pricing issues</div>
                        </div>
                        <Badge variant="outline">Low</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="w-full" variant="outline">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      View All Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="h-5 w-5 text-blue-600" />
                  Loss Prevention Trends
                </CardTitle>
                <CardDescription>Historical loss prevention performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { month: 'Jan', losses: 8500, prevented: 12000 },
                      { month: 'Feb', losses: 7200, prevented: 13500 },
                      { month: 'Mar', losses: 6800, prevented: 14200 },
                      { month: 'Apr', losses: 5900, prevented: 15800 },
                      { month: 'May', losses: 4800, prevented: 16200 },
                      { month: 'Jun', losses: 4200, prevented: 17100 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="losses"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.6}
                        name="Losses"
                      />
                      <Area
                        type="monotone"
                        dataKey="prevented"
                        stackId="2"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.6}
                        name="Prevented Losses"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
