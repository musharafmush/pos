import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Package,
  FileText,
  Plus,
  Edit,
  Eye,
  Calendar,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Target,
  History,
  Download,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";
import { format } from "date-fns";

interface Purchase {
  id: number;
  orderNumber: string;
  status: string;
  supplierId: number;
  total: string | number;
  paidAmount?: string | number;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentDate?: string;
  supplier?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface PaymentRecord {
  id: number;
  purchaseId: number;
  amount: number;
  method: string;
  date: string;
  notes?: string;
  createdAt: string;
  purchase?: Purchase;
}

interface PaymentStatusRecordManagerProps {
  purchaseId?: number;
  onPaymentRecorded?: () => void;
  showFullDashboard?: boolean;
  className?: string;
}

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num || 0);
};

export default function PaymentStatusRecordManager({
  purchaseId,
  onPaymentRecorded,
  showFullDashboard = false,
  className = "",
}: PaymentStatusRecordManagerProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentNotes, setPaymentNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"summary" | "detailed" | "records">("summary");
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch purchases data
  const { data: purchases = [], isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Fetch payment records
  const { data: paymentRecords = [], isLoading: recordsLoading, refetch: refetchRecords } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/payment-records"],
    queryFn: async () => {
      const response = await fetch('/api/payment-records');
      if (!response.ok) throw new Error('Failed to fetch payment records');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Record payment mutation
  const recordPayment = useMutation({
    mutationFn: async (data: {
      purchaseId: number;
      amount: number;
      method: string;
      date: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/purchases/${data.purchaseId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentAmount: data.amount,
          paymentMethod: data.method,
          paymentDate: data.date,
          paymentNotes: data.notes,
          paymentType: 'payment',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/payment-records"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/suppliers/order-summary"] });

      // Refetch data
      await refetchPurchases();
      await refetchRecords();

      toast({
        title: "Payment Recorded Successfully ✅",
        description: `Payment of ${formatCurrency(variables.amount)} recorded for order ${selectedPurchase?.orderNumber}`,
        duration: 4000,
      });

      // Reset form
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentDialogOpen(false);
      
      // Call callback if provided
      onPaymentRecorded?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Recording Failed",
        description: error.message || "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter purchases based on search and status
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch = !searchTerm || 
      purchase.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "paid" && purchase.paymentStatus === "paid") ||
      (statusFilter === "partial" && purchase.paymentStatus === "partial") ||
      (statusFilter === "unpaid" && (!purchase.paymentStatus || purchase.paymentStatus === "unpaid"));

    return matchesSearch && matchesStatus;
  });

  // Calculate payment statistics
  const totalPurchases = purchases.length;
  const paidPurchases = purchases.filter(p => p.paymentStatus === "paid").length;
  const partialPurchases = purchases.filter(p => p.paymentStatus === "partial").length;
  const unpaidPurchases = purchases.filter(p => !p.paymentStatus || p.paymentStatus === "unpaid").length;

  const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.total?.toString() || "0"), 0);
  const paidAmount = purchases.reduce((sum, p) => sum + parseFloat(p.paidAmount?.toString() || "0"), 0);
  const dueAmount = totalAmount - paidAmount;

  // Get payment status color and text
  const getPaymentStatus = (purchase: Purchase) => {
    const total = parseFloat(purchase.total?.toString() || "0");
    const paid = parseFloat(purchase.paidAmount?.toString() || "0");
    
    if (paid >= total && total > 0) {
      return { status: "paid", color: "text-green-600 bg-green-100", text: "Fully Paid" };
    } else if (paid > 0 && paid < total) {
      return { status: "partial", color: "text-yellow-600 bg-yellow-100", text: "Partially Paid" };
    } else {
      return { status: "unpaid", color: "text-red-600 bg-red-100", text: "Unpaid" };
    }
  };

  // Handle quick payment actions
  const handleQuickPayment = (purchase: Purchase, percentage: number) => {
    const total = parseFloat(purchase.total?.toString() || "0");
    const paid = parseFloat(purchase.paidAmount?.toString() || "0");
    const remaining = Math.max(0, total - paid);
    const amount = percentage === 100 ? remaining : Math.round(remaining * (percentage / 100));
    
    setSelectedPurchase(purchase);
    setPaymentAmount(amount.toString());
    setPaymentDialogOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Status Record Management</h2>
          <p className="text-gray-600">Comprehensive payment management for purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPurchases()}
            disabled={purchasesLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${purchasesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecordsDialogOpen(true)}
          >
            <History className="w-4 h-4 mr-2" />
            Payment History
          </Button>
        </div>
      </div>

      {/* Payment Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <Package className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalPurchases}</div>
            <div className="text-xs text-blue-600">Purchase orders</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle className="w-4 h-4" />
              Paid Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{paidPurchases}</div>
            <div className="text-xs text-green-600">Fully paid orders</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-700">
              <Clock className="w-4 h-4" />
              Partial Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{partialPurchases}</div>
            <div className="text-xs text-yellow-600">Partially paid orders</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle className="w-4 h-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(dueAmount)}</div>
            <div className="text-xs text-red-600">Amount due</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by order number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Summary View</SelectItem>
            <SelectItem value="detailed">Detailed View</SelectItem>
            <SelectItem value="records">Records View</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Purchase Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Purchase Orders Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const total = parseFloat(purchase.total?.toString() || "0");
                  const paid = parseFloat(purchase.paidAmount?.toString() || "0");
                  const remaining = Math.max(0, total - paid);
                  const paymentStatus = getPaymentStatus(purchase);
                  
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.orderNumber}</TableCell>
                      <TableCell>{purchase.supplier?.name || 'Unknown Supplier'}</TableCell>
                      <TableCell>{formatCurrency(total)}</TableCell>
                      <TableCell className="text-green-600 font-medium">{formatCurrency(paid)}</TableCell>
                      <TableCell>
                        <Badge className={paymentStatus.color}>
                          {paymentStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {purchase.paymentDate ? format(new Date(purchase.paymentDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {remaining > 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickPayment(purchase, 50)}
                                className="text-yellow-600 hover:bg-yellow-50"
                              >
                                50%
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickPayment(purchase, 100)}
                                className="text-green-600 hover:bg-green-50"
                              >
                                Full
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {selectedPurchase && (
                <>Record payment for order {selectedPurchase.orderNumber}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedPurchase.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid Amount:</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(selectedPurchase.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Remaining:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(
                      Math.max(0, parseFloat(selectedPurchase.total?.toString() || "0") - 
                      parseFloat(selectedPurchase.paidAmount?.toString() || "0"))
                    )}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="payment-amount">Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Debit Card">Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Payment notes or reference..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const amount = parseFloat(paymentAmount);
                    if (!amount || amount <= 0) {
                      toast({
                        title: "Invalid Amount",
                        description: "Please enter a valid payment amount",
                        variant: "destructive",
                      });
                      return;
                    }

                    recordPayment.mutate({
                      purchaseId: selectedPurchase.id,
                      amount,
                      method: paymentMethod,
                      date: paymentDate,
                      notes: paymentNotes,
                    });
                  }}
                  disabled={recordPayment.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {recordPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Records History Dialog */}
      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment Records History
            </DialogTitle>
            <DialogDescription>
              Complete history of all payment transactions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRecords
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-medium">
                          {record.purchase?.orderNumber || `PO-${record.purchaseId}`}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell>{record.method}</TableCell>
                        <TableCell className="text-gray-600">{record.notes || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}