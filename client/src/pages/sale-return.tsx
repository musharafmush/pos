
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
import { Search, ArrowLeft, RefreshCw, DollarSign, CreditCard, Banknote } from 'lucide-react';

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
  
  const queryClient = useQueryClient();

  // Fetch sales for search
  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['/api/sales', { search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('limit', '50');
      
      const response = await fetch(`/api/sales?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch sales: ${errorText}`);
      }
      return response.json();
    },
    enabled: searchTerm.length >= 3,
  });

  // Fetch sale details
  const { data: saleDetails, isLoading: saleLoading } = useQuery<Sale>({
    queryKey: ['/api/sales', selectedSale?.id],
    queryFn: async () => {
      const response = await fetch(`/api/sales/${selectedSale?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sale details');
      }
      return response.json();
    },
    enabled: !!selectedSale?.id,
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      console.log('Sending return data:', returnData);
      
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(returnData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Return API error:', errorText);
        
        let errorMessage = 'Failed to process return';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Return processed successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Return Processed",
        description: `Return #${data.returnId || data.id} has been processed successfully. Stock has been restored.`,
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
      console.error('Return mutation error:', error);
      toast({
        title: "❌ Return Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaleSelect = (sale: Sale) => {
    console.log('Selected sale for return:', sale);
    setSelectedSale(sale);
    
    // Initialize return items from sale items with better data handling
    const items: ReturnItem[] = sale.items?.map(item => {
      const productId = item.productId || item.product?.id || 0;
      const productName = item.product?.name || item.productName || `Product #${productId}` || 'Unknown Product';
      const quantity = parseInt(item.quantity?.toString() || '1') || 1;
      const unitPrice = parseFloat(item.unitPrice?.toString() || item.price?.toString() || '0') || 0;
      
      return {
        productId,
        productName,
        maxQuantity: quantity,
        returnQuantity: 0,
        unitPrice,
        subtotal: 0,
      };
    }) || [];
    
    console.log('Initialized return items:', items);
    setReturnItems(items);
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
        title: "Invalid Return",
        description: "Please select items to return",
        variant: "destructive",
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        title: "Reason Required",
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Sale Returns</h1>
          <p className="text-muted-foreground">Process returns for completed sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search by Order Number, Customer Name, or Phone</Label>
              <Input
                id="search"
                placeholder="Enter order number, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {salesLoading && (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching sales...</p>
              </div>
            )}

            {searchTerm.length >= 3 && sales.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sales.map((sale) => (
                  <Card
                    key={sale.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedSale?.id === sale.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSaleSelect(sale)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">#{sale.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.customer?.name || 'Walk-in Customer'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(parseFloat(sale.total))}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {getPaymentMethodIcon(sale.paymentMethod)}
                            <span className="text-sm capitalize">{sale.paymentMethod}</span>
                          </div>
                          <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                            {sale.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchTerm.length >= 3 && !salesLoading && sales.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sales found matching your search</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Return Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSale ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Select a sale to process return</p>
              </div>
            ) : saleLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading sale details...</p>
              </div>
            ) : saleDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Order Number:</p>
                    <p className="text-muted-foreground">#{saleDetails.orderNumber}</p>
                  </div>
                  <div>
                    <p className="font-medium">Total Amount:</p>
                    <p className="text-muted-foreground">{formatCurrency(parseFloat(saleDetails.total))}</p>
                  </div>
                  <div>
                    <p className="font-medium">Customer:</p>
                    <p className="text-muted-foreground">{saleDetails.customerName || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Date:</p>
                    <p className="text-muted-foreground">
                      {new Date(saleDetails.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="font-medium">Items Count:</p>
                  <p className="text-muted-foreground">{saleDetails.items?.length || 0} items</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Items to Return:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {returnItems.length > 0 ? (
                      returnItems.map((item) => (
                        <div key={`${item.productId}-${item.productName}`} className="flex items-center gap-2 p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.productName || `Product #${item.productId}`}</p>
                            <p className="text-xs text-muted-foreground">
                              Max: {item.maxQuantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={item.maxQuantity}
                              value={item.returnQuantity}
                              onChange={(e) => updateReturnQuantity(item.productId, parseInt(e.target.value) || 0)}
                              className="w-16 h-8"
                            />
                            <div className="text-sm font-medium w-20 text-right">
                              {formatCurrency(item.subtotal)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No items found for this sale</p>
                        <p className="text-xs mt-1">Please select a different sale or check if the sale has items</p>
                      </div>
                    )}
                  </div>
                </div>

                {hasReturnItems && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium">Total Refund:</span>
                      <span className="text-lg font-bold">{formatCurrency(totalRefund)}</span>
                    </div>
                    
                    <Button
                      onClick={() => setShowReturnDialog(true)}
                      className="w-full"
                      disabled={!hasReturnItems}
                    >
                      Process Return
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Return Processing Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
              Complete the return process for order #{selectedSale?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-method">Refund Method *</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select refund method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="return-reason">Return Reason *</Label>
              <Textarea
                id="return-reason"
                placeholder="Please provide a reason for the return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            <div>
              <Label htmlFor="return-notes">Additional Notes</Label>
              <Textarea
                id="return-notes"
                placeholder="Any additional notes about the return..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total Refund Amount:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(totalRefund)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
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
                className="flex-1"
              >
                {createReturnMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Return'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
