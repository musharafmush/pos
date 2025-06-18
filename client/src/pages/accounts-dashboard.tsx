import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
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
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  Calendar,
  Filter,
  Download,
  Eye,
  Wallet,
  ArrowUp,
  ArrowDown,
  CircleDollarSign,
  Receipt,
  HandCoins,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';

interface AccountData {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'credit';
  balance: number;
  lastTransaction: string;
  transactionCount: number;
  status: 'active' | 'inactive';
}

interface TransactionData {
  id: number;
  type: 'sale' | 'purchase' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  account: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
}

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAccounts: number;
  todayTransactions: number;
  cashFlow: number;
  averageTransaction: number;
  topAccount: string;
}

export default function AccountsDashboard() {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'cash',
    initialBalance: ''
  });

  const queryClient = useQueryClient();

  // Real-time connection monitoring
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time data fetching with auto-refresh
  const { data: financialStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/accounts/stats'],
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    enabled: connectionStatus === 'online'
  });

  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['/api/accounts'],
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    enabled: connectionStatus === 'online'
  });

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/accounts/transactions', { period: selectedPeriod, account: selectedAccount }],
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    enabled: connectionStatus === 'online'
  });

  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['/api/accounts/cash-flow'],
    refetchInterval: refreshInterval,
    enabled: connectionStatus === 'online'
  });

  // Manual refresh function
  const handleRefresh = () => {
    refetchStats();
    refetchAccounts();
    refetchTransactions();
    toast({
      title: "Data Refreshed",
      description: "All account data has been updated successfully",
    });
  };

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      if (!response.ok) throw new Error('Failed to create account');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      setShowNewAccountDialog(false);
      setNewAccount({ name: '', type: 'cash', initialBalance: '' });
      toast({
        title: "Account Created",
        description: "New account has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateAccount = () => {
    if (!newAccount.name || !newAccount.initialBalance) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createAccountMutation.mutate({
      name: newAccount.name,
      type: newAccount.type,
      initialBalance: parseFloat(newAccount.initialBalance)
    });
  };

  // Real-time stats with fallback handling
  const stats: FinancialStats = financialStats || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalAccounts: 0,
    todayTransactions: 0,
    cashFlow: 0,
    averageTransaction: 0,
    topAccount: 'N/A'
  };

  const accountsList: AccountData[] = accounts || [];
  const transactionsList: TransactionData[] = transactions || [];

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-emerald-900/20 dark:to-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header with Real-time Status */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Real-time Accounts Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Live financial data with automatic updates every {refreshInterval / 1000} seconds
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {connectionStatus === 'online' ? (
                    <>
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">Offline</span>
                    </>
                  )}
                </div>

                {/* Refresh Controls */}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>

                {/* New Account Dialog */}
                <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                      <Plus className="h-4 w-4 mr-2" />
                      New Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Account</DialogTitle>
                      <DialogDescription>
                        Add a new financial account to your dashboard
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
                            <SelectItem value="cash">Cash Account</SelectItem>
                            <SelectItem value="bank">Bank Account</SelectItem>
                            <SelectItem value="digital">Digital Wallet</SelectItem>
                            <SelectItem value="credit">Credit Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="initialBalance">Initial Balance</Label>
                        <Input
                          id="initialBalance"
                          type="number"
                          value={newAccount.initialBalance}
                          onChange={(e) => setNewAccount({ ...newAccount, initialBalance: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowNewAccountDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateAccount}
                          disabled={createAccountMutation.isPending}
                        >
                          {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Live Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(stats.totalRevenue.toString())}
                      </p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                        <span className="text-xs text-emerald-600">Live</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(stats.totalExpenses.toString())}
                      </p>
                      <div className="flex items-center mt-1">
                        <Activity className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-xs text-blue-600">Real-time</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-amber-200 dark:border-amber-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(stats.netProfit.toString())}
                      </p>
                      <div className="flex items-center mt-1">
                        <BarChart3 className="h-4 w-4 text-amber-500 mr-1" />
                        <span className="text-xs text-amber-600">Updated</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Transactions</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.todayTransactions}
                      </p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 text-purple-500 mr-1" />
                        <span className="text-xs text-purple-600">Live count</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/50 dark:bg-gray-800/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Balances Chart */}
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                      Account Balances Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={accountsList.map((acc, index) => ({
                            name: acc.name,
                            value: Math.abs(acc.balance),
                            fill: COLORS[index % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {accountsList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Cash Flow Chart */}
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Cash Flow Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={cashFlow || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                        <Legend />
                        <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Recent Account Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactionsList.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'sale' ? 'bg-emerald-100 dark:bg-emerald-900' :
                            transaction.type === 'purchase' ? 'bg-blue-100 dark:bg-blue-900' :
                            'bg-amber-100 dark:bg-amber-900'
                          }`}>
                            {transaction.type === 'sale' ? (
                              <ArrowUp className="h-5 w-5 text-emerald-600" />
                            ) : transaction.type === 'purchase' ? (
                              <ArrowDown className="h-5 w-5 text-blue-600" />
                            ) : (
                              <RefreshCw className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {transaction.description}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {transaction.account} • {transaction.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.type === 'sale' ? 'text-emerald-600' : 
                            transaction.type === 'purchase' ? 'text-blue-600' : 
                            'text-amber-600'
                          }`}>
                            {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.amount.toString())}
                          </p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="space-y-6">
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    Live Account Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accountsLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                      ))
                    ) : (
                      accountsList.map((account) => (
                        <Card key={account.id} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                {account.name}
                              </h3>
                              <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                                {account.status}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                              {formatCurrency(account.balance.toString())}
                            </p>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <p>Type: {account.type}</p>
                              <p>Transactions: {account.transactionCount}</p>
                              <p>Last: {account.lastTransaction}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              {/* Filters */}
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accountsList.map((account) => (
                          <SelectItem key={account.id} value={account.name}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table */}
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Live Transaction Feed
                  </CardTitle>
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
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                          </TableRow>
                        ))
                      ) : transactionsList.length > 0 ? (
                        transactionsList.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">{transaction.date}</TableCell>
                            <TableCell>
                              <Badge variant={
                                transaction.type === 'sale' ? 'default' :
                                transaction.type === 'purchase' ? 'secondary' :
                                'outline'
                              }>
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>{transaction.account}</TableCell>
                            <TableCell className={`font-semibold ${
                              transaction.type === 'sale' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.amount.toString())}
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-12 w-12 text-gray-400" />
                              <p className="text-gray-500">No transactions found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Expenses */}
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Revenue vs Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: 'Revenue', amount: stats.totalRevenue, fill: '#10b981' },
                        { name: 'Expenses', amount: stats.totalExpenses, fill: '#ef4444' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value.toString())} />
                        <Bar dataKey="amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Account Performance */}
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Account Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accountsList.map((account, index) => (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{account.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(account.balance.toString())}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {account.transactionCount} transactions
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}