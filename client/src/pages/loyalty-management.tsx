import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, Gift, Star, TrendingUp, Award, CreditCard, 
  Waves, Anchor, Ship, Eye, Edit, Trash2, Plus,
  Search, Filter, Download, Upload, RefreshCw,
  Crown, Trophy, Medal, Gem, History, Compass
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const addPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required"),
  reason: z.string().min(1, "Reason is required")
});

const editPointsSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  points: z.string().min(1, "Points amount is required"),
  reason: z.string().min(1, "Reason is required"),
  action: z.enum(["add", "subtract"])
});

type AddPointsData = z.infer<typeof addPointsSchema>;
type EditPointsData = z.infer<typeof editPointsSchema>;

export default function LoyaltyManagement() {
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [sortBy, setSortBy] = useState("points");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addPointsForm = useForm<AddPointsData>({
    resolver: zodResolver(addPointsSchema),
    defaultValues: {
      customerId: "",
      points: "",
      reason: ""
    }
  });

  const editPointsForm = useForm<EditPointsData>({
    resolver: zodResolver(editPointsSchema),
    defaultValues: {
      customerId: "",
      points: "",
      reason: "",
      action: "add"
    }
  });

  // Fetch customers with loyalty data
  const { data: customers = [], isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Fetch loyalty statistics
  const { data: loyaltyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/loyalty/stats'],
  });

  // Get customer tier based on points
  const getCustomerTier = (points: number) => {
    if (points >= 5000) return { name: "Platinum", icon: Crown, color: "text-purple-600 bg-purple-100" };
    if (points >= 2000) return { name: "Gold", icon: Trophy, color: "text-yellow-600 bg-yellow-100" };
    if (points >= 500) return { name: "Silver", icon: Medal, color: "text-gray-600 bg-gray-100" };
    return { name: "Bronze", icon: Gem, color: "text-orange-600 bg-orange-100" };
  };

  // Enhanced customer data with loyalty info
  const customersWithLoyalty = customers.map((customer: any) => {
    const tier = getCustomerTier(customer.loyaltyPoints || 0);
    return {
      ...customer,
      tier,
      loyaltyPoints: customer.loyaltyPoints || 0,
      totalEarned: customer.totalEarned || 0,
      totalRedeemed: customer.totalRedeemed || 0
    };
  });

  // Filter and sort customers
  const filteredCustomers = customersWithLoyalty
    .filter((customer: any) => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === "all" || customer.tier.name.toLowerCase() === filterTier;
      return matchesSearch && matchesTier;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "points":
          return b.loyaltyPoints - a.loyaltyPoints;
        case "name":
          return a.name.localeCompare(b.name);
        case "tier":
          return b.loyaltyPoints - a.loyaltyPoints;
        default:
          return 0;
      }
    });

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async (data: AddPointsData) => {
      return apiRequest('/api/loyalty/add-points', {
        method: 'POST',
        body: {
          customerId: parseInt(data.customerId),
          points: parseInt(data.points),
          reason: data.reason
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loyalty points added successfully",
      });
      setIsAddPointsDialogOpen(false);
      addPointsForm.reset();
      refetchCustomers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add points",
        variant: "destructive",
      });
    }
  });

  // Edit points mutation
  const editPointsMutation = useMutation({
    mutationFn: async (data: EditPointsData) => {
      const endpoint = data.action === "add" ? '/api/loyalty/add-points' : '/api/loyalty/redeem-points';
      return apiRequest(endpoint, {
        method: 'POST',
        body: {
          customerId: parseInt(data.customerId),
          points: parseInt(data.points),
          reason: data.reason
        }
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Loyalty points ${variables.action === "add" ? "added" : "redeemed"} successfully`,
      });
      setIsEditDialogOpen(false);
      editPointsForm.reset();
      refetchCustomers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update points",
        variant: "destructive",
      });
    }
  });

  const handleAddPoints = (data: AddPointsData) => {
    addPointsMutation.mutate(data);
  };

  const handleEditPoints = (data: EditPointsData) => {
    editPointsMutation.mutate(data);
  };

  const openEditDialog = (customer: any) => {
    setSelectedCustomer(customer);
    editPointsForm.setValue("customerId", customer.id.toString());
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6">
        {/* Ocean-themed Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-lg">
              <Anchor className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Ocean Loyalty Fleet
              </h1>
              <p className="text-gray-600 text-lg">Navigate customer treasures and reward voyages</p>
            </div>
          </div>

          {/* Ocean Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Sailors</p>
                    <h3 className="text-3xl font-bold">{customers.length}</h3>
                  </div>
                  <Ship className="h-10 w-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm font-medium">Active Treasures</p>
                    <h3 className="text-3xl font-bold">
                      {customersWithLoyalty.reduce((sum: number, c: any) => sum + c.loyaltyPoints, 0).toLocaleString()}
                    </h3>
                  </div>
                  <Gem className="h-10 w-10 text-cyan-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm font-medium">Treasure Chests</p>
                    <h3 className="text-3xl font-bold">
                      {customersWithLoyalty.reduce((sum: number, c: any) => sum + c.totalRedeemed, 0).toLocaleString()}
                    </h3>
                  </div>
                  <Trophy className="h-10 w-10 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Fleet Admirals</p>
                    <h3 className="text-3xl font-bold">
                      {customersWithLoyalty.filter((c: any) => c.tier.name === "Platinum").length}
                    </h3>
                  </div>
                  <Crown className="h-10 w-10 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Controls */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search sailors by name or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="w-40 border-blue-200">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ranks</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 border-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">By Treasures</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="tier">By Rank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => refetchCustomers()}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Fleet
                </Button>
                
                <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Award Treasures
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer: any) => {
            const TierIcon = customer.tier.icon;
            return (
              <Card key={customer.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm hover:scale-105">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${customer.tier.color}`}>
                        <TierIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-800">{customer.name}</CardTitle>
                        <Badge variant="secondary" className={`${customer.tier.color} border-0 text-xs`}>
                          {customer.tier.name} Sailor
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openViewDialog(customer)}
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(customer)}
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact Course:</span>
                      <span className="font-medium">{customer.phone || "Unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <Compass className="h-4 w-4 mr-1" />
                        Navigation Date:
                      </span>
                      <span className="font-medium">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700 flex items-center">
                          <Gem className="h-4 w-4 mr-1" />
                          Current Treasures:
                        </span>
                        <span className="font-bold text-blue-800">{customer.loyaltyPoints.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-blue-600">
                        <span>Total Earned: {customer.totalEarned.toLocaleString()}</span>
                        <span>Used: {customer.totalRedeemed.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && !customersLoading && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <Ship className="h-16 w-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sailors Found</h3>
              <p className="text-gray-500">No sailors match your current search and filter criteria.</p>
            </CardContent>
          </Card>
        )}

        {/* Add Points Dialog */}
        <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Gift className="h-5 w-5 text-blue-600" />
                <span>Award Treasures</span>
              </DialogTitle>
              <DialogDescription>
                Grant loyalty treasures to reward your valued sailors
              </DialogDescription>
            </DialogHeader>
            <Form {...addPointsForm}>
              <form onSubmit={addPointsForm.handleSubmit(handleAddPoints)} className="space-y-4">
                <FormField
                  control={addPointsForm.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Sailor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a sailor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name} - {customer.phone || "No contact"}
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
                      <FormLabel>Treasure Amount</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Enter points to award" />
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
                      <FormLabel>Voyage Reason</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Reason for awarding points..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddPointsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel Voyage
                  </Button>
                  <Button
                    type="submit"
                    disabled={addPointsMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
                  >
                    {addPointsMutation.isPending ? "Awarding..." : "Award Treasures"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Points Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-green-600" />
                <span>Manage Sailor Treasures</span>
              </DialogTitle>
              <DialogDescription>
                Add or redeem loyalty treasures for {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...editPointsForm}>
              <form onSubmit={editPointsForm.handleSubmit(handleEditPoints)} className="space-y-4">
                <FormField
                  control={editPointsForm.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="add">Award Treasures</SelectItem>
                          <SelectItem value="subtract">Redeem Treasures</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPointsForm.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treasure Amount</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Enter points amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPointsForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voyage Reason</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Reason for this action..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editPointsMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {editPointsMutation.isPending ? "Processing..." : "Update Treasures"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Customer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <span>Sailor Voyage Details</span>
              </DialogTitle>
              <DialogDescription>
                Complete loyalty journey for {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Sailor Profile</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">Name:</span> {selectedCustomer.name}</p>
                        <p><span className="text-gray-600">Contact:</span> {selectedCustomer.phone || "Not provided"}</p>
                        <p><span className="text-gray-600">Email:</span> {selectedCustomer.email || "Not provided"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <selectedCustomer.tier.icon className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Fleet Rank</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">Current Rank:</span> {selectedCustomer.tier.name}</p>
                        <p><span className="text-gray-600">Member Since:</span> {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Gem className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-lg">Treasure Summary</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{selectedCustomer.loyaltyPoints.toLocaleString()}</p>
                        <p className="text-xs text-blue-500">Current Balance</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{selectedCustomer.totalEarned.toLocaleString()}</p>
                        <p className="text-xs text-green-500">Total Earned</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{selectedCustomer.totalRedeemed.toLocaleString()}</p>
                        <p className="text-xs text-orange-500">Total Redeemed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}