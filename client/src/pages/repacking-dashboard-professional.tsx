import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PackageIcon,
  TrendingUpIcon,
  BarChart3Icon,
  Search,
  Filter,
  Calendar,
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrendingDownIcon,
  ScaleIcon,
  DollarSignIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@shared/schema";

export default function RepackingDashboardProfessional() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Fetch all products to identify repacked items
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter repacked products (those with "REPACK" in SKU)
  const repackedProducts = products.filter((product: Product) => 
    product.sku.includes("REPACK")
  );

  // Filter bulk products (those without "REPACK" in SKU)
  const bulkProducts = products.filter((product: Product) => 
    !product.sku.includes("REPACK")
  );

  // Calculate statistics
  const totalRepackedItems = repackedProducts.length;
  const totalBulkItems = bulkProducts.length;
  const totalRepackedValue = repackedProducts.reduce((sum: number, product: Product) => 
    sum + (parseFloat(product.price) * product.stockQuantity), 0
  );
  const averageRepackValue = totalRepackedItems > 0 ? totalRepackedValue / totalRepackedItems : 0;

  // Filter repacked products based on search and filters
  const filteredRepackedProducts = repackedProducts.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && product.active) ||
                         (statusFilter === "inactive" && !product.active);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
            <p className="mt-2 text-gray-500">Loading repacking data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professional Repacking Dashboard</h1>
            <p className="text-gray-500">Monitor and analyze your repacking operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <BarChart3Icon className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Repack Entry
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Repacked Items</p>
                  <p className="text-3xl font-bold text-blue-600">{totalRepackedItems}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUpIcon className="w-3 h-3 mr-1" />
                    Active products
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bulk Products</p>
                  <p className="text-3xl font-bold text-orange-600">{totalBulkItems}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <ScaleIcon className="w-3 h-3 mr-1" />
                    Available for repack
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ScaleIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Repack Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRepackedValue)}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <DollarSignIcon className="w-3 h-3 mr-1" />
                    Current inventory
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Repack Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(averageRepackValue)}</p>
                  <p className="text-xs text-purple-600 flex items-center mt-1">
                    <BarChart3Icon className="w-3 h-3 mr-1" />
                    Per item
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3Icon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="repacked-items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repacked-items">Repacked Items</TabsTrigger>
            <TabsTrigger value="bulk-products">Bulk Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Repacked Items Tab */}
          <TabsContent value="repacked-items" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Repacked Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search repacked items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Repacked Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Repacked Products ({filteredRepackedProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Stock Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepackedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-500">No repacked items found</p>
                          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRepackedProducts.map((product: Product) => (
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <EyeIcon className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <EditIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Products Tab */}
          <TabsContent value="bulk-products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Bulk Products ({bulkProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Repack Potential</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkProducts.map((product: Product) => (
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
                          <span className={`font-medium ${
                            product.stockQuantity <= product.alertThreshold 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {product.stockQuantity} {product.weightUnit || 'units'}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.cost))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.price))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(product.mrp))}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {product.stockQuantity > 5 ? (
                              <Badge className="bg-green-100 text-green-700">High</Badge>
                            ) : product.stockQuantity > 1 ? (
                              <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">Low</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <PackageIcon className="h-4 w-4 mr-1" />
                            Repack
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Repacking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Total Bulk Products:</span>
                      <span className="font-semibold">{totalBulkItems}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Total Repacked Items:</span>
                      <span className="font-semibold">{totalRepackedItems}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Repack Conversion Rate:</span>
                      <span className="font-semibold">
                        {totalBulkItems > 0 ? ((totalRepackedItems / totalBulkItems) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Average Value per Repack:</span>
                      <span className="font-semibold">{formatCurrency(averageRepackValue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repackedProducts.slice(0, 5).map((product: Product) => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <PackageIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Stock: {product.stockQuantity} units • {formatCurrency(parseFloat(product.price))} each
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Recent'}
                        </Badge>
                      </div>
                    ))}
                    {repackedProducts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <PackageIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p>No repacking activity yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}