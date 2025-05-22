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
import { 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Package,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Truck,
  Building2
} from "lucide-react";
import { useFormatCurrency } from "@/lib/currency";
import { Link } from "wouter";
import { format } from "date-fns";

export default function PurchaseDashboard() {
  const formatCurrency = useFormatCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_statuses");
  const [supplierFilter, setSupplierFilter] = useState("all_suppliers");

  // Fetch purchase orders
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['/api/purchases'],
    queryFn: async () => {
      const response = await fetch('/api/purchases');
      if (!response.ok) throw new Error('Failed to fetch purchases');
      return response.json();
    }
  });

  // Fetch suppliers for filter
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    }
  });

  // Calculate purchase statistics
  const stats = {
    totalPurchases: purchases.length,
    pendingOrders: purchases.filter((p: any) => p.status === 'pending').length,
    receivedOrders: purchases.filter((p: any) => p.status === 'received').length,
    totalValue: purchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || 0), 0)
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase: any) => {
    const matchesSearch = !searchTerm || 
      purchase.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all_statuses" || purchase.status === statusFilter;
    const matchesSupplier = supplierFilter === "all_suppliers" || purchase.supplierId?.toString() === supplierFilter;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
      ordered: { label: "Ordered", variant: "default" as const, icon: ShoppingCart },
      received: { label: "Received", variant: "success" as const, icon: CheckCircle },
      cancelled: { label: "Cancelled", variant: "destructive" as const, icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Management</h1>
            <p className="text-muted-foreground">
              Manage your purchase orders and supplier relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/suppliers">
              <Button variant="outline" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Manage Suppliers
              </Button>
            </Link>
            <Link href="/purchase-entry">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Purchase Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPurchases}</div>
              <p className="text-xs text-muted-foreground">
                Purchase orders created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.receivedOrders}</div>
              <p className="text-xs text-muted-foreground">
                Successfully received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue.toFixed(2))}</div>
              <p className="text-xs text-muted-foreground">
                Total purchase value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_suppliers">All Suppliers</SelectItem>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">No purchase orders found</p>
                            <p className="text-sm text-muted-foreground">
                              {searchTerm || statusFilter !== "all_statuses" || supplierFilter !== "all_suppliers"
                                ? "Try adjusting your filters"
                                : "Create your first purchase order to get started"
                              }
                            </p>
                          </div>
                          {!searchTerm && statusFilter === "all_statuses" && supplierFilter === "all_suppliers" && (
                            <Link href="/purchase-entry">
                              <Button className="mt-2">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Purchase Order
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.orderNumber || `PO-${purchase.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {purchase.supplier?.name || 'Unknown Supplier'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {purchase.orderDate ? format(new Date(purchase.orderDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {purchase.items?.length || 0} items
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(purchase.totalAmount || "0.00")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {purchase.status === 'ordered' && (
                              <Button variant="ghost" size="sm" className="text-green-600">
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}