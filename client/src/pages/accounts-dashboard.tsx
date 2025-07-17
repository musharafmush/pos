import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend
} from "recharts";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  RefreshCw,
  Database,
  Wifi,
  ArrowUpIcon,
  ArrowDownIcon,
  DollarSignIcon,
  CreditCardIcon,
  BanknoteIcon,
  WalletIcon,
  FileTextIcon,
  DownloadIcon,
  CalendarIcon,
  FilterIcon,
  Settings,
  Eye,
  ChevronUp,
  ChevronDown,
  MinusIcon
} from "lucide-react";
import { format } from "date-fns";
import { useFormatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  name: string;
  type: "cash" | "bank" | "asset" | "liability" | "revenue";
  balance: number;
  status: "active" | "inactive";
  registerId?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  account: string;
  amount: number;
  description: string;
  reference: string;
  paymentMethod?: string;
}

export default function AccountsDashboard() {
  const [selectedTab, setSelectedTab] = useState("accounts");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank",
    balance: "0",
    accountNumber: ""
  });

  const [newTransaction, setNewTransaction] = useState({
    type: "income",
    category: "",
    account: "",
    amount: "",
    description: "",
    reference: ""
  });

  const [depositData, setDepositData] = useState({
    amount: "",
    paymentMethod: "cash",
    reason: "",
    notes: ""
  });

  const [withdrawalData, setWithdrawalData] = useState({
    amount: "",
    reason: "",
    notes: ""
  });

  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real-time data from POS system
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ['/api/purchases'],
    queryFn: async () => {
      const response = await fetch('/api/purchases');
      if (!response.ok) throw new Error('Failed to fetch purchases');
      return response.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true
  });

  const { data: cashRegisterData, isLoading: cashRegisterLoading, refetch: refetchCashRegister } = useQuery({
    queryKey: ['/api/cash-register/active'],
    queryFn: async () => {
      const response = await fetch('/api/cash-register/active');
      if (!response.ok) throw new Error('Failed to fetch cash register');
      return response.json();
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true
  });

  // Calculate financial metrics
  const calculateMetrics = () => {
    const totalSalesRevenue = salesData?.reduce((sum: number, sale: any) => {
      return sum + parseFloat(sale.total || 0);
    }, 0) || 0;

    const totalPurchasesCost = purchasesData?.reduce((sum: number, purchase: any) => {
      return sum + parseFloat(purchase.total || 0);
    }, 0) || 0;

    const todaysSales = salesData?.filter((sale: any) => {
      const saleDate = new Date(sale.created_at || sale.createdAt);
      const today = new Date();
      return saleDate.toDateString() === today.toDateString();
    }).reduce((sum: number, sale: any) => sum + parseFloat(sale.total || 0), 0) || 0;

    return {
      totalAssets: totalSalesRevenue,
      totalLiabilities: 0,
      netWorth: totalSalesRevenue - totalPurchasesCost,
      todaysPnL: todaysSales,
      totalRevenue: totalSalesRevenue,
      totalExpenses: totalPurchasesCost
    };
  };

  const metrics = calculateMetrics();

  // Generate accounts from real data
  const generateAccounts = (): Account[] => {
    const accounts: Account[] = [];

    // Cash Register Account
    if (cashRegisterData) {
      accounts.push({
        id: "cash-register",
        name: `Cash Register (${cashRegisterData.registerId || 'REG1752219071011'})`,
        type: "cash",
        balance: parseFloat(cashRegisterData.balance || 0),
        status: "active",
        registerId: cashRegisterData.registerId
      });
    }

    // Business Revenue Account
    accounts.push({
      id: "business-revenue",
      name: "Business Revenue Account",
      type: "bank",
      balance: metrics.totalRevenue,
      status: "active"
    });

    // Inventory Investment Account
    accounts.push({
      id: "inventory-investment",
      name: "Inventory Investment",
      type: "asset",
      balance: metrics.totalExpenses,
      status: "active"
    });

    // Net Profit/Loss Account
    accounts.push({
      id: "net-profit",
      name: "Net Profit/Loss",
      type: "asset",
      balance: metrics.netWorth,
      status: "active"
    });

    return accounts;
  };

  const accounts = generateAccounts();

  // Generate transactions from sales and purchases
  const generateTransactions = (): Transaction[] => {
    const transactions: Transaction[] = [];

    // Sales transactions
    salesData?.forEach((sale: any) => {
      transactions.push({
        id: `sale-${sale.id}`,
        date: sale.created_at || sale.createdAt || new Date().toISOString(),
        type: "income",
        category: "Sales",
        account: sale.paymentMethod === 'cash' ? "Cash Register" : "Business Revenue Account",
        amount: parseFloat(sale.total || 0),
        description: `Sale #${sale.orderNumber || sale.id} - ${sale.customerName || 'Walk-in Customer'}`,
        reference: sale.orderNumber || `SAL-${sale.id}`,
        paymentMethod: sale.paymentMethod || 'cash'
      });
    });

    // Purchase transactions
    purchasesData?.forEach((purchase: any) => {
      transactions.push({
        id: `purchase-${purchase.id}`,
        date: purchase.created_at || purchase.createdAt || new Date().toISOString(),
        type: "expense",
        category: "Inventory",
        account: "Business Revenue Account",
        amount: parseFloat(purchase.total || 0),
        description: `Purchase #${purchase.orderNumber || purchase.id}`,
        reference: purchase.orderNumber || `PUR-${purchase.id}`
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const transactions = generateTransactions();

  // Chart data for account distribution
  const chartData = accounts.map(acc => ({
    name: acc.name,
    value: Math.abs(acc.balance),
    color: acc.type === 'cash' ? '#10b981' : acc.type === 'bank' ? '#3b82f6' : '#f59e0b'
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleCreateAccount = () => {
    console.log("Creating account:", newAccount);
    setShowNewAccountDialog(false);
    setNewAccount({ name: "", type: "bank", balance: "0", accountNumber: "" });
  };

  const handleAddTransaction = () => {
    setShowTransactionDialog(true);
  };

  const handleCreateTransaction = () => {
    console.log("Creating transaction:", newTransaction);
    setShowTransactionDialog(false);
    setNewTransaction({
      type: "income",
      category: "",
      account: "",
      amount: "",
      description: "",
      reference: ""
    });
  };

  const refreshAllData = () => {
    refetchSales();
    refetchPurchases();
    refetchCashRegister();
  };

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (data: typeof depositData) => {
      if (!cashRegisterData?.id) {
        throw new Error("No active cash register found");
      }

      const response = await fetch(`/api/cash-register/${cashRegisterData.id}/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'deposit',
          amount: parseFloat(data.amount),
          paymentMethod: data.paymentMethod,
          reason: data.reason || 'Manual deposit',
          notes: data.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process deposit');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit Successful",
        description: `Amount ${formatCurrency(parseFloat(depositData.amount))} has been deposited to the cash register.`,
      });
      setShowDepositDialog(false);
      setDepositData({ amount: "", paymentMethod: "cash", reason: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/active'] });
      refreshAllData();
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to process deposit",
        variant: "destructive"
      });
    }
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (data: typeof withdrawalData) => {
      if (!cashRegisterData?.id) {
        throw new Error("No active cash register found");
      }

      const response = await fetch(`/api/cash-register/${cashRegisterData.id}/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'withdrawal',
          amount: parseFloat(data.amount),
          paymentMethod: 'cash',
          reason: data.reason || 'Manual withdrawal',
          notes: data.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process withdrawal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Successful",
        description: `Amount ${formatCurrency(parseFloat(withdrawalData.amount))} has been withdrawn from the cash register.`,
      });
      setShowWithdrawDialog(false);
      setWithdrawalData({ amount: "", reason: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register/active'] });
      refreshAllData();
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive"
      });
    }
  });

  const handleDeposit = () => {
    if (!depositData.amount || parseFloat(depositData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive"
      });
      return;
    }
    depositMutation.mutate(depositData);
  };

  const handleWithdrawal = () => {
    if (!withdrawalData.amount || parseFloat(withdrawalData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }
    withdrawalMutation.mutate(withdrawalData);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time financial tracking with POS Enhanced integration</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Wifi className="w-3 h-3 mr-1" />
              Live Data - Updates every 5s
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllData}
              disabled={salesLoading || purchasesLoading || cashRegisterLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${salesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/pos-enhanced', '_blank')}
            >
              <Database className="h-4 w-4 mr-2" />
              POS System
            </Button>
            <Button onClick={() => setShowNewAccountDialog(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Account
            </Button>
            <Button onClick={handleAddTransaction}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
            <Button 
              onClick={() => setShowDepositDialog(true)}
              className="bg-green-600 hover:bg-green-700"
              disabled={!cashRegisterData?.id}
            >
              <ArrowUpIcon className="h-4 w-4 mr-2" />
              Amount Deposit
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              className="bg-red-600 hover:bg-red-700"
              disabled={!cashRegisterData?.id}
            >
              <ArrowDownIcon className="h-4 w-4 mr-2" />
              Amount Withdrawal
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalAssets)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <ChevronUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalLiabilities)}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDownIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <ChevronDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">-2.3%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Worth</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.netWorth)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <WalletIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <ChevronUp className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">+8.1%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's P&L</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.todaysPnL)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <DollarSignIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <ChevronUp className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm text-purple-600">+15.2%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {account.type === 'cash' ? (
                            <BanknoteIcon className="h-5 w-5 text-gray-600" />
                          ) : account.type === 'bank' ? (
                            <CreditCardIcon className="h-5 w-5 text-gray-600" />
                          ) : (
                            <WalletIcon className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.name}</p>
                          {account.registerId && (
                            <p className="text-sm text-gray-500">ID: {account.registerId}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(account.balance)}</p>
                        <Badge 
                          variant={account.status === 'active' ? 'default' : 'secondary'}
                          className={account.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {account.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.account}</TableCell>
                        <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </TableCell>
                        <TableCell>{transaction.reference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Revenue Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                    <p className="text-gray-600">Total Revenue</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <FileTextIcon className="h-8 w-8 mb-2" />
                    <span>Balance Sheet</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <FileTextIcon className="h-8 w-8 mb-2" />
                    <span>Profit & Loss</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                    <FileTextIcon className="h-8 w-8 mb-2" />
                    <span>Cash Flow</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Account Dialog */}
        <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Add a new financial account to track balances and transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="Enter account name"
                />
              </div>
              <div>
                <Label htmlFor="accountType">Account Type</Label>
                <Select
                  value={newAccount.type}
                  onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="cash">Cash Account</SelectItem>
                    <SelectItem value="asset">Asset Account</SelectItem>
                    <SelectItem value="liability">Liability Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="initialBalance">Initial Balance</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number (Optional)</Label>
                <Input
                  id="accountNumber"
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  placeholder="****1234"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAccount}>Create Account</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Transaction Dialog */}
        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                Record a new financial transaction for your business.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select
                  value={newTransaction.type}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transactionCategory">Category</Label>
                <Select
                  value={newTransaction.category}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Inventory">Inventory</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Rent">Rent</SelectItem>
                    <SelectItem value="Salary">Salary</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transactionAccount">Account</Label>
                <Select
                  value={newTransaction.account}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, account: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transactionAmount">Amount</Label>
                <Input
                  id="transactionAmount"
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="transactionDescription">Description</Label>
                <Input
                  id="transactionDescription"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  placeholder="Enter transaction description"
                />
              </div>
              <div>
                <Label htmlFor="transactionReference">Reference (Optional)</Label>
                <Input
                  id="transactionReference"
                  value={newTransaction.reference}
                  onChange={(e) => setNewTransaction({ ...newTransaction, reference: e.target.value })}
                  placeholder="REF-001"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTransaction}>Add Transaction</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}