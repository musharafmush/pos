
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PackageIcon,
  TrendingUpIcon,
  BarChart3Icon,
  PlusIcon,
  SettingsIcon,
  ArrowRightIcon,
  ScaleIcon,
  DollarSignIcon,
  ClockIcon,
  CheckCircleIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useLocation } from "wouter";
import type { Product } from "@shared/schema";

export default function RepackingMainDashboard() {
  const [, setLocation] = useLocation();

  // Fetch all products to analyze repacking data
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Analyze repacking data
  const repackedProducts = products.filter((product: Product) => 
    product.sku.includes("REPACK")
  );
  
  const bulkProducts = products.filter((product: Product) => 
    !product.sku.includes("REPACK") && product.stockQuantity > 0 && product.active
  );

  // Calculate key metrics
  const totalRepackedValue = repackedProducts.reduce((sum: number, product: Product) => 
    sum + (parseFloat(product.price) * product.stockQuantity), 0
  );
  
  const totalBulkValue = bulkProducts.reduce((sum: number, product: Product) => 
    sum + (parseFloat(product.price) * product.stockQuantity), 0
  );

  const recentRepackedProducts = repackedProducts
    .sort((a: Product, b: Product) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 5);

  const handleStartProfessionalRepacking = () => {
    setLocation("/products/repacking-professional");
  };

  const handleViewAnalytics = () => {
    setLocation("/products/repacking-dashboard-professional");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
            <p className="mt-2 text-gray-500">Loading repacking dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <PackageIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Professional Repacking System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform bulk products into smaller retail units with intelligent inventory management, 
            cost optimization, and comprehensive business analytics.
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bulk Products Available</p>
                  <p className="text-3xl font-bold text-blue-600">{bulkProducts.length}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUpIcon className="w-3 h-3 mr-1" />
                    Ready for repacking
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ScaleIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Repacked Products</p>
                  <p className="text-3xl font-bold text-green-600">{repackedProducts.length}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Successfully created
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bulk Inventory Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalBulkValue)}</p>
                  <p className="text-xs text-purple-600 flex items-center mt-1">
                    <DollarSignIcon className="w-3 h-3 mr-1" />
                    Available for repack
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Repacked Value</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalRepackedValue)}</p>
                  <p className="text-xs text-orange-600 flex items-center mt-1">
                    <BarChart3Icon className="w-3 h-3 mr-1" />
                    Total created value
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3Icon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Professional Repacking Entry */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-5 h-5 text-blue-600" />
                </div>
                Professional Repacking Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Create new repacked products from bulk inventory with intelligent cost calculation, 
                stock management, and profit optimization.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Real-time bulk product search and selection
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Configurable unit weights and pricing
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Automatic inventory stock updates
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Unique SKU generation for repacked items
                </div>
              </div>

              <Button 
                onClick={handleStartProfessionalRepacking}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Start Professional Repacking
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Analytics & Monitoring */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3Icon className="w-5 h-5 text-green-600" />
                </div>
                Analytics & Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Monitor repacking performance, analyze cost savings, track inventory levels, 
                and view comprehensive business intelligence reports.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Real-time inventory tracking and analysis
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Cost savings and profit margin insights
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Repacking activity history and trends
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  Performance monitoring and optimization
                </div>
              </div>

              <Button 
                onClick={handleViewAnalytics}
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
                size="lg"
              >
                <BarChart3Icon className="w-4 h-4 mr-2" />
                View Analytics Dashboard
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Repacking Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                Recent Repacking Activity
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleViewAnalytics}>
                View All Activity
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentRepackedProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Unit Weight</TableHead>
                    <TableHead>Stock Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRepackedProducts.map((product: Product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {product.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ScaleIcon className="h-4 w-4 text-gray-400" />
                          <span>{product.weight}{product.weightUnit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          product.stockQuantity <= product.alertThreshold 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {product.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(parseFloat(product.price))}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(parseFloat(product.price) * product.stockQuantity)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <PackageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Repacking Activity Yet</h3>
                <p className="text-gray-500 mb-6">
                  Start your first professional repacking operation to see activity here.
                </p>
                <Button onClick={handleStartProfessionalRepacking} className="bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Your First Repack
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status Footer */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">System Status: Operational</h3>
                  <p className="text-sm text-green-700">
                    Professional repacking system is running smoothly and ready for production use.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-800">
                  {bulkProducts.length} bulk products ready for repacking
                </p>
                <p className="text-xs text-green-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
