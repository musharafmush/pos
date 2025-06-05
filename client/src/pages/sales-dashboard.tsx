import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building2, 
  FileText, 
  CircleDot,
  Clock,
  User,
  Calculator,
  RefreshCw,
  Lock,
  Unlock
} from "lucide-react";

interface CashRegister {
  id: string;
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

interface SalesSummary {
  totalSales: number;
  cashReceived: number;
  upiReceived: number;
  cardReceived: number;
  bankReceived: number;
  chequeReceived: number;
  otherReceived: number;
  totalRefunds: number;
  transactionCount: number;
}

interface Sale {
  id: number;
  total: string;
  paymentMethod: string;
  saleDate: string;
  customerId?: number;
}

export default function SalesDashboard() {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [withdrawal, setWithdrawal] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();

  // Fetch current register status
  const { data: currentRegister, refetch: refetchRegister } = useQuery<CashRegister>({
    queryKey: ["/api/register/current"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch sales summary
  const { data: salesSummary, refetch: refetchSummary } = useQuery<SalesSummary>({
    queryKey: ["/api/register/sales-summary"],
    enabled: !!currentRegister && currentRegister.status === 'open',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent sales
  const { data: recentSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    refetchInterval: 30000,
  });

  const openRegister = async () => {
    if (!openingCash || parseFloat(openingCash) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening cash amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: parseFloat(openingCash),
          openedBy: "Admin", // You might want to get this from auth context
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to open register");
      }

      toast({
        title: "Register Opened",
        description: `Register opened with ${formatCurrency(parseFloat(openingCash))}`,
      });

      setShowOpenModal(false);
      setOpeningCash("");
      refetchRegister();
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

  const closeRegister = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedBy: "Admin",
          withdrawal: withdrawal ? parseFloat(withdrawal) : 0,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close register");
      }

      toast({
        title: "Register Closed",
        description: "Register has been closed successfully",
      });

      setShowCloseModal(false);
      setWithdrawal("");
      setNotes("");
      refetchRegister();
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

  const calculateCashInDrawer = () => {
    if (!currentRegister || !salesSummary) return 0;
    return currentRegister.openingCash + salesSummary.cashReceived - (currentRegister.totalWithdrawals || 0);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-muted-foreground">Real-time sales and register management</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRegister();
              refetchSummary();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!currentRegister || currentRegister.status === 'closed' ? (
            <Button onClick={() => setShowOpenModal(true)}>
              <Unlock className="h-4 w-4 mr-2" />
              Open Register
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setShowCloseModal(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Close Register
            </Button>
          )}
        </div>
      </div>

      {/* Register Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentRegister?.status === 'open' ? 
              <Unlock className="h-5 w-5 text-green-600" /> : 
              <Lock className="h-5 w-5 text-red-600" />
            }
            Register Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentRegister ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Register Status</Label>
                <Badge variant={currentRegister.status === 'open' ? 'default' : 'secondary'} className="mt-1">
                  {currentRegister.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Opening Cash</Label>
                <p className="font-semibold">{formatCurrency(currentRegister.openingCash)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Opened At</Label>
                <p className="font-semibold">{formatTime(currentRegister.openedAt)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Opened By</Label>
                <p className="font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {currentRegister.openedBy}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Register is Closed</p>
              <p className="text-muted-foreground">Open the register to start taking sales</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Overview - Only show when register is open */}
      {currentRegister?.status === 'open' && salesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.totalSales)}</div>
              <p className="text-xs text-muted-foreground">{salesSummary.transactionCount} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.cashReceived)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                UPI Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.upiReceived)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.cardReceived)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Methods Breakdown */}
      {currentRegister?.status === 'open' && salesSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Cash</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.cashReceived)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>UPI</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.upiReceived)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Card</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.cardReceived)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Bank</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.bankReceived)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Cheque</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.chequeReceived)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4" />
                  <span>Other</span>
                </div>
                <span className="font-semibold">{formatCurrency(salesSummary.otherReceived)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Calculation */}
      {currentRegister?.status === 'open' && salesSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Live Cash Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Opening Cash:</span>
                <span>{formatCurrency(currentRegister.openingCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>+ Cash Sales:</span>
                <span>{formatCurrency(salesSummary.cashReceived)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>- Withdrawals:</span>
                <span>{formatCurrency(currentRegister.totalWithdrawals || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Cash in Drawer:</span>
                <span className="text-green-600">{formatCurrency(calculateCashInDrawer())}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm font-mono">
                Cash In Drawer = Opening Cash + Cash Sales - Withdrawals
              </p>
              <p className="text-sm font-mono">
                = {formatCurrency(currentRegister.openingCash)} + {formatCurrency(salesSummary.cashReceived)} - {formatCurrency(currentRegister.totalWithdrawals || 0)} = {formatCurrency(calculateCashInDrawer())}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {recentSales && recentSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSales.slice(0, 10).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                      #{sale.id}
                    </div>
                    <div>
                      <p className="font-semibold">{formatCurrency(parseFloat(sale.total))}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(sale.saleDate)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{sale.paymentMethod.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Register Modal */}
      <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔓 Open Register</DialogTitle>
            <DialogDescription>
              Enter the initial cash amount to start the day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="opening-cash">🔘 Cash In Hand</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="opening-cash"
                  type="number"
                  placeholder="0.00"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOpenModal(false)}>
                Cancel
              </Button>
              <Button onClick={openRegister} disabled={isProcessing}>
                {isProcessing ? "Opening..." : "Open Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Register Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔒 Close Register</DialogTitle>
            <DialogDescription>
              End of day register closure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {salesSummary && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Total Sales:</span>
                  <span className="font-semibold">{formatCurrency(salesSummary.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Cash:</span>
                  <span className="font-semibold">{formatCurrency(calculateCashInDrawer())}</span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="withdrawal">Withdrawal Amount (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="withdrawal"
                  type="number"
                  placeholder="0.00"
                  value={withdrawal}
                  onChange={(e) => setWithdrawal(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="End of day notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCloseModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={closeRegister} disabled={isProcessing}>
                {isProcessing ? "Closing..." : "Close Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}