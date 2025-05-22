import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Filter,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays } from "date-fns";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Form schema for forecasting parameters
const forecastingSchema = z.object({
  forecastDays: z.string().default("30"),
  analysisMethod: z.string().default("moving_average"),
  categoryFilter: z.string().default("all"),
  minStockLevel: z.string().default("10"),
});

type ForecastingFormValues = z.infer<typeof forecastingSchema>;

interface ForecastData {
  productId: number;
  productName: string;
  currentStock: number;
  averageDailyUsage: number;
  forecastedDemand: number;
  recommendedReorderPoint: number;
  recommendedOrderQuantity: number;
  daysUntilStockout: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastSaleDate: string;
  category: string;
  price: number;
}

export default function InventoryForecasting() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRisk, setSelectedRisk] = useState("all");

  // Initialize form
  const form = useForm<ForecastingFormValues>({
    resolver: zodResolver(forecastingSchema),
    defaultValues: {
      forecastDays: "30",
      analysisMethod: "moving_average",
      categoryFilter: "all",
      minStockLevel: "10",
    },
  });

  // Fetch forecast data
  const { data: forecastData = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/inventory/forecast", form.watch()],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          forecastDays: form.getValues("forecastDays"),
          analysisMethod: form.getValues("analysisMethod"),
          categoryFilter: form.getValues("categoryFilter"),
          minStockLevel: form.getValues("minStockLevel"),
        });
        
        const res = await fetch(`/api/inventory/forecast?${params}`);
        if (!res.ok) throw new Error("Failed to fetch forecast data");
        return await res.json();
      } catch (error) {
        console.error("Error fetching forecast data:", error);
        return [];
      }
    },
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        return await res.json();
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },
  });

  // Generate purchase order mutation
  const generatePOMutation = useMutation({
    mutationFn: async (selectedProducts: number[]) => {
      const res = await apiRequest("POST", "/api/inventory/generate-po", {
        productIds: selectedProducts,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Order Generated",
        description: "A new purchase order has been created based on forecasting recommendations.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error) => {
      toast({
        title: "Error generating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter forecast data
  const filteredData = forecastData.filter((item: ForecastData) => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesRisk = selectedRisk === "all" || item.riskLevel === selectedRisk;
    return matchesSearch && matchesCategory && matchesRisk;
  });

  // Calculate summary statistics
  const totalProducts = filteredData.length;
  const criticalItems = filteredData.filter((item: ForecastData) => item.riskLevel === 'critical').length;
  const highRiskItems = filteredData.filter((item: ForecastData) => item.riskLevel === 'high').length;
  const avgDaysUntilStockout = filteredData.reduce((sum: number, item: ForecastData) => sum + item.daysUntilStockout, 0) / totalProducts || 0;

  // Get risk level styling
  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-7xl pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Forecasting</h1>
            <p className="text-muted-foreground mt-2">
              Predict inventory needs and optimize stock levels using advanced analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Being analyzed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticalItems}</div>
              <p className="text-xs text-muted-foreground">Immediate attention needed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Items</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{highRiskItems}</div>
              <p className="text-xs text-muted-foreground">Need reordering soon</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Days to Stockout</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDaysUntilStockout.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Across all products</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">Forecast Analysis</TabsTrigger>
            <TabsTrigger value="settings">Forecasting Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast">
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filters & Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Forecast Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Forecast Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Based on historical sales data and current stock levels
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Analyzing inventory data...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Daily Usage</TableHead>
                          <TableHead>Days to Stockout</TableHead>
                          <TableHead>Reorder Point</TableHead>
                          <TableHead>Order Quantity</TableHead>
                          <TableHead>Trend</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead>Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item: ForecastData) => (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-sm text-muted-foreground">{item.category}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${item.currentStock <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.currentStock}
                              </span>
                            </TableCell>
                            <TableCell>{item.averageDailyUsage.toFixed(1)}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${item.daysUntilStockout <= 7 ? 'text-red-600' : item.daysUntilStockout <= 14 ? 'text-orange-600' : 'text-green-600'}`}>
                                {item.daysUntilStockout} days
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{item.recommendedReorderPoint}</TableCell>
                            <TableCell className="font-medium">{item.recommendedOrderQuantity}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getTrendIcon(item.trend)}
                                <span className="text-sm capitalize">{item.trend}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRiskBadgeVariant(item.riskLevel)}>
                                {item.riskLevel.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">₹{item.price.toFixed(0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Forecasting Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Adjust parameters to customize your inventory forecasting analysis
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="forecastDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forecast Period (Days)</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select forecast period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7">7 Days</SelectItem>
                                <SelectItem value="14">14 Days</SelectItem>
                                <SelectItem value="30">30 Days</SelectItem>
                                <SelectItem value="60">60 Days</SelectItem>
                                <SelectItem value="90">90 Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analysisMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Analysis Method</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select analysis method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="moving_average">Moving Average</SelectItem>
                                <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                                <SelectItem value="linear_regression">Linear Regression</SelectItem>
                                <SelectItem value="seasonal_analysis">Seasonal Analysis</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryFilter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Filter</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Stock Alert Level</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              placeholder="Enter minimum stock level"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => refetch()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Forecast
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}