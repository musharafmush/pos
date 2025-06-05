import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  User,
  Plus,
  Minus,
  Calculator,
  Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface RegisterSession {
  id: number;
  openingCash: number;
  openedAt: string;
  openedBy: string;
  status: 'open' | 'closed';
  totalSales: number;
  cashSales: number;
  upiSales: number;
  otherPayments: number;
  totalRefunds: number;
  withdrawals: number;
}

interface SalesData {
  totalSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherPayments: number;
  totalRefunds: number;
  withdrawals: number;
  transactionCount: number;
}

export function SalesDashboard() {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRegister, setCurrentRegister] = useState<RegisterSession | null>(null);
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    otherPayments: 0,
    totalRefunds: 0,
    withdrawals: 0,
    transactionCount: 0
  });

  // Check for existing open register on component mount
  useEffect(() => {
    checkOpenRegister();
    if (currentRegister?.status === 'open') {
      fetchSalesData();
    }
  }, [currentRegister?.id]);

  const checkOpenRegister = async () => {
    try {
      const response = await fetch('/api/register/current');
      if (response.ok) {
        const data = await response.json();
        if (data.register) {
          setCurrentRegister(data.register);
        } else {
          setShowOpenDialog(true);
        }
      }
    } catch (error) {
      console.error('Error checking register status:', error);
    }
  };

  const fetchSalesData = async () => {
    if (!currentRegister) return;

    try {
      const response = await fetch(`/api/sales/today?registerId=${currentRegister.id}`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const handleOpenRegister = async () => {
    const cashAmount = parseFloat(openingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      alert('Please enter a valid cash amount');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/register/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openingCash: cashAmount,
          openedBy: 'Current User' // Replace with actual user
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentRegister(data.register);
        setShowOpenDialog(false);
        setOpeningCash('');
      } else {
        alert('Failed to open register');
      }
    } catch (error) {
      console.error('Error opening register:', error);
      alert('Error opening register');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseRegister = async () => {
    const actualCash = parseFloat(closingAmount);
    if (isNaN(actualCash) || actualCash < 0) {
      alert('Please enter a valid cash count');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/register/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerId: currentRegister?.id,
          actualCash,
          notes
        }),
      });

      if (response.ok) {
        setCurrentRegister(null);
        setShowCloseDialog(false);
        setClosingAmount('');
        setNotes('');
        setShowOpenDialog(true);
      } else {
        alert('Failed to close register');
      }
    } catch (error) {
      console.error('Error closing register:', error);
      alert('Error closing register');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateCashInDrawer = () => {
    if (!currentRegister) return 0;
    return currentRegister.openingCash + salesData.cashSales - salesData.withdrawals;
  };

  const getCashVariance = () => {
    const expected = calculateCashInDrawer();
    const actual = parseFloat(closingAmount) || 0;
    return actual - expected;
  };

  if (!currentRegister) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Plus className="h-6 w-6 text-green-600" />
                Register Closed
              </CardTitle>
              <CardDescription>
                Please open the cash register to start selling
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Open Register Dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Open Cash Register
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  Enter the starting cash amount in your register to begin the day.
                </p>
              </div>

              <div>
                <Label htmlFor="openingCash">Cash In Hand (₹)</Label>
                <Input
                  id="openingCash"
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Enter starting cash amount"
                  className="mt-1"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={handleOpenRegister}
                  disabled={isProcessing || !openingCash}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Opening..." : "Open Register"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time sales monitoring and cash register management
            </p>
          </div>
          <Button 
            onClick={() => setShowCloseDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Minus className="h-4 w-4" />
            Close Register
          </Button>
        </div>

        {/* Register Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Register Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Register Status</p>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Open
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cash In Hand</p>
                <p className="text-lg font-semibold">{formatCurrency(currentRegister.openingCash)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Opened At</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(currentRegister.openedAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Opened By</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {currentRegister.openedBy}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Sales Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(salesData.totalSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                {salesData.transactionCount} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(salesData.cashSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                Physical cash payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">UPI Sales</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(salesData.upiSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                Digital payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Card Sales</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(salesData.cardSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                Credit/Debit cards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Other Payments</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(salesData.otherPayments)}
              </div>
              <p className="text-xs text-muted-foreground">
                Vouchers, gifts, etc.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(salesData.totalRefunds)}
              </div>
              <p className="text-xs text-muted-foreground">
                Money returned to customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
              <Minus className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(salesData.withdrawals)}
              </div>
              <p className="text-xs text-muted-foreground">
                Cash removed from drawer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Cash Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Live Cash Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-medium">Cash In Drawer Calculation:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-blue-600">Opening Cash:</span>
                      <br />
                      <span className="font-semibold">{formatCurrency(currentRegister.openingCash)}</span>
                    </div>
                    <div>
                      <span className="text-green-600">+ Cash Sales:</span>
                      <br />
                      <span className="font-semibold">{formatCurrency(salesData.cashSales)}</span>
                    </div>
                    <div>
                      <span className="text-red-600">- Withdrawals:</span>
                      <br />
                      <span className="font-semibold">{formatCurrency(salesData.withdrawals)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">= Cash in Drawer:</span>
                      <br />
                      <span className="font-bold text-lg">{formatCurrency(calculateCashInDrawer())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Close Register Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5 text-red-600" />
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
                {closingAmount && (
                  <p className={`text-xs mt-1 ${getCashVariance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Variance: {getCashVariance() >= 0 ? '+' : ''}{formatCurrency(getCashVariance())}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
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