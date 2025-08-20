import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Truck,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
  BarChart3,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileSpreadsheet,
  Printer,
  PieChart,
  Store,
  Calculator,
  MessageSquare,
  Wallet,
  Receipt,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { PurchasePaymentManagement } from "@/components/purchase-payment-management";

interface Purchase {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName?: string;
  supplier?: { name: string; email: string; phone: string };
  userId: number;
  userName?: string;
  total: string;
  status: string;
  paymentStatus: string;
  paidAmount: string;
  orderDate: string;
  createdAt: string;
  dueDate?: string;
  receivedDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  itemCount?: number;
}

interface SupplierSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  pendingAmount: number;
  lastOrderDate: string;
}

export default function PurchaseDashboardEnhanced() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentPurchase, setSelectedPaymentPurchase] = useState<Purchase | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch purchases data
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['/api/purchases'],
    queryFn: async () => {
      const response = await apiRequest('/api/purchases');
      return response as Purchase[];
    }
  });

  // Fetch supplier order summary
  const { data: supplierSummary = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/suppliers/order-summary'],
    queryFn: async () => {
      const response = await apiRequest('/api/suppliers/order-summary');
      return response as SupplierSummary[];
    }
  });

  // Filter purchases based on search term
  const filteredPurchases = purchases.filter(purchase =>
    purchase.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate dashboard statistics
  const dashboardStats = {
    totalPurchases: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + parseFloat(p.total || '0'), 0),
    pendingOrders: purchases.filter(p => p.status === 'pending').length,
    completedOrders: purchases.filter(p => p.status === 'completed').length,
    paymentsDue: purchases.filter(p => p.paymentStatus === 'due').length,
    paymentsPartial: purchases.filter(p => p.paymentStatus === 'partial').length,
    paymentsPaid: purchases.filter(p => p.paymentStatus === 'paid').length,
    totalPaidAmount: purchases.reduce((sum, p) => sum + parseFloat(p.paidAmount || '0'), 0),
    totalOutstanding: purchases.reduce((sum, p) => {
      const total = parseFloat(p.total || '0');
      const paid = parseFloat(p.paidAmount || '0');
      return sum + (total - paid);
    }, 0)
  };

  // Enhanced purchase data with calculated fields
  const enhancedPurchases = filteredPurchases.map(purchase => {
    const totalAmount = parseFloat(purchase.total || '0');
    const paidAmount = parseFloat(purchase.paidAmount || '0');
    const remainingAmount = totalAmount - paidAmount;
    
    // Payment status styling
    let paymentStatusColor = "gray";
    let paymentStatusText = purchase.paymentStatus || 'due';
    
    if (remainingAmount <= 0) {
      paymentStatusColor = "green";
      paymentStatusText = "Fully Paid";
    } else if (paidAmount > 0) {
      paymentStatusColor = "orange";
      paymentStatusText = "Partial Payment";
    } else {
      paymentStatusColor = "red";
      paymentStatusText = "Payment Due";
    }

    return {
      ...purchase,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatusColor,
      paymentStatusText
    };
  });

  // Handle payment recording
  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPaymentPurchase(purchase);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentRecorded = () => {
    // Refresh data after payment is recorded
    queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers/order-summary'] });
    setSelectedPaymentPurchase(null);
  };

  // Print purchase order
  const handlePrintOrder = (purchaseId: number) => {
    window.open(`/api/purchases/${purchaseId}/print`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="purchase-dashboard">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Purchase Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage purchase orders, track payments, and supplier relationships
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" data-testid="button-export">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button asChild data-testid="button-new-purchase">
              <Link href="/purchase-entry-professional">
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Link>
            </Button>
          </div>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Purchases */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Purchases</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="stat-total-purchases">
                    {dashboardStats.totalPurchases}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {formatCurrency(dashboardStats.totalAmount)}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Payments Received</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="stat-payments-paid">
                    {dashboardStats.paymentsPaid}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency(dashboardStats.totalPaidAmount)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Payments */}
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300" data-testid="stat-outstanding">
                    {dashboardStats.paymentsDue + dashboardStats.paymentsPartial}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {formatCurrency(dashboardStats.totalOutstanding)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          {/* Active Suppliers */}
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active Suppliers</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="stat-suppliers">
                    {supplierSummary.length}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Partnerships
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders">
                <Package className="h-4 w-4 mr-2" />
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger value="suppliers" data-testid="tab-suppliers">
                <Building2 className="h-4 w-4 mr-2" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <PieChart className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders, suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="sm" data-testid="button-filters">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Purchase Orders</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredPurchases.length} orders
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Details</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Expected Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enhancedPurchases.map((purchase) => (
                        <TableRow 
                          key={purchase.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          data-testid={`row-purchase-${purchase.id}`}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  {format(new Date(purchase.orderDate), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="font-medium" data-testid={`text-order-${purchase.orderNumber}`}>
                                {purchase.orderNumber}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <span>{purchase.supplierName || purchase.supplier?.name || "N/A"}</span>
                              </div>
                              {(purchase.supplier?.email || purchase.supplier?.phone) && (
                                <div className="text-sm text-gray-500 space-y-1">
                                  {purchase.supplier.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="h-3 w-3" />
                                      <span>{purchase.supplier.email}</span>
                                    </div>
                                  )}
                                  {purchase.supplier.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{purchase.supplier.phone}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={purchase.status === 'completed' ? 'default' : 'secondary'}
                              className={
                                purchase.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }
                              data-testid={`badge-status-${purchase.id}`}
                            >
                              {purchase.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-lg" data-testid={`text-amount-${purchase.id}`}>
                              {formatCurrency(purchase.totalAmount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-sm" data-testid={`badge-items-${purchase.id}`}>
                              <Package className="h-3 w-3 mr-1" />
                              {purchase.itemCount || 1} items
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge 
                                variant="secondary"
                                className={`border-2 ${
                                  purchase.paymentStatusColor === 'green' 
                                    ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600'
                                    : purchase.paymentStatusColor === 'orange'
                                    ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-600'
                                    : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600'
                                }`}
                                data-testid={`badge-payment-${purchase.id}`}
                              >
                                {purchase.paymentStatusColor === 'green' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {purchase.paymentStatusColor === 'orange' && <Clock className="h-3 w-3 mr-1" />}
                                {purchase.paymentStatusColor === 'red' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {purchase.paymentStatusText}
                              </Badge>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div>Paid: {formatCurrency(purchase.paidAmount)}</div>
                                {purchase.remainingAmount > 0 && (
                                  <div className="text-red-600 dark:text-red-400 font-medium">
                                    Outstanding: {formatCurrency(purchase.remainingAmount)}
                                  </div>
                                )}
                                {purchase.paymentDate && (
                                  <div className="text-green-600 dark:text-green-400 text-xs">
                                    Paid on {format(new Date(purchase.paymentDate), 'MMM dd')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {purchase.dueDate ? format(new Date(purchase.dueDate), 'MMM dd, yyyy') : "Not set"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${purchase.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/purchase-entry-professional?id=${purchase.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/purchase-entry-professional?id=${purchase.id}&edit=true`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Order
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintOrder(purchase.id)}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {purchase.remainingAmount > 0 && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRecordPayment(purchase)}
                                    className="text-green-600 dark:text-green-400"
                                    data-testid={`button-payment-${purchase.id}`}
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Record Payment
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Supplier Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplierSummary.map((supplier) => (
                    <Card key={supplier.id} className="border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold">{supplier.name}</span>
                            </div>
                            <Badge variant="outline">{supplier.totalOrders} orders</Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                              <span className="font-medium">{formatCurrency(supplier.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                              <span className="font-medium text-orange-600">
                                {supplier.pendingOrders} ({formatCurrency(supplier.pendingAmount)})
                              </span>
                            </div>
                            {supplier.lastOrderDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Last Order:</span>
                                <span className="font-medium">
                                  {format(new Date(supplier.lastOrderDate), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Contact
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enhancedPurchases.slice(0, 5).map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Receipt className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium">{purchase.orderNumber}</div>
                            <div className="text-sm text-gray-500">{purchase.supplierName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(purchase.totalAmount)}</div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              purchase.paymentStatusColor === 'green' ? 'bg-green-100 text-green-800' :
                              purchase.paymentStatusColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {purchase.paymentStatusText}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-400">Paid Orders</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700 dark:text-green-400">{dashboardStats.paymentsPaid}</div>
                        <div className="text-sm text-green-600 dark:text-green-500">{formatCurrency(dashboardStats.totalPaidAmount)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-700 dark:text-orange-400">Partial Payments</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-700 dark:text-orange-400">{dashboardStats.paymentsPartial}</div>
                        <div className="text-sm text-orange-600 dark:text-orange-500">In progress</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-700 dark:text-red-400">Outstanding</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-700 dark:text-red-400">{dashboardStats.paymentsDue}</div>
                        <div className="text-sm text-red-600 dark:text-red-500">{formatCurrency(dashboardStats.totalOutstanding)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Purchase analytics chart would be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supplier Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Supplier performance chart would be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Payment Management Dialog */}
        {selectedPaymentPurchase && (
          <PurchasePaymentManagement
            purchase={selectedPaymentPurchase}
            isOpen={isPaymentDialogOpen}
            onClose={() => {
              setIsPaymentDialogOpen(false);
              setSelectedPaymentPurchase(null);
            }}
            onPaymentRecorded={handlePaymentRecorded}
          />
        )}
      </div>
    </DashboardLayout>
  );
}