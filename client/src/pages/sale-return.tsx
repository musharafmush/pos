
import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  RotateCcw,
  Trash2,
  CreditCard,
  Receipt,
  Calculator,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  ArrowLeft,
  Package,
  User,
  Calendar,
  Clock,
  FileText,
  DollarSign
} from "lucide-react";

interface Sale {
  id: number;
  customerName: string;
  billNumber: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
  items: SaleItem[];
}

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

interface ReturnItem extends SaleItem {
  returnQuantity: number;
  returnReason: string;
  returnAmount: number;
}

export default function SaleReturn() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [returnNumber, setReturnNumber] = useState(`RET${Date.now()}`);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch sales with search
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["/api/sales", searchTerm],
    queryFn: async () => {
      try {
        const url = searchTerm 
          ? `/api/sales?search=${encodeURIComponent(searchTerm)}`
          : "/api/sales";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch sales");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching sales:", error);
        toast({
          title: "Error",
          description: "Failed to load sales data",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  const addReturnItem = (saleItem: SaleItem) => {
    const existingReturn = returnItems.find(item => item.id === saleItem.id);
    
    if (existingReturn) {
      if (existingReturn.returnQuantity >= saleItem.quantity) {
        toast({
          title: "Maximum Quantity Reached",
          description: `Cannot return more than ${saleItem.quantity} units`,
          variant: "destructive",
        });
        return;
      }

      setReturnItems(returnItems.map(item =>
        item.id === saleItem.id
          ? { 
              ...item, 
              returnQuantity: item.returnQuantity + 1,
              returnAmount: (item.returnQuantity + 1) * parseFloat(item.unitPrice)
            }
          : item
      ));
    } else {
      setReturnItems([...returnItems, {
        ...saleItem,
        returnQuantity: 1,
        returnReason: "",
        returnAmount: parseFloat(saleItem.unitPrice)
      }]);
    }

    toast({
      title: "Item Added to Return",
      description: `${saleItem.product.name} added to return list`,
    });
  };

  const updateReturnQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeReturnItem(itemId);
      return;
    }

    const saleItem = selectedSale?.items.find(item => item.id === itemId);
    if (saleItem && newQuantity > saleItem.quantity) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot return more than ${saleItem.quantity} units`,
        variant: "destructive",
      });
      return;
    }

    setReturnItems(returnItems.map(item =>
      item.id === itemId
        ? { 
            ...item, 
            returnQuantity: newQuantity,
            returnAmount: newQuantity * parseFloat(item.unitPrice)
          }
        : item
    ));
  };

  const removeReturnItem = (itemId: number) => {
    const item = returnItems.find(returnItem => returnItem.id === itemId);
    setReturnItems(returnItems.filter(returnItem => returnItem.id !== itemId));
    
    if (item) {
      toast({
        title: "Item Removed",
        description: `${item.product.name} removed from return list`,
      });
    }
  };

  const updateReturnReason = (itemId: number, reason: string) => {
    setReturnItems(returnItems.map(item =>
      item.id === itemId ? { ...item, returnReason: reason } : item
    ));
  };

  const clearReturn = () => {
    setReturnItems([]);
    setSelectedSale(null);
    setReturnReason("");
    setRefundMethod("cash");
    
    toast({
      title: "Return Cleared",
      description: "All return items have been cleared",
    });
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + item.returnAmount, 0);

  const processReturn = async () => {
    if (returnItems.length === 0) {
      toast({
        title: "No Items to Return",
        description: "Please add items to the return list",
        variant: "destructive",
      });
      return;
    }

    // Validate that all items have return reasons
    const itemsWithoutReason = returnItems.filter(item => !item.returnReason.trim());
    if (itemsWithoutReason.length > 0) {
      toast({
        title: "Return Reason Required",
        description: "Please provide return reason for all items",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const returnData = {
        originalSaleId: selectedSale?.id,
        returnNumber: returnNumber,
        customerName: selectedSale?.customerName || "Walk-in Customer",
        items: returnItems.map(item => ({
          saleItemId: item.id,
          productId: item.productId,
          returnQuantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          returnAmount: item.returnAmount.toFixed(2),
          returnReason: item.returnReason
        })),
        totalReturnAmount: totalReturnAmount.toFixed(2),
        refundMethod: refundMethod,
        returnReason: returnReason,
        status: "completed"
      };

      console.log("Processing return with data:", returnData);

      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(returnData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Return API error:", errorText);
        throw new Error("Failed to process return");
      }

      const returnResult = await response.json();
      console.log("Return processed successfully:", returnResult);

      toast({
        title: "✅ Return Processed Successfully!",
        description: `Return ${returnNumber} completed for ${formatCurrency(totalReturnAmount)}`,
        variant: "default",
      });

      // Reset everything
      clearReturn();
      setShowReturnDialog(false);
      setReturnNumber(`RET${Date.now()}`);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    } catch (error) {
      console.error("Return processing error:", error);
      toast({
        title: "❌ Return Failed",
        description: "Failed to process return. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-600 text-white p-3 rounded-xl shadow-lg">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sale Return</h1>
                <p className="text-sm text-gray-500">Process customer returns and refunds</p>
              </div>

              <div className="flex items-center space-x-3 ml-8">
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Return System
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="text-right">
                <div className="text-sm text-gray-500">Return Number</div>
                <div className="font-mono font-semibold text-gray-900">{returnNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Date & Time</div>
                <div className="font-mono text-sm text-gray-700">{currentDate} • {currentTime}</div>
              </div>
              <div className="text-right bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-600 font-medium">Total Return</div>
                <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalReturnAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sale Search Section */}
        <div className="flex-1 bg-white p-6">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Search className="h-6 w-6 mr-3" />
                <h2 className="text-xl font-bold">Find Original Sale</h2>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {sales.length} sales found
                </div>
                <div className="text-orange-100 text-sm">
                  Search by bill number or customer
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Input
                ref={searchInputRef}
                placeholder="Search by bill number, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-lg py-3 pl-12 border-2 border-gray-200 focus:border-orange-500"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Sales List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {salesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading sales...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Sales Found</h3>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            ) : (
              sales.map((sale: Sale) => (
                <Card 
                  key={sale.id} 
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    selectedSale?.id === sale.id 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                  }`}
                  onClick={() => setSelectedSale(sale)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-semibold text-lg text-gray-900">{sale.billNumber}</h4>
                        <Badge variant="outline" className="text-xs">
                          {sale.paymentMethod}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {sale.customerName}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          {sale.items?.length || 0} items
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(parseFloat(sale.total))}
                      </div>
                      <div className="text-sm text-gray-500">
                        Sale Total
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Selected Sale Items */}
        <div className="w-96 bg-white border-l border-gray-200 p-6">
          <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white p-6 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center mb-3">
              <FileText className="h-6 w-6 mr-3" />
              <h2 className="text-xl font-bold">Sale Items</h2>
            </div>
            {selectedSale ? (
              <div>
                <div className="text-orange-100 text-sm">Bill: {selectedSale.billNumber}</div>
                <div className="text-orange-100 text-sm">Customer: {selectedSale.customerName}</div>
              </div>
            ) : (
              <div className="text-orange-100 text-sm">Select a sale to view items</div>
            )}
          </div>

          {selectedSale ? (
            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {selectedSale.items?.map((item: SaleItem) => {
                const returnItem = returnItems.find(ri => ri.id === item.id);
                const remainingQty = item.quantity - (returnItem?.returnQuantity || 0);
                
                return (
                  <Card key={item.id} className="p-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.product.name}</h4>
                          <p className="text-sm text-gray-500">{item.product.sku}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium">{formatCurrency(parseFloat(item.unitPrice))}</span>
                            <Badge variant="outline" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {formatCurrency(parseFloat(item.subtotal))}
                          </div>
                        </div>
                      </div>

                      {returnItem && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-orange-700">Return Qty:</span>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateReturnQuantity(item.id, returnItem.returnQuantity - 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-bold">{returnItem.returnQuantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateReturnQuantity(item.id, returnItem.returnQuantity + 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <Input
                            placeholder="Return reason..."
                            value={returnItem.returnReason}
                            onChange={(e) => updateReturnReason(item.id, e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-medium text-orange-700">Amount:</span>
                            <span className="font-bold text-orange-700">
                              {formatCurrency(returnItem.returnAmount)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {!returnItem ? (
                          <Button
                            size="sm"
                            onClick={() => addReturnItem(item)}
                            className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Add to Return
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeReturnItem(item.id)}
                            className="text-red-600 hover:bg-red-50 flex-1"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Sale Selected</h3>
              <p className="text-gray-500">Select a sale from the left to view items</p>
            </div>
          )}

          {/* Return Summary */}
          {returnItems.length > 0 && (
            <div className="space-y-4">
              <Separator />
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-3">Return Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-orange-700">Items to Return:</span>
                    <span className="font-semibold">{returnItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-700">Total Quantity:</span>
                    <span className="font-semibold">
                      {returnItems.reduce((sum, item) => sum + item.returnQuantity, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-orange-700">Refund Amount:</span>
                    <span className="text-orange-800">{formatCurrency(totalReturnAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => setShowReturnDialog(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Return
                </Button>
                <Button
                  variant="outline"
                  onClick={clearReturn}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Processing Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <RotateCcw className="h-6 w-6 mr-3" />
              Process Return
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-6 bg-orange-50 rounded-xl text-center border border-orange-200">
              <div className="text-3xl font-bold text-orange-700">
                {formatCurrency(totalReturnAmount)}
              </div>
              <div className="text-orange-600 mt-1">Refund Amount</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refund Method</label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash Refund</SelectItem>
                  <SelectItem value="upi">📱 UPI Refund</SelectItem>
                  <SelectItem value="card">💳 Card Refund</SelectItem>
                  <SelectItem value="store_credit">🎫 Store Credit</SelectItem>
                  <SelectItem value="exchange">🔄 Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <Textarea
                placeholder="Enter any additional notes about this return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="min-h-20"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowReturnDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={processReturn}
                disabled={isProcessing}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isProcessing ? "Processing..." : `Process Return ${formatCurrency(totalReturnAmount)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
