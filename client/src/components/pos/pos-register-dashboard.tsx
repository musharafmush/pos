
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CashIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  UserIcon,
  ReceiptIcon,
  CreditCardIcon,
  SmartphoneIcon,
  BanknoteIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";

interface RegisterSession {
  id: number;
  status: string;
  openingCash: number;
  cashInHand: number;
  openedAt: string;
  openedBy: number;
}

interface SalesData {
  totalSales: number;
  salesCount: number;
  cashSales: number;
  upiSales: number;
  otherSales: number;
  totalRefunds: number;
  totalWithdrawals: number;
}

interface RegisterDashboard {
  session: RegisterSession;
  sales: SalesData;
  cashInDrawer: number;
}

export function POSRegisterDashboard() {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionReason, setTransactionReason] = useState("");
  const [notes, setNotes] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Fetch current register session
  const { data: currentSession } = useQuery({
    queryKey: ['/api/register/current'],
    queryFn: async () => {
      const response = await fetch('/api/register/current', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch current session');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch register dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['/api/register/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/register/dashboard', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    enabled: !!currentSession,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Open register mutation
  const openRegisterMutation = useMutation({
    mutationFn: async (data: { openingCash: number; notes?: string }) => {
      const response = await fetch('/api/register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to open register');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/register/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/register/dashboard'] });
      toast({
        title: "Register Opened",
        description: "Cash register has been successfully opened",
      });
      setShowOpenDialog(false);
      setOpeningCash("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Close register mutation
  const closeRegisterMutation = useMutation({
    mutationFn: async (data: { sessionId: number; closingCash: number; notes?: string }) => {
      const response = await fetch('/api/register/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to close register');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/register/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/register/dashboard'] });
      toast({
        title: "Register Closed",
        description: "Cash register has been successfully closed",
      });
      setShowCloseDialog(false);
      setClosingCash("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cash transaction mutation
  const cashTransactionMutation = useMutation({
    mutationFn: async (data: { type: string; amount: number; reason?: string }) => {
      const response = await fetch('/api/register/cash-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to record transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/register/dashboard'] });
      toast({
        title: "Transaction Recorded",
        description: `Cash ${transactionType} has been recorded successfully`,
      });
      setShowCashDialog(false);
      setTransactionAmount("");
      setTransactionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenRegister = () => {
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening cash amount",
        variant: "destructive",
      });
      return;
    }
    openRegisterMutation.mutate({ openingCash: amount, notes });
  };

  const handleCloseRegister = () => {
    if (!currentSession) return;
    
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid closing cash amount",
        variant: "destructive",
      });
      return;
    }
    
    closeRegisterMutation.mutate({ 
      sessionId: currentSession.id, 
      closingCash: amount, 
      notes 
    });
  };

  const handleCashTransaction = () => {
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }
    
    cashTransactionMutation.mutate({
      type: transactionType,
      amount,
      reason: transactionReason,
    });
  };

  if (!currentSession) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <LockClosedIcon className="h-5 w-5" />
              Register Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              The cash register is currently closed. Please open it to start taking sales.
            </p>
            <Button 
              onClick={() => setShowOpenDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <LockOpenIcon className="h-4 w-4 mr-2" />
              Open Register
            </Button>
          </CardContent>
        </Card>

        {/* Open Register Dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CashIcon className="h-5 w-5 text-green-600" />
                Open Cash Register
              </DialogTitle>
              <DialogDescription>
                Enter the amount of cash currently in the register drawer to start your shift.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cash In Hand</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  placeholder="Add any notes about opening the register"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                disabled={openRegisterMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpenRegister}
                disabled={openRegisterMutation.isPending || !openingCash}
                className="bg-green-600 hover:bg-green-700"
              >
                {openRegisterMutation.isPending ? "Opening..." : "Open Register"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Register Status Card */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <LockOpenIcon className="h-5 w-5" />
              Register Status
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {dashboard.session.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-600">Cash In Hand</label>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(dashboard.cashInDrawer)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Opened At</label>
              <p className="text-sm font-medium">
                {new Date(dashboard.session.openedAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Opened By</label>
              <p className="text-sm font-medium flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Cashier {dashboard.session.openedBy}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCashDialog(true)}
                className="flex-1"
              >
                <CashIcon className="h-3 w-3 mr-1" />
                Cash
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCloseDialog(true)}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <LockClosedIcon className="h-3 w-3 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5 text-blue-600" />
            Real-Time Sales Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                <ReceiptIcon className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(dashboard.sales.totalSales)}
              </p>
              <p className="text-xs text-gray-500">
                {dashboard.sales.salesCount} transactions
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <BanknoteIcon className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Cash Sales</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(dashboard.sales.cashSales)}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <SmartphoneIcon className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">UPI Sales</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(dashboard.sales.upiSales)}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
                <CreditCardIcon className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600">Other Payments</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(dashboard.sales.otherSales)}
              </p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Refunds</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(dashboard.sales.totalRefunds)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Withdrawals</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(dashboard.sales.totalWithdrawals)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Cash Tracker */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <CashIcon className="h-5 w-5" />
            Live Cash Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Opening Cash:</span>
              <span className="font-medium">{formatCurrency(dashboard.session.openingCash)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">+ Cash Sales:</span>
              <span className="font-medium text-green-600">{formatCurrency(dashboard.sales.cashSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">- Withdrawals:</span>
              <span className="font-medium text-red-600">{formatCurrency(dashboard.sales.totalWithdrawals)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Cash In Drawer:</span>
              <span className="text-blue-700">{formatCurrency(dashboard.cashInDrawer)}</span>
            </div>
            <p className="text-xs text-gray-600 text-center">
              This reflects the actual cash that should currently be in the drawer
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cash Transaction Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CashIcon className="h-5 w-5 text-blue-600" />
              Cash Transaction
            </DialogTitle>
            <DialogDescription>
              Record a cash deposit or withdrawal from the register.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Transaction Type</label>
              <Select value={transactionType} onValueChange={(value: "deposit" | "withdrawal") => setTransactionType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">
                    <div className="flex items-center gap-2">
                      <PlusIcon className="h-4 w-4 text-green-600" />
                      Deposit (Add Cash)
                    </div>
                  </SelectItem>
                  <SelectItem value="withdrawal">
                    <div className="flex items-center gap-2">
                      <MinusIcon className="h-4 w-4 text-red-600" />
                      Withdrawal (Remove Cash)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                placeholder="Enter reason for this transaction"
                value={transactionReason}
                onChange={(e) => setTransactionReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCashDialog(false)}
              disabled={cashTransactionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCashTransaction}
              disabled={cashTransactionMutation.isPending || !transactionAmount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {cashTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <LockClosedIcon className="h-5 w-5" />
              Close Cash Register
            </DialogTitle>
            <DialogDescription>
              Count the cash in the drawer and close the register to end your shift.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">Expected Cash in Drawer:</p>
              <p className="text-xl font-bold text-blue-800">
                {formatCurrency(dashboard.cashInDrawer)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Actual Cash Count</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                placeholder="Add any notes about closing the register"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(false)}
              disabled={closeRegisterMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseRegister}
              disabled={closeRegisterMutation.isPending || !closingCash}
              variant="destructive"
            >
              {closeRegisterMutation.isPending ? "Closing..." : "Close Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
