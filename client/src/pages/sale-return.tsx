
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
import { Search, ArrowLeft, RefreshCw, DollarSign, CreditCard, Banknote, ShoppingCart, Package, AlertCircle, CheckCircle, Wifi, WifiOff, Clock } from 'lucide-react';

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

export default function SaleReturn() {
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

        {/* Find Sale Transaction Section */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="h-6 w-6" />
                Find Sale Transaction
              </div>
              <Button
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  Search by Order Number, Customer Name, or Phone
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
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Search Results ({sales.length})
                </h4>
                {sales.map((sale) => (
                  <Card
                    key={sale.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
                      selectedSale?.id === sale.id 
                        ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleSaleSelect(sale)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">#{sale.orderNumber}</p>
                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {sale.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">
                            {formatCurrency(parseFloat(sale.total))}
                          </p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <span className="text-xs capitalize text-gray-600">
                              {sale.paymentMethod}
                            </span>
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

        {/* Return Processing Details Section */}
        {selectedSale && (
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  Return Processing Details
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
                  {/* Sale Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Sale Information
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">Live Data</span>
                      </div>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-600">Order Number:</p>
                        <p className="text-gray-800 font-mono">#{saleDetails.orderNumber}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Total Amount:</p>
                        <p className="text-gray-800 font-semibold">{formatCurrency(parseFloat(saleDetails.total))}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Customer:</p>
                        <p className="text-gray-800">{saleDetails.customer?.name || 'Walk-in Customer'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Date:</p>
                        <p className="text-gray-800">
                          {new Date(saleDetails.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items to Return */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      Items Available for Return ({returnItems.length})
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {returnItems.length > 0 ? (
                        returnItems.map((item, index) => (
                          <div key={`${item.productId}-${index}`} 
                               className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Available: {item.maxQuantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center">
                                <Label className="text-xs text-gray-600 mb-1">Return Qty</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.maxQuantity}
                                  value={item.returnQuantity}
                                  onChange={(e) => updateReturnQuantity(item.productId, parseInt(e.target.value) || 0)}
                                  className="w-16 h-8 text-center text-sm"
                                />
                              </div>
                              <div className="text-right min-w-[80px]">
                                <p className="text-xs text-gray-600">Refund</p>
                                <p className="font-semibold text-sm text-green-600">
                                  {formatCurrency(item.subtotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No items found for this sale</p>
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
