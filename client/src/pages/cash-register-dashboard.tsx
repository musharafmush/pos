import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CashIcon, 
  CalendarIcon, 
  UserIcon, 
  DollarSignIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  SmartphoneIcon,
  BanknoteIcon
} from "lucide-react";
import { useFormatCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface RegisterStatus {
  id: number;
  opening_cash: number;
  current_cash: number;
  closing_cash?: number;
  withdrawal?: number;
  status: 'open' | 'closed';
  opened_by: number;
  opened_by_name?: string;
  opened_at: string;
  closed_at?: string;
  notes?: string;
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
  transactionCount: number;
  cashInDrawer: number;
  withdrawal: number;
  openingCash: number;
  sales: any[];
}

export default function CashRegisterDashboard() {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const formatCurrency = useFormatCurrency();
  const queryClient = useQueryClient();

  // Fetch current register status
  const { data: registerStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/register/current'],
    queryFn: async (): Promise<RegisterStatus | null> => {
      try {
        const response = await fetch('/api/register/current');
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.error('Error fetching register status:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch today's sales data if register is open
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/register/today-sales', registerStatus?.id],
    queryFn: async (): Promise<SalesData | null> => {
      if (!registerStatus?.id) return null;
      try {
        const response = await fetch(`/api/register/today-sales?registerId=${registerStatus.id}`);
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.error('Error fetching sales data:', error);
        return null;
      }
    },
    enabled: !!registerStatus?.id && registerStatus.status === 'open',
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  // Open register mutation
  const openRegisterMutation = useMutation({
    mutationFn: async (data: { openingCash: number; notes: string }) => {
      const response = await fetch('/api/register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          openingCash: data.openingCash, 
          userId: 1, // Default user ID
          notes: data.notes 
        }),
      });
      if (!response.ok) throw new Error('Failed to open register');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/register/current'] });
      setShowOpenDialog(false);
      setOpeningAmount("");
      setNotes("");
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Error opening register:', error);
      setIsProcessing(false);
    },
  });

  // Close register mutation
  const closeRegisterMutation = useMutation({
    mutationFn: async (data: { registerId: number; closingCash: number; notes: string; withdrawal: number }) => {
      const response = await fetch('/api/register/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to close register');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/register/current'] });
      setShowCloseDialog(false);
      setClosingAmount("");
      setWithdrawalAmount("");
      setNotes("");
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Error closing register:', error);
      setIsProcessing(false);
    },
  });

const handleOpenRegister = () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      alert('Please enter a valid opening amount');
      return;
    }
    setIsProcessing(true);
    openRegisterMutation.mutate({
      openingCash: parseFloat(openingAmount),
      notes: notes,
    });
  };

  const handleCloseRegister = () => {
    if (!registerStatus || !closingAmount || parseFloat(closingAmount) < 0) {
      alert('Please enter a valid closing amount');
      return;
    }
    setIsProcessing(true);
    closeRegisterMutation.mutate({
      registerId: registerStatus.id,
      closingCash: parseFloat(closingAmount),
      withdrawal: parseFloat(withdrawalAmount || '0'),
      notes: notes,
    });
  };

  const calculateCashInDrawer = () => {
    if (!salesData) return 0;
    return salesData.openingCash + salesData.cashSales - salesData.withdrawal;
  };

return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash Register Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your cash register and track real-time sales data
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live Data
            </Badge>
            {registerStatus?.status === 'open' ? (
              <Button
                onClick={() => setShowCloseDialog(true)}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <MinusIcon className="h-4 w-4" />
                <span>Close Register</span>
              </Button>
            ) : (
              <Button
                onClick={() => setShowOpenDialog(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Open Register</span>
              </Button>
            )}
          </div>
        </div>

        {/* Register Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CashIcon className="h-5 w-5" />
              <span>Register Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="text-center py-8">Loading register status...</div>
            ) : registerStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <Badge 
                    variant={registerStatus.status === 'open' ? 'default' : 'secondary'}
                    className={`text-sm px-3 py-1 ${
                      registerStatus.status === 'open' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-gray-500 hover:bg-gray-600'
                    }`}
                  >
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    {registerStatus.status === 'open' ? 'Register Open' : 'Register Closed'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Current Status</p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(registerStatus.opening_cash)}
                  </div>
                  <p className="text-sm text-muted-foreground">Cash In Hand</p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {registerStatus.opened_at ? format(new Date(registerStatus.opened_at), 'HH:mm') : '--:--'}
                  </div>
                  <p className="text-sm text-muted-foreground">Opened At</p>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {registerStatus.opened_by_name || 'Cashier 1'}
                  </div>
                  <p className="text-sm text-muted-foreground">Opened By</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No register session found</p>
                <p className="text-sm text-muted-foreground">Open a register to start tracking sales</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Dashboard - Only show when register is open */}
        {registerStatus?.status === 'open' && salesData && (
          <>
            {/* Real-Time Sales Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(salesData.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    {salesData.transactionCount} transactions today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                  <CashIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(salesData.cashSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    Cash transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">UPI Sales</CardTitle>
                  <SmartphoneIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(salesData.upiSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    UPI transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Other Payments</CardTitle>
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(salesData.cardSales + salesData.bankSales + salesData.chequeSales + salesData.otherSales)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Card, Bank, Cheque
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Payment Method Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <CashIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="font-semibold">{formatCurrency(salesData.cashSales)}</div>
                    <div className="text-sm text-muted-foreground">Cash</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <SmartphoneIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">{formatCurrency(salesData.upiSales)}</div>
                    <div className="text-sm text-muted-foreground">UPI</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-semibold">{formatCurrency(salesData.cardSales)}</div>
                    <div className="text-sm text-muted-foreground">Card</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <BanknoteIcon className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <div className="font-semibold">{formatCurrency(salesData.bankSales)}</div>
                    <div className="text-sm text-muted-foreground">Bank</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <DollarSignIcon className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <div className="font-semibold">{formatCurrency(salesData.chequeSales)}</div>
                    <div className="text-sm text-muted-foreground">Cheque</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <ShoppingCartIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <div className="font-semibold">{formatCurrency(salesData.otherSales)}</div>
                    <div className="text-sm text-muted-foreground">Other</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash Calculation Formula */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUpIcon className="h-5 w-5" />
                  <span>Live Cash Tracker</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-center space-y-2">
                    <div className="text-lg font-mono">
                      <span className="text-green-700 dark:text-green-300 font-semibold">Cash In Drawer</span> = 
                      <span className="mx-2 text-blue-600">Opening Cash</span> + 
                      <span className="mx-2 text-green-600">Cash Sales</span> - 
                      <span className="mx-2 text-red-600">Withdrawals</span>
                    </div>
                    <div className="text-xl font-bold text-green-700 dark:text-green-300">
                      = {formatCurrency(salesData.openingCash)} + {formatCurrency(salesData.cashSales)} - {formatCurrency(salesData.withdrawal)} = {formatCurrency(calculateCashInDrawer())}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5" />
                  <span>Today's Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.sales.length > 0 ? (
                        salesData.sales.slice(0, 10).map((sale: any) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              {format(new Date(sale.createdAt), 'HH:mm')}
                            </TableCell>
                            <TableCell>{sale.customerName || 'Walk-in Customer'}</TableCell>
                            <TableCell>{sale.items?.length || 0} items</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {sale.paymentMethod || 'Cash'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(sale.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No transactions yet today
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Open Register Dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5 text-green-600" />
                🔓 Open Cash Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  Enter the amount of cash you're starting with in the register drawer.
                </p>
              </div>

              <div>
                <Label htmlFor="openingAmount">🔘 Cash In Hand: ₹</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="Enter opening cash amount"
                  className="mt-1"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about opening the register"
                  className="mt-1"
                />
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
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Opening..." : "Open Register"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Close Register Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MinusIcon className="h-5 w-5 text-red-600" />
                Close Cash Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  Closing the register will end the current session. Count the cash in the drawer.
                </p>
              </div>

              <div>
                <Label htmlFor="closingAmount">Actual Cash Count (₹)</Label>
                <Input
                  id="closingAmount"
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Enter actual cash count"
                  className="mt-1"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected: {formatCurrency(calculateCashInDrawer())}
                </p>
              </div>

              <div>
                <Label htmlFor="withdrawalAmount">Cash Withdrawal (₹)</Label>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="Enter withdrawal amount"
                  className="mt-1"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount taken out of the drawer
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about the closing"
                  className="mt-1"
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
    </DashboardLayout>
  );
}