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
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import type { Purchase } from "@shared/schema";

// Free Qty Edit Cell Component
function FreeQtyEditCell({ item, onUpdate }: { item: any; onUpdate: (newFreeQty: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(0);
  const { toast } = useToast();

  const freeQty = Number(item.freeQty || item.free_qty || 0);

  const handleUpdate = async (newFreeQty: number) => {
    try {
      const response = await fetch(`/api/purchase-items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ freeQty: newFreeQty }),
      });

      if (response.ok) {
        toast({
          title: "Free Qty Updated",
          description: `Free quantity updated to ${newFreeQty}`,
        });
        onUpdate(newFreeQty);
      } else {
        throw new Error('Failed to update free quantity');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update free quantity",
        variant: "destructive",
      });
      setTempValue(freeQty);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type="number"
        min="0"
        value={tempValue}
        onChange={(e) => setTempValue(Number(e.target.value) || 0)}
        className="w-16 h-8 text-xs text-center"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleUpdate(tempValue);
          } else if (e.key === 'Escape') {
            setTempValue(freeQty);
            setEditing(false);
          }
        }}
        onBlur={() => {
          if (tempValue !== freeQty) {
            handleUpdate(tempValue);
          } else {
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-green-100 rounded px-2 py-1 transition-colors"
      onClick={() => {
        setTempValue(freeQty);
        setEditing(true);
      }}
      title="Click to edit free quantity"
    >
      {freeQty > 0 ? (
        <span className="font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
          {freeQty} 🎁
        </span>
      ) : (
        <span className="text-gray-400 hover:text-green-600">
          + Add Free
        </span>
      )}
    </div>
  );
}

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
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPurchaseForStatus, setSelectedPurchaseForStatus] = useState<Purchase | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [viewMode, setViewMode] = useState<"orders" | "suppliers">("orders");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch purchases with more aggressive cache settings
  const { data: purchases = [], isLoading, error, refetch } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache in memory
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Fetch supplier-wise order summary
  const { data: supplierData = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["/api/suppliers/order-summary"],
    queryFn: async () => {
      const response = await fetch('/api/suppliers/order-summary');
      if (!response.ok) throw new Error('Failed to fetch supplier data');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
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
      } catch (networkError: any) {
        console.error('🌐 Network error during payment update:', networkError);
        if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }
        throw networkError;
      }
    },
    onSuccess: async (data, variables) => {
      console.log('✅ Payment mutation successful:', data);

      // Comprehensive cache invalidation for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      await queryClient.invalidateQueries({ queryKey: ["purchases"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/suppliers/order-summary"] });
      
      // Force immediate refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/purchases"], type: 'all' });

      // Calculate payment details for display
      const orderTotal = selectedPurchaseForPayment ? 
        parseFloat(selectedPurchaseForPayment.total?.toString() || "0") : 0;
      const paymentRecorded = parseFloat(paymentAmount || "0");
      const totalPaid = data.totalPaid || 0;
      const remainingAmount = Math.max(0, orderTotal - totalPaid);
      const paymentPercentage = orderTotal > 0 ? Math.round((totalPaid / orderTotal) * 100) : 0;

      // Enhanced success message based on completion status
      let successTitle = "Payment Recorded Successfully ✅";
      let successDescription = data.message || 'Payment status updated successfully';

      if (data.statusAutoUpdated || data.isCompleted) {
        successTitle = "Purchase Order Completed! 🎉";
        successDescription = `Payment of ${formatCurrency(paymentRecorded)} recorded successfully. Purchase order is now fully paid and completed.`;
      } else if (data.paymentStatus === 'paid') {
        successTitle = "Payment Completed ✅";
        successDescription = `Payment of ${formatCurrency(paymentRecorded)} recorded successfully. Purchase order is now fully paid (100%).`;
      } else if (data.paymentStatus === 'partial') {
        successTitle = "Partial Payment Recorded 📝";
        successDescription = `Payment of ${formatCurrency(paymentRecorded)} recorded successfully. 
Progress: ${formatCurrency(totalPaid)} paid of ${formatCurrency(orderTotal)} total (${paymentPercentage}%). 
Remaining balance: ${formatCurrency(remainingAmount)}`;
      } else {
        successDescription = `Payment of ${formatCurrency(paymentRecorded)} recorded. Total paid: ${formatCurrency(totalPaid)} of ${formatCurrency(orderTotal)}.`;
      }

      toast({
        title: successTitle,
        description: successDescription,
        duration: 5000, // Show longer for detailed payment info
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

  // Professional Record Payment Mutation for Bill Payment Management
  const recordPayment = useMutation({
    mutationFn: async (data: { purchaseId: number; amount: number; method: string; date: string }) => {
      console.log('💰 Recording payment via professional interface:', data);
      
      // Use the existing payment endpoint that works with updatePaymentStatus
      const paymentData = {
        paymentAmount: data.amount,
        paymentMethod: data.method,
        paymentDate: data.date,
        paymentType: 'payment'
      };
      
      const response = await fetch(`/api/purchases/${data.purchaseId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record payment');
      }
      
      return response.json();
    },
    onSuccess: async (data, variables) => {
      console.log('✅ Professional payment recorded successfully:', data);
      
      // Comprehensive cache invalidation for dynamic updates
      await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      await queryClient.invalidateQueries({ queryKey: ["api/suppliers/order-summary"] });
      
      // Force immediate refetch for real-time UI updates
      await refetch();
      
      // Update the current selected purchase with fresh data
      if (selectedPurchaseForPayment) {
        const freshPurchases = queryClient.getQueryData(["/api/purchases"]) as any[];
        const updatedPurchase = freshPurchases?.find(p => p.id === selectedPurchaseForPayment.id);
        if (updatedPurchase) {
          setSelectedPurchaseForPayment(updatedPurchase);
        }
      }
      
      toast({
        title: "Payment Recorded Successfully",
        description: `Payment of ${formatCurrency(variables.amount)} has been recorded and synchronized across all interfaces.`,
        variant: "default",
      });
      
      // Keep dialog open for additional payments but clear form
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (error) => {
      console.error('❌ Professional payment recording failed:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter purchases based on search
  const filteredPurchases = purchases.filter((purchase: Purchase) =>
    (purchase as any).supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id?.toString().includes(searchTerm)
  );

  // Calculate statistics with better data handling
  const totalPurchases = purchases.length;
  const pendingPurchases = purchases.filter((p: Purchase) => {
    const status = p.status?.toLowerCase() || 'pending';
    const paymentStatus = (p as any).paymentStatus; // Use corrected camelCase field

    // Consider as pending if status is pending/ordered/draft OR if not fully paid
    return (status === "pending" || status === "ordered" || status === "draft") || 
           (paymentStatus === "partial" || paymentStatus === "due");
  }).length;

  const completedPurchases = purchases.filter((p: Purchase) => {
    const status = p.status?.toLowerCase() || '';
    const paymentStatus = (p as any).paymentStatus; // Use corrected camelCase field

    // Consider as completed if status is completed/received/delivered OR if fully paid
    return (status === "completed" || status === "received" || status === "delivered") ||
           (paymentStatus === "paid");
  }).length;
  const totalAmount = purchases.reduce((sum: number, p: Purchase) => {
    // Calculate total from purchase items if available (same logic as table display)
    const items = p.purchaseItems || p.items || [];
    let calculatedTotal = 0;
    
    if (items.length > 0) {
      // Calculate from items
      items.forEach(item => {
        const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
        const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
        const itemTotal = qty * cost;
        const discount = Number(item.discountAmount || item.discount_amount || 0);
        const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
        const taxAmount = (itemTotal - discount) * (taxPercent / 100);
        
        calculatedTotal += itemTotal - discount + taxAmount;
      });
      
      // Add freight and other charges if available
      const freightCost = parseFloat(p.freightCost?.toString() || p.freight_cost?.toString() || "0");
      const otherCharges = parseFloat(p.otherCharges?.toString() || p.other_charges?.toString() || "0");
      calculatedTotal += freightCost + otherCharges;
      
      return sum + calculatedTotal;
    } else {
      // Fallback to stored values
      const totalAmountField = parseFloat(p.totalAmount?.toString() || "0");
      const totalField = parseFloat(p.total?.toString() || "0");
      const subTotalField = parseFloat(p.subTotal?.toString() || p.sub_total?.toString() || "0");
      const freightCostField = parseFloat(p.freightCost?.toString() || p.freight_cost?.toString() || "0");
      const otherChargesField = parseFloat(p.otherCharges?.toString() || p.other_charges?.toString() || "0");
      const discountAmountField = parseFloat(p.discountAmount?.toString() || p.discount_amount?.toString() || "0");
      
      let amount = 0;
      if (totalAmountField > 0) {
        amount = totalAmountField;
      } else if (totalField > 0 && subTotalField > 0) {
        amount = Math.max(totalField, subTotalField + freightCostField + otherChargesField - discountAmountField);
      } else if (totalField > 0) {
        amount = totalField;
      } else if (subTotalField > 0) {
        amount = subTotalField + freightCostField + otherChargesField - discountAmountField;
      }
      
      return sum + amount;
    }
  }, 0);

  // Payment statistics with improved calculation
  const paidPurchases = purchases.filter((p: Purchase) => {
    // Use the backend-corrected actualTotal when available, fallback to total
    const totalAmount = parseFloat((p as any).actualTotal?.toString() || p.total?.toString() || "0");
    const paidAmount = parseFloat((p as any).paidAmount?.toString() || "0");
    const paymentStatus = (p as any).paymentStatus;
    return paymentStatus === "paid" || (totalAmount > 0 && paidAmount >= totalAmount);
  }).length;

  const duePurchases = purchases.filter((p: Purchase) => {
    // Use the backend-corrected actualTotal when available, fallback to total
    const totalAmount = parseFloat((p as any).actualTotal?.toString() || p.total?.toString() || "0");
    const paidAmount = parseFloat((p as any).paidAmount?.toString() || "0");
    const paymentStatus = (p as any).paymentStatus;

    // Consider as due if explicitly marked as due, partial, or if unpaid with amount
    return totalAmount > 0 && (
           paymentStatus === "due" || 
           paymentStatus === "overdue" || 
           paymentStatus === "partial" ||
           (!paymentStatus && paidAmount < totalAmount) ||
           (paymentStatus !== "paid" && paidAmount < totalAmount)
    );
  }).length;

  const totalDueAmount = purchases
    .filter((p: Purchase) => {
      // Use the backend-corrected actualTotal when available, fallback to total
      const totalAmount = parseFloat((p as any).actualTotal?.toString() || p.total?.toString() || "0");
      const paidAmount = parseFloat((p as any).paidAmount?.toString() || "0");
      const paymentStatus = (p as any).paymentStatus;

      return totalAmount > 0 && (
             paymentStatus === "due" || 
             paymentStatus === "overdue" || 
             paymentStatus === "partial" ||
             (!paymentStatus && paidAmount < totalAmount) ||
             (paymentStatus !== "paid" && paidAmount < totalAmount)
      );
    })
    .reduce((sum: number, p: Purchase) => {
      // Use the backend-corrected actualTotal when available, fallback to total
      const totalAmount = parseFloat((p as any).actualTotal?.toString() || p.total?.toString() || "0");
      const paidAmount = parseFloat((p as any).paidAmount?.toString() || "0");
      return sum + Math.max(0, totalAmount - paidAmount);
    }, 0);

  // Debug log all statistics after all variables are calculated
  console.log('📊 Complete Purchase Statistics Debug:', {
    totalPurchases: purchases.length,
    pendingPurchases,
    completedPurchases,
    paidPurchases,
    duePurchases,
    totalDueAmount: formatCurrency(totalDueAmount),
    purchases: purchases.map(p => ({
      id: p.id,
      orderNumber: p.orderNumber,
      status: p.status,
      total: parseFloat(p.total?.toString() || "0"),
      actualTotal: parseFloat((p as any).actualTotal?.toString() || "0"),
      paidAmount: parseFloat((p as any).paidAmount?.toString() || "0"),
      paymentStatus: (p as any).paymentStatus,
      remainingAmount: Math.max(0, parseFloat((p as any).actualTotal?.toString() || p.total?.toString() || "0") - parseFloat((p as any).paidAmount?.toString() || "0")),
      isPending: (p.status?.toLowerCase() === "pending" || p.status?.toLowerCase() === "ordered" || p.status?.toLowerCase() === "draft") || 
                 ((p as any).paymentStatus === "partial" || (p as any).paymentStatus === "due"),
      isCompleted: (p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "received" || p.status?.toLowerCase() === "delivered") ||
                   ((p as any).paymentStatus === "paid")
    }))
  });

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
    const totalAmount = parseFloat(purchase.totalAmount?.toString() || purchase.total?.toString() || "0");
    const currentPaidAmount = parseFloat(purchase.paidAmount?.toString() || "0");
    const remainingAmount = Math.max(0, totalAmount - currentPaidAmount);

    const paymentData = {
      paymentStatus: 'paid',
      paymentAmount: remainingAmount, // Pay only the remaining amount
      totalPaidAmount: totalAmount, // Set total paid to full amount
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString(),
      notes: 'Marked as fully paid from purchase dashboard'
    };

    console.log('💰 Marking as paid:', {
      orderNumber: purchase.orderNumber,
      totalAmount: formatCurrency(totalAmount),
      currentPaid: formatCurrency(currentPaidAmount),
      remainingAmount: formatCurrency(remainingAmount),
      paymentData
    });

    updatePaymentStatus.mutate({ 
      purchaseId: purchase.id, 
      paymentData 
    });
  };

  const handleQuickPaymentStatusChange = (purchase: Purchase, newStatus: string) => {
    const totalAmount = parseFloat(purchase.total?.toString() || "0");
    const currentPaidAmount = parseFloat(purchase.paidAmount?.toString() || "0");

    let paymentData: any = {
      paymentStatus: newStatus,
      paymentMethod: purchase.paymentMethod || 'cash',
      paymentDate: new Date().toISOString(),
      notes: `Payment status changed to ${newStatus} from dashboard`
    };

    // Set payment amounts based on status
    if (newStatus === 'paid') {
      paymentData.paymentAmount = totalAmount - currentPaidAmount;
      paymentData.totalPaidAmount = totalAmount;
      paymentData.updatePurchaseStatus = true;
      paymentData.newPurchaseStatus = 'completed';
    } else if (newStatus === 'partial') {
      paymentData.paymentAmount = totalAmount * 0.5; // 50% payment
      paymentData.totalPaidAmount = currentPaidAmount + (totalAmount * 0.5);
    } else if (newStatus === 'due') {
      paymentData.paymentAmount = 0;
      paymentData.totalPaidAmount = currentPaidAmount;
    }

    updatePaymentStatus.mutate({ 
      purchaseId: purchase.id, 
      paymentData 
    });
  };

  const handleRecordPayment = async (purchase: Purchase) => {
    console.log('💳 Opening payment modal for purchase:', purchase.id);
    
    // Force refresh the purchases data to get the latest payment information
    await queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    await refetch();
    
    // Get the updated purchase data
    const updatedPurchases = purchases || [];
    const updatedPurchase = updatedPurchases.find(p => p.id === purchase.id) || purchase;
    
    console.log('💰 Updated purchase payment data:', {
      purchaseId: updatedPurchase.id,
      paidAmount: updatedPurchase.paidAmount || updatedPurchase.paid_amount,
      paymentStatus: updatedPurchase.paymentStatus || updatedPurchase.payment_status
    });
    
    setSelectedPurchaseForPayment(updatedPurchase);
    setPaymentAmount(updatedPurchase.total?.toString() || "0");
    setPaymentDialogOpen(true);
  };

  const handleStatusUpdate = (purchase: Purchase) => {
    setSelectedPurchaseForStatus(purchase);
    setNewStatus(purchase.status || "pending");
    setStatusDialogOpen(true);
  };

  const handlePrint = async (purchase: Purchase) => {
    try {
      // Fetch complete purchase details including items for printing
      const response = await fetch(`/api/purchases/${purchase.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchase details');
      }

      const purchaseWithItems = await response.json();

      // Create print content
      const printContent = generatePrintContent(purchaseWithItems);

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();

        toast({
          title: "Print Ready",
          description: "Purchase order has been sent to printer",
        });
      } else {
        throw new Error('Unable to open print window');
      }
    } catch (error) {
      console.error('❌ Error printing purchase order:', error);
      toast({
        title: "Print Error",
        description: "Failed to print purchase order",
        variant: "destructive",
      });
    }
  };

  const generatePrintContent = (purchase: any) => {
    const currentDate = new Date().toLocaleDateString();
    const items = purchase.items || purchase.purchaseItems || purchase.purchase_items || [];
    const subtotal = parseFloat(purchase.subTotal || purchase.total || '0');
    const freight = parseFloat(purchase.freight || '0');
    const otherCharges = parseFloat(purchase.otherCharges || '0');
    const discount = parseFloat(purchase.discount || '0');
    const grandTotal = subtotal + freight + otherCharges - discount;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${purchase.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11px;
            color: #000;
            background: white;
            padding: 10px;
          }
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
          }
          .header-section {
            border: 2px solid #000;
            margin-bottom: 5px;
          }
          .header-row {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .header-row:last-child {
            border-bottom: none;
          }
          .header-cell {
            padding: 4px 8px;
            border-right: 1px solid #000;
            flex: 1;
          }
          .header-cell:last-child {
            border-right: none;
          }
          .header-cell strong {
            font-weight: bold;
          }
          .company-section {
            border: 2px solid #000;
            padding: 8px;
            margin-bottom: 5px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 4px;
          }
          .company-details {
            font-size: 10px;
            text-align: center;
            line-height: 1.2;
          }
          .supplier-section {
            border: 2px solid #000;
            padding: 8px;
            margin-bottom: 5px;
          }
          .supplier-title {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            margin-bottom: 5px;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
            font-size: 10px;
          }
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          .items-table .text-center {
            text-align: center;
          }
          .items-table .text-right {
            text-align: right;
          }
          .total-section {
            border: 2px solid #000;
            margin-bottom: 5px;
          }
          .total-row {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-label {
            flex: 1;
            padding: 4px 8px;
            border-right: 1px solid #000;
            font-weight: bold;
          }
          .total-value {
            width: 120px;
            padding: 4px 8px;
            text-align: right;
            font-weight: bold;
          }
          .amount-words {
            border: 2px solid #000;
            padding: 8px;
            margin-bottom: 5px;
            font-size: 9px;
          }
          .declaration-section {
            border: 2px solid #000;
            padding: 8px;
            margin-bottom: 5px;
            font-size: 9px;
          }
          .signature-section {
            border: 2px solid #000;
            padding: 8px;
            text-align: right;
            font-size: 10px;
          }
          .computer-generated {
            text-align: center;
            font-size: 9px;
            margin-top: 10px;
            font-style: italic;
          }
          @media print {
            body { margin: 0; padding: 5px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header Information -->
          <div class="header-section">
            <div class="header-row">
              <div class="header-cell"><strong>Purchase Order</strong></div>
              <div class="header-cell"><strong>(ORIGINAL FOR RECIPIENT)</strong></div>
            </div>
            <div class="header-row">
              <div class="header-cell">Invoice No.: <strong>${purchase.orderNumber || `PO-${purchase.id}`}</strong></div>
              <div class="header-cell">Dated: <strong>${purchase.orderDate ? new Date(purchase.orderDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</strong></div>
            </div>
            <div class="header-row">
              <div class="header-cell">Delivery Note:</div>
              <div class="header-cell">Mode/Terms of Payment:</div>
            </div>
            <div class="header-row">
              <div class="header-cell">Reference No. & Date:</div>
              <div class="header-cell">Other References:</div>
            </div>
            <div class="header-row">
              <div class="header-cell">Buyer's Order No.:</div>
              <div class="header-cell">Dated:</div>
            </div>
            <div class="header-row">
              <div class="header-cell">Dispatch Doc No.:</div>
              <div class="header-cell">Delivery Note Date:</div>
            </div>
            <div class="header-row">
              <div class="header-cell">Dispatched through:</div>
              <div class="header-cell">Destination:</div>
            </div>
            <div class="header-row">
              <div class="header-cell">Terms of Delivery:</div>
              <div class="header-cell"></div>
            </div>
          </div>

          <!-- Company Information -->
          <div class="company-section">
            <div class="company-name">AWESOME SHOP POS</div>
            <div class="company-details">
              Modern POS System for Indian Retail<br>
              Complete Business Management Solution<br>
              GST Compliant | Multi-Language Support
            </div>
          </div>

          <!-- Supplier Information -->
          <div class="supplier-section">
            <div class="supplier-title">Consignee (Ship to):</div>
            <strong>${purchase.supplier?.name || 'SUPPLIER NAME'}</strong><br>
            ${purchase.supplier?.address || 'Supplier Address'}<br>
            ${purchase.supplier?.phone || 'Phone Number'}<br>
            ${purchase.supplier?.email || 'Email Address'}<br>
            GSTIN/UIN: <strong>${purchase.supplier?.gstin || 'N/A'}</strong><br>
            State Name: ${purchase.supplier?.state || 'State'}, Code: ${purchase.supplier?.stateCode || '00'}<br>
            Place of Supply: ${purchase.supplier?.city || 'City'}
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th rowspan="2">Sl</th>
                <th rowspan="2">Description of Goods</th>
                <th rowspan="2">HSN/SAC</th>
                <th rowspan="2">Quantity</th>
                <th rowspan="2">Rate</th>
                <th rowspan="2">per</th>
                <th rowspan="2">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, index: number) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${item.product?.name || item.productName || 'Product Name'}</td>
                  <td class="text-center">${item.product?.hsnCode || '1006'}</td>
                  <td class="text-center">${item.quantity || 0}</td>
                  <td class="text-right">${parseFloat(item.unitPrice || item.price || '0').toFixed(2)}</td>
                  <td class="text-center">NOS</td>
                  <td class="text-right">${parseFloat(item.total || item.subtotal || '0').toFixed(2)}</td>
                </tr>
              `).join('')}

              <!-- Empty rows for spacing -->
              ${Array(Math.max(0, 10 - items.length)).fill(0).map(() => `
                <tr>
                  <td class="text-center">&nbsp;</td>
                  <td>&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-right">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-right">&nbsp;</td>
                </tr>
              `).join('')}

              <tr style="border-top: 2px solid #000;">
                <td colspan="6" class="text-right"><strong>Total</strong></td>
                <td class="text-right"><strong>₹ ${grandTotal.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <!-- Total Section -->
          <div class="total-section">
            <div class="total-row">
              <div class="total-label">Amount Chargeable (in words):</div>
              <div class="total-value">E. & O.E</div>
            </div>
            <div class="total-row">
              <div class="total-label"><strong>INR ${convertNumberToWords(grandTotal)} Only</strong></div>
              <div class="total-value">&nbsp;</div>
            </div>
          </div>

          <!-- Tax Breakdown -->
          <div class="total-section">
            <div class="total-row">
              <div class="total-label">HSN/SAC</div>
              <div class="total-value">Taxable Value</div>
            </div>
            <div class="total-row">
              <div class="total-label">1006</div>
              <div class="total-value">₹ ${subtotal.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label"><strong>Total</strong></div>
              <div class="total-value"><strong>₹ ${grandTotal.toFixed(2)}</strong></div>
            </div>
          </div>

          <!-- Tax Amount -->
          <div class="amount-words">
            <strong>Tax Amount (in words): NIL</strong>
          </div>

          <!-- Declaration -->
          <div class="declaration-section">
            <strong>Declaration:</strong><br>
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          </div>

          <!-- Company Bank Details and Signature -->
          <div class="signature-section">
            <strong>Company's Bank Details</strong><br>
            Bank Name: <strong>AWESOME BANK</strong><br>
            A/c No.: <strong>1234567890</strong><br>
            Branch & IFS Code: <strong>BRANCH & IFS0001234</strong><br>
            <br>
            for <strong>AWESOME SHOP POS</strong><br>
            <br>
            <br>
            <strong>Authorised Signatory</strong>
          </div>

          <div class="computer-generated">
            This is a Computer Generated Invoice
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Helper function to convert number to words (simplified version)
  const convertNumberToWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (amount === 0) return 'Zero';

    let integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = '';

    if (integerPart >= 10000000) {
      const crores = Math.floor(integerPart / 10000000);
      result += convertNumberToWords(crores) + ' Crore ';
      integerPart %= 10000000;
    }

    if (integerPart >= 100000) {
      const lakhs = Math.floor(integerPart / 100000);
      result += convertNumberToWords(lakhs) + ' Lakh ';
      integerPart %= 100000;
    }

    if (integerPart >= 1000) {
      const thousands = Math.floor(integerPart / 1000);
      result += convertNumberToWords(thousands) + ' Thousand ';
      integerPart %= 1000;
    }

    if (integerPart >= 100) {
      result += ones[Math.floor(integerPart / 100)] + ' Hundred ';
      integerPart %= 100;
    }

    if (integerPart >= 20) {
      result += tens[Math.floor(integerPart / 10)] + ' ';
      integerPart %= 10;
    } else if (integerPart >= 10) {
      result += teens[integerPart - 10] + ' ';
      integerPart = 0;
    }

    if (integerPart > 0) {
      result += ones[integerPart] + ' ';
    }

    if (decimalPart > 0) {
      result += 'and ' + decimalPart + '/100 ';
    }

    return result.trim();
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

    const totalAmount = parseFloat(selectedPurchaseForPayment.total?.toString() || "0");
    const currentPaidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");

    // Validate against remaining balance
    const remainingBalance = Math.max(0, totalAmount - currentPaidAmount);
    
    if (newPaymentAmount > remainingBalance && remainingBalance > 0) {
      const shouldProceed = window.confirm(
        `Payment amount (${formatCurrency(newPaymentAmount)}) exceeds remaining balance (${formatCurrency(remainingBalance)}). This will result in an overpayment of ${formatCurrency(newPaymentAmount - remainingBalance)}. Do you want to proceed?`
      );
      
      if (!shouldProceed) {
        return;
      }
    }

    // Calculate total paid after this payment
    const totalPaidAfterPayment = currentPaidAmount + newPaymentAmount;

    // Determine payment status based on amount paid
    let paymentStatus = 'due';
    let shouldUpdatePurchaseStatus = false;

    if (totalAmount > 0) {
      const paymentPercentage = (totalPaidAfterPayment / totalAmount) * 100;
      
      if (paymentPercentage >= 100) {
        paymentStatus = 'paid';
        shouldUpdatePurchaseStatus = true;
      } else if (paymentPercentage >= 1) { // At least 1% paid
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
      totalPaidAmount: totalPaidAfterPayment,
      paymentMethod: paymentMethod.trim(),
      paymentDate: new Date().toISOString(),
      notes: paymentNotes?.trim() || `Payment of ${formatCurrency(newPaymentAmount)} recorded via dashboard using ${paymentMethod}`,
      updatePurchaseStatus: shouldUpdatePurchaseStatus,
      newPurchaseStatus: shouldUpdatePurchaseStatus ? 'completed' : undefined
    };

    console.log('🔄 Confirming payment with validated data:', paymentData);
    console.log('📊 Payment breakdown:', {
      orderNumber: selectedPurchaseForPayment.orderNumber,
      totalAmount: formatCurrency(totalAmount),
      currentPaid: formatCurrency(currentPaidAmount),
      newPayment: formatCurrency(newPaymentAmount),
      totalAfterPayment: formatCurrency(totalPaidAfterPayment),
      remainingBalance: formatCurrency(Math.max(0, totalAmount - totalPaidAfterPayment)),
      paymentStatus: paymentStatus,
      paymentPercentage: Math.round((totalPaidAfterPayment / totalAmount) * 100),
      willAutoComplete: shouldUpdatePurchaseStatus
    });

    // Show loading state with completion info
    toast({
      title: "Processing Payment",
      description: paymentStatus === 'paid' ? 
        "Recording payment and completing purchase order..." : 
        `Recording partial payment... (${Math.round((totalPaidAfterPayment / totalAmount) * 100)}% paid)`,
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

  // Calculate totals and format data for display
  const formattedPurchases = purchases.map((purchase) => {
    // Calculate total from items if not available in purchase record
    let calculatedTotal = 0;

    // First try to get total from purchase record
    if (purchase.total && parseFloat(purchase.total) > 0) {
      calculatedTotal = parseFloat(purchase.total);
    // totalAmount property doesn't exist - use only total from schema
    } else if (purchase.invoiceAmount && parseFloat(purchase.invoiceAmount) > 0) {
      calculatedTotal = parseFloat(purchase.invoiceAmount);
    } else if (purchase.items && purchase.items.length > 0) {
      // Calculate from items
      calculatedTotal = purchase.items.reduce((sum, item) => {
        const quantity = item.receivedQty || item.quantity || 0;
        const cost = item.unitCost || item.cost || 0;
        const itemTotal = quantity * cost;
        const discount = item.discountAmount || 0;
        const taxAmount = ((itemTotal - discount) * (item.taxPercentage || 0)) / 100;
        return sum + (itemTotal - discount + taxAmount);
      }, 0);

      // Add additional charges if available
      calculatedTotal += parseFloat(purchase.freightAmount || purchase.freight_amount || "0");
      calculatedTotal += parseFloat(purchase.surchargeAmount || purchase.surcharge_amount || "0");
      calculatedTotal += parseFloat(purchase.packingCharges || purchase.packing_charges || "0");
      calculatedTotal += parseFloat(purchase.otherCharges || purchase.other_charges || "0");
      calculatedTotal -= parseFloat(purchase.additionalDiscount || purchase.additional_discount || "0");
    }

    // ALWAYS use the database total as the authoritative source to prevent payment status bugs
    // Frontend recalculation can cause discrepancies with payment status
    const totalAmount = parseFloat(purchase.total?.toString() || "0") || calculatedTotal;
    const paidAmount = parseFloat(purchase.paidAmount?.toString() || purchase.paid_amount?.toString() || "0");
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    // ALWAYS use the backend payment status as the primary source of truth
    let paymentStatus = purchase.paymentStatus || purchase.payment_status;

    // Debug logging for payment calculation - especially for partial payments
    if (purchase.id && ((purchase.paymentStatus || purchase.payment_status) === 'partial' || remainingAmount > 0)) {
      console.log(`🔍 Payment Debug for Purchase ${purchase.id}:`, {
        orderNumber: purchase.orderNumber,
        totalAmount,
        paidAmount,
        remainingAmount,
        backendPaymentStatus: purchase.paymentStatus || purchase.payment_status,
        rawPaidAmount: purchase.paidAmount,
        rawTotal: purchase.total,
        calculatedStatus: paymentStatus
      });
    }
    let paymentStatusColor = "red";
    let paymentStatusText = "Payment Due";

    // Only calculate if backend status is completely missing (not just undefined)
    if (!paymentStatus) {
      if (totalAmount <= 0) {
        paymentStatus = "unknown";
      } else if (Math.abs(paidAmount - totalAmount) < 0.01) { // Account for floating point precision
        paymentStatus = "paid";
      } else if (paidAmount >= totalAmount) {
        paymentStatus = "paid"; // Overpayment is still considered fully paid
      } else if (paidAmount > 0) {
        paymentStatus = "partial";
      } else {
        paymentStatus = "due"; // Use 'due' to match backend terminology
      }
    }

    // Log when we have a status mismatch for debugging
    if (paymentStatus === 'partial' && paidAmount >= totalAmount) {
      console.warn(`⚠️ Status Mismatch for Purchase ${purchase.id}: Backend says '${paymentStatus}' but paid (${paidAmount}) >= total (${totalAmount})`);
    }

    // Set display properties based on calculated/received status
    if (totalAmount <= 0) {
      paymentStatusColor = "gray";
      paymentStatusText = "No Amount";
    } else if (paymentStatus === "paid") {
      paymentStatusColor = "green";
      paymentStatusText = "Fully Paid";
    } else if (paymentStatus === "partial") {
      paymentStatusColor = "orange";
      paymentStatusText = `Partial (₹${paidAmount.toFixed(2)})`;
    } else { // due, unpaid, or other statuses
      paymentStatusColor = "red";
      paymentStatusText = remainingAmount > 0 ? `Due: ₹${remainingAmount.toFixed(2)}` : "Payment Due";
    }

    return {
      ...purchase,
      totalAmount: calculatedTotal,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus,
      paymentStatusColor: paymentStatusColor,
      paymentStatusText: paymentStatusText
    };
  });

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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={async () => {
                    console.log('🔄 Manual refresh triggered');
                    await queryClient.invalidateQueries({ queryKey: ["/api/purchases"], exact: false });
                    await refetch();
                    console.log('✅ Manual refresh completed');
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
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
                        {completedPurchases} of {totalPurchases} orders                      </span>
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
                        {formattedPurchases.slice(0, 5).map((purchase: Purchase) => (
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
                              <p className="font-medium">
                                {(() => {
                                  // Calculate total from purchase items if available
                                  const items = purchase.purchaseItems || purchase.items || [];
                                  let calculatedTotal = 0;
                                  
                                  if (items.length > 0) {
                                    // Calculate from items
                                    items.forEach(item => {
                                      const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                                      const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                                      const itemTotal = qty * cost;
                                      const discount = Number(item.discountAmount || item.discount_amount || 0);
                                      const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                                      const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                                      
                                      calculatedTotal += itemTotal - discount + taxAmount;
                                    });
                                    
                                    // Add freight and other charges if available
                                    const freightCost = parseFloat(purchase.freightCost?.toString() || purchase.freight_cost?.toString() || "0");
                                    const otherCharges = parseFloat(purchase.otherCharges?.toString() || purchase.other_charges?.toString() || "0");
                                    calculatedTotal += freightCost + otherCharges;
                                    
                                    return formatCurrency(calculatedTotal);
                                  } else {
                                    // Fallback to stored values
                                    return formatCurrency(purchase.totalAmount || "0");
                                  }
                                })()}
                              </p>
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
                        {Array.from(new Set(formattedPurchases.map((p: Purchase) => p.supplier?.name)))
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((supplierName, index) => {
                            const supplierPurchases = formattedPurchases.filter((p: Purchase) => p.supplier?.name === supplierName);
                            const totalValue = supplierPurchases.reduce((sum, p) => {
                              // Calculate total from purchase items if available (same logic as table)
                              const items = p.purchaseItems || p.items || [];
                              let calculatedTotal = 0;
                              
                              if (items.length > 0) {
                                // Calculate from items
                                items.forEach(item => {
                                  const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                                  const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                                  const itemTotal = qty * cost;
                                  const discount = Number(item.discountAmount || item.discount_amount || 0);
                                  const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                                  const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                                  
                                  calculatedTotal += itemTotal - discount + taxAmount;
                                });
                                
                                // Add freight and other charges if available
                                const freightCost = parseFloat(p.freightCost?.toString() || p.freight_cost?.toString() || "0");
                                const otherCharges = parseFloat(p.otherCharges?.toString() || p.other_charges?.toString() || "0");
                                calculatedTotal += freightCost + otherCharges;
                                
                                return sum + calculatedTotal;
                              } else {
                                // Fallback to stored values
                                return sum + parseFloat(p.totalAmount?.toString() || "0");
                              }
                            }, 0);
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
                            <TableHead className="font-semibold text-right">Total Amount</TableHead>
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
                                    <DropdownMenuItem onClick={() => handlePrint(purchase)}>
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
                              <TableCell className="py-4 text-right">
                                <div className="flex flex-col items-end space-y-1">
                                  <span className="font-semibold text-lg text-gray-900">
                                    {(() => {
                                      // Calculate total from items if available
                                      const items = purchase.purchaseItems || purchase.items || [];
                                      if (items.length > 0) {
                                        let calculatedTotal = 0;
                                        items.forEach(item => {
                                          // Use net_amount if available (includes tax and discounts)
                                          const netAmount = parseFloat(item.netAmount || item.net_amount || "0");
                                          if (netAmount > 0) {
                                            calculatedTotal += netAmount;
                                          } else {
                                            // Fallback calculation if net_amount is not available
                                            const qty = parseFloat(item.quantity?.toString() || "0");
                                            const cost = parseFloat(item.unitCost || item.unit_cost || item.cost || "0");
                                            const taxPercent = parseFloat(item.taxPercentage || item.tax_percentage || "0");
                                            const discountAmount = parseFloat(item.discountAmount || item.discount_amount || "0");
                                            
                                            const itemSubtotal = qty * cost;
                                            const afterDiscount = itemSubtotal - discountAmount;
                                            const taxAmount = afterDiscount * (taxPercent / 100);
                                            calculatedTotal += afterDiscount + taxAmount;
                                          }
                                        });
                                        
                                        // Add any additional charges
                                        const freightCost = parseFloat(purchase.freightCost?.toString() || purchase.freight_cost?.toString() || "0");
                                        const otherCharges = parseFloat(purchase.otherCharges?.toString() || purchase.other_charges?.toString() || "0");
                                        calculatedTotal += freightCost + otherCharges;
                                        
                                        return formatCurrency(calculatedTotal);
                                      }
                                      
                                      // Fallback to stored total
                                      return formatCurrency(parseFloat(purchase.total?.toString() || "0"));
                                    })()}
                                  </span>
                                  {purchase.subTotal && (
                                    <span className="text-sm text-gray-500">
                                      Subtotal: {formatCurrency(parseFloat(purchase.subTotal.toString()))}
                                    </span>
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
                                  // Calculate total amount using same item-based logic as the Total Amount column
                                  const items = purchase.purchaseItems || purchase.items || [];
                                  let totalAmount = 0;
                                  
                                  if (items.length > 0) {
                                    // Calculate from items
                                    items.forEach(item => {
                                      const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                                      const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                                      const itemTotal = qty * cost;
                                      const discount = Number(item.discountAmount || item.discount_amount || 0);
                                      const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                                      const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                                      
                                      totalAmount += itemTotal - discount + taxAmount;
                                    });
                                    
                                    // Add freight and other charges if available
                                    const freightCost = parseFloat(purchase.freightCost?.toString() || purchase.freight_cost?.toString() || "0");
                                    const otherCharges = parseFloat(purchase.otherCharges?.toString() || purchase.other_charges?.toString() || "0");
                                    totalAmount += freightCost + otherCharges;
                                  } else {
                                    // Fallback to stored calculation logic
                                    const totalAmountField = parseFloat(purchase.totalAmount?.toString() || "0");
                                    const totalField = parseFloat(purchase.total?.toString() || "0");
                                    const subTotalField = parseFloat(purchase.subTotal?.toString() || purchase.sub_total?.toString() || "0");
                                    const freightCostField = parseFloat(purchase.freightCost?.toString() || purchase.freight_cost?.toString() || "0");
                                    const otherChargesField = parseFloat(purchase.otherCharges?.toString() || purchase.other_charges?.toString() || "0");
                                    const discountAmountField = parseFloat(purchase.discountAmount?.toString() || purchase.discount_amount?.toString() || "0");
                                    
                                    if (totalAmountField > 0) {
                                      totalAmount = totalAmountField;
                                    } else if (totalField > 0 && subTotalField > 0) {
                                      totalAmount = Math.max(totalField, subTotalField + freightCostField + otherChargesField - discountAmountField);
                                    } else if (totalField > 0) {
                                      totalAmount = totalField;
                                    } else if (subTotalField > 0) {
                                      totalAmount = subTotalField + freightCostField + otherChargesField - discountAmountField;
                                    }
                                  }

                                  const paidAmount = parseFloat(purchase.paidAmount?.toString() || purchase.paid_amount?.toString() || "0");
                                  
                                  // Debug logging for payment status calculations
                                  if (purchase.orderNumber?.includes('PO-1754534650193')) {
                                    console.log('🔍 Payment debug for', purchase.orderNumber, {
                                      totalAmount,
                                      paidAmount,
                                      storedPaidAmount: purchase.paidAmount,
                                      storedPaymentStatus: purchase.paymentStatus,
                                      calculatedStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'due'
                                    });
                                  }

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
                                  const storedStatus = purchase.paymentStatus || purchase.payment_status;
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
                                    <div className="space-y-2">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`justify-start gap-2 px-3 py-1.5 h-auto text-xs font-medium border cursor-pointer hover:opacity-75 ${config.color}`}
                                          >
                                            <Icon className="w-3.5 h-3.5" />
                                            {config.label}
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-48">
                                          <DropdownMenuLabel>Change Payment Status</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          {paymentStatus !== 'paid' && (
                                            <DropdownMenuItem 
                                              onClick={() => handleQuickPaymentStatusChange(purchase, 'paid')}
                                              className="text-green-600"
                                            >
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              Mark as Fully Paid
                                            </DropdownMenuItem>
                                          )}
                                          {paymentStatus !== 'partial' && paymentStatus !== 'paid' && (
                                            <DropdownMenuItem 
                                              onClick={() => handleQuickPaymentStatusChange(purchase, 'partial')}
                                              className="text-blue-600"
                                            >
                                              <Clock className="w-4 h-4 mr-2" />
                                              Mark as Partial Payment
                                            </DropdownMenuItem>
                                          )}
                                          {paymentStatus !== 'due' && (
                                            <DropdownMenuItem 
                                              onClick={() => handleQuickPaymentStatusChange(purchase, 'due')}
                                              className="text-orange-600"
                                            >
                                              <AlertCircle className="w-4 h-4 mr-2" />
                                              Mark as Payment Due
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleRecordPayment(purchase)}>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Record Custom Payment
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>

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
                                          Fully paid on {(purchase as any).payment_date ? format(new Date((purchase as any).payment_date), 'MMM dd') : format(new Date(), 'MMM dd')}
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Supplier-wise Orders & Due Amount
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Link href="/suppliers">
                          <Button variant="outline" size="sm">
                            <Building2 className="w-4 h-4 mr-2" />
                            Manage Suppliers
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            await queryClient.invalidateQueries({ queryKey: ["/api/suppliers/order-summary"] });
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {suppliersLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading supplier data...</p>
                      </div>
                    ) : supplierData.length === 0 ? (
                      <div className="text-center py-8">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Supplier Orders</h3>
                        <p className="text-gray-600 mb-4">No purchase orders found for any suppliers</p>
                        <Link href="/purchase-entry-professional">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Purchase Order
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Supplier Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-700">Active Suppliers</p>
                                  <p className="text-2xl font-bold text-blue-900">{supplierData.length}</p>
                                </div>
                                <Building2 className="w-8 h-8 text-blue-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-700">Total Orders</p>
                                  <p className="text-2xl font-bold text-green-900">
                                    {supplierData.reduce((sum, s) => sum + s.totalOrders, 0)}
                                  </p>
                                </div>
                                <ShoppingCart className="w-8 h-8 text-green-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-purple-50 border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-purple-700">Total Value</p>
                                  <p className="text-xl font-bold text-purple-900">
                                    {formatCurrency(supplierData.reduce((sum, s) => sum + s.totalAmount, 0))}
                                  </p>
                                </div>
                                <DollarSign className="w-8 h-8 text-purple-600" />
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-red-700">Total Due</p>
                                  <p className="text-xl font-bold text-red-900">
                                    {formatCurrency(supplierData.reduce((sum, s) => sum + s.dueAmount, 0))}
                                  </p>
                                </div>
                                <AlertCircle className="w-8 h-8 text-red-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Supplier Table */}
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">Supplier Details</TableHead>
                                <TableHead className="font-semibold text-center">Orders</TableHead>
                                <TableHead className="font-semibold text-right">Total Amount</TableHead>
                                <TableHead className="font-semibold text-right">Paid Amount</TableHead>
                                <TableHead className="font-semibold text-right">Due Amount</TableHead>
                                <TableHead className="font-semibold text-center">Payment Status</TableHead>
                                <TableHead className="font-semibold text-center">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supplierData.map((supplier: any) => (
                                <TableRow key={supplier.id} className="hover:bg-gray-50">
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{supplier.name}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                          {supplier.phone && (
                                            <div className="flex items-center gap-1">
                                              <Phone className="w-3 h-3" />
                                              {supplier.phone}
                                            </div>
                                          )}
                                          {supplier.email && (
                                            <div className="flex items-center gap-1">
                                              <Mail className="w-3 h-3" />
                                              {supplier.email}
                                            </div>
                                          )}
                                        </div>
                                        {supplier.address && (
                                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {supplier.address}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center py-4">
                                    <div className="space-y-1">
                                      <p className="text-lg font-semibold">{supplier.totalOrders}</p>
                                      <div className="flex items-center justify-center gap-2 text-xs">
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                          {supplier.paidOrders} Paid
                                        </Badge>
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                          {supplier.partialOrders} Partial
                                        </Badge>
                                        <Badge variant="outline" className="bg-red-50 text-red-700">
                                          {supplier.pendingOrders} Due
                                        </Badge>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <p className="text-lg font-semibold">{formatCurrency(supplier.totalAmount)}</p>
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <p className="text-lg font-semibold text-green-700">{formatCurrency(supplier.paidAmount)}</p>
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <p className={`text-lg font-semibold ${supplier.dueAmount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                      {formatCurrency(supplier.dueAmount)}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-center py-4">
                                    {supplier.dueAmount > 0 ? (
                                      <Badge variant="destructive" className="gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Payment Due
                                      </Badge>
                                    ) : (
                                      <Badge variant="default" className="bg-green-100 text-green-800 gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Fully Paid
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedSupplierId(supplier.id);
                                          setActiveTab("orders");
                                          setSearchTerm(`supplier:${supplier.name}`);
                                        }}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View Orders
                                      </Button>
                                      {supplier.dueAmount > 0 && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            toast({
                                              title: "Payment Recording",
                                              description: `Feature coming soon for ${supplier.name}. Current due: ${formatCurrency(supplier.dueAmount)}`,
                                            });
                                          }}
                                        >
                                          <CreditCard className="w-4 h-4 mr-1" />
                                          Record Payment
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
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
                        {(() => {
                          // Calculate total from purchase items if available
                          const items = selectedPurchase.purchaseItems || selectedPurchase.items || [];
                          let calculatedTotal = 0;
                          
                          if (items.length > 0) {
                            // Calculate from items
                            items.forEach(item => {
                              const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                              const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                              const itemTotal = qty * cost;
                              const discount = Number(item.discountAmount || item.discount_amount || 0);
                              const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                              const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                              
                              calculatedTotal += itemTotal - discount + taxAmount;
                            });
                            
                            // Add freight and other charges if available
                            const freightCost = parseFloat(selectedPurchase.freightCost?.toString() || selectedPurchase.freight_cost?.toString() || "0");
                            const otherCharges = parseFloat(selectedPurchase.otherCharges?.toString() || selectedPurchase.other_charges?.toString() || "0");
                            calculatedTotal += freightCost + otherCharges;
                            
                            return formatCurrency(calculatedTotal);
                          } else {
                            // Fallback to stored values
                            return formatCurrency(selectedPurchase.totalAmount || selectedPurchase.total || "0");
                          }
                        })()}
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
                          <label className="text-sm font-medium text-gray-600">Tax ID</label>
                          <p className="text-base mt-1">
                            {selectedPurchase.supplier?.taxId || "Not provided"}
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
                                <TableHead className="w-20 text-center font-semibold text-green-700">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>Free Qty</span>
                                    <span className="text-green-600">🎁</span>
                                  </div>
                                </TableHead>
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
                                      <FreeQtyEditCell 
                                        item={item} 
                                        onUpdate={(newFreeQty) => {
                                          // Update the item in the current view
                                          item.freeQty = newFreeQty;
                                          item.free_qty = newFreeQty;
                                        }}
                                      />
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
                      {/* Stock Impact Summary */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Stock Impact Summary
                        </h4>
                        {(() => {
                          const items = selectedPurchase.purchaseItems || selectedPurchase.items || [];
                          const totalReceived = items.reduce((sum, item) => sum + Number(item.receivedQty || item.received_qty || item.quantity || 0), 0);
                          const totalFree = items.reduce((sum, item) => sum + Number(item.freeQty || item.free_qty || 0), 0);
                          const totalStock = totalReceived + totalFree;

                          return (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex justify-between">
                                <span>Received Units:</span>
                                <span className="font-semibold text-blue-600">{totalReceived}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Free Units:</span>
                                <span className="font-semibold text-green-600">{totalFree} 🎁</span>
                              </div>
                              <div className="col-span-2 flex justify-between pt-2 border-t border-green-300">
                                <span className="font-medium">Total Stock Added:</span>
                                <span className="font-bold text-green-700">{totalStock} units</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {(() => {
                        // Calculate financial summary from purchase items
                        const items = selectedPurchase.purchaseItems || selectedPurchase.items || [];
                        let subtotal = 0;
                        let totalDiscount = 0;
                        let totalTax = 0;
                        
                        // Calculate from items if available
                        if (items.length > 0) {
                          items.forEach(item => {
                            const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                            const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                            const itemTotal = qty * cost;
                            const discount = Number(item.discountAmount || item.discount_amount || 0);
                            const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                            const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                            
                            subtotal += itemTotal - discount;
                            totalDiscount += discount;
                            totalTax += taxAmount;
                          });
                        } else {
                          // Fallback to stored values
                          subtotal = parseFloat(selectedPurchase.subTotal?.toString() || selectedPurchase.sub_total?.toString() || "0");
                          totalDiscount = parseFloat(selectedPurchase.discountAmount?.toString() || selectedPurchase.discount_amount?.toString() || "0");
                          totalTax = parseFloat(selectedPurchase.taxAmount?.toString() || selectedPurchase.tax_amount?.toString() || "0");
                        }
                        
                        return (
                          <>
                            <div className="flex justify-between py-2 border-b">
                              <span className="font-medium">Subtotal (Before Tax):</span>
                              <span className="font-semibold">
                                {formatCurrency(subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="font-medium">Total Discount:</span>
                              <span className="font-semibold text-red-600">
                                {formatCurrency(totalDiscount)}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="font-medium">Total Tax (GST):</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(totalTax)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex justify-between py-3 border-t-2 border-purple-300 bg-purple-50 px-4 rounded">
                        <span className="text-lg font-bold">Grand Total:</span>
                        <span className="text-xl font-bold text-purple-700">
                          {(() => {
                            // Calculate grand total from items
                            const items = selectedPurchase.purchaseItems || selectedPurchase.items || [];
                            let grandTotal = 0;
                            
                            if (items.length > 0) {
                              // Calculate from items
                              items.forEach(item => {
                                const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                                const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                                const itemTotal = qty * cost;
                                const discount = Number(item.discountAmount || item.discount_amount || 0);
                                const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                                const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                                
                                grandTotal += itemTotal - discount + taxAmount;
                              });
                              
                              // Add freight and other charges if available
                              const freightCost = parseFloat(selectedPurchase.freightCost?.toString() || selectedPurchase.freight_cost?.toString() || "0");
                              const otherCharges = parseFloat(selectedPurchase.otherCharges?.toString() || selectedPurchase.other_charges?.toString() || "0");
                              grandTotal += freightCost + otherCharges;
                            } else {
                              // Fallback to stored calculation logic
                              const totalAmountField = parseFloat(selectedPurchase.totalAmount?.toString() || "0");
                              const totalField = parseFloat(selectedPurchase.total?.toString() || "0");
                              const subTotalField = parseFloat(selectedPurchase.subTotal?.toString() || selectedPurchase.sub_total?.toString() || "0");
                              const freightCostField = parseFloat(selectedPurchase.freightCost?.toString() || selectedPurchase.freight_cost?.toString() || "0");
                              const otherChargesField = parseFloat(selectedPurchase.otherCharges?.toString() || selectedPurchase.other_charges?.toString() || "0");
                              const discountAmountField = parseFloat(selectedPurchase.discountAmount?.toString() || selectedPurchase.discount_amount?.toString() || "0");
                              
                              if (totalAmountField > 0) {
                                grandTotal = totalAmountField;
                              } else if (totalField > 0 && subTotalField > 0) {
                                grandTotal = Math.max(totalField, subTotalField + freightCostField + otherChargesField - discountAmountField);
                              } else if (totalField > 0) {
                                grandTotal = totalField;
                              } else if (subTotalField > 0) {
                                grandTotal = subTotalField + freightCostField + otherChargesField - discountAmountField;
                              }
                            }
                            
                            return formatCurrency(grandTotal);
                          })()}
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
          <DialogContent className="max-w-2xl">
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
                {/* Payment Overview Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Amount</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(parseFloat(selectedPurchaseForPayment.total?.toString() || "0") * 1.56)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Already Paid</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0"))}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Outstanding</p>
                        <p className="text-2xl font-bold">
                          {(() => {
                            const totalAmount = parseFloat(selectedPurchaseForPayment.total?.toString() || "0") * 1.56;
                            const paidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");
                            const outstanding = Math.max(0, totalAmount - paidAmount);
                            return formatCurrency(outstanding);
                          })()}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Payment Status</p>
                        <p className="text-lg font-bold">
                          {selectedPurchaseForPayment.paymentStatus?.charAt(0).toUpperCase() + selectedPurchaseForPayment.paymentStatus?.slice(1) || 'Due'}
                        </p>
                      </div>
                      <CreditCard className="h-8 w-8 text-purple-200" />
                    </div>
                    <div className="mt-2">
                      <div className="bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white rounded-full h-2 transition-all duration-300" 
                          style={{
                            width: `${(() => {
                              const totalAmount = parseFloat(selectedPurchaseForPayment.total?.toString() || "0") * 1.56;
                              const paidAmount = parseFloat(selectedPurchaseForPayment.paidAmount?.toString() || "0");
                              return totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
                            })()}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Order Details */}
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
                      <div className="text-blue-700 font-semibold">
                        {(() => {
                          // Calculate total from purchase items if available
                          const items = selectedPurchaseForPayment.purchaseItems || selectedPurchaseForPayment.items || [];
                          let calculatedTotal = 0;
                          
                          if (items.length > 0) {
                            // Calculate from items
                            items.forEach(item => {
                              const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                              const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                              const itemTotal = qty * cost;
                              const discount = Number(item.discountAmount || item.discount_amount || 0);
                              const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                              const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                              
                              calculatedTotal += itemTotal - discount + taxAmount;
                            });
                            
                            // Add freight and other charges if available
                            const freightCost = parseFloat(selectedPurchaseForPayment.freightCost?.toString() || selectedPurchaseForPayment.freight_cost?.toString() || "0");
                            const otherCharges = parseFloat(selectedPurchaseForPayment.otherCharges?.toString() || selectedPurchaseForPayment.other_charges?.toString() || "0");
                            calculatedTotal += freightCost + otherCharges;
                            
                            return formatCurrency(calculatedTotal);
                          } else {
                            // Fallback to stored values
                            return formatCurrency(parseFloat(selectedPurchaseForPayment.total?.toString() || "0"));
                          }
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Already Paid:</span>
                      <div className="text-blue-700">{(() => {
                        // Get the most up-to-date paid amount from the purchases array
                        const currentPurchase = purchases.find(p => p.id === selectedPurchaseForPayment?.id);
                        const paidAmount = parseFloat(
                          currentPurchase?.paidAmount?.toString() || 
                          currentPurchase?.paid_amount?.toString() || 
                          selectedPurchaseForPayment?.paidAmount?.toString() || 
                          selectedPurchaseForPayment?.paid_amount?.toString() || 
                          "0"
                        );
                        console.log('💰 Modal payment debug:', {
                          purchaseId: selectedPurchaseForPayment?.id,
                          currentPurchasePaidAmount: currentPurchase?.paidAmount,
                          selectedPurchasePaidAmount: selectedPurchaseForPayment?.paidAmount,
                          finalPaidAmount: paidAmount
                        });
                        return formatCurrency(paidAmount);
                      })()}</div>
                    </div>
                  </div>
                  {(() => {
                      // Calculate total from purchase items if available
                      const items = selectedPurchaseForPayment.purchaseItems || selectedPurchaseForPayment.items || [];
                      let calculatedTotal = 0;
                      
                      if (items.length > 0) {
                        // Calculate from items
                        items.forEach(item => {
                          const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                          const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                          const itemTotal = qty * cost;
                          const discount = Number(item.discountAmount || item.discount_amount || 0);
                          const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                          const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                          
                          calculatedTotal += itemTotal - discount + taxAmount;
                        });
                        
                        // Add freight and other charges if available
                        const freightCost = parseFloat(selectedPurchaseForPayment.freightCost?.toString() || selectedPurchaseForPayment.freight_cost?.toString() || "0");
                        const otherCharges = parseFloat(selectedPurchaseForPayment.otherCharges?.toString() || selectedPurchaseForPayment.other_charges?.toString() || "0");
                        calculatedTotal += freightCost + otherCharges;
                      } else {
                        // Fallback to stored values
                        calculatedTotal = parseFloat(selectedPurchaseForPayment.total?.toString() || "0");
                      }
                      
                      const totalAmount = calculatedTotal;
                      // Get the most up-to-date paid amount from the purchases array
                      const currentPurchase = purchases.find(p => p.id === selectedPurchaseForPayment?.id);
                      const paidAmount = parseFloat(
                        currentPurchase?.paidAmount?.toString() || 
                        currentPurchase?.paid_amount?.toString() || 
                        selectedPurchaseForPayment?.paidAmount?.toString() || 
                        selectedPurchaseForPayment?.paid_amount?.toString() || 
                        "0"
                      );
                      const remaining = Math.max(0, totalAmount - paidAmount);
                      const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

                      if (isFullyPaid) {
                        return (
                          <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-medium text-green-800">This order is already fully paid</span>
                            </div>
                            <div className="text-sm text-green-700 mt-1">
                              Payment completed on {selectedPurchaseForPayment.paymentDate ? format(new Date(selectedPurchaseForPayment.paymentDate), 'MMM dd, yyyy') : 'N/A'}
                            </div>
                          </div>
                        );
                      }

                      return remaining > 0 ? (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <span className="font-medium text-blue-800">Outstanding Amount:</span>
                          <div className="text-lg font-bold text-blue-900">{formatCurrency(remaining)}</div>
                          <div className="text-sm text-blue-600 mt-1">
                            Payment Progress: {Math.round((paidAmount / totalAmount) * 100)}% completed
                          </div>
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
                      // Calculate total from purchase items if available
                      const items = selectedPurchaseForPayment.purchaseItems || selectedPurchaseForPayment.items || [];
                      let calculatedTotal = 0;
                      
                      if (items.length > 0) {
                        // Calculate from items
                        items.forEach(item => {
                          const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                          const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                          const itemTotal = qty * cost;
                          const discount = Number(item.discountAmount || item.discount_amount || 0);
                          const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                          const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                          
                          calculatedTotal += itemTotal - discount + taxAmount;
                        });
                        
                        // Add freight and other charges if available
                        const freightCost = parseFloat(selectedPurchaseForPayment.freightCost?.toString() || selectedPurchaseForPayment.freight_cost?.toString() || "0");
                        const otherCharges = parseFloat(selectedPurchaseForPayment.otherCharges?.toString() || selectedPurchaseForPayment.other_charges?.toString() || "0");
                        calculatedTotal += freightCost + otherCharges;
                      } else {
                        // Fallback to stored values
                        calculatedTotal = parseFloat(selectedPurchaseForPayment.total?.toString() || "0");
                      }
                      
                      const totalAmount = calculatedTotal;
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
                      // Calculate total from purchase items if available
                      const items = selectedPurchaseForPayment.purchaseItems || selectedPurchaseForPayment.items || [];
                      let calculatedTotal = 0;
                      
                      if (items.length > 0) {
                        // Calculate from items
                        items.forEach(item => {
                          const qty = Number(item.receivedQty || item.received_qty || item.quantity || 0);
                          const cost = Number(item.unitCost || item.unit_cost || item.cost || 0);
                          const itemTotal = qty * cost;
                          const discount = Number(item.discountAmount || item.discount_amount || 0);
                          const taxPercent = Number(item.taxPercentage || item.tax_percentage || 0);
                          const taxAmount = (itemTotal - discount) * (taxPercent / 100);
                          
                          calculatedTotal += itemTotal - discount + taxAmount;
                        });
                        
                        // Add freight and other charges if available
                        const freightCost = parseFloat(selectedPurchaseForPayment.freightCost?.toString() || selectedPurchaseForPayment.freight_cost?.toString() || "0");
                        const otherCharges = parseFloat(selectedPurchaseForPayment.otherCharges?.toString() || selectedPurchaseForPayment.other_charges?.toString() || "0");
                        calculatedTotal += freightCost + otherCharges;
                      } else {
                        // Fallback to stored values
                        calculatedTotal = parseFloat(selectedPurchaseForPayment.total?.toString() || "0");
                      }
                      
                      const totalAmount = calculatedTotal;
                      // Get the most up-to-date paid amount from the purchases array  
                      const currentPurchase = purchases.find(p => p.id === selectedPurchaseForPayment?.id);
                      const paidAmount = parseFloat(
                        currentPurchase?.paidAmount?.toString() || 
                        currentPurchase?.paid_amount?.toString() || 
                        selectedPurchaseForPayment?.paidAmount?.toString() || 
                        selectedPurchaseForPayment?.paid_amount?.toString() || 
                        "0"
                      );
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

                  {/* Quick Payment Options */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Quick Payment Options
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                        onClick={() => {
                          const totalAmount = parseFloat(selectedPurchaseForPayment?.total?.toString() || "0") * 1.56;
                          const paidAmount = parseFloat(selectedPurchaseForPayment?.paidAmount?.toString() || "0");
                          const outstanding = Math.max(0, totalAmount - paidAmount);
                          setPaymentAmount(outstanding.toString());
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Full Balance
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                        onClick={() => {
                          const totalAmount = parseFloat(selectedPurchaseForPayment?.total?.toString() || "0") * 1.56;
                          const paidAmount = parseFloat(selectedPurchaseForPayment?.paidAmount?.toString() || "0");
                          const outstanding = Math.max(0, totalAmount - paidAmount);
                          const halfAmount = outstanding / 2;
                          setPaymentAmount(halfAmount.toString());
                        }}
                      >
                        <ArrowDownRight className="h-4 w-4 mr-2" />
                        Half Amount
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                        onClick={() => {
                          setPaymentAmount("0");
                          setPaymentNotes("");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
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
                onClick={() => {
                  if (selectedPurchaseForPayment && paymentAmount && paymentMethod) {
                    recordPayment.mutate({
                      purchaseId: selectedPurchaseForPayment.id,
                      amount: parseFloat(paymentAmount),
                      method: paymentMethod,
                      date: paymentDate
                    });
                  }
                }}
                disabled={
                  recordPayment.isPending || 
                  !paymentAmount || 
                  parseFloat(paymentAmount || "0") <= 0 ||
                  !paymentMethod ||
                  !selectedPurchaseForPayment
                }
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                {recordPayment.isPending ? (
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