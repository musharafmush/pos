
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Eye, 
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  FileText,
  Download
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ReturnItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Return {
  id: number;
  returnNumber: string;
  saleId: number;
  orderNumber: string;
  customerId?: number;
  customerName?: string;
  userId: number;
  userName: string;
  refundMethod: string;
  totalRefund: string;
  reason: string;
  notes?: string;
  status: string;
  createdAt: string;
  items: ReturnItem[];
}

interface DashboardStats {
  totalReturns: number;
  totalRefundAmount: number;
  todayReturns: number;
  todayRefundAmount: number;
  returnRate: number;
  averageReturnValue: number;
}

export default function SaleReturnsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/returns/stats'],
    queryFn: async () => {
      const response = await fetch('/api/returns/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch return stats');
      }
      return response.json();
    },
  });

  // Fetch returns list
  const { data: returns = [], isLoading: returnsLoading } = useQuery<Return[]>({
    queryKey: ['/api/returns', { search: searchTerm, dateFilter, statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '50');
      
      const response = await fetch(`/api/returns?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch returns');
      }
      return response.json();
    },
  });

  const handleViewDetails = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRefundMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'store_credit':
        return '🎫';
      case 'bank_transfer':
        return '🏦';
      default:
        return '💰';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex items-center gap-2 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-blue-600" />
                    Sale Returns Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">Comprehensive returns management and analytics</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.open('/sale-return', '_blank')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Process New Return
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Returns</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {statsLoading ? '...' : stats?.totalReturns || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Total Refunds</p>
                    <p className="text-2xl font-bold text-green-800">
                      {statsLoading ? '...' : formatCurrency(stats?.totalRefundAmount || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Today's Returns</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {statsLoading ? '...' : stats?.todayReturns || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Return Rate</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {statsLoading ? '...' : `${(stats?.returnRate || 0).toFixed(1)}%`}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Returns</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Order number, customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Today</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setDateFilter('7');
                      setStatusFilter('all');
                    }}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returns Table */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Returns History ({returns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {returnsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                  <p className="text-gray-600">Loading returns...</p>
                </div>
              ) : returns.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return #</TableHead>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Refund Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((returnItem) => (
                        <TableRow key={returnItem.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {returnItem.returnNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{returnItem.orderNumber}</Badge>
                          </TableCell>
                          <TableCell>
                            {returnItem.customerName || 'Walk-in Customer'}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(parseFloat(returnItem.totalRefund))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getRefundMethodIcon(returnItem.refundMethod)}</span>
                              <span className="capitalize">{returnItem.refundMethod.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(returnItem.status)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(returnItem.createdAt), 'MMM dd, yyyy')}
                            <div className="text-xs text-gray-500">
                              {format(new Date(returnItem.createdAt), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(returnItem)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No returns found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Return Details - {selectedReturn?.returnNumber}
                </DialogTitle>
                <DialogDescription>
                  Complete information about this return transaction
                </DialogDescription>
              </DialogHeader>
              
              {selectedReturn && (
                <div className="space-y-6">
                  {/* Return Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">Return Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Return Number:</span>
                          <span className="font-medium">{selectedReturn.returnNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Original Order:</span>
                          <Badge variant="outline">#{selectedReturn.orderNumber}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          {getStatusBadge(selectedReturn.status)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Date:</span>
                          <span className="font-medium">
                            {format(new Date(selectedReturn.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">Refund Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Refund:</span>
                          <span className="font-bold text-green-600 text-lg">
                            {formatCurrency(parseFloat(selectedReturn.totalRefund))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Refund Method:</span>
                          <div className="flex items-center gap-2">
                            <span>{getRefundMethodIcon(selectedReturn.refundMethod)}</span>
                            <span className="capitalize">
                              {selectedReturn.refundMethod.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer:</span>
                          <span className="font-medium">
                            {selectedReturn.customerName || 'Walk-in Customer'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Processed by:</span>
                          <span className="font-medium">{selectedReturn.userName}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Return Reason */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Return Reason</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedReturn.reason}</p>
                      {selectedReturn.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600 mb-1">Additional Notes:</p>
                          <p className="text-sm">{selectedReturn.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Returned Items */}
                  {selectedReturn.items && selectedReturn.items.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-600">
                          Returned Items ({selectedReturn.items.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedReturn.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.productName}</p>
                                <p className="text-xs text-gray-500">
                                  {item.quantity} × {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(item.subtotal)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
