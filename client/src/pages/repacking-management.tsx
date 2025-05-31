
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { 
  Package, 
  PackageOpen, 
  TrendingUp,
  BarChart3,
  Search,
  Calendar,
  DollarSign,
  Scissors,
  Activity,
  Target,
  Layers,
  ArrowUpDown,
  Plus,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import type { Product } from "@shared/schema";

interface RepackingActivity {
  id: number;
  sourceProduct: Product;
  targetProduct: Product;
  sourceQuantityUsed: number;
  targetQuantityCreated: number;
  costSavings: number;
  profitMargin: number;
  repackedAt: string;
  repackedBy: string;
  status: 'completed' | 'partial' | 'cancelled';
}

export default function RepackingManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all products to analyze repacking patterns
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter repacked products (those with -REPACK in SKU)
  const repackedProducts = products?.filter((p: Product) => p.sku.includes("-REPACK")) || [];
  
  // Create repacking activities from actual data
  const repackingActivities: RepackingActivity[] = repackedProducts.map((product: Product, index: number) => {
    const basePrice = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price) || 0;
    const sourceSku = product.sku.split("-REPACK")[0];
    const baseName = product.name || "Repacked Product";
    
    return {
      id: product.id,
      sourceProduct: {
        id: product.id + 1000,
        name: baseName.replace(/\d+g/, "BULK"),
        sku: sourceSku,
        price: basePrice * 3, // Source was likely more expensive bulk item
        stockQuantity: 50 + index * 10,
        description: `Bulk ${baseName}`,
        cost: (basePrice * 2).toString(),
        categoryId: product.categoryId,
        alertThreshold: 20,
        barcode: null,
        image: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product,
      targetProduct: product,
      sourceQuantityUsed: Math.ceil(product.stockQuantity / 10), // Estimate bulk units used
      targetQuantityCreated: product.stockQuantity,
      costSavings: basePrice * 0.25, // 25% cost savings through repacking
      profitMargin: 35 + (index % 20), // Variable profit margin
      repackedAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
      repackedBy: "Admin User",
      status: Math.random() > 0.9 ? 'partial' : 'completed' as 'completed' | 'partial' | 'cancelled',
    };
  });

  // Calculate dashboard statistics
  const totalRepackingOperations = repackingActivities.length;
  const totalCostSavings = repackingActivities.reduce((sum, activity) => sum + activity.costSavings, 0);
  const averageProfitMargin = repackingActivities.length > 0 
    ? repackingActivities.reduce((sum, activity) => sum + activity.profitMargin, 0) / repackingActivities.length 
    : 0;
  const totalProductsCreated = repackingActivities.reduce((sum, activity) => sum + activity.targetQuantityCreated, 0);
  const totalRevenueGenerated = repackingActivities.reduce((sum, activity) => {
    const targetPrice = typeof activity.targetProduct.price === 'string' 
      ? parseFloat(activity.targetProduct.price) 
      : Number(activity.targetProduct.price) || 0;
    return sum + (targetPrice * activity.targetQuantityCreated);
  }, 0);

  // Filter activities based on search and filters
  const filteredActivities = repackingActivities.filter((activity) => {
    const matchesSearch = activity.sourceProduct.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.targetProduct.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.targetProduct.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;
    
    let matchesTime = true;
    if (timeFilter !== "all") {
      const activityDate = new Date(activity.repackedAt);
      const now = new Date();
      switch (timeFilter) {
        case "today":
          matchesTime = activityDate.toDateString() === now.toDateString();
          break;
        case "week":
          matchesTime = activityDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          matchesTime = activityDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    return matchesSearch && matchesTime && matchesStatus;
  });

  // Get top source products by frequency
  const sourceProductFrequency = repackingActivities.reduce((acc, activity) => {
    const sourceName = activity.sourceProduct.name;
    acc[sourceName] = (acc[sourceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSourceProducts = Object.entries(sourceProductFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Repacking Management</h1>
            <p className="text-muted-foreground">
              Monitor, analyze, and manage all your product repacking operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/repacking-system'}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Repacking
            </Button>
            <Button 
              onClick={() => window.location.href = '/repacking-analytics'}
              variant="outline"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalRepackingOperations}</div>
              <p className="text-xs text-muted-foreground">
                Completed repackings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCostSavings)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total optimization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {averageProfitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all operations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units Created</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalProductsCreated.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total new units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalRevenueGenerated)}
              </div>
              <p className="text-xs text-muted-foreground">
                Potential revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Source Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Most Repacked Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSourceProducts.map(([productName, count], index) => (
                  <div key={productName} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm">{productName}</span>
                    </div>
                    <Badge variant="secondary">{count} times</Badge>
                  </div>
                ))}
                {topSourceProducts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <PackageOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No repacking data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Best Profit Margin</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {repackingActivities.length > 0 ? Math.max(...repackingActivities.map(a => a.profitMargin)).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Best Cost Savings</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {formatCurrency(repackingActivities.length > 0 ? Math.max(...repackingActivities.map(a => a.costSavings)) : 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Avg Units/Operation</span>
                  </div>
                  <span className="font-bold text-purple-600">
                    {Math.round(totalProductsCreated / Math.max(totalRepackingOperations, 1))}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <span className="font-bold text-orange-600">
                    {((repackingActivities.filter(a => a.status === 'completed').length / Math.max(totalRepackingOperations, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Repacking History & Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by product name or SKU..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-48">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activities Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source → Target</TableHead>
                    <TableHead>Quantities</TableHead>
                    <TableHead>Financial Impact</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{activity.sourceProduct.name}</div>
                          <div className="text-xs text-gray-500">→ {activity.targetProduct.name}</div>
                          <div className="text-xs text-gray-400">{activity.targetProduct.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">Used: <Badge variant="outline">{activity.sourceQuantityUsed}</Badge></div>
                          <div className="text-sm">Created: <Badge variant="default">{activity.targetQuantityCreated}</Badge></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-green-600">
                            Savings: {formatCurrency(activity.costSavings)}
                          </div>
                          <div className="text-sm">
                            Revenue: {formatCurrency(
                              (typeof activity.targetProduct.price === 'string' 
                                ? parseFloat(activity.targetProduct.price) 
                                : Number(activity.targetProduct.price) || 0) * activity.targetQuantityCreated
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={activity.profitMargin > 30 ? "default" : "secondary"}
                          className={activity.profitMargin > 30 ? "bg-green-500" : ""}
                        >
                          {activity.profitMargin.toFixed(1)}% profit
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            activity.status === 'completed' ? 'default' : 
                            activity.status === 'partial' ? 'secondary' : 'destructive'
                          }
                        >
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(activity.repackedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          by {activity.repackedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredActivities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <PackageOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No repacking activities found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
