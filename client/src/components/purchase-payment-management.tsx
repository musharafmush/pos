import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Wallet,
  Calculator,
  Receipt,
  Calendar,
  FileText,
  X
} from "lucide-react";
import { format } from "date-fns";

interface PurchasePaymentManagementProps {
  purchase: any;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export function PurchasePaymentManagement({ 
  purchase, 
  isOpen, 
  onClose, 
  onPaymentRecorded 
}: PurchasePaymentManagementProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate payment details
  const totalAmount = parseFloat(purchase?.total || purchase?.totalAmount || "0");
  const paidAmount = parseFloat(purchase?.paidAmount || purchase?.paid_amount || "0");
  const remainingAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Payment status styling
  const getPaymentStatusStyle = () => {
    if (remainingAmount <= 0) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        status: "Fully Paid",
        icon: CheckCircle
      };
    } else if (paidAmount > 0) {
      return {
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        borderColor: "border-orange-200 dark:border-orange-800",
        status: "Partial Payment",
        icon: Clock
      };
    } else {
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        status: "Payment Due",
        icon: AlertCircle
      };
    }
  };

  const statusStyle = getPaymentStatusStyle();
  const StatusIcon = statusStyle.icon;

  // Quick payment buttons
  const handleQuickPayment = (percentage: number) => {
    const amount = Math.round(remainingAmount * percentage / 100);
    setPaymentAmount(amount.toString());
  };

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest(`/api/purchases/${purchase.id}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Payment Recorded Successfully",
        description: `Payment of ${formatCurrency(parseFloat(paymentAmount))} has been recorded.`,
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      });
      
      // Reset form
      setPaymentAmount("");
      setPaymentNotes("");
      setTransactionId("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      queryClient.invalidateQueries({ queryKey: [`/api/purchases/${purchase.id}`] });
      
      // Notify parent component
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Recording Failed",
        description: error.message || "Failed to record payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmitPayment = () => {
    const amount = parseFloat(paymentAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive"
      });
      return;
    }

    if (amount > remainingAmount) {
      toast({
        title: "Amount Exceeds Balance",
        description: `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}.`,
        variant: "destructive"
      });
      return;
    }

    const paymentData = {
      amount: amount,
      method: paymentMethod,
      date: paymentDate,
      notes: paymentNotes,
      transactionId: transactionId,
      purchaseId: purchase.id
    };

    recordPaymentMutation.mutate(paymentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Bill Payment Management
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-payment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Record and track payments for this purchase order
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Order Details */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {purchase?.orderNumber || purchase?.order_number}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <div className="font-medium mt-1">
                    {purchase?.supplierName || purchase?.supplier?.name || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Order Date:</span>
                  <div className="font-medium mt-1">
                    {purchase?.orderDate 
                      ? format(new Date(purchase.orderDate), 'dd MMM yyyy')
                      : purchase?.order_date 
                        ? format(new Date(purchase.order_date), 'dd MMM yyyy')
                        : "N/A"
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Overview */}
          <Card className={`${statusStyle.bgColor} ${statusStyle.borderColor} border-2`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className={`h-5 w-5 ${statusStyle.color}`} />
                <span>Payment Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Progress</span>
                  <span className="font-medium">{Math.round(paymentProgress)}% completed</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                    data-testid="progress-payment"
                  ></div>
                </div>
              </div>

              {/* Payment Amount Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-amount">
                      {formatCurrency(totalAmount)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-paid-amount">
                      {formatCurrency(paidAmount)}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${statusStyle.bgColor} ${statusStyle.borderColor}`}>
                  <CardContent className="p-4 text-center">
                    <StatusIcon className={`h-6 w-6 mx-auto mb-2 ${statusStyle.color}`} />
                    <div className="text-sm text-muted-foreground">Balance Due</div>
                    <div className={`text-xl font-bold ${statusStyle.color}`} data-testid="text-balance-due">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Status Badge */}
              <div className="flex justify-center">
                <Badge 
                  variant="secondary" 
                  className={`${statusStyle.bgColor} ${statusStyle.color} ${statusStyle.borderColor} border px-4 py-2`}
                  data-testid="badge-payment-status"
                >
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusStyle.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Record New Payment */}
          {remainingAmount > 0 && (
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span>Record New Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Payment Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Payment Options</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPayment(100)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      data-testid="button-full-payment"
                    >
                      Full Balance ({formatCurrency(remainingAmount)})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPayment(50)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      data-testid="button-half-payment"
                    >
                      Half Amount ({formatCurrency(remainingAmount / 2)})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount("")}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      data-testid="button-clear-payment"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Payment Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount" className="text-sm font-medium">
                      Payment Amount <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="paymentAmount"
                        type="number"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="pl-10"
                        step="0.01"
                        min="0"
                        max={remainingAmount}
                        data-testid="input-payment-amount"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Maximum: {formatCurrency(remainingAmount)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium">
                      Payment Method
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate" className="text-sm font-medium">
                      Payment Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="pl-10"
                        data-testid="input-payment-date"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionId" className="text-sm font-medium">
                      Reference/Transaction ID
                    </Label>
                    <Input
                      id="transactionId"
                      placeholder="Payment reference number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      data-testid="input-transaction-id"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentNotes" className="text-sm font-medium">
                    Payment Notes (Optional)
                  </Label>
                  <Textarea
                    id="paymentNotes"
                    placeholder="Reference number, bank details, etc."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-payment-notes"
                  />
                </div>

                {/* Real-time Payment Preview */}
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Payment Preview
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Payment Amount:</span>
                          <div className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(parseFloat(paymentAmount))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Remaining After Payment:</span>
                          <div className="font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(remainingAmount - parseFloat(paymentAmount))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">New Status:</span>
                          <div className="font-bold">
                            {remainingAmount - parseFloat(paymentAmount) <= 0 
                              ? <span className="text-green-600 dark:text-green-400">Fully Paid</span>
                              : <span className="text-orange-600 dark:text-orange-400">Partial Payment</span>
                            }
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment Method:</span>
                          <div className="font-bold">{paymentMethod}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || recordPaymentMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-record-payment"
                  >
                    {recordPaymentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recording...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment ({formatCurrency(parseFloat(paymentAmount || "0"))})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}