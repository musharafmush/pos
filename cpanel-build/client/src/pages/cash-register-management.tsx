import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  Plus, 
  Minus, 
  Calculator, 
  Clock, 
  User, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Receipt,
  FileText,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Banknote,
  CreditCard,
  Wallet
} from "lucide-react";

interface CashRegister {
  id: number;
  registerId: string;
  status: 'open' | 'closed';
  openingCash: number;
  currentCash: number;
  cashReceived: number;
  upiReceived: number;
  cardReceived: number;
  bankReceived: number;
  chequeReceived: number;
  otherReceived: number;
  totalWithdrawals: number;
  totalRefunds: number;
  totalSales: number;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
}

interface CashTransaction {
  id: number;
  type: 'opening' | 'sale' | 'withdrawal' | 'deposit' | 'closing';
  amount: number;
  reason: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export default function CashRegisterManagement() {
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active cash register
  const { data: activeCashRegister, isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ["/api/cash-register/active"],
    queryFn: async () => {
      const response = await fetch('/api/cash-register/active');
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch active register');
      }
      return response.json();
    },
    refetchInterval: 5000
  });

  // Fetch recent registers
  const { data: recentRegisters, isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
    queryKey: ["/api/cash-register/recent"],
    queryFn: async () => {
      const response = await fetch('/api/cash-register/recent');
      if (!response.ok) throw new Error('Failed to fetch recent registers');
      return response.json();
    }
  });

  // Fetch transactions for selected register
  const { data: transactions } = useQuery({
    queryKey: ["/api/cash-register/transactions", selectedRegister?.id],
    queryFn: async () => {
      if (!selectedRegister?.id) return [];
      const response = await fetch(`/api/cash-register/${selectedRegister.id}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!selectedRegister?.id
  });

  // Open register mutation
  const openRegisterMutation = useMutation({
    mutationFn: async (data: { openingCash: number; notes: string }) => {
      const response = await fetch('/api/cash-register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open register');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/recent"] });
      setShowOpenRegister(false);
      setOpeningAmount("");
      setOpeningNotes("");
      toast({
        title: "Register Opened Successfully",
        description: "Cash register is now ready for transactions"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Open Register",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Close register mutation
  const closeRegisterMutation = useMutation({
    mutationFn: async (data: { registerId: number; notes: string }) => {
      const response = await fetch(`/api/cash-register/${data.registerId}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.notes })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close register');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/recent"] });
      setShowCloseRegister(false);
      setClosingNotes("");
      toast({
        title: "Register Closed Successfully",
        description: "End of day process completed"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Close Register",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleOpenRegister = () => {
    const amount = parseFloat(openingAmount);
    if (!amount || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive"
      });
      return;
    }

    openRegisterMutation.mutate({
      openingCash: amount,
      notes: openingNotes || `Register opened with ${formatCurrency(amount)}`
    });
  };

  const handleCloseRegister = () => {
    if (!activeCashRegister?.id) {
      toast({
        title: "No Active Register",
        description: "No register is currently open",
        variant: "destructive"
      });
      return;
    }

    closeRegisterMutation.mutate({
      registerId: activeCashRegister.id,
      notes: closingNotes || "Register closed from dashboard"
    });
  };

  const viewTransactions = (register: CashRegister) => {
    setSelectedRegister(register);
    setShowTransactionHistory(true);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto p-6">
        {/* Header with Enhanced Action Buttons */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cash Register Management</h1>
            <p className="text-gray-600 mt-2">Manage cash register operations and view transaction history</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowOpenRegister(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Open New Register
            </Button>
            <Button
              onClick={() => refetchActive()}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Register Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeCashRegister ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Active Register Status
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    No Active Register
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : activeCashRegister ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        OPEN
                      </Badge>
                      <span className="font-medium">{activeCashRegister.registerId}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Current Cash</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(activeCashRegister.currentCash)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">Opening Cash</div>
                      <div className="font-semibold">{formatCurrency(activeCashRegister.openingCash)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Total Sales</div>
                      <div className="font-semibold">{formatCurrency(activeCashRegister.totalSales)}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Cash Received</div>
                      <div className="font-semibold">{formatCurrency(activeCashRegister.cashReceived)}</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-sm text-gray-600">Withdrawals</div>
                      <div className="font-semibold">{formatCurrency(activeCashRegister.totalWithdrawals)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-600">Opened by: {activeCashRegister.openedBy}</div>
                      <div className="text-sm text-gray-600">
                        Opened at: {new Date(activeCashRegister.openedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewTransactions(activeCashRegister)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Transactions
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowCloseRegister(true)}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Close Register
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Register</h3>
                  <p className="text-gray-600 mb-4">Open a cash register to start processing transactions</p>
                  <Button
                    onClick={() => setShowOpenRegister(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Open Register
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => setShowOpenRegister(true)}
                  disabled={!!activeCashRegister}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Unlock className="w-5 h-5 mr-2" />
                  Open New Register
                </Button>
                <Button
                  onClick={() => setShowCloseRegister(true)}
                  disabled={!activeCashRegister}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Close Current Register
                </Button>
              </div>
              
              <Separator />
              
              {/* Secondary Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-medium py-2.5 transition-all duration-200"
                  onClick={() => {
                    if (activeCashRegister) {
                      viewTransactions(activeCashRegister);
                    }
                  }}
                  disabled={!activeCashRegister}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Transaction History
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 font-medium py-2.5 transition-all duration-200"
                  onClick={() => refetchActive()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 font-medium py-2.5 transition-all duration-200"
                  onClick={() => refetchRecent()}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Reload History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Registers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Registers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentRegisters && recentRegisters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Register ID</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Opening Cash</th>
                      <th className="text-left py-3 px-4">Total Sales</th>
                      <th className="text-left py-3 px-4">Current Cash</th>
                      <th className="text-left py-3 px-4">Opened By</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRegisters.map((register: any) => (
                      <tr key={register.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{register.register_id}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={register.status === 'open' ? 'default' : 'secondary'}
                            className={register.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {register.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{formatCurrency(register.opening_cash)}</td>
                        <td className="py-3 px-4">{formatCurrency(register.total_sales)}</td>
                        <td className="py-3 px-4">{formatCurrency(register.current_cash)}</td>
                        <td className="py-3 px-4">{register.opened_by}</td>
                        <td className="py-3 px-4">
                          {new Date(register.opened_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewTransactions(register)}
                              className="bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 font-medium px-3 py-2 shadow-sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {register.status === 'open' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRegister(register);
                                  setShowCloseRegister(true);
                                }}
                                className="bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 text-red-700 font-medium px-3 py-2 shadow-sm"
                              >
                                <Lock className="w-4 h-4 mr-1" />
                                Close
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No register history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Register Dialog */}
        <Dialog open={showOpenRegister} onOpenChange={setShowOpenRegister}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-green-600" />
                Open Cash Register
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="opening-amount">Opening Cash Amount</Label>
                <Input
                  id="opening-amount"
                  type="number"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="opening-notes">Notes (Optional)</Label>
                <Textarea
                  id="opening-notes"
                  placeholder="Add any notes about opening the register..."
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowOpenRegister(false)}
                  disabled={openRegisterMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenRegister}
                  disabled={openRegisterMutation.isPending || !openingAmount}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {openRegisterMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Open Register
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Close Register Dialog */}
        <Dialog open={showCloseRegister} onOpenChange={setShowCloseRegister}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                Close Cash Register
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeCashRegister && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Register Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Register ID:</span>
                      <span className="font-medium">{activeCashRegister.registerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opening Cash:</span>
                      <span>{formatCurrency(activeCashRegister.openingCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Cash:</span>
                      <span className="font-medium">{formatCurrency(activeCashRegister.currentCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <span>{formatCurrency(activeCashRegister.totalSales)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="closing-notes">Closing Notes (Optional)</Label>
                <Textarea
                  id="closing-notes"
                  placeholder="Add any notes about closing the register..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseRegister(false)}
                  disabled={closeRegisterMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseRegister}
                  disabled={closeRegisterMutation.isPending}
                  variant="destructive"
                >
                  {closeRegisterMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Close Register
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction History Dialog */}
        <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Transaction History - {selectedRegister?.registerId}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-96">
              {transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction: CashTransaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              transaction.type === 'opening' ? 'bg-blue-50 text-blue-700' :
                              transaction.type === 'sale' ? 'bg-green-50 text-green-700' :
                              transaction.type === 'withdrawal' ? 'bg-red-50 text-red-700' :
                              transaction.type === 'deposit' ? 'bg-purple-50 text-purple-700' :
                              'bg-gray-50 text-gray-700'
                            }
                          >
                            {transaction.type.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{transaction.reason}</span>
                        </div>
                        <span className="font-bold text-lg">
                          {transaction.type === 'withdrawal' ? '-' : '+'}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>By: {transaction.createdBy}</div>
                        <div>At: {new Date(transaction.createdAt).toLocaleString()}</div>
                        {transaction.notes && <div>Notes: {transaction.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No transactions found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}