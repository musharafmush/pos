import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  RefreshCw,
  Calendar,
  DollarSign,
  BarChart3,
  Receipt
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RetailSale {
  id: number;
  orderNumber: string;
  customerId?: number;
  customerName?: string;
  total: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashAmount?: number;
  upiAmount?: number;
  cardAmount?: number;
  bankTransferAmount?: number;
  chequeAmount?: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  user?: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    total: number;
    product: {
      id: number;
      name: string;
      sku: string;
    };
  }>;
  itemsSummary?: string;
}

interface SalesStats {
  todaysSales: number;
  todaysRevenue: number;
  thisMonthSales: number;
  thisMonthRevenue: number;
  avgOrderValue: number;
  topPaymentMethod: string;
}

export default function RetailSales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [selectedSale, setSelectedSale] = useState<RetailSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch retail sales
  const { data: retailSales = [], isLoading, refetch } = useQuery<RetailSale[]>({
    queryKey: ['/api/sales'],
    staleTime: 5000,
    refetchInterval: 10000
  });

  // Fetch sales statistics
  const { data: salesStats } = useQuery<SalesStats>({
    queryKey: ['/api/sales/stats'],
    staleTime: 30000,
    refetchInterval: 60000
  });

  // Delete sale mutation
  const deleteSaleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/sales/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/stats'] });
      toast({
        title: "Success",
        description: "Sale deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sale",
        variant: "destructive"
      });
    }
  });

  // Filter sales based on search and filters
  const filteredSales = retailSales.filter(sale => {
    const matchesSearch = !searchTerm || 
      sale.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || sale.status === filterStatus;
    const matchesPayment = filterPayment === "all" || sale.paymentMethod === filterPayment;

    // Date filtering
    const saleDate = new Date(sale.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let matchesDate = true;
    if (selectedDateRange === "today") {
      matchesDate = saleDate >= today;
    } else if (selectedDateRange === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = saleDate >= weekAgo;
    } else if (selectedDateRange === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = saleDate >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "outline",
      cancelled: "destructive",
      refunded: "secondary"
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: "bg-green-100 text-green-800",
      upi: "bg-blue-100 text-blue-800",
      card: "bg-purple-100 text-purple-800",
      bank_transfer: "bg-orange-100 text-orange-800",
      cheque: "bg-gray-100 text-gray-800"
    };
    return (
      <Badge className={colors[method] || "bg-gray-100 text-gray-800"}>
        {method.toUpperCase().replace('_', ' ')}
      </Badge>
    );
  };

  const viewSaleDetails = (sale: RetailSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  // Calculate summary statistics
  const summaryStats = {
    totalSales: filteredSales.length,
    totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.total, 0),
    avgOrderValue: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.total, 0) / filteredSales.length : 0,
    cashSales: filteredSales.filter(sale => sale.paymentMethod === 'cash').length,
    upiSales: filteredSales.filter(sale => sale.paymentMethod === 'upi').length,
    cardSales: filteredSales.filter(sale => sale.paymentMethod === 'card').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Retail Sales Management</h1>
          <p className="text-muted-foreground">Monitor and manage retail transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Filtered results</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{summaryStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Filtered period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summaryStats.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cash:</span>
                <span className="font-medium">{summaryStats.cashSales}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI:</span>
                <span className="font-medium">{summaryStats.upiSales}</span>
              </div>
              <div className="flex justify-between">
                <span>Card:</span>
                <span className="font-medium">{summaryStats.cardSales}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Order number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setFilterPayment("all");
                  setSelectedDateRange("today");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sales Transactions ({filteredSales.length})</span>
            <div className="text-sm text-muted-foreground">
              Total: ₹{summaryStats.totalRevenue.toFixed(2)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading sales data...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {sale.customer?.name || sale.customerName || "Walk-in Customer"}
                          </div>
                          {sale.customer?.phone && (
                            <div className="text-sm text-muted-foreground">{sale.customer.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.items?.length || 0} items</div>
                          <div className="text-sm text-muted-foreground max-w-48 truncate">
                            {sale.itemsSummary || "No details"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">₹{sale.total.toFixed(2)}</div>
                        {sale.discount > 0 && (
                          <div className="text-sm text-green-600">-₹{sale.discount.toFixed(2)} disc</div>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(sale.paymentMethod)}</TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewSaleDetails(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteSaleMutation.mutate(sale.id)}
                            disabled={deleteSaleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Details - {selectedSale?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sale Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Order Number:</span>
                      <span>{selectedSale.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date & Time:</span>
                      <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      {getStatusBadge(selectedSale.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Payment Method:</span>
                      {getPaymentMethodBadge(selectedSale.paymentMethod)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{selectedSale.customer?.name || selectedSale.customerName || "Walk-in Customer"}</span>
                    </div>
                    {selectedSale.customer?.phone && (
                      <div className="flex justify-between">
                        <span className="font-medium">Phone:</span>
                        <span>{selectedSale.customer.phone}</span>
                      </div>
                    )}
                    {selectedSale.customer?.email && (
                      <div className="flex justify-between">
                        <span className="font-medium">Email:</span>
                        <span>{selectedSale.customer.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Items Purchased</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell>{item.product.sku}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>₹{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{(selectedSale.total - selectedSale.tax + selectedSale.discount).toFixed(2)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-₹{selectedSale.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedSale.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>₹{selectedSale.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{selectedSale.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}