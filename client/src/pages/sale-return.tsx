
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { Search, ArrowLeft, RefreshCw, DollarSign, CreditCard, Banknote, ShoppingCart, Package, AlertCircle, CheckCircle, Wifi, WifiOff, Clock, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';

interface SaleItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: {
    id: number;
    name: string;
    sku: string;
    price: string;
  };
}

interface Sale {
  id: number;
  orderNumber: string;
  customerId?: number;
  userId: number;
  total: string;
  tax: string;
  discount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  user: {
    id: number;
    name: string;
  };
  items: SaleItem[];
}

interface ReturnItem {
  productId: number;
  productName: string;
  maxQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export default function SalesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const queryClient = useQueryClient();

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real-time sales statistics
  const { data: salesStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/sales/stats'],
    queryFn: async () => {
      const response = await fetch('/api/sales/stats');
      if (!response.ok) throw new Error('Failed to fetch sales statistics');
      return response.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Fetch sales for search with real-time updates and instant search
  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery<Sale[]>({
    queryKey: ['/api/sales', { search: searchTerm }],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }
      
      const params = new URLSearchParams();
      params.append('search', searchTerm);
      params.append('limit', '20');
      
      const response = await fetch(`/api/sales?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales');
      }
      return response.json();
    },
    enabled: searchTerm.length >= 2,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
    staleTime: 1000, // Data considered fresh for 1 second (faster updates)
  });

  // Fetch sale details when a sale is selected with real-time updates
  const { data: saleDetails, isLoading: saleLoading, refetch: refetchSaleDetails } = useQuery<Sale>({
    queryKey: ['/api/sales', selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale?.id) return null;
      
      const response = await fetch(`/api/sales/${selectedSale.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sale details');
      }
      return response.json();
    },
    enabled: !!selectedSale?.id,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
    refetchOnWindowFocus: true,
  });

  // Update return items when sale details are loaded
  useEffect(() => {
    if (saleDetails?.items && Array.isArray(saleDetails.items)) {
      const items: ReturnItem[] = saleDetails.items.map((item) => {
        const productId = item.productId || item.product?.id || 0;
        const productName = item.product?.name || `Product #${productId}`;
        const quantity = parseInt(item.quantity?.toString() || '1');
        const unitPrice = parseFloat(item.unitPrice?.toString() || item.product?.price?.toString() || '0');
        
        return {
          productId,
          productName,
          maxQuantity: quantity,
          returnQuantity: 0,
          unitPrice,
          subtotal: 0,
        };
      });
      
      setReturnItems(items);
    } else {
      setReturnItems([]);
    }
  }, [saleDetails]);

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to process return');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Return Processed Successfully",
        description: `Return has been processed successfully. Stock has been restored.`,
      });
      
      // Reset form
      setSelectedSale(null);
      setReturnItems([]);
      setShowReturnDialog(false);
      setRefundMethod('cash');
      setReturnReason('');
      setReturnNotes('');
      setSearchTerm('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Return Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale);
  };

  const updateReturnQuantity = (productId: number, quantity: number) => {
    setReturnItems(items =>
      items.map(item => {
        if (item.productId === productId) {
          const returnQuantity = Math.max(0, Math.min(quantity, item.maxQuantity));
          return {
            ...item,
            returnQuantity,
            subtotal: returnQuantity * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const totalRefund = returnItems.reduce((sum, item) => sum + item.subtotal, 0);
  const hasReturnItems = returnItems.some(item => item.returnQuantity > 0);

  const handleProcessReturn = () => {
    if (!selectedSale || !hasReturnItems) {
      toast({
        title: "❌ Invalid Return",
        description: "Please select items to return",
        variant: "destructive",
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        title: "❌ Reason Required",
        description: "Please provide a reason for the return",
        variant: "destructive",
      });
      return;
    }

    const returnData = {
      saleId: selectedSale.id,
      items: returnItems
        .filter(item => item.returnQuantity > 0)
        .map(item => ({
          productId: item.productId,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      refundMethod,
      totalRefund,
      reason: returnReason,
      notes: returnNotes,
    };

    createReturnMutation.mutate(returnData);
  };

  return (
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
                  Sale Returns Management
                </h1>
                <p className="text-gray-600 mt-1">Process returns for completed sales transactions</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Return Processing</div>
              <div className="text-lg font-semibold text-blue-600">Professional System</div>
            </div>
          </div>
        </div>

        {/* Real-Time Sales Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Today's Sales</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {salesStats ? formatCurrency(salesStats.todaySales || 0) : formatCurrency(0)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">Live Data</span>
                {statsLoading && <RefreshCw className="h-3 w-3 animate-spin ml-2 text-blue-500" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-green-900">
                    {salesStats ? salesStats.totalTransactions || 0 : 0}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <BarChart3 className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">Real-time</span>
                {statsLoading && <RefreshCw className="h-3 w-3 animate-spin ml-2 text-green-500" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Average Sale</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {salesStats ? formatCurrency(salesStats.averageSale || 0) : formatCurrency(0)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <Calendar className="h-3 w-3 text-purple-500 mr-1" />
                <span className="text-purple-600">Updated</span>
                {statsLoading && <RefreshCw className="h-3 w-3 animate-spin ml-2 text-purple-500" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Active Customers</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {salesStats ? salesStats.activeCustomers || 0 : 0}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs">
                <Users className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-orange-600">Live Count</span>
                {statsLoading && <RefreshCw className="h-3 w-3 animate-spin ml-2 text-orange-500" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Transaction Search */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6" />
                Real-Time Sales Dashboard
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded">
                    <Wifi className="h-3 w-3" />
                    Live
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs bg-red-500/20 px-2 py-1 rounded">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  Search Sales Transactions (Order Number, Customer, Phone)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSales()}
                  className="flex items-center gap-2 text-xs"
                  disabled={salesLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${salesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Enter order number, customer name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {salesLoading && searchTerm.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              {searchTerm.length > 0 && searchTerm.length < 2 && (
                <p className="text-xs text-gray-500">Type at least 2 characters for instant search</p>
              )}
              {searchTerm.length >= 2 && (
                <div className="flex items-center justify-between text-xs">
                  <p className="text-blue-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Real-time search active - Data updates every 5 seconds
                  </p>
                  <div className="flex items-center gap-1">
                    {isOnline ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {salesLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-gray-600">Searching sales transactions...</p>
              </div>
            )}

            {searchTerm.length >= 2 && sales.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Sales Analytics ({sales.length} transactions)
                  </h4>
                  <div className="text-sm text-gray-600">
                    Total: {formatCurrency(sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0))}
                  </div>
                </div>

                {/* Quick Analytics for Search Results */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0))}
                    </p>
                    <p className="text-xs text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{sales.length}</p>
                    <p className="text-xs text-gray-600">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0) / sales.length)}
                    </p>
                    <p className="text-xs text-gray-600">Average</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">
                      {sales.filter(sale => sale.paymentMethod === 'cash').length}
                    </p>
                    <p className="text-xs text-gray-600">Cash Sales</p>
                  </div>
                </div>

                {sales.map((sale) => (
                  <Card
                    key={sale.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
                      selectedSale?.id === sale.id 
                        ? 'ring-2 ring-emerald-500 border-emerald-200 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-300'
                    } border-l-4 border-l-emerald-500`}
                    onClick={() => handleSaleSelect(sale)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">#{sale.orderNumber}</p>
                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="text-xs bg-emerald-100 text-emerald-700">
                              {sale.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{new Date(sale.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                            <span>•</span>
                            <span>{sale.items?.length || 0} items</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-emerald-700">
                            {formatCurrency(parseFloat(sale.total))}
                          </p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <Badge variant="outline" className="text-xs capitalize">
                              {sale.paymentMethod}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && !salesLoading && sales.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No sales found</p>
                <p className="text-sm text-gray-400">Try a different search term</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Transaction Details Section */}
        {selectedSale && (
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6" />
                  Transaction Analytics & Details
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchSaleDetails()}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  disabled={saleLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${saleLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {saleLoading ? (
                <div className="text-center py-16">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
                  <p className="text-gray-600">Loading sale details...</p>
                </div>
              ) : saleDetails ? (
                <div className="space-y-6">
                  {/* Transaction Overview */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        Transaction Overview
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-emerald-600 font-medium">Live Analytics</span>
                      </div>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="text-xs font-medium text-gray-600 mb-1">Order Number</p>
                        <p className="text-lg font-bold text-emerald-700 font-mono">#{saleDetails.orderNumber}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="text-xs font-medium text-gray-600 mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-emerald-700">{formatCurrency(parseFloat(saleDetails.total))}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="text-xs font-medium text-gray-600 mb-1">Payment Method</p>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                          {saleDetails.paymentMethod.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="text-xs font-medium text-gray-600 mb-1">Items Count</p>
                        <p className="text-lg font-bold text-emerald-700">{saleDetails.items?.length || 0}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="font-medium text-gray-600 mb-1">Customer Details</p>
                        <p className="text-gray-800 font-medium">{saleDetails.customer?.name || 'Walk-in Customer'}</p>
                        {saleDetails.customer?.phone && (
                          <p className="text-gray-600 text-xs">{saleDetails.customer.phone}</p>
                        )}
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <p className="font-medium text-gray-600 mb-1">Transaction Date</p>
                        <p className="text-gray-800 font-medium">
                          {new Date(saleDetails.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {new Date(saleDetails.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Items Analytics */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-emerald-600" />
                      Items Breakdown & Analytics ({saleDetails.items?.length || 0} items)
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {saleDetails.items && saleDetails.items.length > 0 ? (
                        saleDetails.items.map((item, index) => (
                          <div key={`${item.productId}-${index}`} 
                            className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-semibold text-gray-800">{item.product.name}</h5>
                                  <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                                    SKU: {item.product.sku}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-medium">Quantity</p>
                                    <p className="text-emerald-700 font-bold">{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-medium">Unit Price</p>
                                    <p className="text-emerald-700 font-bold">{formatCurrency(parseFloat(item.unitPrice))}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-medium">Line Total</p>
                                    <p className="text-emerald-700 font-bold">{formatCurrency(parseFloat(item.subtotal))}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-medium">% of Sale</p>
                                    <p className="text-emerald-700 font-bold">
                                      {((parseFloat(item.subtotal) / parseFloat(saleDetails.total)) * 100).toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between bg-white rounded-md p-2 border border-emerald-100">
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span>Product ID: {item.productId}</span>
                                <span>•</span>
                                <span>Revenue Impact: {formatCurrency(parseFloat(item.subtotal))}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {(parseFloat(item.subtotal) > (parseFloat(saleDetails.total) / saleDetails.items.length)) ? 'High Value' : 'Standard'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No items data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Return Summary */}
                  {hasReturnItems && (
                    <div className="border-t pt-4">
                      <div className="bg-green-50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">Total Refund Amount:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalRefund)}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setShowReturnDialog(true)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 text-lg font-semibold"
                        disabled={!hasReturnItems}
                      >
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Process Return - {formatCurrency(totalRefund)}
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Return Processing Dialog */}
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                Complete Return Process
              </DialogTitle>
              <DialogDescription>
                Finalize the return for order #{selectedSale?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Return Summary</h4>
                <div className="text-sm text-blue-700">
                  <p>Items being returned: {returnItems.filter(item => item.returnQuantity > 0).length}</p>
                  <p>Total refund: <span className="font-bold">{formatCurrency(totalRefund)}</span></p>
                </div>
              </div>

              <div>
                <Label htmlFor="refund-method" className="text-sm font-medium">Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="h-11 mt-1">
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash Refund</SelectItem>
                    <SelectItem value="card">💳 Card Refund</SelectItem>
                    <SelectItem value="store_credit">🎫 Store Credit</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="return-reason" className="text-sm font-medium">Return Reason *</Label>
                <Textarea
                  id="return-reason"
                  placeholder="Please provide a detailed reason for the return..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="min-h-[80px] mt-1"
                />
              </div>

              <div>
                <Label htmlFor="return-notes" className="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  id="return-notes"
                  placeholder="Any additional notes about the return..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="min-h-[60px] mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReturnDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessReturn}
                  disabled={createReturnMutation.isPending || !returnReason.trim()}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {createReturnMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Return
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
