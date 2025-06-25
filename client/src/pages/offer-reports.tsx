import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Users, 
  ShoppingCart,
  Calendar,
  DollarSign,
  Percent,
  Target,
  Gift,
  X
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from "recharts";

export default function OfferReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch offers data
  const { data: offers, isLoading: offersLoading, refetch: refetchOffers } = useQuery({
    queryKey: ['/api/offers'],
    queryFn: async () => {
      const response = await fetch('/api/offers');
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json();
    }
  });

  // Fetch sales data for offer analytics
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales?include=items,customer');
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    }
  });

  // Process offers data
  const offersList = Array.isArray(offers) ? offers : [];
  
  // Filter offers based on search and filters
  const filteredOffers = offersList.filter((offer: any) => {
    const matchesSearch = !searchTerm || 
      offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || offer.type === filterType;
    const matchesStatus = filterStatus === "all" || offer.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate offer analytics
  const calculateOfferMetrics = () => {
    const activeOffers = offersList.filter((offer: any) => offer.status === 'active').length;
    const expiredOffers = offersList.filter((offer: any) => offer.status === 'expired').length;
    const totalOffers = offersList.length;
    
    // Calculate usage from sales data
    const offerUsage = salesData?.reduce((acc: any, sale: any) => {
      if (sale.discount && sale.discount > 0) {
        acc.totalUsed += 1;
        acc.totalSavings += parseFloat(sale.discount || 0);
      }
      return acc;
    }, { totalUsed: 0, totalSavings: 0 }) || { totalUsed: 0, totalSavings: 0 };

    return {
      totalOffers,
      activeOffers,
      expiredOffers,
      totalUsage: offerUsage.totalUsed,
      totalSavings: offerUsage.totalSavings,
      averageSavings: offerUsage.totalUsed > 0 ? offerUsage.totalSavings / offerUsage.totalUsed : 0
    };
  };

  const metrics = calculateOfferMetrics();

  // Generate chart data for offer performance
  const generateOfferPerformanceData = () => {
    const offerTypes = {};
    offersList.forEach((offer: any) => {
      const type = offer.type || 'other';
      if (!offerTypes[type]) {
        offerTypes[type] = { name: type, count: 0, active: 0 };
      }
      offerTypes[type].count += 1;
      if (offer.status === 'active') {
        offerTypes[type].active += 1;
      }
    });

    return Object.values(offerTypes);
  };

  // Generate usage trends data
  const generateUsageTrendsData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'MMM dd');
      
      // Count sales with discounts for this date
      const dayUsage = salesData?.filter((sale: any) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.toDateString() === date.toDateString() && sale.discount > 0;
      }).length || 0;

      last7Days.push({
        date: dateStr,
        usage: dayUsage,
        savings: salesData?.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate.toDateString() === date.toDateString() && sale.discount > 0;
        }).reduce((sum: number, sale: any) => sum + parseFloat(sale.discount || 0), 0) || 0
      });
    }
    return last7Days;
  };

  const performanceData = generateOfferPerformanceData();
  const usageTrendsData = generateUsageTrendsData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (offersLoading || salesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading offer reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Offer Reports</h1>
            <p className="text-gray-600">Comprehensive analytics and insights for your promotional offers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchOffers()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOffers}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-1">
                  {metrics.activeOffers} Active
                </Badge>
                {metrics.expiredOffers} Expired
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsage}</div>
              <p className="text-xs text-muted-foreground">
                Times offers were applied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalSavings)}</div>
              <p className="text-xs text-muted-foreground">
                Customer savings generated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.averageSavings)}</div>
              <p className="text-xs text-muted-foreground">
                Per transaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search offers by title, description, or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>

              {isFilterOpen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Offer Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="percentage">Percentage Discount</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="bogo">Buy One Get One</SelectItem>
                        <SelectItem value="quantity">Quantity Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 md:col-span-3 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("all");
                        setFilterStatus("all");
                        setDateRange("30");
                        setIsFilterOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="usage">Usage Trends</TabsTrigger>
            <TabsTrigger value="details">Offer Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Offer Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <RechartsPieChart data={performanceData}>
                        {performanceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </RechartsPieChart>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active vs Total Offers</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Total" />
                      <Bar dataKey="active" fill="#82ca9d" name="Active" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Offer Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.totalOffers}</div>
                    <div className="text-sm text-blue-800">Total Offers Created</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.activeOffers}</div>
                    <div className="text-sm text-green-800">Currently Active</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics.expiredOffers}</div>
                    <div className="text-sm text-red-800">Expired/Inactive</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={usageTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="usage" stroke="#8884d8" name="Usage Count" />
                    <Line yAxisId="right" type="monotone" dataKey="savings" stroke="#82ca9d" name="Savings (₹)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Offer Details ({filteredOffers.length} offers)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.map((offer: any) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">{offer.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{offer.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {offer.type === 'percentage' ? `${offer.value}%` : formatCurrency(offer.value)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
                            {offer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {offer.validUntil ? format(new Date(offer.validUntil), 'MMM dd, yyyy') : 'No expiry'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">0 times</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredOffers.length === 0 && (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No offers found matching your criteria</p>
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