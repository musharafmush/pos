
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Archive,
  Plus,
  Minus,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  CreditCard,
  Building,
  Wallet,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Calendar,
  Settings,
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

interface CashTransaction {
  id: string;
  registerId: string;
  type: 'add' | 'remove' | 'sale' | 'refund' | 'withdrawal';
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank' | 'cheque' | 'other';
  amount: number;
  reason: string;
  reference?: string;
  createdAt: string;
  createdBy: string;
}

export default function CashRegisterDashboard() {
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Form states
  const [openingAmount, setOpeningAmount] = useState("");
  const [transactionType, setTransactionType] = useState<'add' | 'remove'>('add');
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionReason, setTransactionReason] = useState("");
  const [transactionMethod, setTransactionMethod] = useState("cash");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data - In real app, this would come from API
  const [registers, setRegisters] = useState<CashRegister[]>([
    {
      id: "REG001",
      status: "open",
      openingCash: 5000,
      currentCash: 8500,
      cashReceived: 3000,
      upiReceived: 2500,
      cardReceived: 1500,
      bankReceived: 500,
      chequeReceived: 0,
      otherReceived: 200,
      totalWithdrawals: 1000,
      totalRefunds: 200,
      totalSales: 7500,
      openedAt: new Date().toISOString(),
      openedBy: "Admin User",
    },
    {
      id: "REG002",
      status: "closed",
      openingCash: 3000,
      currentCash: 4800,
      cashReceived: 2500,
      upiReceived: 1800,
      cardReceived: 800,
      bankReceived: 200,
      chequeReceived: 100,
      otherReceived: 0,
      totalWithdrawals: 500,
      totalRefunds: 100,
      totalSales: 5400,
      openedAt: new Date(Date.now() - 86400000).toISOString(),
      closedAt: new Date(Date.now() - 43200000).toISOString(),
      openedBy: "Admin User",
      closedBy: "Admin User",
    },
  ]);

  const [transactions, setTransactions] = useState<CashTransaction[]>([
    {
      id: "TXN001",
      registerId: "REG001",
      type: "sale",
      paymentMethod: "cash",
      amount: 1500,
      reason: "Product sale",
      reference: "INV001",
      createdAt: new Date().toISOString(),
      createdBy: "Admin User",
    },
    {
      id: "TXN002",
      registerId: "REG001",
      type: "add",
      paymentMethod: "upi",
      amount: 1000,
      reason: "UPI payment received",
      reference: "UPI123",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: "Admin User",
    },
  ]);

  // Get current open register
  const currentRegister = registers.find(r => r.status === 'open');

  // Filter registers
  const filteredRegisters = registers.filter(register => {
    if (filterStatus !== "all" && register.status !== filterStatus) return false;
    if (searchTerm && !register.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFilter && !register.openedAt.startsWith(dateFilter)) return false;
    return true;
  });

  // Get transactions for selected register
  const registerTransactions = selectedRegister 
    ? transactions.filter(t => t.registerId === selectedRegister.id)
    : [];

  // Open new register
  const handleOpenRegister = () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const newRegister: CashRegister = {
      id: `REG${String(registers.length + 1).padStart(3, '0')}`,
      status: 'open',
      openingCash: parseFloat(openingAmount),
      currentCash: parseFloat(openingAmount),
      cashReceived: 0,
      upiReceived: 0,
      cardReceived: 0,
      bankReceived: 0,
      chequeReceived: 0,
      otherReceived: 0,
      totalWithdrawals: 0,
      totalRefunds: 0,
      totalSales: 0,
      openedAt: new Date().toISOString(),
      openedBy: "Admin User",
    };

    setRegisters(prev => [newRegister, ...prev]);
    setOpeningAmount("");
    setShowOpenDialog(false);
    setIsProcessing(false);

    toast({
      title: "Register Opened",
      description: `Register ${newRegister.id} opened with ${formatCurrency(parseFloat(openingAmount))}`,
    });
  };

  // Add cash transaction
  const handleCashTransaction = () => {
    if (!selectedRegister || selectedRegister.status !== 'open') return;
    
    const amount = parseFloat(transactionAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!transactionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this transaction",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Create transaction
    const newTransaction: CashTransaction = {
      id: `TXN${String(transactions.length + 1).padStart(3, '0')}`,
      registerId: selectedRegister.id,
      type: transactionType,
      paymentMethod: transactionMethod as any,
      amount,
      reason: transactionReason.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Admin User",
    };

    setTransactions(prev => [newTransaction, ...prev]);

    // Update register
    setRegisters(prev => prev.map(register => {
      if (register.id === selectedRegister.id) {
        const newCash = transactionType === 'add' 
          ? register.currentCash + amount 
          : Math.max(0, register.currentCash - amount);

        const updatedRegister = {
          ...register,
          currentCash: newCash,
        };

        // Update payment method totals
        if (transactionType === 'add') {
          switch (transactionMethod) {
            case 'cash':
              updatedRegister.cashReceived += amount;
              break;
            case 'upi':
              updatedRegister.upiReceived += amount;
              break;
            case 'card':
              updatedRegister.cardReceived += amount;
              break;
            case 'bank':
              updatedRegister.bankReceived += amount;
              break;
            case 'cheque':
              updatedRegister.chequeReceived += amount;
              break;
            case 'other':
              updatedRegister.otherReceived += amount;
              break;
          }
        }

        return updatedRegister;
      }
      return register;
    }));

    // Update selected register
    setSelectedRegister(prev => {
      if (!prev) return null;
      const updated = registers.find(r => r.id === prev.id);
      return updated || prev;
    });

    setTransactionAmount("");
    setTransactionReason("");
    setShowTransactionDialog(false);
    setIsProcessing(false);

    toast({
      title: "Transaction Processed",
      description: `${transactionType === 'add' ? 'Added' : 'Removed'} ${formatCurrency(amount)}`,
    });
  };

  // Process withdrawal
  const handleWithdrawal = () => {
    if (!selectedRegister || selectedRegister.status !== 'open') return;
    
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > selectedRegister.currentCash) {
      toast({
        title: "Insufficient Cash",
        description: "Cannot withdraw more than available cash",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Create withdrawal transaction
    const newTransaction: CashTransaction = {
      id: `TXN${String(transactions.length + 1).padStart(3, '0')}`,
      registerId: selectedRegister.id,
      type: 'withdrawal',
      paymentMethod: 'cash',
      amount,
      reason: withdrawalNote || 'Cash withdrawal',
      createdAt: new Date().toISOString(),
      createdBy: "Admin User",
    };

    setTransactions(prev => [newTransaction, ...prev]);

    // Update register
    setRegisters(prev => prev.map(register => {
      if (register.id === selectedRegister.id) {
        return {
          ...register,
          currentCash: register.currentCash - amount,
          totalWithdrawals: register.totalWithdrawals + amount,
        };
      }
      return register;
    }));

    setWithdrawalAmount("");
    setWithdrawalNote("");
    setShowWithdrawalDialog(false);
    setIsProcessing(false);

    toast({
      title: "Withdrawal Processed",
      description: `Withdrew ${formatCurrency(amount)}`,
    });
  };

  // Close register
  const handleCloseRegister = () => {
    if (!selectedRegister || selectedRegister.status !== 'open') return;

    setIsProcessing(true);

    setRegisters(prev => prev.map(register => {
      if (register.id === selectedRegister.id) {
        return {
          ...register,
          status: 'closed' as const,
          closedAt: new Date().toISOString(),
          closedBy: "Admin User",
        };
      }
      return register;
    }));

    setSelectedRegister(null);
    setShowCloseDialog(false);
    setIsProcessing(false);

    toast({
      title: "Register Closed",
      description: `Register ${selectedRegister.id} closed successfully`,
    });
  };

  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 text-white p-3 rounded-xl shadow-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cash Register Dashboard</h1>
                <p className="text-sm text-gray-500">Manage cash registers and transactions</p>
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
                  <Plus className="h-4 w-4 mr-2" />
                  Open New Register
                </Button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-600 font-medium">Current Register</div>
                  <div className="text-lg font-bold text-green-700">{currentRegister.id}</div>
                  <div className="text-sm text-green-600">{formatCurrency(currentRegister.currentCash)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registers</p>
                  <div className="text-2xl font-bold">{registers.length}</div>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Archive className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Registers</p>
                  <div className="text-2xl font-bold">{registers.filter(r => r.status === 'open').length}</div>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <div className="text-2xl font-bold">
                    {formatCurrency(registers.reduce((sum, r) => sum + r.totalSales, 0))}
                  </div>
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
                  <p className="text-sm font-medium text-gray-600">Total Cash</p>
                  <div className="text-2xl font-bold">
                    {formatCurrency(registers.reduce((sum, r) => sum + r.currentCash, 0))}
                  </div>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Register Management</h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Search Register</Label>
                <div className="relative">
                  <Input
                    placeholder="Search by ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Status Filter</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Date Filter</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registers Table */}
        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Register ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opening Cash</TableHead>
                  <TableHead>Current Cash</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Opened By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegisters.map((register) => (
                  <TableRow key={register.id}>
                    <TableCell className="font-mono font-medium">{register.id}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={register.status === 'open' ? 'default' : 'secondary'}
                        className={register.status === 'open' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {register.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(register.openingCash)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(register.currentCash)}</TableCell>
                    <TableCell>{formatCurrency(register.totalSales)}</TableCell>
                    <TableCell>
                      {new Date(register.openedAt).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>{register.openedBy}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRegister(register);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {register.status === 'open' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRegister(register);
                                setShowTransactionDialog(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRegister(register);
                                setShowWithdrawalDialog(true);
                              }}
                            >
                              <TrendingDown className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRegister(register)}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Close Register</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to close register {register.id}?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleCloseRegister}>
                                    Close Register
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Open Register Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Open New Cash Register
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">Enter the opening cash amount for the new register.</p>
            </div>

            <div>
              <Label htmlFor="openingAmount">Opening Cash Amount</Label>
              <Input
                id="openingAmount"
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Enter opening amount"
                className="mt-1"
                step="0.01"
                min="0"
                autoFocus
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
                disabled={isProcessing || !openingAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? "Opening..." : "Open Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Cash Transaction - {selectedRegister?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                Current Cash: {selectedRegister ? formatCurrency(selectedRegister.currentCash) : '---'}
              </p>
            </div>

            <div>
              <Label>Transaction Type</Label>
              <Select value={transactionType} onValueChange={(value: 'add' | 'remove') => setTransactionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Cash</SelectItem>
                  <SelectItem value="remove">Remove Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={transactionMethod} onValueChange={setTransactionMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transactionAmount">Amount</Label>
              <Input
                id="transactionAmount"
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="transactionReason">Reason</Label>
              <Textarea
                id="transactionReason"
                value={transactionReason}
                onChange={(e) => setTransactionReason(e.target.value)}
                placeholder="Enter reason for transaction"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTransactionDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCashTransaction}
                disabled={isProcessing || !transactionAmount || !transactionReason}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? "Processing..." : "Process Transaction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Cash Withdrawal - {selectedRegister?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-orange-800 text-sm">
                Available Cash: {selectedRegister ? formatCurrency(selectedRegister.currentCash) : '---'}
              </p>
            </div>

            <div>
              <Label htmlFor="withdrawalAmount">Withdrawal Amount</Label>
              <Input
                id="withdrawalAmount"
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Enter withdrawal amount"
                className="mt-1"
                step="0.01"
                min="0"
                max={selectedRegister?.currentCash}
              />
            </div>

            <div>
              <Label htmlFor="withdrawalNote">Note (Optional)</Label>
              <Textarea
                id="withdrawalNote"
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                placeholder="e.g., Cash sent to bank"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawalDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawal}
                disabled={
                  isProcessing || 
                  !withdrawalAmount || 
                  parseFloat(withdrawalAmount) <= 0 || 
                  (selectedRegister && parseFloat(withdrawalAmount) > selectedRegister.currentCash)
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isProcessing ? "Processing..." : "Process Withdrawal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Register Details - {selectedRegister?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedRegister && (
            <div className="space-y-6">
              {/* Register Summary */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Register Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={selectedRegister.status === 'open' ? 'default' : 'secondary'}>
                        {selectedRegister.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opened At:</span>
                      <span>{new Date(selectedRegister.openedAt).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opened By:</span>
                      <span>{selectedRegister.openedBy}</span>
                    </div>
                    {selectedRegister.closedAt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Closed At:</span>
                          <span>{new Date(selectedRegister.closedAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Closed By:</span>
                          <span>{selectedRegister.closedBy}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cash Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Cash:</span>
                      <span className="font-semibold">{formatCurrency(selectedRegister.openingCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Cash:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(selectedRegister.currentCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Withdrawals:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(selectedRegister.totalWithdrawals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Refunds:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(selectedRegister.totalRefunds)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Methods Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Methods Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedRegister.cashReceived)}</div>
                      <div className="text-sm text-gray-600">Cash Payments</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(selectedRegister.upiReceived)}</div>
                      <div className="text-sm text-gray-600">UPI Payments</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{formatCurrency(selectedRegister.cardReceived)}</div>
                      <div className="text-sm text-gray-600">Card Payments</div>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedRegister.bankReceived)}</div>
                      <div className="text-sm text-gray-600">Bank Transfer</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{formatCurrency(selectedRegister.chequeReceived)}</div>
                      <div className="text-sm text-gray-600">Cheque Payments</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{formatCurrency(selectedRegister.otherReceived)}</div>
                      <div className="text-sm text-gray-600">Other Payments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {registerTransactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registerTransactions.slice(0, 10).map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{new Date(transaction.createdAt).toLocaleTimeString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === 'add' ? 'default' : 'secondary'}>
                                {transaction.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{transaction.paymentMethod}</TableCell>
                            <TableCell className={`font-semibold ${
                              transaction.type === 'add' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'add' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>{transaction.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found for this register
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
