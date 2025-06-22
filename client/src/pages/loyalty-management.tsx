import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Gift, Star, TrendingUp, Award, CreditCard, Edit, Trash2, Plus, MoreVertical, History, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const redeemPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required")
});

const addPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required"),
  reason: z.string().min(1, "Reason is required")
});

const salePointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  saleAmount: z.string().min(1, "Sale amount is required"),
  pointsPerRupee: z.string().default("1"),
  notes: z.string().optional()
});

const editLoyaltySchema = z.object({
  totalPoints: z.string().min(1, "Total points is required"),
  availablePoints: z.string().min(1, "Available points is required"),
  notes: z.string().optional()
});

const bulkUpdateSchema = z.object({
  operation: z.enum(["add", "subtract", "set"]),
  points: z.string().min(1, "Points amount is required"),
  reason: z.string().min(1, "Reason is required"),
  selectedCustomers: z.array(z.string()).min(1, "Select at least one customer")
});

type RedeemPointsData = z.infer<typeof redeemPointsSchema>;
type AddPointsData = z.infer<typeof addPointsSchema>;
type SalePointsData = z.infer<typeof salePointsSchema>;
type EditLoyaltyData = z.infer<typeof editLoyaltySchema>;
type BulkUpdateData = z.infer<typeof bulkUpdateSchema>;

export default function LoyaltyManagement() {
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false);
  const [isSalePointsDialogOpen, setIsSalePointsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const redeemForm = useForm<RedeemPointsData>({
    resolver: zodResolver(redeemPointsSchema),
    defaultValues: {
      customerId: "",
      points: ""
    }
  });

  const addPointsForm = useForm<AddPointsData>({
    resolver: zodResolver(addPointsSchema),
    defaultValues: {
      customerId: "",
      points: "",
      reason: ""
    }
  });

  const salePointsForm = useForm<SalePointsData>({
    resolver: zodResolver(salePointsSchema),
    defaultValues: {
      customerId: "",
      saleAmount: "",
      pointsPerRupee: "1",
      notes: ""
    }
  });

  const editLoyaltyForm = useForm<EditLoyaltyData>({
    resolver: zodResolver(editLoyaltySchema),
    defaultValues: {
      totalPoints: "",
      availablePoints: "",
      notes: ""
    }
  });

  const bulkUpdateForm = useForm<BulkUpdateData>({
    resolver: zodResolver(bulkUpdateSchema),
    defaultValues: {
      operation: "add",
      points: "",
      reason: "",
      selectedCustomers: []
    }
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  });

  // Fetch customer loyalty data with enhanced error handling and real-time updates
  const { data: loyaltyData = [], isLoading, refetch: refetchLoyalty } = useQuery({
    queryKey: ['/api/loyalty/all', customers.length],
    queryFn: async () => {
      if (customers.length === 0) return [];
      
      const loyaltyPromises = customers.map(async (customer: any) => {
        try {
          const response = await fetch(`/api/loyalty/customer/${customer.id}`);
          if (!response.ok) {
            // If loyalty doesn't exist, create it
            if (response.status === 404) {
              const createResponse = await fetch('/api/loyalty/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: customer.id })
              });
              if (createResponse.ok) {
                const newLoyalty = await createResponse.json();
                return { ...newLoyalty, customer };
              }
            }
            return null;
          }
          const loyalty = await response.json();
          return { ...loyalty, customer };
        } catch (error) {
          console.error(`Error fetching loyalty for customer ${customer.id}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(loyaltyPromises);
      return results.filter(Boolean);
    },
    enabled: customers.length > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Calculate summary statistics with proper number handling
  const totalCustomers = loyaltyData.length;
  const totalActivePoints = loyaltyData.reduce((total, customer) => {
    const points = Number(customer.availablePoints) || 0;
    return total + points;
  }, 0);
  const totalUsedPoints = loyaltyData.reduce((total, customer) => {
    const totalPts = Number(customer.totalPoints) || 0;
    const availablePts = Number(customer.availablePoints) || 0;
    return total + (totalPts - availablePts);
  }, 0);
  const averagePoints = totalCustomers > 0 ? Math.round(totalActivePoints / totalCustomers) : 0;

  // Loyalty tier system
  const getTier = (points: number) => {
    if (points >= 1000) return { name: "Platinum", color: "bg-purple-500" };
    if (points >= 500) return { name: "Gold", color: "bg-yellow-500" };
    if (points >= 200) return { name: "Silver", color: "bg-gray-400" };
    return { name: "Bronze", color: "bg-orange-500" };
  };

  // Helper functions for customer selection
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    const allCustomerIds = loyaltyData.map(customer => 
      (customer.customerId || customer.customer?.id)?.toString()
    ).filter(Boolean);
    setSelectedCustomers(allCustomerIds);
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  // Dialog helper functions
  const openEditDialog = (customer: any) => {
    setSelectedCustomer(customer);
    editLoyaltyForm.setValue('totalPoints', customer.totalPoints?.toString() || '0');
    editLoyaltyForm.setValue('availablePoints', customer.availablePoints?.toString() || '0');
    editLoyaltyForm.setValue('notes', customer.notes || '');
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: any) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  // Form submission handlers
  const handleEditLoyalty = async (data: EditLoyaltyData) => {
    await editLoyaltyMutation.mutateAsync(data);
  };

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      const customerId = customerToDelete.customerId || customerToDelete.customer?.id;
      await deleteLoyaltyMutation.mutateAsync(customerId);
    }
  };

  const handleBulkUpdate = async (data: BulkUpdateData) => {
    await bulkUpdateMutation.mutateAsync(data);
    setSelectedCustomers([]);
    setIsBulkUpdateDialogOpen(false);
    bulkUpdateForm.reset();
  };

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async (data: AddPointsData) => {
      return apiRequest('POST', '/api/loyalty/add-points', {
        customerId: parseInt(data.customerId),
        points: parseInt(data.points),
        reason: data.reason
      });
    },
    onSuccess: () => {
      toast({
        title: "Points Added Successfully",
        description: "Loyalty points have been awarded to the customer",
      });
      setIsAddPointsDialogOpen(false);
      addPointsForm.reset();
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error Adding Points",
        description: error.message || "Failed to add loyalty points",
        variant: "destructive",
      });
    }
  });

  // Sale-based points mutation
  const salePointsMutation = useMutation({
    mutationFn: async (data: SalePointsData) => {
      const saleAmount = parseFloat(data.saleAmount);
      const pointsPerRupee = parseFloat(data.pointsPerRupee);
      const calculatedPoints = Math.floor(saleAmount * pointsPerRupee);
      
      return apiRequest('POST', '/api/loyalty/add-points', {
        customerId: parseInt(data.customerId),
        points: calculatedPoints,
        reason: `Sale-based points: ₹${saleAmount} x ${pointsPerRupee} points/rupee${data.notes ? ` - ${data.notes}` : ''}`
      });
    },
    onSuccess: (_, variables) => {
      const saleAmount = parseFloat(variables.saleAmount);
      const pointsPerRupee = parseFloat(variables.pointsPerRupee);
      const calculatedPoints = Math.floor(saleAmount * pointsPerRupee);
      
      toast({
        title: "Sale Points Added Successfully",
        description: `${calculatedPoints} points awarded for ₹${saleAmount} sale`,
      });
      setIsSalePointsDialogOpen(false);
      salePointsForm.reset();
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error Adding Sale Points",
        description: error.message || "Failed to add sale-based loyalty points",
        variant: "destructive",
      });
    }
  });

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async (data: RedeemPointsData) => {
      return apiRequest('POST', '/api/loyalty/redeem-points', {
        customerId: parseInt(data.customerId),
        points: parseInt(data.points)
      });
    },
    onSuccess: () => {
      toast({
        title: "Points Redeemed Successfully",
        description: "Customer loyalty points have been redeemed",
      });
      setIsRedeemDialogOpen(false);
      redeemForm.reset();
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error Redeeming Points",
        description: error.message || "Failed to redeem loyalty points",
        variant: "destructive",
      });
    }
  });

  // Edit loyalty mutation
  const editLoyaltyMutation = useMutation({
    mutationFn: async (data: EditLoyaltyData) => {
      return apiRequest('PUT', `/api/loyalty/customer/${selectedCustomer.customerId}/update`, {
        totalPoints: parseInt(data.totalPoints),
        availablePoints: parseInt(data.availablePoints),
        notes: data.notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Loyalty Account Updated",
        description: "Customer loyalty information has been updated successfully",
      });
      setIsEditDialogOpen(false);
      editLoyaltyForm.reset();
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Loyalty",
        description: error.message || "Failed to update loyalty account",
        variant: "destructive",
      });
    }
  });

  // Delete loyalty mutation
  const deleteLoyaltyMutation = useMutation({
    mutationFn: async (customerId: number) => {
      return apiRequest('DELETE', `/api/loyalty/customer/${customerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Loyalty Account Deleted",
        description: "Customer loyalty account has been permanently deleted",
      });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Account",
        description: error.message || "Failed to delete loyalty account",
        variant: "destructive",
      });
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: BulkUpdateData) => {
      return apiRequest('POST', '/api/loyalty/bulk-update', {
        operation: data.operation,
        points: parseInt(data.points),
        reason: data.reason,
        customerIds: selectedCustomers.map(id => parseInt(id))
      });
    },
    onSuccess: () => {
      toast({
        title: "Bulk Update Completed",
        description: "Points have been updated for selected customers",
      });
      setIsBulkUpdateDialogOpen(false);
      bulkUpdateForm.reset();
      setSelectedCustomers([]);
      refetchLoyalty();
    },
    onError: (error: any) => {
      toast({
        title: "Error in Bulk Update",
        description: error.message || "Failed to perform bulk update",
        variant: "destructive",
      });
    }
  });

  const handleAddPoints = (data: AddPointsData) => {
    addPointsMutation.mutate(data);
  };

  const handleRedeem = (data: RedeemPointsData) => {
    redeemPointsMutation.mutate(data);
  };






  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Customer Loyalty Management
              </h1>
              <p className="text-lg text-gray-600">
                Track rewards, manage points, and boost customer retention
              </p>
            </div>
            <div className="flex items-center gap-4">
              {selectedCustomers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {selectedCustomers.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="h-8"
                  >
                    Clear
                  </Button>
                  <Dialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Bulk Update
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
              <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                    <Gift className="mr-2 h-5 w-5" />
                    Award Points
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={isSalePointsDialogOpen} onOpenChange={setIsSalePointsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Sale Points
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Sale-Based Points</DialogTitle>
                    <DialogDescription>
                      Award points based on customer sale amounts
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...salePointsForm}>
                    <form onSubmit={salePointsForm.handleSubmit(async (data) => await salePointsMutation.mutateAsync(data))} className="space-y-5">
                      <FormField
                        control={salePointsForm.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Select Customer</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Choose customer for sale points" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer: any) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                                      </div>
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={salePointsForm.control}
                        name="saleAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Sale Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1000"
                                className="h-12 text-lg"
                                step="0.01"
                                min="0"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              Enter the total sale amount
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={salePointsForm.control}
                        name="pointsPerRupee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Points per Rupee</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                className="h-12 text-lg"
                                step="0.1"
                                min="0"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              Default: 1 point per rupee spent
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={salePointsForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Special sale promotion, bonus points, etc."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Preview calculation */}
                      {salePointsForm.watch("saleAmount") && salePointsForm.watch("pointsPerRupee") && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-800 font-medium">Points to Award:</span>
                            <span className="text-purple-700 font-bold text-lg">
                              {Math.floor(parseFloat(salePointsForm.watch("saleAmount") || "0") * parseFloat(salePointsForm.watch("pointsPerRupee") || "1"))} points
                            </span>
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            ₹{salePointsForm.watch("saleAmount")} × {salePointsForm.watch("pointsPerRupee")} points/rupee
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsSalePointsDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={salePointsMutation.isPending}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 px-6"
                        >
                          {salePointsMutation.isPending ? "Adding..." : "Award Sale Points"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Award Loyalty Points</DialogTitle>
                    <DialogDescription>
                      Give bonus points to reward customer loyalty
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addPointsForm}>
                    <form onSubmit={addPointsForm.handleSubmit(handleAddPoints)} className="space-y-5">
                      <FormField
                        control={addPointsForm.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Select Customer</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Choose customer to reward" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer: any) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                                      </div>
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addPointsForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Points Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="100"
                                className="h-12 text-lg"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addPointsForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Reason</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Birthday bonus, Purchase milestone"
                                className="h-12"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddPointsDialogOpen(false)}
                          className="px-6"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={addPointsMutation.isPending}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-6"
                        >
                          {addPointsMutation.isPending ? "Adding..." : "Award Points"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Redeem Points
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Redeem Loyalty Points</DialogTitle>
                    <DialogDescription>
                      Process point redemption for customer purchases
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...redeemForm}>
                    <form onSubmit={redeemForm.handleSubmit(handleRedeem)} className="space-y-5">
                      <FormField
                        control={redeemForm.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Select Customer</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Choose customer for redemption" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer: any) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                                      </div>
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={redeemForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Points to Redeem</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="50"
                                className="h-12 text-lg"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsRedeemDialogOpen(false)}
                          className="px-6"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={redeemPointsMutation.isPending}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                        >
                          {redeemPointsMutation.isPending ? "Processing..." : "Redeem Points"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700">Total Customers</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{totalCustomers}</div>
              <p className="text-sm text-blue-600 mt-1">
                Active loyalty members
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-700">Active Points</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {isNaN(totalActivePoints) || !isFinite(totalActivePoints) ? '0' : Math.max(0, totalActivePoints).toLocaleString()}
              </div>
              <p className="text-sm text-green-600 mt-1">
                Points ready to redeem
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700">Redeemed Points</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {isNaN(totalUsedPoints) || !isFinite(totalUsedPoints) ? '0' : Math.max(0, totalUsedPoints).toLocaleString()}
              </div>
              <p className="text-sm text-purple-600 mt-1">
                Total redeemed
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-700">Average Points</CardTitle>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">
                {isNaN(averagePoints) || !isFinite(averagePoints) ? '0' : Math.max(0, averagePoints).toLocaleString()}
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Per customer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Customer Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Customer Loyalty Accounts</h2>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {totalCustomers} Active Members
            </Badge>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="inline-flex items-center gap-3 text-gray-500">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading customer loyalty data...
                </div>
              </div>
            ) : loyaltyData.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Loyalty Members Yet</h3>
                <p className="text-gray-500">Start building your loyalty program by adding customers</p>
              </div>
            ) : (
              loyaltyData.map((customer: any) => {
                const tier = getTier(customer.availablePoints || 0);
                return (
                  <Card key={customer.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                          {customer.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {customer.customer?.name || 'Unknown Customer'}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-500">
                            Member since {new Date(customer.customer?.createdAt || customer.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={`${tier.color} text-white border-0`}
                        >
                          {tier.name}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <Label className="text-sm font-medium text-green-700">Available Points</Label>
                          <div className="text-2xl font-bold text-green-600 mt-1">
                            {(customer.availablePoints || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <Label className="text-sm font-medium text-blue-700">Total Earned</Label>
                          <div className="text-2xl font-bold text-blue-600 mt-1">
                            {(customer.totalPoints || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes((customer.customerId || customer.customer?.id)?.toString())}
                          onChange={() => toggleCustomerSelection((customer.customerId || customer.customer?.id)?.toString())}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              redeemForm.setValue('customerId', customer.customerId?.toString() || customer.customer?.id?.toString() || '');
                              setIsRedeemDialogOpen(true);
                            }}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            disabled={!customer.availablePoints || customer.availablePoints <= 0}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Redeem
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit Account
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(customer)} className="text-red-600">
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Edit Loyalty Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Edit Loyalty Account</DialogTitle>
                <DialogDescription>
                  Modify customer loyalty points and account details
                </DialogDescription>
              </DialogHeader>
              <Form {...editLoyaltyForm}>
                <form onSubmit={editLoyaltyForm.handleSubmit(handleEditLoyalty)} className="space-y-5">
                  <FormField
                    control={editLoyaltyForm.control}
                    name="totalPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Total Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1500"
                            className="h-12 text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editLoyaltyForm.control}
                    name="availablePoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Available Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1200"
                            className="h-12 text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editLoyaltyForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Account adjustment notes..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={editLoyaltyMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                    >
                      {editLoyaltyMutation.isPending ? "Updating..." : "Update Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Loyalty Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete the loyalty account for{" "}
                  <span className="font-semibold">{customerToDelete?.customer?.name || 'this customer'}</span>?
                  This action cannot be undone and all loyalty points will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteLoyaltyMutation.isPending}
                >
                  {deleteLoyaltyMutation.isPending ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Update Dialog */}
          <Dialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Bulk Update Loyalty Points</DialogTitle>
                <DialogDescription>
                  Apply changes to {selectedCustomers.length} selected customer accounts
                </DialogDescription>
              </DialogHeader>
              <Form {...bulkUpdateForm}>
                <form onSubmit={bulkUpdateForm.handleSubmit(handleBulkUpdate)} className="space-y-5">
                  <FormField
                    control={bulkUpdateForm.control}
                    name="operation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Operation Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Choose operation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="add">Add Points</SelectItem>
                            <SelectItem value="subtract">Subtract Points</SelectItem>
                            <SelectItem value="set">Set Points</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkUpdateForm.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Points Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            className="h-12 text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkUpdateForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Reason</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Seasonal bonus, Promotion adjustment"
                            className="h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      This will affect <span className="font-semibold">{selectedCustomers.length}</span> customer accounts.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBulkUpdateDialogOpen(false)}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={bulkUpdateMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-6"
                    >
                      {bulkUpdateMutation.isPending ? "Processing..." : "Apply Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}