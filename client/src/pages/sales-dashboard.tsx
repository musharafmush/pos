import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  Banknote,
  TrendingUp,
  TrendingDown,
  Calculator,
  Clock,
  User,
  CreditCard,
  Building,
  Wallet,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ShoppingCart,
  Receipt,
  PieChart,
  BarChart3,
  Lock,
  Unlock,
  Calendar,
  Timer,
} from "lucide-react";

interface RegisterData {
  id: string;
  userId: number;
  openingCash: number;
  currentCash: number;
  status: 'open' | 'closed';
  openedAt: string;
  openedBy: number;
  closedAt?: string;
  closedBy?: number;
}

interface SalesData {
  totalSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  bankSales: number;
  chequeSales: number;
  otherSales: number;
  totalRefunds: number;
  totalTransactions: number;
  sales: any[];
}

export default function SalesDashboard() {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for current register
  const { data: registerData, isLoading: isLoadingRegister, error: registerError } = useQuery({
    queryKey: ['/api/cash-register/current'],
    queryFn: async () => {
      const response = await fetch('/api/cash-register/current', {
        credentials: 'include'
      });

      if (response.status === 404) {
        return null; // No open register
      }

      if (!response.ok) {
        throw new Error('Failed to fetch register data');
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const currentRegister: RegisterData | null = registerData?.register || null;
  const salesData: SalesData = registerData?.salesData || {
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    bankSales: 0,
    chequeSales: 0,
    otherSales: 0,
    totalRefunds: 0,
    totalTransactions: 0,
    sales: []
  };

  // Calculate cash in drawer
  const cashInDrawer = currentRegister 
    ? currentRegister.openingCash + salesData.cashSales + salesData.upiSales - (withdrawalAmount ? parseFloat(withdrawalAmount) : 0)
    : 0;

  // Open register
  const handleOpenRegister = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/cash-register/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          openingCash: parseFloat(openingAmount)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to open register');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/cash-register/current'] });

      setOpeningAmount("");
      setShowOpenDialog(false);

      toast({
        title: "Register Opened",
        description: `Register opened with ${formatCurrency(parseFloat(openingAmount))}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Close register
  const handleCloseRegister = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/cash-register/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          withdrawalAmount: withdrawalAmount ? parseFloat(withdrawalAmount) : 0,
          notes: closeNotes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to close register');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/cash-register/current'] });

      setWithdrawalAmount("");
      setCloseNotes("");
      setShowCloseDialog(false);

      toast({
        title: "Register Closed",
        description: "End of day completed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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

  if (isLoadingRegister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading register data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
                <p className="text-sm text-gray-500">Real-time sales tracking and register management</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Date & Time</div>
                <div className="font-mono text-sm text-gray-700">{currentDate} • {currentTime}</div>
              </div>

              {!currentRegister ? (
                <Button
                  onClick={() => setShowOpenDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Open Register
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-600 font-medium">Register Status</div>
                    <div className="text-lg font-bold text-green-700">OPEN</div>
                    <div className="text-xs text-green-600">
                      Since {new Date(currentRegister.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                        <Lock className="h-4 w-4 mr-2" />
                        Close Register
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close Cash Register</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will close the register for the day. Please review your sales summary before proceeding.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setShowCloseDialog(true)}>
                          Continue to Close
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!currentRegister ? (
        // No Register Open - Show Open Register Prompt
        <div className="px-6 py-12">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Unlock className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Register Not Open</h3>
                <p className="text-gray-600 mb-6">
                  Please open the cash register to start tracking sales for today.
                </p>
                <Button
                  onClick={() => setShowOpenDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Open Register
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Register Open - Show Dashboard
        <div className="px-6 py-6">
          {/* Register Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Opening Cash</p>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(currentRegister.openingCash)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Opened at {new Date(currentRegister.openedAt).toLocaleTimeString('en-IN')}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cash in Drawer</p>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashInDrawer)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Live calculation
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(salesData.totalSales)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {salesData.totalTransactions} transactions
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800">OPEN</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Register active
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Payment Methods Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Cash Payments</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(salesData.cashSales)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">UPI Payments</span>
                    </div>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(salesData.upiSales)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Card Payments</span>
                    </div>
                    <span className="font-semibold text-purple-600">
                      {formatCurrency(salesData.cardSales)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">Bank Transfer</span>
                    </div>
                    <span className="font-semibold text-indigo-600">
                      {formatCurrency(salesData.bankSales)}
                    </span>
                  </div>

                  {(salesData.chequeSales > 0 || salesData.otherSales > 0) && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">Cheque</span>
                        </div>
                        <span className="font-semibold text-yellow-600">
                          {formatCurrency(salesData.chequeSales)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">Other</span>
                        </div>
                        <span className="font-semibold text-gray-600">
                          {formatCurrency(salesData.otherSales)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-600" />
                  Cash Calculation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Cash In Drawer Formula:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Opening Cash:</span>
                        <span className="font-mono">+{formatCurrency(currentRegister.openingCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash Sales:</span>
                        <span className="font-mono">+{formatCurrency(salesData.cashSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>UPI Sales:</span>
                        <span className="font-mono">+{formatCurrency(salesData.upiSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Withdrawals:</span>
                        <span className="font-mono">-{formatCurrency(0)}</span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 mt-3">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total Cash:</span>
                          <span className="font-mono text-green-600">
                            {formatCurrency(cashInDrawer)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        This amount should match physical cash in drawer
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                Today's Sales Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.sales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.sales.slice(0, 10).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleTimeString('en-IN')}
                        </TableCell>
                        <TableCell className="font-mono">{sale.orderNumber}</TableCell>
                        <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(parseFloat(sale.total))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {sale.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No sales transactions yet today</p>
                  <p className="text-sm">Sales will appear here in real-time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open Register Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Unlock className="h-6 w-6 text-green-600" />
              Open Cash Register
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800 text-sm mb-2">
                🔓 <strong>Register Opening</strong> - Initial Cash Entry
              </p>
              <p className="text-green-600 text-xs">
                Enter the cash amount you're placing in the register drawer to start the day.
              </p>
            </div>

            <div>
              <Label htmlFor="openingCash" className="text-sm font-medium">
                🔘 Cash In Hand
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="openingCash"
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="Enter opening amount"
                  className="pl-8 text-lg"
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpenRegister}
                disabled={isProcessing || !openingAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? "Opening..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-6 w-6 text-red-600" />
              Close Cash Register
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-red-800 text-sm font-medium mb-2">End of Day Summary</p>
              <p className="text-red-600 text-xs">
                Review your sales and close the register for the day.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Today's Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Opening Cash:</span>
                  <div className="font-semibold">{formatCurrency(currentRegister?.openingCash || 0)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Sales:</span>
                  <div className="font-semibold">{formatCurrency(salesData.totalSales)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Cash Sales:</span>
                  <div className="font-semibold">{formatCurrency(salesData.cashSales)}</div>
                </div>
                <div>
                  <span className="text-gray-600">UPI Sales:</span>
                  <div className="font-semibold">{formatCurrency(salesData.upiSales)}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Expected Cash in Drawer:</span>
                  <div className="font-bold text-lg text-green-600">
                    {formatCurrency(cashInDrawer)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="withdrawalAmount" className="text-sm font-medium">
                💸 Withdrawal Amount (Optional)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="closeNotes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="closeNotes"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g., Cash sent to bank"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseRegister}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? "Closing..." : "Close Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}