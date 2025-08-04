import { useState, useEffect } from "react";
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
import { Plus, Building2, CreditCard, ArrowUpDown, Eye, Edit, Trash2, Download, Filter, Search, TrendingUp, TrendingDown, Wallet, RefreshCw, Clock, Zap, ArrowUpCircle, ArrowDownCircle, ShoppingCart, Smartphone, Receipt, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
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
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isViewAccountOpen, setIsViewAccountOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isPosIntegrationOpen, setIsPosIntegrationOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
  const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionDescription, setTransactionDescription] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
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
    balanceAfter: 0,
    description: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Login function
  const handleLogin = async () => {
    if (!loginCredentials.username || !loginCredentials.password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginCredentials),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        // Refresh all queries after login
        queryClient.invalidateQueries();
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
    setIsLoggingIn(false);
  };

  // Check authentication on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch bank accounts with real-time updates
  const { data: accounts = [], isLoading: accountsLoading, isFetching: accountsFetching } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: isAuthenticated === true // Only fetch when authenticated
  });

  // Fetch bank account summary with real-time updates
  const { data: summary = { totalAccounts: 0, activeAccounts: 0, totalBalance: 0 }, isFetching: summaryFetching } = useQuery<{
    totalAccounts: number;
    activeAccounts: number;
    totalBalance: number;
  }>({
    queryKey: ['/api/bank-accounts/summary'],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 8000, // Auto-refresh every 8 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: isAuthenticated === true // Only fetch when authenticated
  });

  // Fetch bank transactions with real-time updates
  const { data: transactions = [], isLoading: transactionsLoading, isFetching: transactionsFetching } = useQuery<BankTransaction[]>({
    queryKey: ['/api/bank-transactions'],
    staleTime: 5000, // 5 seconds for real-time feel
    refetchInterval: 12000, // Auto-refresh every 12 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: isAuthenticated === true // Only fetch when authenticated
  });

  // Fetch account categories (less frequent updates needed)
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/bank-account-categories'],
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true,
    enabled: isAuthenticated === true // Only fetch when authenticated
  });

  // Fetch POS sales data with payment methods for bank integration
  const { data: posData = [] } = useQuery<any[]>({
    queryKey: ['/api/sales'],
    staleTime: 30000, // 30 seconds stale time for sales data
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
    enabled: isAuthenticated === true, // Only fetch when authenticated
    select: (data) => {
      // Filter and transform sales data for bank integration with split payment support
      console.log('🔍 Raw sales data received:', data?.[0]); // Debug first sale
      const transformedData = data?.map(sale => {
        const transformed = {
          id: sale.id,
          orderNumber: sale.orderNumber || sale.order_number,
          customerName: sale.customerName || sale.customer?.name || 'Walk-in Customer', 
          totalAmount: parseFloat(sale.total || '0'),
          paymentMethod: sale.paymentMethod || sale.payment_method || 'cash',
          saleDate: sale.createdAt || sale.created_at,
          items: sale.items || [],
          // Split payment amounts
          cashAmount: parseFloat(sale.cashAmount || sale.cash_amount || '0'),
          upiAmount: parseFloat(sale.upiAmount || sale.upi_amount || '0'),
          cardAmount: parseFloat(sale.cardAmount || sale.card_amount || '0'),
          bankTransferAmount: parseFloat(sale.bankTransferAmount || sale.bank_transfer_amount || '0'),
          chequeAmount: parseFloat(sale.chequeAmount || sale.cheque_amount || '0')
        };
        if (sale.id <= 19 && sale.id >= 17) { // Debug recent sales
          console.log(`💰 Sale ${sale.id} transformed:`, transformed);
          console.log(`🔗 Payment method for linkability: "${transformed.paymentMethod}" (type: ${typeof transformed.paymentMethod})`);
        }
        return transformed;
      }) || [];
      
      // Calculate totals for debugging
      const totals = {
        cash: transformedData.reduce((sum, sale) => sum + sale.cashAmount, 0),
        upi: transformedData.reduce((sum, sale) => sum + sale.upiAmount, 0),
        card: transformedData.reduce((sum, sale) => sum + sale.cardAmount, 0),
        bankTransfer: transformedData.reduce((sum, sale) => sum + sale.bankTransferAmount, 0)
      };
      console.log('📊 Payment totals calculated:', totals);
      
      return transformedData;
    }
  });

  // Update last refresh time when data changes
  useEffect(() => {
    if ((accounts as any[])?.length > 0 || (summary && Object.keys(summary).length > 0) || (transactions as any[])?.length > 0) {
      setLastUpdate(new Date());
    }
  }, [accounts, summary, transactions]);

  // Auto-create bank transactions for POS sales mutation (split payment support)
  const createPosTransactionMutation = useMutation({
    mutationFn: async ({ sale, accountId, paymentType }: { sale: any, accountId: number, paymentType?: string }) => {
      // Calculate the amount based on payment type for split payments
      let amount = sale.totalAmount;
      let transactionMode = 'other';
      let description = `POS Sale - ${sale.orderNumber} (${sale.customerName})`;
      
      if (paymentType) {
        // Handle split payment linking
        switch (paymentType.toLowerCase()) {
          case 'upi':
            amount = sale.upiAmount;
            transactionMode = 'upi';
            description = `POS Sale (UPI) - ${sale.orderNumber} (${sale.customerName})`;
            break;
          case 'card':
            amount = sale.cardAmount;
            transactionMode = 'card';
            description = `POS Sale (Card) - ${sale.orderNumber} (${sale.customerName})`;
            break;
          case 'bank_transfer':
            amount = sale.bankTransferAmount;
            transactionMode = 'bank_transfer';
            description = `POS Sale (Bank Transfer) - ${sale.orderNumber} (${sale.customerName})`;
            break;
          case 'cheque':
            amount = sale.chequeAmount;
            transactionMode = 'cheque';
            description = `POS Sale (Cheque) - ${sale.orderNumber} (${sale.customerName})`;
            break;
        }
      } else {
        // Fallback to original payment method
        const transactionModeMap: { [key: string]: string } = {
          'upi': 'upi',
          'card': 'card',
          'bank_transfer': 'bank_transfer',
          'cheque': 'cheque',
          'cash': 'cash',
          'other': 'other'
        };
        transactionMode = transactionModeMap[sale.paymentMethod.toLowerCase()] || 'other';
      }

      // Skip if amount is 0 or negative
      if (amount <= 0) {
        throw new Error(`No ${paymentType || 'payment'} amount found for this transaction`);
      }
      
      const response = await apiRequest('POST', '/api/bank-transactions', {
        accountId,
        transactionId: `POS${sale.orderNumber}${paymentType ? `_${paymentType.toUpperCase()}` : ''}`,
        transactionType: 'credit',
        transactionMode: transactionMode,
        amount: amount,
        balanceAfter: 0, // Backend will calculate
        description: description,
        referenceNumber: sale.orderNumber,
        category: 'sales_revenue',
        transactionDate: new Date().toISOString().split('T')[0]
      });
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts/summary'] });
      toast({
        title: "POS Transaction Created",
        description: "Sales transaction has been added to bank account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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

  // Deposit money mutation
  const depositMutation = useMutation({
    mutationFn: async ({ accountId, amount, description }: { accountId: number, amount: number, description: string }) => {
      const response = await fetch('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountId,
          transactionId: `DEP${Date.now()}`,
          transactionType: 'credit',
          transactionMode: 'deposit',
          amount,
          balanceAfter: 0, // Backend will calculate the correct balance
          description: description || 'Deposit',
          transactionDate: new Date().toISOString().split('T')[0]
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process deposit');
      }
      return response.json();
    },
    onSuccess: () => {
      // Force immediate cache invalidation and refetch
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts/summary'] });
      queryClient.removeQueries({ queryKey: ['/api/bank-transactions'] });
      
      // Refetch immediately with fresh data
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts/summary'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank-transactions'] });
      
      toast({
        title: "Success",
        description: "Deposit completed successfully",
      });
      setIsDepositOpen(false);
      setTransactionAmount(0);
      setTransactionDescription("");
      setSelectedAccountForTransaction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process deposit",
        variant: "destructive",
      });
    },
  });

  // Set default account mutation
  const setDefaultAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch(`/api/bank-accounts/${accountId}/set-default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default account');
      }
      return response.json();
    },
    onSuccess: () => {
      // Force immediate cache invalidation and refetch
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts/summary'] });
      
      // Refetch immediately with fresh data
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts/summary'] });
      
      toast({
        title: "Success",
        description: "Default account updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set default account",
        variant: "destructive",
      });
    },
  });

  // Withdraw money mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ accountId, amount, description }: { accountId: number, amount: number, description: string }) => {
      const response = await fetch('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountId,
          transactionId: `WTH${Date.now()}`,
          transactionType: 'debit',
          transactionMode: 'withdrawal',
          amount,
          balanceAfter: 0, // Backend will calculate and validate the balance
          description: description || 'Withdrawal',
          transactionDate: new Date().toISOString().split('T')[0]
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process withdrawal');
      }
      return response.json();
    },
    onSuccess: () => {
      // Force immediate cache invalidation and refetch
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.removeQueries({ queryKey: ['/api/bank-accounts/summary'] });
      queryClient.removeQueries({ queryKey: ['/api/bank-transactions'] });
      
      // Refetch immediately with fresh data
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank-accounts/summary'] });
      queryClient.refetchQueries({ queryKey: ['/api/bank-transactions'] });
      
      toast({
        title: "Success",
        description: "Withdrawal completed successfully",
      });
      setIsWithdrawOpen(false);
      setTransactionAmount(0);
      setTransactionDescription("");
      setSelectedAccountForTransaction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    },
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
        balanceAfter: 0,
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

  // Set default account handler
  const handleSetDefaultClick = (account: BankAccount) => {
    setDefaultAccountMutation.mutate(account.id);
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

  // Show login interface if not authenticated
  if (isAuthenticated === false) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Login Required</CardTitle>
                <CardDescription className="text-center">
                  Please log in to access the Bank Accounts Dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={loginCredentials.username}
                    onChange={(e) => setLoginCredentials(prev => ({ ...prev, username: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="admin123"
                    value={loginCredentials.password}
                    onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button 
                  onClick={handleLogin} 
                  disabled={isLoggingIn}
                  className="w-full"
                >
                  {isLoggingIn ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Default credentials: admin / admin123
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Checking authentication...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Bank Accounts Dashboard</h1>
              {(summaryFetching || accountsFetching || transactionsFetching) && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Live Data</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Real-time Updates</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600 font-medium">
                  Last: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
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
                    checked={newAccount.isDefault || false}
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
            <div className="flex items-center gap-2">
              {summaryFetching && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-2">
              {summaryFetching && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-2">
              {transactionsFetching && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-2">
              {transactionsFetching && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
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
          <TabsTrigger value="pos-integration">POS Integration</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Bank Accounts
                    {accountsFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                  </CardTitle>
                  <CardDescription>
                    Manage your business bank accounts for POS settlements ({accounts.length} accounts)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm text-blue-600 font-medium">Auto-refresh: 15s</span>
                </div>
              </div>
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
                        <div className="flex gap-1 mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                            onClick={() => {
                              setSelectedAccountForTransaction(account);
                              setIsDepositOpen(true);
                            }}
                          >
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            Deposit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            onClick={() => {
                              setSelectedAccountForTransaction(account);
                              setIsWithdrawOpen(true);
                            }}
                          >
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                            Withdraw
                          </Button>
                        </div>
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
                        {!account.isDefault && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleSetDefaultClick(account)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Set as Default
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos-integration" className="space-y-4">
          <div className="grid gap-6">
            {/* POS Sales Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      POS Enhanced Sales Data
                    </CardTitle>
                    <CardDescription>
                      Recent sales from POS Enhanced with payment method breakdown
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {posData.length} Sales
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Payment Method Breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Method Breakdown
                    </h4>
                    <div className="space-y-3">
                      {[
                        { method: 'UPI Payment', key: 'upi', icon: Smartphone, color: 'text-blue-600' },
                        { method: 'Card Payment', key: 'card', icon: CreditCard, color: 'text-purple-600' },
                        { method: 'Bank Transfer', key: 'bank_transfer', icon: Building2, color: 'text-indigo-600' }
                      ].map(({ method, key, icon: Icon, color }) => {
                        // Calculate total amounts for each payment type from split payment data
                        let total = 0;
                        if (key === 'upi') {
                          total = posData.reduce((sum, sale) => sum + sale.upiAmount, 0);
                        } else if (key === 'card') {
                          total = posData.reduce((sum, sale) => sum + sale.cardAmount, 0);
                        } else if (key === 'cash') {
                          total = posData.reduce((sum, sale) => sum + sale.cashAmount, 0);
                        } else if (key === 'bank_transfer') {
                          total = posData.reduce((sum, sale) => sum + sale.bankTransferAmount, 0);
                        }
                        const methodSales = posData.filter(sale => {
                          if (key === 'upi') return sale.upiAmount > 0;
                          if (key === 'card') return sale.cardAmount > 0;
                          if (key === 'cash') return sale.cashAmount > 0;
                          if (key === 'bank_transfer') return sale.bankTransferAmount > 0;
                          return false;
                        });
                        
                        return (
                          <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Icon className={`h-5 w-5 ${color}`} />
                              <div>
                                <span className="font-medium">{method}</span>
                                <p className="text-sm text-gray-600">{methodSales.length} transactions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">₹{total.toFixed(2)}</div>
                              <div className="text-sm text-gray-600">
                                {methodSales.length > 0 ? `Avg: ₹${(total/methodSales.length).toFixed(2)}` : '—'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Sales List */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Recent Sales ({posData.length})
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {posData.slice(0, 10).map(sale => (
                        <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{sale.orderNumber}</span>
                              <Badge variant="outline" className="text-xs">
                                {sale.paymentMethod || 'Cash'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{sale.customerName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(sale.saleDate).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">₹{sale.totalAmount.toFixed(2)}</div>
                            {/* Show Link to Bank for non-cash payments or split payments with UPI amounts */}
                            {(() => {
                              const paymentMethod = sale.paymentMethod?.toLowerCase();
                              const isNotCash = paymentMethod !== 'cash';
                              const isLinkable = ['upi', 'card', 'bank_transfer', 'cheque'].includes(paymentMethod);
                              const hasSplitUpi = sale.upiAmount > 0; // Check if there's a UPI portion in split payment
                              const shouldShowLink = (isNotCash && isLinkable) || hasSplitUpi;
                              console.log(`🔗 Sale ${sale.id} linkability check:`, {
                                paymentMethod,
                                isNotCash,
                                isLinkable,
                                hasSplitUpi,
                                upiAmount: sale.upiAmount,
                                shouldShowLink
                              });
                              return shouldShowLink;
                            })() ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-1 text-xs"
                                onClick={() => {
                                  // Auto-link to first available account for demo
                                  if (accounts.length > 0) {
                                    createPosTransactionMutation.mutate({
                                      sale,
                                      accountId: accounts[0].id
                                    });
                                  }
                                }}
                                disabled={createPosTransactionMutation.isPending}
                              >
                                Link to Bank
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {sale.paymentMethod?.toLowerCase() === 'cash' ? 'Cash Only' : 'Not Linkable'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Link Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Auto-Link Configuration
                </CardTitle>
                <CardDescription>
                  Automatically create bank transactions for POS sales based on payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Payment Method Mapping</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span>UPI Payments →</span>
                        <span className="font-medium">Business Current Account</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                        <span>Card Payments →</span>
                        <span className="font-medium">Business Current Account</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                        <span>Bank Transfers →</span>
                        <span className="font-medium">Business Savings Account</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span>Cheque Payments →</span>
                        <span className="font-medium">Business Current Account</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
                        <span>Cash Payments →</span>
                        <span className="font-medium text-red-600">Not Linked to Bank</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => {
                          // Link UPI portions of all sales to current account
                          const salesWithUpi = posData.filter(sale => sale.upiAmount > 0);
                          if (accounts.length > 0 && salesWithUpi.length > 0) {
                            salesWithUpi.forEach(sale => {
                              createPosTransactionMutation.mutate({
                                sale,
                                accountId: accounts[0].id,
                                paymentType: 'upi'
                              });
                            });
                          }
                        }}
                        disabled={createPosTransactionMutation.isPending}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Link UPI Portions
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => {
                          // Link card portions of all sales
                          const salesWithCard = posData.filter(sale => sale.cardAmount > 0);
                          if (accounts.length > 0 && salesWithCard.length > 0) {
                            salesWithCard.forEach(sale => {
                              createPosTransactionMutation.mutate({
                                sale,
                                accountId: accounts[0].id,
                                paymentType: 'card'
                              });
                            });
                          }
                        }}
                        disabled={createPosTransactionMutation.isPending}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Link Card Portions
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => {
                          // Link bank transfer portions of all sales
                          const salesWithBankTransfer = posData.filter(sale => sale.bankTransferAmount > 0);
                          if (accounts.length > 0 && salesWithBankTransfer.length > 0) {
                            salesWithBankTransfer.forEach(sale => {
                              createPosTransactionMutation.mutate({
                                sale,
                                accountId: accounts[1]?.id || accounts[0].id, // Use savings account if available
                                paymentType: 'bank_transfer'
                              });
                            });
                          }
                        }}
                        disabled={createPosTransactionMutation.isPending}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Link Bank Transfer Portions
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => {
                          // Link cheque portions of all sales
                          const salesWithCheque = posData.filter(sale => sale.chequeAmount > 0);
                          if (accounts.length > 0 && salesWithCheque.length > 0) {
                            salesWithCheque.forEach(sale => {
                              createPosTransactionMutation.mutate({
                                sale,
                                accountId: accounts[0].id,
                                paymentType: 'cheque'
                              });
                            });
                          }
                        }}
                        disabled={createPosTransactionMutation.isPending}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Link Cheque Portions
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                          {(() => {
                            const account = accounts.find(acc => acc.id === transaction.accountId);
                            return (
                              <>
                                <div className="font-medium">{account?.accountName || 'Unknown Account'}</div>
                                <div className="text-sm text-muted-foreground">{account?.bankName || 'Unknown Bank'}</div>
                              </>
                            );
                          })()}
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

        {/* Deposit Dialog */}
        <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deposit Money</DialogTitle>
              <DialogDescription>
                Add money to {selectedAccountForTransaction?.accountName || 'selected account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Amount (₹)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  value={transactionAmount || ''}
                  onChange={(e) => setTransactionAmount(Number(e.target.value))}
                  placeholder="Enter deposit amount"
                  min="1"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="deposit-description">Description</Label>
                <Input
                  id="deposit-description"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDepositOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedAccountForTransaction && transactionAmount > 0) {
                    depositMutation.mutate({
                      accountId: selectedAccountForTransaction.id,
                      amount: transactionAmount,
                      description: transactionDescription
                    });
                  }
                }}
                disabled={!transactionAmount || transactionAmount <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Deposit ₹{transactionAmount || 0}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Money</DialogTitle>
              <DialogDescription>
                Withdraw money from {selectedAccountForTransaction?.accountName || 'selected account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="withdraw-amount">Amount (₹)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  value={transactionAmount || ''}
                  onChange={(e) => setTransactionAmount(Number(e.target.value))}
                  placeholder="Enter withdrawal amount"
                  min="1"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="withdraw-description">Description</Label>
                <Input
                  id="withdraw-description"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                />
              </div>
              {selectedAccountForTransaction && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Available Balance</div>
                  <div className="text-lg font-semibold">₹{selectedAccountForTransaction.currentBalance || 0}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedAccountForTransaction && transactionAmount > 0) {
                    withdrawMutation.mutate({
                      accountId: selectedAccountForTransaction.id,
                      amount: transactionAmount,
                      description: transactionDescription
                    });
                  }
                }}
                disabled={
                  !transactionAmount || 
                  transactionAmount <= 0 || 
                  transactionAmount > (selectedAccountForTransaction?.currentBalance || 0)
                }
                className="bg-red-600 hover:bg-red-700"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Withdraw ₹{transactionAmount || 0}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}