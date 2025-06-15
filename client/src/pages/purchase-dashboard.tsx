import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Building2, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  RefreshCw, 
  Truck,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
  BarChart3,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileSpreadsheet,
  Printer,
  PieChart,
  Store,
  Calculator,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

export default function PurchaseDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<Purchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPurchaseForStatus, setSelectedPurchaseForStatus] = useState<Purchase | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch purchases
  const { data: purchases = [], isLoading, error } = useQuery({
    queryKey: ["/api/purchases"],
    onSuccess: (data) => {
      console.log('📊 Purchase data received:', {
        count: data?.length || 0,
        sample: data?.slice(0, 3) || [],
        statuses: data?.map(p => p.status) || []
      });
    }
  });

  // Delete purchase mutation
  const deletePurchase = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await fetch(`/api/purchases/${purchaseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `Failed to delete purchase. Status: ${response.status}`);
      }

      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    },
  });

  // Status update mutation
  const updatePurchaseStatus = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      console.log('🔄 Updating purchase status:', purchaseId, status);

      const response = await fetch(`/api/purchases/${purchaseId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          receivedDate: status === 'completed' ? new Date().toISOString() : undefined
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update status. Status: ${response.status}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      
      const successMessage = data.message || `Purchase order status updated to ${newStatus}`;
      
      toast({
        title: "Status Updated",
        description: successMessage,
      });
      setStatusDialogOpen(false);
      setSelectedPurchaseForStatus(null);
      setNewStatus("");
    },
    onError: (error: Error) => {
      console.error('❌ Status update error:', error);
      
      let userMessage = error.message;
      if (error.message.includes('no such column')) {
        userMessage = 'Database schema issue. Please refresh the page and try again.';
      } else if (error.message.includes('SQLITE_')) {
        userMessage = 'Database error. Please try again in a moment.';
      }
      
      toast({
        title: "Status Update Failed",
        description: userMessage,
        variant: "destructive",
      });
    },
  });

  // Payment mutation with enhanced error handling
  const updatePaymentStatus = useMutation({
    mutationFn: async ({ purchaseId, paymentData }: { purchaseId: number; paymentData: any }) => {
      console.log('🔄 Updating payment status for purchase:', purchaseId, paymentData);

      try {
        const response = await fetch(`/api/purchases/${purchaseId}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        console.log('📡 Payment API response status:', response.status);

        if (!response.ok) {
          let errorMessage = `Failed to update payment status. Status: ${response.status}`;

          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
              console.error('❌ Payment API error data:', errorData);
            } else {
              const errorText = await response.text();
              console.error('❌ Payment API error text:', errorText);

              // If we get HTML instead of JSON, extract a meaningful error
              if (errorText.includes('DOCTYPE') || errorText.includes('<html>')) {
                errorMessage = 'Server error: Payment endpoint not responding correctly. Please try again.';
              } else if (errorText.includes('Cannot read properties')) {
                errorMessage = 'Database error: Please check the purchase order exists and try again.';
              } else {
                errorMessage = errorText.substring(0, 100) || errorMessage;
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing response:', parseError);
            errorMessage = 'Network error: Unable to process server response. Please try again.';
          }

          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          console.log('✅ Payment update successful:', result);
          return result;
        } else {
          return { success: true, message: 'Payment status updated successfully' };
        }
      } catch (networkError) {
        console.error('🌐 Network error during payment update:', networkError);
        if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }
        throw networkError;
      }
    },
    onSuccess: async (data, variables) => {
      console.log('✅ Payment mutation successful:', data);

      // Check if payment is now fully paid and auto-update status to completed
      if (data.purchase && selectedPurchaseForPayment) {
        const totalAmount = parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0");
        const newPaidAmount = parseFloat(data.totalPaid?.toString() || data.purchase.paid_amount?.toString() || "0");

        console.log('💰 Payment status check:', {
          totalAmount,
          newPaidAmount,
          currentStatus: selectedPurchaseForPayment.status,
          paymentStatus: data.purchase.payment_status
        });

        // If fully paid and status is not already completed, auto-update to completed
        if (newPaidAmount >= totalAmount && 
            selectedPurchaseForPayment.status !== 'completed' && 
            data.purchase.payment_status === 'paid') {

          console.log('🔄 Auto-updating purchase status to completed (fully paid)');

          try {
            const statusResponse = await fetch(`/api/purchases/${selectedPurchaseForPayment.id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                status: 'completed',
                receivedDate: new Date().toISOString()
              }),
            });

            if (statusResponse.ok) {
              console.log('✅ Auto-updated purchase status to completed');
              toast({
                title: "Status Updated",
                description: "Purchase automatically marked as completed (fully paid)",
              });
            }
          } catch (statusError) {
            console.error('⚠️ Failed to auto-update status:', statusError);
            // Don't throw error, payment was successful
          }
        }
      }

      // Invalidate and refetch purchase data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });

      // Enhanced success message based on completion status
      let successTitle = "Payment Recorded";
      let successDescription = data.message || 'Payment status updated successfully';

      if (data.statusAutoUpdated || data.isCompleted) {
        successTitle = "Purchase Order Completed! 🎉";
        successDescription = `Payment recorded and purchase order automatically marked as completed. Total paid: ${formatCurrency(data.totalPaid || 0)}`;
      } else if (data.paymentStatus === 'paid') {
        successTitle = "Payment Completed";
        successDescription = `Full payment of ${formatCurrency(data.paymentRecorded || 0)} recorded successfully. Purchase is now fully paid.`;
      } else if (data.paymentStatus === 'partial') {
        successTitle = "Partial Payment Recorded";
        successDescription = `Payment of ${formatCurrency(data.paymentRecorded || 0)} recorded. Remaining: ${formatCurrency(data.remainingAmount || 0)}`;
      }

      toast({
        title: successTitle,
        description: successDescription,
      });

      // Reset form state
      setPaymentDialogOpen(false);
      setSelectedPurchaseForPayment(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("cash");
    },
    onError: (error: Error) => {
      console.error('❌ Payment update error:', error);

      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('Network')) {
        userMessage = 'Connection problem. Please check your internet and try again.';
      } else if (error.message.includes('Database')) {
        userMessage = 'Database issue. Please refresh the page and try again.';
      } else if (error.message.includes('Server error')) {
        userMessage = 'Server problem. Please wait a moment and try again.';
      }

      toast({
        title: "Payment Failed",
        description: userMessage,
        variant: "destructive",
      });
    },
  });

  // Filter purchases based on search
  const filteredPurchases = purchases.filter((purchase: Purchase) =>
    purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id?.toString().includes(searchTerm)
  );

  // Calculate statistics with better data handling
  const totalPurchases = purchases.length;
  const pendingPurchases = purchases.filter((p: Purchase) => {
    const status = p.status?.toLowerCase() || 'pending';
    const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
    const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
    const paymentStatus = p.paymentStatus;

    // Consider as pending if status is pending/ordered/draft OR if not fully paid
    return (status === "pending" || status === "ordered" || status === "draft") || 
           (paymentStatus !== "paid" && paidAmount < totalAmount);
  }).length;

  const completedPurchases = purchases.filter((p: Purchase) => {
    const status = p.status?.toLowerCase() || '';
    const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
    const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
    const paymentStatus = p.paymentStatus;

    // Consider as completed if status is completed/received/delivered OR if fully paid
    return (status === "completed" || status === "received" || status === "delivered") ||
           (paymentStatus === "paid" && totalAmount > 0 && paidAmount >= totalAmount);
  }).length;
  const totalAmount = purchases.reduce((sum: number, p: Purchase) => {
    const amount = parseFloat(p.totalAmount?.toString() || p.total?.toString() || "0");
    return sum + amount;
  }, 0);

  // Payment statistics with improved calculation
  const paidPurchases = purchases.filter((p: Purchase) => {
    const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
    const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
    return p.paymentStatus === "paid" || (totalAmount > 0 && paidAmount >= totalAmount);
  }).length;

  const duePurchases = purchases.filter((p: Purchase) => {
    const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
    const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
    const paymentStatus = p.paymentStatus;

    // Consider as due if explicitly marked as due, or if no payment status and unpaid
    return paymentStatus === "due" || 
           paymentStatus === "overdue" || 
           (!paymentStatus && paidAmount < totalAmount) ||
           (paymentStatus === "partial" && paidAmount < totalAmount);
  }).length;

  const totalDueAmount = purchases
    .filter((p: Purchase) => {
      const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
      const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
      const paymentStatus = p.paymentStatus;

      return paymentStatus === "due" || 
             paymentStatus === "overdue" || 
             (!paymentStatus && paidAmount < totalAmount) ||
             (paymentStatus === "partial" && paidAmount < totalAmount);
    })
    .reduce((sum: number, p: Purchase) => {
      const totalAmount = parseFloat(p.totalAmount?.toString() || "0");
      const paidAmount = parseFloat(p.paidAmount?.toString() || "0");
      return sum + Math.max(0, totalAmount - paidAmount);
    }, 0);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        variant: "secondary" as const, 
        icon: Clock, 
        color: "text-yellow-600 bg-yellow-100",
        label: "Pending"
      },
      completed: { 
        variant: "default" as const, 
        icon: CheckCircle, 
        color: "text-green-600 bg-green-100",
        label: "Completed"
      },
      cancelled: { 
        variant: "destructive" as const, 
        icon: XCircle, 
        color: "text-red-600 bg-red-100",
        label: "Cancelled"
      },
      received: { 
        variant: "default" as const, 
        icon: Package, 
        color: "text-blue-600 bg-blue-100",
        label: "Received"
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const handleView = async (purchase: Purchase) => {
    try {
      // Fetch complete purchase details including items
      const response = await fetch(`/api/purchases/${purchase.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchase details');
      }

      const purchaseWithItems = await response.json();
      console.log('📦 Purchase details with items:', purchaseWithItems);

      setSelectedPurchase(purchaseWithItems);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('❌ Error fetching purchase details:', error);
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      });
      // Fallback to showing purchase without items
      setSelectedPurchase(purchase);
      setViewDialogOpen(true);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    // Navigate to the purchase entry form in edit mode
    setLocation(`/purchase-entry-professional?edit=${purchase.id}`);
  };

  const handleDelete = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleMarkAsPaid = (purchase: Purchase) => {
    const paymentData = {
      paymentStatus: 'paid',
      paymentAmount: parseFloat(purchase.totalAmount?.toString() || "0"),
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString(),
      notes: 'Marked as paid from dashboard'
    };

    updatePaymentStatus.mutate({ 
      purchaseId: purchase.id, 
      paymentData 
    });
  };

  const handleRecordPayment = (purchase: Purchase) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentAmount(purchase.totalAmount?.toString() || "0");
    setPaymentDialogOpen(true);
  };

  const handleStatusUpdate = (purchase: Purchase) => {
    setSelectedPurchaseForStatus(purchase);
    setNewStatus(purchase.status || "pending");
    setStatusDialogOpen(true);
  };

  const confirmPayment = () => {
    if (!selectedPurchaseForPayment) {
      toast({
        title: "Error",
        description: "No purchase order selected",
        variant: "destructive",
      });
      return;
    }

    // Validate payment amount with better error messages
    const newPaymentAmount = parseFloat(paymentAmount || "0");
    if (isNaN(newPaymentAmount) || newPaymentAmount <= 0) {
      toast({
        title: "Invalid Payment Amount",
        description: "Please enter a valid payment amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0");
    const currentPaidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");

    // Check if payment amount is reasonable
    if (newPaymentAmount > (totalAmount * 2)) {
      toast({
        title: "Warning",
        description: "Payment amount seems unusually high. Please verify the amount.",
        variant: "destructive",
      });
      return;
    }

    const totalPaidAmount = currentPaidAmount + newPaymentAmount;

    // Determine payment status based on amount paid
    let paymentStatus = 'due';
    let purchaseStatus = selectedPurchaseForPayment.status || 'pending';

    if (totalAmount > 0) {
      if (totalPaidAmount >= totalAmount) {
        paymentStatus = 'paid';
        // Auto-complete purchase when fully paid
        purchaseStatus = 'completed';
      } else if (totalPaidAmount > 0) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'due';
      }
    }

    // Validate payment method
    if (!paymentMethod || paymentMethod.trim() === '') {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      paymentStatus,
      paymentAmount: newPaymentAmount,
      totalPaidAmount: totalPaidAmount,
      paymentMethod: paymentMethod.trim(),
      paymentDate: new Date().toISOString(),
      notes: paymentNotes?.trim() || `Payment of ${formatCurrency(newPaymentAmount)} recorded via dashboard using ${paymentMethod}`,
      // Include purchase status update if payment is complete
      updatePurchaseStatus: paymentStatus === 'paid',
      newPurchaseStatus: purchaseStatus
    };

    console.log('🔄 Confirming payment with validated data:', paymentData);
    console.log('📊 Payment breakdown:', {
      orderNumber: selectedPurchaseForPayment.orderNumber,
      totalAmount: formatCurrency(totalAmount),
      currentPaid: formatCurrency(currentPaidAmount),
      newPayment: formatCurrency(newPaymentAmount),
      totalAfterPayment: formatCurrency(totalPaidAmount),
      remainingBalance: formatCurrency(Math.max(0, totalAmount - totalPaidAmount)),
      paymentStatus: paymentStatus,
      purchaseStatus: purchaseStatus,
      willAutoComplete: paymentStatus === 'paid'
    });

    // Show loading state with completion info
    toast({
      title: "Processing Payment",
      description: paymentStatus === 'paid' ? 
        "Recording payment and completing purchase order..." : 
        "Recording payment details...",
    });

    updatePaymentStatus.mutate({ 
      purchaseId: selectedPurchaseForPayment.id, 
      paymentData 
    });
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchase.mutate(purchaseToDelete.id);
    }
  };

  if (error) {
    console.error('❌ Purchase dashboard error:', error);
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Purchases</h3>
            <p className="text-gray-600">Failed to load purchase data. Please try again.</p>
            <div className="mt-4 space-x-2">
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/purchases"] })}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Link href="/purchase-entry-professional">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Purchase
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
                  <p className="text-gray-600 mt-1">Manage purchase orders, suppliers, and inventory procurement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Import
                </Button>
                <Link href="/suppliers">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Manage Suppliers
                  </Button>
                </Link>
                <Link href="/purchase-entry-professional">
                  <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Purchase Order
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Orders</p>
                    <p className="text-3xl font-bold text-blue-900">{totalPurchases}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">+12% from last month</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Total Value</p>
                    <p className="text-3xl font-bold text-green-900">{formatCurrency(totalAmount)}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">+8% from last month</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Pending Orders</p>
                    <p className="text-3xl font-bold text-yellow-900">{pendingPurchases}</p>
                    <div className="flex items-center mt-2">
                      <Clock className="w-4 h-4 text-yellow-600 mr-1" />
                      <span className="text-sm text-yellow-600 font-medium">
                        {pendingPurchases > 0 ? 'Needs attention' : 'All up to date'}
                      </span>
                    </div>
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Total: {totalPurchases} | Pending: {pendingPurchases} | Completed: {completedPurchases}
                      </div>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-yellow-200 rounded-full flex items-center justify-center">
                    <Clock className="w-7 h-7 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Completed</p>
                    <p className="text-3xl font-bold text-purple-900">{completedPurchases}</p>
                    <div>
                      <span className="text-sm text-purple-600 font-medium">
                        {totalPurchases > 0 ? Math.round((completedPurchases / totalPurchases) * 100) : 0}% completion rate
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        {completedPurchases} of {totalPurchases} orders
                      </span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-purple-200 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Payment Due</p>
                    <p className="text-2xl font-bold text-red-900">{duePurchases}</p>
                    <div className="text-xs text-red-600 font-medium mt-1">
                      {formatCurrency(totalDueAmount)}
                    </div>
                    <div className="flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 text-red-600 mr-1" />
                      <span className="text-xs text-red-600 font-medium">Requires payment</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-red-200 rounded-full flex items-center justify-center">
                    <CreditCard className="w-7 h-7 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Purchase Orders
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Suppliers
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Recent Purchase Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {purchases.slice(0, 5).map((purchase: Purchase) => (
                          <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{purchase.orderNumber || `PO-${purchase.id}`}</p>
                                <p className="text-sm text-gray-600">{purchase.supplier?.name || 'Unknown'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(parseFloat(purchase.totalAmount?.toString() || "0"))}</p>
                              {getStatusBadge(purchase.status || "pending")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Suppliers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Top Suppliers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.from(new Set(purchases.map((p: Purchase) => p.supplier?.name)))
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((supplierName, index) => {
                            const supplierPurchases = purchases.filter((p: Purchase) => p.supplier?.name === supplierName);
                            const totalValue = supplierPurchases.reduce((sum, p) => 
                              sum + parseFloat(p.totalAmount?.toString() || "0"), 0
                            );
                            return (
                              <div key={supplierName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{supplierName}</p>
                                    <p className="text-sm text-gray-600">{supplierPurchases.length} orders</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(totalValue)}</p>
                                  <Badge variant="secondary">#{index + 1}</Badge>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                {/* Enhanced Search and Filters */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search orders, suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filters
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Enhanced Table */}
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading purchases...</span>
                      </div>
                    ) : filteredPurchases.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {purchases.length === 0 ? 'No Purchase Orders' : 'No Matching Orders'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {purchases.length === 0 
                            ? 'Get started by creating your first purchase order' 
                            : 'Try adjusting your search or filters to find orders'
                          }
                        </p>
                        <div className="space-x-2">
                          {purchases.length === 0 ? (
                            <Link href="/purchase-entry-professional">
                              <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Purchase Order
                              </Button>
                            </Link>
                          ) : (
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSearchTerm("");
                                // Reset any other filters if they exist
                              }}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                        {/* Debug info for development */}
                        {process.env.NODE_ENV === 'development' && purchases.length > 0 && (
                          <div className="mt-4 text-xs text-gray-500">
                            Debug: Found {purchases.length} total purchases, but 0 after filtering
                          </div>
                        )}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Actions</TableHead>
                            <TableHead className="font-semibold">Order Date</TableHead>
                            <TableHead className="font-semibold">Order Number</TableHead>
                            <TableHead className="font-semibold">Supplier</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Total Amount</TableHead>
                            <TableHead className="font-semibold">Items</TableHead>
                            <TableHead className="font-semibold">Payment Status</TableHead>
                            <TableHead className="font-semibold">Expected Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPurchases.map((purchase: Purchase) => (
                            <TableRow key={purchase.id} className="hover:bg-gray-50">
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleView(purchase)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(purchase)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(purchase)}>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Update Status
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {(!purchase.paymentStatus || purchase.paymentStatus === 'due' || purchase.paymentStatus === 'partial') && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleMarkAsPaid(purchase)}>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark as Fully Paid
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleRecordPayment(purchase)}>
                                          <DollarSign className="h-4 w-4 mr-2" />
                                          Record Partial Payment
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {purchase.paymentStatus === 'paid' && (
                                      <DropdownMenuItem onClick={() => handleRecordPayment(purchase)}>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        View Payment Details
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Generate Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Printer className="h-4 w-4 mr-2" />
                                      Print Order
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(purchase)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">
                                    {purchase.orderDate ? format(new Date(purchase.orderDate), 'MMM dd, yyyy') : 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  {purchase.orderNumber || `PO-${purchase.id?.toString().padStart(6, '0')}`}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{purchase.supplier?.name || 'Unknown Supplier'}</p>
                                    <p className="text-sm text-gray-500">{purchase.supplier?.email || 'No email'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                {getStatusBadge(purchase.status || "pending")}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-right">
                                  <p className="font-semibold text-lg text-gray-900">
                                    {formatCurrency(parseFloat(purchase.totalAmount?.toString() || "0"))}
                                  </p>
                                  {purchase.subTotal && (
                                    <p className="text-sm text-gray-500">
                                      Subtotal: {formatCurrency(parseFloat(purchase.subTotal.toString()))}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">
                                    {(() => {
                                      // First try to get from purchase object
                                      let itemCount = purchase.purchaseItems?.length || 
                                                     purchase.items?.length || 
                                                     purchase.purchase_items?.length || 
                                                     0;
                                      
                                      // If no items found, try to get from itemCount property
                                      if (itemCount === 0 && purchase.itemCount) {
                                        itemCount = purchase.itemCount;
                                      }
                                      
                                      // If still no items, show placeholder
                                      return itemCount || 'N/A';
                                    })()} items
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                {(() => {
                                  const totalAmount = parseFloat(purchase.totalAmount?.toString() || "0");
                                  const paidAmount = parseFloat(purchase.paidAmount?.toString() || "0");

                                  // Determine payment status based on amounts
                                  let paymentStatus = 'due';
                                  let paymentPercentage = 0;

                                  if (totalAmount > 0) {
                                    paymentPercentage = (paidAmount / totalAmount) * 100;

                                    if (paidAmount >= totalAmount) {
                                      paymentStatus = 'paid';
                                    } else if (paidAmount > 0) {
                                      paymentStatus = 'partial';
                                    } else {
                                      // Check if overdue based on expected date
                                      const expectedDate = purchase.expectedDate ? new Date(purchase.expectedDate) : null;
                                      const today = new Date();
                                      if (expectedDate && expectedDate < today) {
                                        paymentStatus = 'overdue';
                                      } else {
                                        paymentStatus = 'due';
                                      }
                                    }
                                  }

                                  // Override with stored payment status if it exists and is valid
                                  const storedStatus = purchase.paymentStatus;
                                  if (storedStatus && ['paid', 'partial', 'due', 'overdue'].includes(storedStatus)) {
                                    paymentStatus = storedStatus;
                                  }

                                  const statusConfig = {
                                    paid: { 
                                      variant: "default" as const, 
                                      icon: CheckCircle, 
                                      color: "text-green-700 bg-green-50 border-green-200",
                                      label: "Fully Paid",
                                      bgColor: "bg-green-500"
                                    },
                                    partial: { 
                                      variant: "secondary" as const, 
                                      icon: Clock, 
                                      color: "text-blue-700 bg-blue-50 border-blue-200",
                                      label: `Partial (${Math.round(paymentPercentage)}%)`,
                                      bgColor: "bg-blue-500"
                                    },
                                    due: { 
                                      variant: "secondary" as const, 
                                      icon: AlertCircle, 
                                      color: "text-orange-700 bg-orange-50 border-orange-200",
                                      label: "Payment Due",
                                      bgColor: "bg-orange-500"
                                    },
                                    overdue: { 
                                      variant: "destructive" as const, 
                                      icon: XCircle, 
                                      color: "text-red-700 bg-red-50 border-red-200",
                                      label: "Overdue",
                                      bgColor: "bg-red-500"
                                    },
                                  };

                                  const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.due;
                                  const Icon = config.icon;
                                  const outstandingAmount = Math.max(0, totalAmount - paidAmount);

                                  return (
                                    <div className="space-y-1">
                                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${config.color}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                        {config.label}
                                      </div>
                                      {paymentStatus === 'partial' && (
                                        <div className="text-xs text-gray-600">
                                          Paid: {formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}
                                        </div>
                                      )}
                                      {(paymentStatus === 'due' || paymentStatus === 'overdue') && outstandingAmount > 0 && (
                                        <div className="text-xs text-gray-600">
                                          Outstanding: {formatCurrency(outstandingAmount)}
                                        </div>
                                      )}
                                      {paymentStatus === 'paid' && (
                                        <div className="text-xs text-green-600">
                                          Fully paid on {purchase.paymentDate ? format(new Date(purchase.paymentDate), 'MMM dd') : 'N/A'}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span>
                                    {purchase.expectedDate 
                                      ? format(new Date(purchase.expectedDate), 'MMM dd, yyyy') 
                                      : 'Not set'
                                    }
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suppliers" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Supplier Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Supplier Management</h3>
                      <p className="text-gray-600 mb-4">Manage your suppliers and their information</p>
                      <Link href="/suppliers">
                        <Button>
                          <Building2 className="w-4 h-4 mr-2" />
                          Manage Suppliers
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Analytics Chart Coming Soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Supplier Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Performance Metrics Coming Soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Enhanced View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6" />
                Purchase Order Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this purchase order
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-6">
                {/* Top Header with Key Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Order Number</label>
                      <p className="text-xl font-bold text-blue-800 mt-1">
                        {selectedPurchase.orderNumber || `PO-${selectedPurchase.id}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedPurchase.status || "pending")}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Order Date</label>
                      <p className="text-lg font-semibold mt-1">
                        {selectedPurchase.orderDate 
                          ? format(new Date(selectedPurchase.orderDate), 'dd/MM/yyyy') 
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Amount</label>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatCurrency(parseFloat(selectedPurchase.totalAmount?.toString() || selectedPurchase.total?.toString() || "0"))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business and Supplier Information Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supplier Information */}
                  <Card className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Supplier Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Name</label>
                          <p className="text-lg font-semibold mt-1">
                            {selectedPurchase.supplier?.name || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-base mt-1">
                            {selectedPurchase.supplier?.email || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <p className="text-base mt-1">
                            {selectedPurchase.supplier?.phone || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          <p className="text-base mt-1">
                            {selectedPurchase.supplier?.address || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Tax Number</label>
                          <p className="text-base mt-1">
                            ```python
{selectedPurchase.supplier?.taxNumber || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Information */}
                  <Card className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Store className="w-5 h-5 text-green-600" />
                        Business Information
                      </CardTitle>
                    </CardHeader>
<CardContent className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Business</label>
                          <p className="text-lg font-semibold mt-1">Awesome Shop</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          <div className="text-base mt-1 space-y-1">
                            <p>Linking Street</p>
                            <p>Phoenix, Arizona, USA</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">GSTIN</label>
                          <p className="text-base mt-1 font-mono">3412569900</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Date</label>
                          <p className="text-base mt-1">
                            {format(new Date(), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Details Card */}
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Reference No:</label>
                        <p className="text-base font-semibold mt-1">
                          {selectedPurchase.orderNumber || `#PO${selectedPurchase.id}`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Order Date:</label>
                        <p className="text-base font-semibold mt-1">
                          {selectedPurchase.orderDate 
                            ? format(new Date(selectedPurchase.orderDate), 'dd/MM/yyyy') 
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Purchase Status:</label>
                        <p className="text-base font-semibold mt-1">
                          {selectedPurchase.status?.charAt(0).toUpperCase() + selectedPurchase.status?.slice(1) || 'Pending'}
                        </p>
                      </div>
                      <div>
                      <label className="text-sm font-medium text-gray-600">Payment Status:</label>
                      <div className="mt-1">
                        <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Due Payment
                        </Badge>
                      </div>
                    </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Purchase Items Table */}
                <Card className="border-2 border-green-200">
                  <CardHeader className="bg-green-50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-green-800">Purchase Items</h3>
                          <p className="text-sm text-green-600">
                            {selectedPurchase.purchaseItems?.length || selectedPurchase.items?.length || 0} item(s) in this order
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Order #{selectedPurchase.orderNumber || selectedPurchase.id}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const items = selectedPurchase.purchaseItems || selectedPurchase.items || [];
                      return items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table className="text-sm">
                            <TableHeader>
                              <TableRow className="bg-blue-50 border-b-2">
                                <TableHead className="w-12 text-center font-semibold">No</TableHead>
                                <TableHead className="min-w-[120px] font-semibold">Product</TableHead>
                                <TableHead className="w-20 text-center font-semibold">Qty</TableHead>
                                <TableHead className="w-24 text-center font-semibold">Unit Cost</TableHead>
                                <TableHead className="w-24 text-center font-semibold">Amount</TableHead>
                                <TableHead className="w-20 text-center font-semibold">Tax %</TableHead>
                                <TableHead className="w-24 text-center font-semibold">Net Amount</TableHead>
                                <TableHead className="w-20 text-center font-semibold">Unit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any, index: number) => {
                                const quantity = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                                const unitCost = parseFloat(item.unitCost || item.unit_cost || item.cost || "0");
                                const amount = parseFloat(item.amount || item.subtotal || item.total || (quantity * unitCost).toString());
                                const taxPercent = parseFloat(item.taxPercentage || item.tax_percentage || item.taxPercent || "0");
                                const netAmount = parseFloat(item.netAmount || item.net_amount || amount.toString());

                                return (
                                  <TableRow key={item.id || index} className="hover:bg-gray-50">
                                    <TableCell className="text-center font-medium">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div className="font-medium text-gray-900">
                                          {item.product?.name || item.product_name || item.productName || `Product #${item.productId || item.product_id || ''}`}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          SKU: {item.product?.sku || item.product_sku || item.code || 'N/A'}
                                        </div>
                                        {item.description && (
                                          <div className="text-xs text-gray-600">
                                            {item.description}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="font-semibold text-blue-600 text-lg">
                                        {quantity}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="font-semibold text-gray-900">
                                        ₹{unitCost.toLocaleString('en-IN')}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="font-semibold text-blue-700">
                                        ₹{amount.toLocaleString('en-IN')}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {taxPercent > 0 ? (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                          {taxPercent}%
                                        </Badge>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="font-bold text-green-700 text-base">
                                        ₹{netAmount.toLocaleString('en-IN')}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="text-xs">
                                        {item.unit || 'PCS'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Items Found</h4>
                              <p className="text-gray-600 max-w-md">
                                This purchase order doesn't have any items or they couldn't be loaded.
                              </p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
                              <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> Items may not have been properly saved during order creation.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="w-5 h-5 text-purple-600" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Subtotal (Before Tax):</span>
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(selectedPurchase.totalAmount?.toString() || selectedPurchase.total?.toString() || "0"))}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Total Discount:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Total Tax (GST):</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-t-2 border-purple-300 bg-purple-50 px-4 rounded">
                        <span className="text-lg font-bold">Grand Total:</span>
                        <span className="text-xl font-bold text-purple-700">
                          {formatCurrency(parseFloat(selectedPurchase.totalAmount?.toString() || selectedPurchase.total?.toString() || "0"))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes and Additional Information */}
                {(selectedPurchase.notes || selectedPurchase.remarks) && (
                  <Card className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Notes & Remarks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedPurchase.notes || selectedPurchase.remarks}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              {selectedPurchase && (
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(selectedPurchase);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Order
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Recording Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record payment for purchase order
              </DialogDescription>
            </DialogHeader>
            {selectedPurchaseForPayment && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Order:</span>
                      <div className="text-blue-700">{selectedPurchaseForPayment.orderNumber || `PO-${selectedPurchaseForPayment.id}`}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Supplier:</span>
                      <div className="text-blue-700">{selectedPurchaseForPayment.supplier?.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Total Amount:</span>
                      <div className="text-blue-700 font-semibold">{formatCurrency(parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0"))}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Already Paid:</span>
                      <div className="text-blue-700">{formatCurrency(parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0"))}</div>
                    </div>
                  </div>
                  {(() => {
                    const totalAmount = parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0");
                    const paidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");
                    const remaining = totalAmount - paidAmount;
                    return remaining > 0 ? (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <span className="font-medium text-blue-800">Outstanding Amount:</span>
                        <div className="text-lg font-bold text-blue-900">{formatCurrency(remaining)}</div>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Payment Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                      className="mt-1"
                    />
                    {(() => {
                      const totalAmount = parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0");
                      const paidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");
                      const remaining = totalAmount - paidAmount;
                      const currentPayment = parseFloat(paymentAmount || "0");

                      if (currentPayment > remaining && remaining > 0) {
                        return (
                          <p className="text-xs text-amber-600 mt-1">
                            Payment exceeds outstanding amount. Overpayment: {formatCurrency(currentPayment - remaining)}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const totalAmount = parseFloat(selectedPurchaseForPayment.totalAmount?.toString() || "0");
                      const paidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");
                      const remaining = Math.max(0, totalAmount - paidAmount);

                      if (remaining <= 0) {
                        return (
                          <div className="col-span-2 text-center py-2">
                            <span className="text-sm text-green-600 font-medium">
                              ✅ This order is already fully paid
                            </span>
                          </div>
                        );
                      }

                      return (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentAmount((remaining / 2).toFixed(2))}
                            className="text-xs"
                            disabled={remaining <= 0}
                          >
                            50% ({formatCurrency(remaining / 2)})
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentAmount(remaining.toFixed(2))}
                            className="text-xs"
                            disabled={remaining <= 0}
                          >
                            Full Amount ({formatCurrency(remaining)})
                          </Button>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="upi">UPI</option>
                      <option value="neft">NEFT</option>
                      <option value="rtgs">RTGS</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment Notes (Optional)</label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Reference number, bank details, etc..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(false)}
                disabled={updatePaymentStatus.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmPayment}
                disabled={
                  updatePaymentStatus.isPending || 
                  !paymentAmount || 
                  parseFloat(paymentAmount || "0") <= 0 ||
                  !paymentMethod ||
                  !selectedPurchaseForPayment
                }
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                {updatePaymentStatus.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Record Payment ({paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : formatCurrency(0)})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Update Purchase Status
              </DialogTitle>
              <DialogDescription>
                Update the status for this purchase order
              </DialogDescription>
            </DialogHeader>
            {selectedPurchaseForStatus && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm">
                    <div className="font-medium text-blue-800">Order: {selectedPurchaseForStatus.orderNumber || `PO-${selectedPurchaseForStatus.id}`}</div>
                    <div className="text-blue-700">Supplier: {selectedPurchaseForStatus.supplier?.name || 'Unknown'}</div>
                    <div className="text-blue-700">Current Status: <span className="font-semibold">{selectedPurchaseForStatus.status || 'Pending'}</span></div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">New Status</label>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {newStatus === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">
                      <strong>Note:</strong> Marking as completed will indicate that all items have been received and the order is finalized.
                    </p>
                  </div>
                )}

                {newStatus === 'cancelled' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      <strong>Warning:</strong> Cancelling this order cannot be undone. Make sure this is the correct action.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setStatusDialogOpen(false)}
                disabled={updatePurchaseStatus.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedPurchaseForStatus) {
                    updatePurchaseStatus.mutate({ 
                      purchaseId: selectedPurchaseForStatus.id, 
                      status: newStatus 
                    });
                  }
                }}
                disabled={
                  updatePurchaseStatus.isPending || 
                  !newStatus ||
                  !selectedPurchaseForStatus ||
                  newStatus === selectedPurchaseForStatus.status
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updatePurchaseStatus.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Purchase Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this purchase order? This action cannot be undone.
                {purchaseToDelete && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800">
                      <strong>Order:</strong> {purchaseToDelete.orderNumber || `PO-${purchaseToDelete.id}`}
                    </div>
                    <div className="text-sm text-red-700">
                      <strong>Supplier:</strong> {purchaseToDelete.supplier?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-red-700">
                      <strong>Amount:</strong> {formatCurrency(parseFloat(purchaseToDelete.totalAmount?.toString() || "0"))}
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePurchase.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deletePurchase.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletePurchase.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Order
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}