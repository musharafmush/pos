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
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { 
  BankAccount, 
  BankTransaction, 
  BankAccountInsert, 
  BankTransactionInsert 
} from "../../../shared/sqlite-schema";

export default function AccountsDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isViewAccountOpen, setIsViewAccountOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
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
    mutationFn: async (data: any) => {
      console.log('🏦 Creating bank account with data:', data);
      
      try {
        const response = await fetch('/api/bank-accounts', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', errorText);
          let errorMessage = 'Failed to create bank account';
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch (parseError) {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Bank account created:', result);
        return result;
      } catch (error) {
        console.error('🚨 Network error:', error);
        throw error;
      }
    },
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

  // Update bank account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔧 Updating bank account with data:', data);
      
      try {
        const response = await fetch(`/api/bank-accounts/${data.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        console.log('📡 Update response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Update API Error:', errorText);
          let errorMessage = 'Failed to update bank account';
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch (parseError) {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Bank account updated:', result);
        return result;
      } catch (error) {
        console.error('🚨 Update network error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts/summary'] });
      setIsEditAccountOpen(false);
      setEditingAccount(null);
      toast({
        title: "Success",
        description: "Bank account updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bank account",
        variant: "destructive"
      });
    }
  });

  // Delete bank account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      console.log('🗑️ Deleting bank account with ID:', accountId);
      
      try {
        const response = await fetch(`/api/bank-accounts/${accountId}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('📡 Delete response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Delete API Error:', errorText);
          let errorMessage = 'Failed to delete bank account';
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch (parseError) {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Bank account deleted:', result);
        return result;
      } catch (error) {
        console.error('🚨 Delete network error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts/summary'] });
      setIsDeleteAccountOpen(false);
      setDeletingAccount(null);
      toast({
        title: "Success",
        description: "Bank account deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bank account",
        variant: "destructive"
      });
    }
  });

  // Create bank transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: BankTransactionInsert) => {
      const response = await fetch('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create transaction');
      }
      return response.json();
    },
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
    <DashboardLayout>
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
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setViewingAccount(account);
                              setIsViewAccountOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingAccount(account);
                              setIsEditAccountOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeletingAccount(account);
                              setIsDeleteAccountOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
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

      {/* View Account Dialog */}
      <Dialog open={isViewAccountOpen} onOpenChange={setIsViewAccountOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>
              Complete information for this bank account
            </DialogDescription>
          </DialogHeader>
          {viewingAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Account Name</Label>
                  <p className="font-semibold">{viewingAccount.accountName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Bank Name</Label>
                  <p className="font-semibold">{viewingAccount.bankName || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Account Number</Label>
                  <p className="font-mono">{viewingAccount.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
                  <Badge variant="outline">{viewingAccount.accountType?.toUpperCase() || 'UNKNOWN'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">IFSC Code</Label>
                  <p className="font-mono">{viewingAccount.ifscCode || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Branch Name</Label>
                  <p>{viewingAccount.branchName || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Balance</Label>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(viewingAccount.currentBalance || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={viewingAccount.status === 'active' ? 'default' : 'secondary'}>
                    {viewingAccount.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>
              {viewingAccount.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{viewingAccount.description}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="text-sm">
                  {viewingAccount.createdAt ? new Date(viewingAccount.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Unknown'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewAccountOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update the details of this bank account
            </DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editAccountName">Account Name *</Label>
                <Input
                  id="editAccountName"
                  value={editingAccount.accountName || ''}
                  onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, accountName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editAccountNumber">Account Number *</Label>
                  <Input
                    id="editAccountNumber"
                    value={editingAccount.accountNumber || ''}
                    onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, accountNumber: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Account Type</Label>
                  <Select 
                    value={editingAccount.accountType || 'savings'} 
                    onValueChange={(value) => setEditingAccount((prev: any) => ({ ...prev, accountType: value }))}
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
                <Label htmlFor="editBankName">Bank Name *</Label>
                <Input
                  id="editBankName"
                  value={editingAccount.bankName || ''}
                  onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, bankName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editIfscCode">IFSC Code</Label>
                  <Input
                    id="editIfscCode"
                    value={editingAccount.ifscCode || ''}
                    onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, ifscCode: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editBranchName">Branch Name</Label>
                  <Input
                    id="editBranchName"
                    value={editingAccount.branchName || ''}
                    onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, branchName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editCurrentBalance">Current Balance (₹)</Label>
                <Input
                  id="editCurrentBalance"
                  type="number"
                  step="0.01"
                  value={editingAccount.currentBalance || 0}
                  onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, currentBalance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editingAccount.description || ''}
                  onChange={(e) => setEditingAccount((prev: any) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAccountOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateAccountMutation.mutate(editingAccount)}
              disabled={updateAccountMutation.isPending}
            >
              {updateAccountMutation.isPending ? 'Updating...' : 'Update Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bank Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingAccount && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800">
                      {deletingAccount.accountName || 'Unknown Account'}
                    </h4>
                    <p className="text-sm text-red-600">
                      {deletingAccount.bankName} • {deletingAccount.accountNumber}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      Current Balance: {formatCurrency(deletingAccount.currentBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>⚠️ Deleting this account will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove the account permanently from your system</li>
                  <li>Delete all associated transaction history</li>
                  <li>Update your total balance calculations</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAccountOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate(deletingAccount?.id)}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}