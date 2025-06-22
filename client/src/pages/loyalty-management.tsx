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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Gift, Star, TrendingUp, Award, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const redeemPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required")
});

const addPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required"),
  reason: z.string().min(1, "Reason is required")
});

type RedeemPointsData = z.infer<typeof redeemPointsSchema>;
type AddPointsData = z.infer<typeof addPointsSchema>;

export default function LoyaltyManagement() {
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
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

  // Calculate summary statistics
  const totalCustomers = loyaltyData.length;
  const totalActivePoints = loyaltyData.reduce((total, customer) => total + (customer.totalPoints || 0), 0);
  const totalUsedPoints = loyaltyData.reduce((total, customer) => total + ((customer.totalPoints || 0) - (customer.availablePoints || 0)), 0);
  const averagePoints = totalCustomers > 0 ? Math.round(totalActivePoints / totalCustomers) : 0;

  // Loyalty tier system
  const getTier = (points: number) => {
    if (points >= 1000) return { name: "Platinum", color: "bg-purple-500" };
    if (points >= 500) return { name: "Gold", color: "bg-yellow-500" };
    if (points >= 200) return { name: "Silver", color: "bg-gray-400" };
    return { name: "Bronze", color: "bg-orange-500" };
  };

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async (data: AddPointsData) => {
      return apiRequest('/api/loyalty/add-points', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(data.customerId),
          points: parseInt(data.points),
          reason: data.reason
        })
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

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async (data: RedeemPointsData) => {
      return apiRequest('/api/loyalty/redeem-points', {
        method: 'POST',
        body: JSON.stringify({
          customerId: parseInt(data.customerId),
          points: parseInt(data.points)
        })
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
              <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                    <Gift className="mr-2 h-5 w-5" />
                    Award Points
                  </Button>
                </DialogTrigger>
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
                {totalActivePoints.toLocaleString()}
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
                {totalUsedPoints.toLocaleString()}
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
                {averagePoints.toLocaleString()}
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
                      
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            redeemForm.setValue('customerId', customer.customerId?.toString() || customer.customer?.id?.toString() || '');
                            setIsRedeemDialogOpen(true);
                          }}
                          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                          disabled={!customer.availablePoints || customer.availablePoints <= 0}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Redeem Points
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}