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
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async (data: RedeemPointsData) => {
      return apiRequest('POST', `/api/loyalty/customer/${data.customerId}/redeem`, {
        points: parseInt(data.points)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/all'] });
      setIsRedeemDialogOpen(false);
      redeemForm.reset();
      refetchLoyalty();
      toast({
        title: "Success",
        description: "Points redeemed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem points",
        variant: "destructive"
      });
    }
  });

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async (data: AddPointsData) => {
      return apiRequest('POST', `/api/loyalty/customer/${data.customerId}/add`, {
        points: parseInt(data.points),
        reason: data.reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/all'] });
      setIsAddPointsDialogOpen(false);
      addPointsForm.reset();
      refetchLoyalty();
      toast({
        title: "Success",
        description: "Points added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add points",
        variant: "destructive"
      });
    }
  });

  const handleRedeem = (data: RedeemPointsData) => {
    redeemPointsMutation.mutate(data);
  };

  const handleAddPoints = (data: AddPointsData) => {
    addPointsMutation.mutate(data);
  };

  const getTier = (points: number) => {
    if (points >= 1000) return { name: "Gold", color: "bg-yellow-500" };
    if (points >= 500) return { name: "Silver", color: "bg-gray-400" };
    return { name: "Bronze", color: "bg-amber-600" };
  };

  // Calculate summary stats
  const totalCustomers = loyaltyData.length;
  const totalActivePoints = loyaltyData.reduce((sum, loyalty) => sum + (loyalty.availablePoints || 0), 0);
  const totalUsedPoints = loyaltyData.reduce((sum, loyalty) => sum + (loyalty.usedPoints || 0), 0);
  const averagePoints = totalCustomers > 0 ? Math.round(totalActivePoints / totalCustomers) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Loyalty Management</h1>
            <p className="text-muted-foreground">
              Manage customer loyalty points and rewards program
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Star className="mr-2 h-4 w-4" />
                  Add Points
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Loyalty Points</DialogTitle>
                  <DialogDescription>
                    Award loyalty points to a customer
                  </DialogDescription>
                </DialogHeader>
                <Form {...addPointsForm}>
                  <form onSubmit={addPointsForm.handleSubmit(handleAddPoints)} className="space-y-4">
                    <FormField
                      control={addPointsForm.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: any) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name}
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
                          <FormLabel>Points to Add</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the number of points to award
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addPointsForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason</FormLabel>
                          <FormControl>
                            <Input placeholder="Purchase reward, bonus points, etc." {...field} />
                          </FormControl>
                          <FormDescription>
                            Brief description for the point award
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddPointsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addPointsMutation.isPending}>
                        {addPointsMutation.isPending ? "Adding..." : "Add Points"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Redeem Points
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Redeem Customer Points</DialogTitle>
                  <DialogDescription>
                    Process point redemption for a customer
                  </DialogDescription>
                </DialogHeader>
                <Form {...redeemForm}>
                  <form onSubmit={redeemForm.handleSubmit(handleRedeem)} className="space-y-4">
                    <FormField
                      control={redeemForm.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: any) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name}
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
                          <FormLabel>Points to Redeem</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the number of points to redeem
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsRedeemDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={redeemPointsMutation.isPending}>
                        {redeemPointsMutation.isPending ? "Processing..." : "Redeem Points"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Active loyalty members
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Points</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActivePoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Points ready to redeem
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Redeemed Points</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsedPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total points used
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Points</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePoints}</div>
              <p className="text-xs text-muted-foreground">
                Points per customer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Customer Loyalty Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loyaltyData.map((loyalty: any) => {
            const tier = getTier(loyalty.availablePoints || 0);
            return (
              <Card key={loyalty.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{loyalty.customer.name}</CardTitle>
                    <Badge variant="secondary" className={`${tier.color} text-white`}>
                      {tier.name}
                    </Badge>
                  </div>
                  <CardDescription>
                    Customer since {new Date(loyalty.customer.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available Points</p>
                      <p className="text-xl font-bold text-green-600">{loyalty.availablePoints || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Earned</p>
                      <p className="text-xl font-bold">{loyalty.totalPoints || 0}</p>
                    </div>
                  </div>

                  {loyalty.usedPoints > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Redeemed: {loyalty.usedPoints} points</p>
                    </div>
                  )}

                  {loyalty.lastEarnedDate && (
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">
                        Last earned: {new Date(loyalty.lastEarnedDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      redeemForm.setValue('customerId', loyalty.customerId.toString());
                      setIsRedeemDialogOpen(true);
                    }}
                    disabled={!loyalty.availablePoints || loyalty.availablePoints <= 0}
                  >
                    <CreditCard className="mr-1 h-3 w-3" />
                    Redeem Points
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loyaltyData.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No loyalty data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Customers will appear here once they start earning loyalty points.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading loyalty data...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}