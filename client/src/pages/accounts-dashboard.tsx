
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import {
  DollarSignIcon,
  CreditCardIcon,
  BanknoteIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  FileTextIcon,
  CalendarIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CircleDollarSignIcon,
  ReceiptIcon,
  HandCoinsIcon
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useFormatCurrency } from "@/lib/currency";

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  category: string;
  account: string;
  amount: number;
  description: string;
  reference?: string;
  status: "completed" | "pending" | "cancelled";
}

interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "credit" | "asset" | "liability";
  balance: number;
  currency: string;
  accountNumber?: string;
  isActive: boolean;
}

export default function AccountsDashboard() {
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank",
    balance: "",
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

  const formatCurrency = useFormatCurrency();

  // Mock data - replace with actual API calls
  const accounts: Account[] = [
    {
      id: "1",
      name: "Main Cash Register",
      type: "cash",
      balance: 15420.50,
      currency: "INR",
      isActive: true
    },
    {
      id: "2",
      name: "Business Bank Account",
      type: "bank",
      balance: 125300.75,
      currency: "INR",
      accountNumber: "****4567",
      isActive: true
    },
    {
      id: "3",
      name: "Petty Cash",
      type: "cash",
      balance: 2500.00,
      currency: "INR",
      isActive: true
    },
    {
      id: "4",
      name: "Business Credit Card",
      type: "credit",
      balance: -8750.25,
      currency: "INR",
      accountNumber: "****8901",
      isActive: true
    }
  ];

  const transactions: Transaction[] = [
    {
      id: "1",
      date: "2024-01-20",
      type: "income",
      category: "Sales",
      account: "Main Cash Register",
      amount: 2500.00,
      description: "Daily sales revenue",
      reference: "SAL-001",
      status: "completed"
    },
    {
      id: "2",
      date: "2024-01-20",
      type: "expense",
      category: "Inventory",
      account: "Business Bank Account",
      amount: -15000.00,
      description: "Product purchase from supplier",
      reference: "PUR-001",
      status: "completed"
    },
    {
      id: "3",
      date: "2024-01-19",
      type: "expense",
      category: "Utilities",
      account: "Business Bank Account",
      amount: -450.00,
      description: "Electricity bill payment",
      reference: "UTIL-001",
      status: "completed"
    },
    {
      id: "4",
      date: "2024-01-19",
      type: "income",
      category: "Sales",
      account: "Business Bank Account",
      amount: 18750.00,
      description: "Card payment settlements",
      reference: "SAL-002",
      status: "completed"
    },
    {
      id: "5",
      date: "2024-01-18",
      type: "expense",
      category: "Office Supplies",
      account: "Petty Cash",
      amount: -150.00,
      description: "Stationery purchase",
      reference: "OFF-001",
      status: "completed"
    }
  ];

  // Calculate totals
  const totalAssets = accounts
    .filter(acc => acc.type === "bank" || acc.type === "cash" || acc.type === "asset")
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalLiabilities = accounts
    .filter(acc => acc.type === "credit" || acc.type === "liability")
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const todayIncome = transactions
    .filter(t => t.type === "income" && t.date === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpenses = transactions
    .filter(t => t.type === "expense" && t.date === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Chart data
  const accountBalanceData = accounts.map(acc => ({
    name: acc.name,
    balance: Math.abs(acc.balance),
    type: acc.type
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

  const monthlyData = [
    { month: "Dec", income: 45000, expenses: 32000 },
    { month: "Jan", income: 52000, expenses: 38000 },
    { month: "Feb", income: 48000, expenses: 35000 },
    { month: "Mar", income: 55000, expenses: 40000 },
  ];

  const handleCreateAccount = () => {
    console.log("Creating account:", newAccount);
    setShowNewAccountDialog(false);
    setNewAccount({ name: "", type: "bank", balance: "", accountNumber: "" });
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Accounts Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your financial accounts and track transactions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-1">
                    <PlusIcon className="h-4 w-4" />
                    <span>New Account</span>
                  </Button>
                </DialogTrigger>
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
                          <SelectItem value="credit">Credit Account</SelectItem>
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

              <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-1">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Transaction</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                      Record a new financial transaction.
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
                          <SelectItem value="transfer">Transfer</SelectItem>
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
                      <Label htmlFor="transactionCategory">Category</Label>
                      <Input
                        id="transactionCategory"
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                        placeholder="e.g., Sales, Utilities, Inventory"
                      />
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
                      <Textarea
                        id="transactionDescription"
                        value={newTransaction.description}
                        onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                        placeholder="Transaction description"
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assets</p>
                <h4 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalAssets.toString())}
                </h4>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <ArrowUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Liabilities</p>
                <h4 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totalLiabilities.toString())}
                </h4>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <ArrowDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Worth</p>
                <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(netWorth.toString())}
                </h4>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <WalletIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's P&L</p>
                <h4 className={`text-2xl font-bold ${(todayIncome - todayExpenses) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency((todayIncome - todayExpenses).toString())}
                </h4>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <CircleDollarSignIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => (
                    <Card key={account.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {account.name}
                        </h4>
                        <Badge variant={account.type === "credit" ? "destructive" : "secondary"}>
                          {account.type}
                        </Badge>
                      </div>
                      <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(account.balance.toString())}
                      </p>
                      {account.accountNumber && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {account.accountNumber}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Account Balance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Account Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={accountBalanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value.toString())}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="balance"
                    >
                      {accountBalanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Transactions</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.name}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transaction.type === "income" 
                                  ? "default" 
                                  : transaction.type === "expense" 
                                    ? "destructive" 
                                    : "secondary"
                              }
                            >
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell>{transaction.account}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.reference || "—"}</TableCell>
                          <TableCell className={`font-medium ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(transaction.amount.toString())}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transaction.status === "completed" 
                                  ? "default" 
                                  : transaction.status === "pending" 
                                    ? "secondary" 
                                    : "destructive"
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => formatCurrency(value.toString())} />
                      <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cash Flow Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => formatCurrency(value.toString())} />
                      <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Income"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Expenses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {formatCurrency("52000")}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Monthly Income</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                      {formatCurrency("38000")}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Monthly Expenses</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {formatCurrency("14000")}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Net Profit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Balance Sheet</h4>
                        <p className="text-sm text-gray-500">Assets, liabilities & equity</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <TrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Income Statement</h4>
                        <p className="text-sm text-gray-500">Revenue & expenses</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <HandCoinsIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Cash Flow</h4>
                        <p className="text-sm text-gray-500">Cash in & out flow</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                        <ReceiptIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Tax Summary</h4>
                        <p className="text-sm text-gray-500">GST & tax reports</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Period Reports</h4>
                        <p className="text-sm text-gray-500">Monthly/quarterly data</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <DownloadIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Export Data</h4>
                        <p className="text-sm text-gray-500">Download Excel/PDF</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
