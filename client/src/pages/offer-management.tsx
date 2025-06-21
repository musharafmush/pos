import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Gift, Percent, Calendar, Users, BarChart3, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const offerFormSchema = z.object({
  name: z.string().min(1, "Offer name is required"),
  description: z.string().optional(),
  offerType: z.enum(['percentage', 'flat_amount', 'buy_x_get_y', 'time_based', 'category_based', 'loyalty_points']),
  discountValue: z.string().min(1, "Discount value is required"),
  minPurchaseAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  buyQuantity: z.string().optional(),
  getQuantity: z.string().optional(),
  freeProductId: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  applicableCategories: z.string().optional(),
  applicableProducts: z.string().optional(),
  pointsThreshold: z.string().optional(),
  pointsReward: z.string().optional(),
  usageLimit: z.string().optional(),
  perCustomerLimit: z.string().optional(),
  priority: z.string().optional(),
  active: z.boolean().default(true)
});

type OfferFormData = z.infer<typeof offerFormSchema>;

export default function OfferManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      active: true,
      priority: "1"
    }
  });

  // Fetch offers
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['/api/offers', { 
      active: filterActive !== 'all' ? filterActive === 'active' : undefined,
      offerType: filterType !== 'all' ? filterType : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterActive !== 'all') {
        params.append('active', filterActive === 'active' ? 'true' : 'false');
      }
      if (filterType !== 'all') {
        params.append('offerType', filterType);
      }
      
      const response = await fetch(`/api/offers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json();
    }
  });

  // Fetch categories for category-based offers
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch products for buy_x_get_y offers
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: OfferFormData) => {
      return apiRequest('POST', '/api/offers', {
        ...data,
        discountValue: parseFloat(data.discountValue),
        minPurchaseAmount: data.minPurchaseAmount ? parseFloat(data.minPurchaseAmount) : undefined,
        maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : undefined,
        buyQuantity: data.buyQuantity ? parseInt(data.buyQuantity) : undefined,
        getQuantity: data.getQuantity ? parseInt(data.getQuantity) : undefined,
        freeProductId: data.freeProductId ? parseInt(data.freeProductId) : undefined,
        pointsThreshold: data.pointsThreshold ? parseFloat(data.pointsThreshold) : undefined,
        pointsReward: data.pointsReward ? parseFloat(data.pointsReward) : undefined,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : undefined,
        perCustomerLimit: data.perCustomerLimit ? parseInt(data.perCustomerLimit) : undefined,
        priority: data.priority ? parseInt(data.priority) : 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Offer created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create offer",
        variant: "destructive"
      });
    }
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/offers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Success",
        description: "Offer deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete offer",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: OfferFormData) => {
    createOfferMutation.mutate(data);
  };

  const getOfferTypeLabel = (type: string) => {
    const labels = {
      percentage: "Percentage Discount",
      flat_amount: "Flat Amount",
      buy_x_get_y: "Buy X Get Y Free",
      time_based: "Time-based Offer",
      category_based: "Category Discount",
      loyalty_points: "Loyalty Points"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getOfferTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'flat_amount':
        return <Gift className="h-4 w-4" />;
      case 'buy_x_get_y':
        return <Gift className="h-4 w-4" />;
      case 'time_based':
        return <Calendar className="h-4 w-4" />;
      case 'category_based':
        return <BarChart3 className="h-4 w-4" />;
      case 'loyalty_points':
        return <Users className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Offer Management</h1>
            <p className="text-muted-foreground">
              Create and manage promotional offers, discounts, and loyalty programs
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Offer</DialogTitle>
                <DialogDescription>
                  Set up a new promotional offer for your customers
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Weekend Special" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select offer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage Discount</SelectItem>
                              <SelectItem value="flat_amount">Flat Discount</SelectItem>
                              <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                              <SelectItem value="time_based">Time-based Offer</SelectItem>
                              <SelectItem value="category_based">Category Discount</SelectItem>
                              <SelectItem value="loyalty_points">Loyalty Points</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the offer..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch('offerType') === 'percentage' ? 'Discount Percentage' : 
                             form.watch('offerType') === 'loyalty_points' ? 'Points Multiplier' : 'Discount Amount'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder={form.watch('offerType') === 'percentage' ? "10" : "50"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minPurchaseAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Purchase Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('offerType') === 'percentage' && (
                    <FormField
                      control={form.control}
                      name="maxDiscountAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Discount Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="200" {...field} />
                          </FormControl>
                          <FormDescription>
                            Maximum discount amount for percentage offers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('offerType') === 'buy_x_get_y' && (
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="buyQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buy Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="getQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Get Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="freeProductId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Free Product (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product: any) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch('offerType') === 'time_based' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="timeStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="timeEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch('offerType') === 'loyalty_points' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pointsThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points Threshold</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="1000" {...field} />
                            </FormControl>
                            <FormDescription>
                              Purchase amount to earn points
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pointsReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points Reward</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="10" {...field} />
                            </FormControl>
                            <FormDescription>
                              Points earned per threshold
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid From (Optional)</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid To (Optional)</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usage Limit</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormDescription>
                            Total usage limit
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="perCustomerLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Per Customer Limit</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="3" {...field} />
                          </FormControl>
                          <FormDescription>
                            Usage per customer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1" {...field} />
                          </FormControl>
                          <FormDescription>
                            Higher = more priority
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable this offer for customers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createOfferMutation.isPending}>
                      {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="filter-type">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="flat_amount">Flat Discount</SelectItem>
                <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                <SelectItem value="time_based">Time-based</SelectItem>
                <SelectItem value="category_based">Category Discount</SelectItem>
                <SelectItem value="loyalty_points">Loyalty Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="filter-active">Filter by Status</Label>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getOfferTypeIcon(offer.offerType)}
                    <CardTitle className="text-lg">{offer.name}</CardTitle>
                  </div>
                  <Badge variant={offer.active ? "default" : "secondary"}>
                    {offer.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  {getOfferTypeLabel(offer.offerType)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {offer.description || "No description provided"}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-medium">
                      {offer.offerType === 'percentage' ? `${offer.discountValue}%` : 
                       offer.offerType === 'flat_amount' ? `₹${offer.discountValue}` :
                       offer.offerType === 'buy_x_get_y' ? `Buy ${offer.buyQuantity} Get ${offer.getQuantity}` :
                       offer.offerType === 'loyalty_points' ? `${offer.pointsReward} points` :
                       `${offer.discountValue}%`}
                    </span>
                  </div>
                  
                  {offer.minPurchaseAmount && parseFloat(offer.minPurchaseAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Min Purchase:</span>
                      <span className="font-medium">₹{offer.minPurchaseAmount}</span>
                    </div>
                  )}
                  
                  {offer.usageCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span className="font-medium">
                        {offer.usageCount}{offer.usageLimit ? `/${offer.usageLimit}` : ''}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Priority:</span>
                    <span className="font-medium">{offer.priority || 1}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteOfferMutation.mutate(offer.id)}
                    disabled={deleteOfferMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {offers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Gift className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No offers</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new offer.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}