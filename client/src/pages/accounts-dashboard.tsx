import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, CreditCard, ArrowUpDown, Eye, Edit, Trash2, Download, Filter, Search, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { 
  BankAccount, 
  BankTransaction, 
  BankAccountInsert, 
  BankTransactionInsert 
} from "@/shared/sqlite-schema";

export default function AccountsDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<BankAccountInsert>({
    accountName: "",
    accountNumber: "",
    bankName: "",
    accountType: "savings",
    ifscCode: "",
    branchName: "",
    currentBalance: 0,
    description: "",
    isDefault: false
  });
  const [newTransaction, setNewTransaction] = useState<BankTransactionInsert>({
    accountId: 0,
    transactionId: "",
    transactionType: "credit",
    transactionMode: "cash",
    amount: 0,
    description: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  // Fetch bank accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/bank-accounts'],
    staleTime: 30000
  });

  // Fetch bank account summary
  const { data: summary } = useQuery({
    queryKey: ['/api/bank-accounts/summary'],
    staleTime: 30000
  });

  // Fetch bank transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/bank-transactions'],
    staleTime: 30000
  });

  // Fetch account categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/bank-account-categories'],
    staleTime: 60000
  });

  // Create bank account mutation
  const createAccountMutation = useMutation({
    mutationFn: (data: BankAccountInsert) => 
      apiRequest('/api/bank-accounts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts/summary'] });
      setIsAddAccountOpen(false);
      setNewAccount({
        accountName: "",
        accountNumber: "",
        bankName: "",
        accountType: "savings",
        ifscCode: "",
        branchName: "",
        currentBalance: 0,
        description: "",
        isDefault: false
      });
      toast({
        title: "Success",
        description: "Bank account created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bank account",
        variant: "destructive"
      });
    }
  });

  // Create bank transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: (data: BankTransactionInsert) => 
      apiRequest('/api/bank-transactions', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts/summary'] });
      setIsAddTransactionOpen(false);
      setNewTransaction({
        accountId: 0,
        transactionId: "",
        transactionType: "credit",
        transactionMode: "cash",
        amount: 0,
        description: "",
        transactionDate: new Date().toISOString().split('T')[0]
      });
      toast({
        title: "Success",
        description: "Transaction recorded successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record transaction",
        variant: "destructive"
      });
    }
  });

  const handleCreateAccount = () => {
    if (!newAccount.accountName || !newAccount.accountNumber || !newAccount.bankName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createAccountMutation.mutate(newAccount);
  };

  const handleCreateTransaction = () => {
    if (!newTransaction.accountId || !newTransaction.transactionId || !newTransaction.amount || !newTransaction.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createTransactionMutation.mutate({
      ...newTransaction,
      transactionId: `TXN${Date.now()}`
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type: string | undefined) => {
    if (!type) return <CreditCard className="h-4 w-4 text-gray-500" />;
    return type === 'credit' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'current': return <Building2 className="h-4 w-4" />;
      case 'savings': return <Wallet className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your POS bank accounts, track settlements, and monitor financial transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Bank Transaction</DialogTitle>
                <DialogDescription>
                  Record a payment from POS to bank or vice versa
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="account">Bank Account</Label>
                  <Select 
                    value={newTransaction.accountId.toString()} 
                    onValueChange={(value) => setNewTransaction(prev => ({ ...prev, accountId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account: BankAccount) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.accountName} - {account.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Transaction Type</Label>
                    <Select 
                      value={newTransaction.transactionType} 
                      onValueChange={(value) => setNewTransaction(prev => ({ ...prev, transactionType: value as 'credit' | 'debit' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Payment Mode</Label>
                    <Select 
                      value={newTransaction.transactionMode} 
                      onValueChange={(value) => setNewTransaction(prev => ({ ...prev, transactionMode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="POS settlement, cash deposit, etc."
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Transaction Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTransaction.transactionDate}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionDate: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTransaction}
                  disabled={createTransactionMutation.isPending}
                >
                  {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Bank Account</DialogTitle>
                <DialogDescription>
                  Add a bank account to track POS settlements and payments
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input
                    id="accountName"
                    placeholder="e.g., POS Business Account"
                    value={newAccount.accountName}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, accountName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      placeholder="123456789012"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Type</Label>
                    <Select 
                      value={newAccount.accountType} 
                      onValueChange={(value) => setNewAccount(prev => ({ ...prev, accountType: value as 'savings' | 'current' | 'business' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    placeholder="e.g., State Bank of India"
                    value={newAccount.bankName}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      placeholder="SBIN0001234"
                      value={newAccount.ifscCode || ""}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, ifscCode: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      placeholder="Main Branch"
                      value={newAccount.branchName || ""}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, branchName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currentBalance">Opening Balance (₹)</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccount.currentBalance}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, currentBalance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={newAccount.description || ""}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newAccount.isDefault}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isDefault">Set as default account</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAccount}
                  disabled={createAccountMutation.isPending}
                >
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.activeAccounts || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Across all accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter((t: BankTransaction) => 
                new Date(t.transactionDate).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Transactions today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Flow Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                transactions
                  .filter((t: BankTransaction) => 
                    new Date(t.transactionDate).toDateString() === new Date().toDateString()
                  )
                  .reduce((sum: number, t: BankTransaction) => 
                    sum + (t.transactionType === 'credit' ? t.amount : -t.amount), 0
                  )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Credit - Debit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Manage your business bank accounts for POS settlements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="text-center py-8">Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bank accounts found. Add your first account to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts.map((account: BankAccount) => (
                    <Card key={account.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getAccountTypeIcon(account.accountType || 'savings')}
                            <CardTitle className="text-lg">{account.accountName || 'Unknown Account'}</CardTitle>
                          </div>
                          {account.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <CardDescription>{account.bankName || 'Unknown Bank'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Account No:</span>
                            <span className="font-mono">{account.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Balance:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(account.currentBalance || 0)}
                            </span>
                          </div>
                          {account.ifscCode && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">IFSC:</span>
                              <span className="font-mono">{account.ifscCode}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Type:</span>
                            <Badge variant="outline" className="text-xs">
                              {account.accountType?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Transactions</CardTitle>
              <CardDescription>
                Track all inflow and outflow transactions across your bank accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found. Record your first transaction to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: BankTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString('en-IN') : 'Invalid Date'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.accountName || 'Unknown Account'}</div>
                          <div className="text-sm text-muted-foreground">{transaction.bankName || 'Unknown Bank'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transactionType)}
                            <Badge 
                              variant={transaction.transactionType === 'credit' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transaction.transactionType?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {transaction.transactionMode?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={
                            transaction.transactionType === 'credit' 
                              ? 'text-green-600 font-semibold' 
                              : 'text-red-600 font-semibold'
                          }>
                            {transaction.transactionType === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(transaction.balanceAfter || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>POS Settlements</CardTitle>
              <CardDescription>
                Track settlements between your POS sales and bank deposits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Settlement tracking feature coming soon. This will help you reconcile POS sales with bank credits.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate reports and analytics for your bank account transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Financial reports and analytics coming soon. This will include transaction summaries, balance trends, and payment method analysis.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}