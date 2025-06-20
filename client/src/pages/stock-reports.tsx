import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Activity,
  Archive,
  ShoppingCart,
  ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";

interface StockSummary {
  totalProducts: number;
  productsInStock: number;
  outOfStock: number;
  lowStock: number;
  totalStockValue: number;
  totalRetailValue: number;
  profitPotential: number;
}

interface StockByCategory {
  categoryName: string;
  productCount: number;
  totalQuantity: number;
  categoryValue: number;
  lowStockCount: number;
}

interface StockItem {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  alert_threshold?: number;
  cost: number;
  price: number;
  categoryName: string;
  deficit?: number;
  stockValue?: number;
  retailValue?: number;
  lastUpdated?: string;
}

interface StockMovement {
  type: 'purchase' | 'sale';
  product_id: number;
  productName: string;
  quantity: number;
  unit_price: number;
  date: string;
  supplierName?: string;
  customerName?: string;
}

interface StockReportData {
  stockSummary: StockSummary;
  stockByCategory: StockByCategory[];
  lowStockItems: StockItem[];
  highValueItems: StockItem[];
  recentMovements: StockMovement[];
  zeroStockItems: StockItem[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
};

export default function StockReports() {
  const { data: reportData, isLoading, error } = useQuery<StockReportData>({
    queryKey: ['/api/reports/stock'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Reports</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold">Stock Reports</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Failed to load stock reports. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return <div>No data available</div>;
  }

  const { stockSummary } = reportData;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Package className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Stock Reports</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stockSummary.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{stockSummary.productsInStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">{stockSummary.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-600">{stockSummary.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-xl font-bold">{formatCurrency(stockSummary.totalStockValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Retail Value</p>
                <p className="text-xl font-bold">{formatCurrency(stockSummary.totalRetailValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Profit Potential</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stockSummary.profitPotential)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="high-value">High Value Items</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="zero-stock">Out of Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Stock by Category</CardTitle>
              <CardDescription>Inventory breakdown by product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Low Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.stockByCategory.length > 0 ? (
                    reportData.stockByCategory.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{category.categoryName}</TableCell>
                        <TableCell className="text-right">{category.productCount}</TableCell>
                        <TableCell className="text-right">{category.totalQuantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.categoryValue)}</TableCell>
                        <TableCell className="text-right">
                          {category.lowStockCount > 0 ? (
                            <Badge variant="destructive">{category.lowStockCount}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No category data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alert</CardTitle>
              <CardDescription>Products that need immediate restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Alert Level</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.lowStockItems.length > 0 ? (
                    reportData.lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.stock_quantity === 0 ? "destructive" : "secondary"}>
                            {item.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.alert_threshold}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.deficit ? Math.abs(item.deficit) : 0}
                        </TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No low stock items - all products are adequately stocked!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="high-value">
          <Card>
            <CardHeader>
              <CardTitle>High Value Inventory</CardTitle>
              <CardDescription>Most valuable items in your inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead className="text-right">Retail Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.highValueItems.length > 0 ? (
                    reportData.highValueItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">{item.stock_quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.stockValue || 0)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(item.retailValue || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No high value items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
              <CardDescription>Latest purchases and sales affecting inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.recentMovements.length > 0 ? (
                    reportData.recentMovements.map((movement, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {movement.type === 'purchase' ? (
                              <>
                                <ArrowUpDown className="h-4 w-4 text-green-500" />
                                <Badge variant="secondary">Purchase</Badge>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                <Badge variant="outline">Sale</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{movement.productName}</TableCell>
                        <TableCell className="text-right">
                          <span className={movement.type === 'sale' ? 'text-red-600' : 'text-green-600'}>
                            {movement.type === 'sale' ? '-' : '+'}{Math.abs(movement.quantity)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(movement.unit_price)}</TableCell>
                        <TableCell>
                          {movement.type === 'purchase' ? movement.supplierName : movement.customerName}
                        </TableCell>
                        <TableCell>{formatDate(movement.date)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No recent stock movements found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zero-stock">
          <Card>
            <CardHeader>
              <CardTitle>Out of Stock Items</CardTitle>
              <CardDescription>Products that are completely out of stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.zeroStockItems.length > 0 ? (
                    reportData.zeroStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>
                          {item.lastUpdated ? formatDate(item.lastUpdated) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No out of stock items - great inventory management!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}