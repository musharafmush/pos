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
    completedOrders: purchases.filter((p: any) => p.status === 'received').length,
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
      pending: { label: "Pending", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
      ordered: { label: "Ordered", variant: "default" as const, className: "bg-blue-100 text-blue-800 border-blue-200" },
      received: { label: "Received", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
      cancelled: { label: "Cancelled", variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className={`${config.className} rounded-full px-3 py-1`}>
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
    toast({
      title: "Edit not available",
      description: "Purchase order editing has been disabled.",
      variant: "destructive",
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
      'Reference No': purchase.orderNumber || `PO-${purchase.id}`,
      'Supplier': purchase.supplier?.name || 'Unknown',
      'Date': purchase.orderDate ? format(new Date(purchase.orderDate), 'MM/dd/yyyy') : 'N/A',
      'Grand Total': purchase.totalAmount || '0.00',
      'Purchase Status': purchase.status,
      'Payment Status': 'Pending',
      'Expected On': purchase.expectedDate ? format(new Date(purchase.expectedDate), 'MM/dd/yyyy') : 'N/A'
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
      <div className="space-y-6 bg-gray-50 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your purchase orders and supplier relationships
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/suppliers">
              <Button variant="outline" className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50">
                <Building2 className="h-4 w-4" />
                Manage Suppliers
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
                  <p className="text-xs text-gray-500 mt-1">Purchase orders created</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
                </div>
                <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                  <p className="text-xs text-gray-500 mt-1">Successfully received</p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue.toFixed(2))}</p>
                  <p className="text-xs text-gray-500 mt-1">Total purchase value</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders Table */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">All Purchases</CardTitle>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-9 w-full sm:w-64 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9">
                    <SelectValue placeholder="All Statuses" />
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
                  <SelectTrigger className="w-full sm:w-[140px] h-9">
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

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-y">
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Action</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Reference No</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Supplier</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Purchase Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Payment Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Grand Total</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Payment Due</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-4">Expected On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-lg font-medium text-gray-900">No purchase orders found</p>
                            <p className="text-sm text-gray-500">
                              {searchTerm || statusFilter !== "all_statuses" || supplierFilter !== "all_suppliers"
                                ? "Try adjusting your filters"
                                : "Create your first purchase order to get started"
                              }
                            </p>
                          </div>
                          {!searchTerm && statusFilter === "all_statuses" && supplierFilter === "all_suppliers" && (
                            <p className="mt-2 text-sm text-gray-500">
                              Purchase orders will appear here when created
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((purchase: any) => (
                      <TableRow key={purchase.id} className="border-b hover:bg-gray-50">
                        <TableCell className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-20 px-2 text-xs border-gray-300"
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="py-4 text-gray-900">
                          {purchase.orderDate ? format(new Date(purchase.orderDate), 'MM/dd/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-gray-900">
                          {purchase.orderNumber || `PO-${purchase.id?.toString().padStart(9, '0')}`}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{purchase.supplier?.name || 'mushu'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 rounded-full px-3 py-1">
                            Pending
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 font-medium text-gray-900">
                          {formatCurrency(
                            purchase.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 
                            purchase.totalAmount || 
                            "0.00"
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-gray-900">
                          {formatCurrency(
                            purchase.items?.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0) || 
                            purchase.totalAmount || 
                            "0.00"
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-gray-900">
                          {purchase.expectedDate ? format(new Date(purchase.expectedDate), 'MM/dd/yyyy') : 'N/A'}
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