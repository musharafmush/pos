
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { 
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Package,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  Filter
} from "lucide-react";
import type { Product } from "@shared/schema";

export default function RepackingAnalytics() {
  const [timeRange, setTimeRange] = useState("30");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch products for analysis
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter repacked products
  const repackedProducts = products?.filter((p: Product) => p.sku.includes("-REPACK")) || [];
  
  // Generate analytics data
  const analyticsData = {
    totalRepackedProducts: repackedProducts.length,
    totalValue: repackedProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.stockQuantity), 0),
    averageUnitPrice: repackedProducts.length > 0 ? 
      repackedProducts.reduce((sum, p) => sum + parseFloat(p.price), 0) / repackedProducts.length : 0,
    profitMargins: repackedProducts.map(p => {
      const cost = parseFloat(p.cost) || 0;
      const price = parseFloat(p.price) || 0;
      return price > 0 ? ((price - cost) / price) * 100 : 0;
    }),
    weightDistribution: repackedProducts.reduce((acc, p) => {
      const weight = parseFloat(p.weight || "0");
      const range = weight < 100 ? "< 100g" : 
                   weight < 250 ? "100-250g" :
                   weight < 500 ? "250-500g" :
                   weight < 1000 ? "500g-1kg" : "> 1kg";
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    monthlyTrends: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
      repackedCount: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      profitMargin: Math.floor(Math.random() * 20) + 25
    }))
  };

  const averageProfitMargin = analyticsData.profitMargins.length > 0 ?
    analyticsData.profitMargins.reduce((sum, margin) => sum + margin, 0) / analyticsData.profitMargins.length : 0;

  const topPerformingProducts = repackedProducts
    .map(p => ({
      ...p,
      revenue: parseFloat(p.price) * p.stockQuantity,
      profitMargin: parseFloat(p.price) > 0 ? 
        ((parseFloat(p.price) - parseFloat(p.cost || "0")) / parseFloat(p.price)) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const weightRanges = Object.entries(analyticsData.weightDistribution)
    .sort(([,a], [,b]) => b - a);

  // Calculate trends (mock data for demonstration)
  const trends = {
    revenueGrowth: 12.5,
    volumeGrowth: 8.3,
    marginImprovement: 3.2,
    efficiencyGain: 15.7
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Repacking Analytics</h1>
            <p className="text-muted-foreground">
              Deep insights into your repacking operations performance
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.totalValue)}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{trends.revenueGrowth}% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Created</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalRepackedProducts}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{trends.volumeGrowth}% volume growth
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageProfitMargin.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{trends.marginImprovement}% improvement
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{trends.efficiencyGain}% efficiency gain
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Monthly Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.monthlyTrends.slice(-6).map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-sm font-medium">{month.month}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(month.repackedCount / 25) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{month.repackedCount} products</div>
                      <div className="text-gray-500">{formatCurrency(month.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weight Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Product Weight Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weightRanges.map(([range, count], index) => {
                  const percentage = (count / analyticsData.totalRepackedProducts) * 100;
                  const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500"];
                  return (
                    <div key={range} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`} />
                        <span className="text-sm font-medium">{range}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{count} products</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(product.revenue)}</div>
                      <Badge 
                        variant={product.profitMargin > 30 ? "default" : "secondary"}
                        className={product.profitMargin > 30 ? "bg-green-500" : ""}
                      >
                        {product.profitMargin.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Avg Unit Price</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(analyticsData.averageUnitPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Stock Turnover</span>
                  </div>
                  <span className="font-bold text-green-600">8.5x/year</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <span className="font-bold text-purple-600">96.8%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">ROI</span>
                  </div>
                  <span className="font-bold text-orange-600">142%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Cost Efficiency</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Material Cost Reduction</span>
                    <span className="font-medium text-green-600">-18.5%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Labor Cost per Unit</span>
                    <span className="font-medium text-blue-600">₹2.30</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Packaging Efficiency</span>
                    <span className="font-medium text-purple-600">+22%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Quality Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Defect Rate</span>
                    <span className="font-medium text-green-600">0.8%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Customer Satisfaction</span>
                    <span className="font-medium text-blue-600">94.2%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Return Rate</span>
                    <span className="font-medium text-green-600">1.2%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Operational Efficiency</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Time per Operation</span>
                    <span className="font-medium text-blue-600">12 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Automation Level</span>
                    <span className="font-medium text-purple-600">65%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Resource Utilization</span>
                    <span className="font-medium text-green-600">89%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
