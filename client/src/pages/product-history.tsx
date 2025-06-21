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
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Receipt, 
  Search, 
  Filter,
  Calendar,
  Eye,
  FileText,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';

interface ProductInfo {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  currentStock: number;
  price: number;
  cost: number;
  category: string;
  supplier: string;
  status: string;
}

interface StockMovement {
  id: number;
  type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  date: string;
  reference: string;
  user: string;
  notes: string;
  unitPrice: number;
  totalValue: number;
}

interface PriceHistory {
  id: number;
  previousPrice: number;
  newPrice: number;
  previousCost: number;
  newCost: number;
  changeDate: string;
  changedBy: string;
  reason: string;
}

interface SalesHistory {
  id: number;
  saleId: number;
  orderNumber: string;
  customer: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  date: string;
  status: string;
}

interface PurchaseHistory {
  id: number;
  purchaseId: number;
  orderNumber: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  date: string;
  status: string;
}

interface ProductHistoryData {
  product: ProductInfo;
  stockMovements: StockMovement[];
  priceHistory: PriceHistory[];
  salesHistory: SalesHistory[];
  purchaseHistory: PurchaseHistory[];
  analytics: {
    totalSold: number;
    totalPurchased: number;
    averageSalePrice: number;
    averagePurchasePrice: number;
    profitMargin: number;
    turnoverRate: number;
    daysInStock: number;
    lastSaleDate: string;
    lastPurchaseDate: string;
  };
}

export default function ProductHistory() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('30days');
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch available products for selection
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products/search', searchTerm],
    queryFn: () => fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}`).then(res => res.json()),
    enabled: !selectedProductId,
  });

  // Fetch product history data
  const { data: historyData, isLoading } = useQuery<ProductHistoryData>({
    queryKey: ['/api/products/history', selectedProductId, dateFilter],
    enabled: !!selectedProductId,
  });

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'purchase':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'return':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Receipt className="h-4 w-4" />;
      case 'purchase':
        return <ShoppingCart className="h-4 w-4" />;
      case 'adjustment':
        return <ArrowUpDown className="h-4 w-4" />;
      case 'return':
        return <RotateCcw className="h-4 w-4" />;
      case 'transfer':
        return <Package className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
      case 'returned':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredProducts = products || [];

  const filteredMovements = historyData?.stockMovements?.filter(movement => {
    if (typeFilter === 'all') return true;
    return movement.type === typeFilter;
  }) || [];

  if (!selectedProductId) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product History</h1>
              <p className="text-muted-foreground">
                View detailed history and analytics for any product
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select a Product</CardTitle>
              <CardDescription>
                Choose a product to view its complete history and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                          <p className="text-xs text-gray-500">Stock: {product.stock_quantity || 0}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          ₹{Number(product.price || 0).toFixed(2)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {productsLoading && (
                <div className="text-center py-8 text-gray-500">
                  Loading products...
                </div>
              )}
              
              {!productsLoading && filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products found. Try adjusting your search.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading product history...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { product, stockMovements, priceHistory, salesHistory, purchaseHistory, analytics } = historyData || {
    product: null,
    stockMovements: [],
    priceHistory: [],
    salesHistory: [],
    purchaseHistory: [],
    analytics: {
      totalSold: 0,
      totalPurchased: 0,
      averageSalePrice: 0,
      averagePurchasePrice: 0,
      profitMargin: 0,
      turnoverRate: 0,
      daysInStock: 0,
      lastSaleDate: null,
      lastPurchaseDate: null
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="outline" 
              onClick={() => setSelectedProductId(null)}
              className="mb-2"
            >
              ← Back to Product Selection
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {product?.name || 'Product History'}
            </h1>
            <p className="text-muted-foreground">
              Complete history and analytics for {product?.sku || 'selected product'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Export History
            </Button>
          </div>
        </div>

        {/* Product Summary */}
        {product && (
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Stock</p>
                  <p className="text-2xl font-bold">{product.currentStock}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Price</p>
                  <p className="text-2xl font-bold">₹{Number(product.price).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cost</p>
                  <p className="text-2xl font-bold">₹{Number(product.cost).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge className={getStatusColor(product.status)}>
                    {product.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Sold</p>
                    <p className="text-2xl font-bold">{analytics.totalSold}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Purchased</p>
                    <p className="text-2xl font-bold">{analytics.totalPurchased}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Receipt className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Sale Price</p>
                    <p className="text-2xl font-bold">₹{Number(analytics.averageSalePrice).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                    <p className="text-2xl font-bold">{Number(analytics.profitMargin).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tabs */}
        <Tabs defaultValue="movements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            <TabsTrigger value="purchases">Purchase History</TabsTrigger>
            <TabsTrigger value="price-changes">Price Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Movements</CardTitle>
                <CardDescription>
                  All stock changes including sales, purchases, adjustments, and transfers
                </CardDescription>
                <div className="flex items-center space-x-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale">Sales</SelectItem>
                      <SelectItem value="purchase">Purchases</SelectItem>
                      <SelectItem value="adjustment">Adjustments</SelectItem>
                      <SelectItem value="return">Returns</SelectItem>
                      <SelectItem value="transfer">Transfers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Stock Before</TableHead>
                      <TableHead>Stock After</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements?.length > 0 ? (
                      filteredMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getMovementIcon(movement.type)}
                              <Badge className={getMovementTypeColor(movement.type)}>
                                {movement.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(movement.date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">{movement.reference}</TableCell>
                          <TableCell>
                            <span className={movement.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{movement.previousStock}</TableCell>
                          <TableCell>{movement.newStock}</TableCell>
                          <TableCell>₹{Number(movement.unitPrice || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(movement.totalValue || 0).toFixed(2)}</TableCell>
                          <TableCell>{movement.user}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No stock movements found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>
                  All sales transactions for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory?.length > 0 ? (
                      salesHistory.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                          <TableCell>
                            {format(new Date(sale.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{sale.customer}</TableCell>
                          <TableCell>{sale.quantity}</TableCell>
                          <TableCell>₹{Number(sale.unitPrice).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(sale.subtotal).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(sale.status)}>
                              {sale.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No sales found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>
                  All purchase orders for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory?.length > 0 ? (
                      purchaseHistory.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.orderNumber}</TableCell>
                          <TableCell>
                            {format(new Date(purchase.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{purchase.supplier}</TableCell>
                          <TableCell>{purchase.quantity}</TableCell>
                          <TableCell>₹{Number(purchase.unitCost).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(purchase.subtotal).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(purchase.status)}>
                              {purchase.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No purchases found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="price-changes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Change History</CardTitle>
                <CardDescription>
                  All price and cost adjustments for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Previous Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Previous Cost</TableHead>
                      <TableHead>New Cost</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory?.length > 0 ? (
                      priceHistory.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell>
                            {format(new Date(change.changeDate), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{change.changedBy}</TableCell>
                          <TableCell>₹{Number(change.previousPrice).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(change.newPrice).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(change.previousCost).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(change.newCost).toFixed(2)}</TableCell>
                          <TableCell>{change.reason || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No price changes found
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
    </DashboardLayout>
  );
}