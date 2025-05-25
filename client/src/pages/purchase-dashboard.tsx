import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Building2,
  MoreHorizontal,
  Printer,
  Trash2,
  Tag,
  CreditCard,
  FileText,
  RefreshCw,
  Calendar,
  ChevronDown,
  Download
} from "lucide-react";
import { useFormatCurrency } from "@/lib/currency";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function PurchaseDashboard() {
  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_statuses");
  const [supplierFilter, setSupplierFilter] = useState("all_suppliers");
  const [entriesPerPage, setEntriesPerPage] = useState("25");
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null);

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

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/purchases/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase deleted",
        description: "The purchase order has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting purchase",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update purchase status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/purchases/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Purchase order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
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
      received: { label: "Received", variant: "default" as const, icon: CheckCircle },
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

  // Action handlers
  const handleView = (purchase: any) => {
    setSelectedPurchase(purchase);
    setViewDialogOpen(true);
  };

  const handleEdit = (purchase: any) => {
    // Navigate to edit page using wouter navigation
    setLocation(`/purchase-entry?edit=${purchase.id}`);
    toast({
      title: "Opening for edit",
      description: `Editing purchase order ${purchase.orderNumber || `PO-${purchase.id}`}`,
    });
  };

  const handleDelete = (purchase: any) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchaseMutation.mutate(purchaseToDelete.id);
    }
  };

  const handlePrint = (purchase: any) => {
    window.print();
    toast({
      title: "Print initiated",
      description: "Purchase order print dialog opened.",
    });
  };

  const handleUpdateStatus = (purchase: any, newStatus: string) => {
    updateStatusMutation.mutate({ id: purchase.id, status: newStatus });
  };

  const handleExportCSV = () => {
    const csvData = filteredPurchases.map((purchase: any) => ({
      'Order Number': purchase.orderNumber || `PO-${purchase.id}`,
      'Supplier': purchase.supplier?.name || 'Unknown',
      'Date': purchase.orderDate ? format(new Date(purchase.orderDate), 'MM/dd/yyyy') : 'N/A',
      'Total Amount': purchase.totalAmount || '0.00',
      'Status': purchase.status,
      'Items': purchase.items?.length || 0
    }));
    
    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV exported",
      description: "Purchase data has been exported successfully.",
    });
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">All Purchases</CardTitle>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
            
            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm">entries</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-9 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="All Status" />
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
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="All Suppliers" />
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
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Date
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <Calendar className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                    <TableHead>Reference No</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Purchase Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Payment Due</TableHead>
                    <TableHead>Expected On</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-20 px-2 text-xs"
                              >
                                Actions
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem onClick={() => handleView(purchase)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(purchase)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(purchase)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(purchase)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Tag className="h-4 w-4 mr-2" />
                                Labels
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Add Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Payments
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Purchase Return
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Truck className="h-4 w-4 mr-2" />
                                Update Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          {purchase.orderDate ? format(new Date(purchase.orderDate), 'MM/dd/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {purchase.orderNumber || `PO${purchase.id?.toString().padStart(4, '0')}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {purchase.supplier?.name || 'Unknown Supplier'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            purchase.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 
                            purchase.totalAmount || 
                            "0.00"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            purchase.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 
                            purchase.totalAmount || 
                            "0.00"
                          )}
                        </TableCell>
                        <TableCell>
                          {purchase.expectedDate ? format(new Date(purchase.expectedDate), 'MM/dd/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(purchase)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Quick View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(purchase)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Purchase Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                View purchase order information and items
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Order Number</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedPurchase.orderNumber || `PO-${selectedPurchase.id}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Supplier</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedPurchase.supplier?.name || 'Unknown Supplier'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedPurchase.orderDate ? format(new Date(selectedPurchase.orderDate), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedPurchase.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Amount</label>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        selectedPurchase.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 
                        selectedPurchase.totalAmount || 
                        "0.00"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Items Count</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedPurchase.items?.length || 0} items
                    </p>
                  </div>
                </div>
                
                {/* Items List */}
                {selectedPurchase?.items && selectedPurchase.items.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Purchase Items</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPurchase.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {item.product?.name || 'Unknown Product'}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unitCost || "0.00")}</TableCell>
                              <TableCell>{formatCurrency(item.subtotal || "0.00")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this purchase order? This action cannot be undone.
                {purchaseToDelete && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <strong>Order:</strong> {purchaseToDelete.orderNumber || `PO-${purchaseToDelete.id}`}
                    <br />
                    <strong>Supplier:</strong> {purchaseToDelete.supplier?.name || 'Unknown'}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}