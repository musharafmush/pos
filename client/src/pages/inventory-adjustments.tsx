import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  PlusIcon,
  RefreshCw,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircle2,
  XCircle,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Wifi,
  Database
} from "lucide-react";

// Validation schema for inventory adjustment
const adjustmentSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  adjustmentType: z.enum(["add", "remove", "transfer", "correction"], {
    required_error: "Adjustment type is required"
  }),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  notes: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  locationFrom: z.string().optional(),
  locationTo: z.string().optional(),
  referenceDocument: z.string().optional()
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

export default function InventoryAdjustments() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time data queries
  const { data: adjustments, isLoading: adjustmentsLoading, refetch: refetchAdjustments } = useQuery({
    queryKey: ['/api/inventory-adjustments'],
    queryFn: async () => {
      const response = await fetch('/api/inventory-adjustments');
      if (!response.ok) throw new Error('Failed to fetch adjustments');
      return response.json();
    },
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });

  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  // Form setup
  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: 0,
      adjustmentType: "add",
      quantity: 1,
      reason: "",
      notes: "",
      unitCost: 0,
      batchNumber: "",
      expiryDate: "",
      locationFrom: "",
      locationTo: "",
      referenceDocument: ""
    }
  });

  // Create adjustment mutation
  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      const response = await fetch('/api/inventory-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create adjustment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory adjustment created successfully"
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Approve adjustment mutation
  const approveAdjustmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventory-adjustments/${id}/approve`, {
        method: 'PUT'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve adjustment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory adjustment approved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-adjustments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete adjustment mutation
  const deleteAdjustmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventory-adjustments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete adjustment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory adjustment deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: AdjustmentFormData) => {
    createAdjustmentMutation.mutate(data);
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!adjustments) return { totalAdjustments: 0, stockAdded: 0, stockRemoved: 0, pendingApprovals: 0 };

    const totalAdjustments = adjustments.length;
    const stockAdded = adjustments
      .filter((adj: any) => adj.quantity > 0)
      .reduce((sum: number, adj: any) => sum + adj.quantity, 0);
    const stockRemoved = Math.abs(adjustments
      .filter((adj: any) => adj.quantity < 0)
      .reduce((sum: number, adj: any) => sum + adj.quantity, 0));
    const pendingApprovals = adjustments.filter((adj: any) => !adj.approved).length;

    return { totalAdjustments, stockAdded, stockRemoved, pendingApprovals };
  };

  const stats = calculateStats();

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get adjustment type icon and color
  const getAdjustmentTypeInfo = (type: string, quantity: number) => {
    switch (type) {
      case 'add':
        return { 
          icon: <ArrowUpIcon className="h-4 w-4" />, 
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Stock Added'
        };
      case 'remove':
        return { 
          icon: <ArrowDownIcon className="h-4 w-4" />, 
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Stock Removed'
        };
      case 'transfer':
        return { 
          icon: <Package className="h-4 w-4" />, 
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Transfer'
        };
      case 'correction':
        return { 
          icon: <Activity className="h-4 w-4" />, 
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          label: 'Correction'
        };
      default:
        return { 
          icon: <Activity className="h-4 w-4" />, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Adjustment'
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Loading and Error States */}
        {(adjustmentsLoading || productsLoading) && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-blue-700">Loading real-time inventory data from POS Enhanced...</p>
            </div>
          </div>
        )}

        {(!adjustments && !adjustmentsLoading) && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-yellow-700">No inventory adjustments found. Create your first adjustment to track stock changes.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Inventory Adjustments
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time inventory management with POS Enhanced integration
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                  <Wifi className="w-2 h-2 mr-2 animate-pulse" />
                  Live Data - Updates every 5s
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    refetchAdjustments();
                    refetchProducts();
                  }}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                  title="Refresh inventory data"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                <Database className="h-4 w-4" />
                <span>POS System</span>
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-1">
                    <PlusIcon className="h-4 w-4" />
                    <span>New Adjustment</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Inventory Adjustment</DialogTitle>
                    <DialogDescription>
                      Adjust stock levels for products with proper tracking and approval workflow.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Product*</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  const productId = parseInt(value);
                                  field.onChange(productId);
                                  const product = products?.find((p: any) => p.id === productId);
                                  setSelectedProduct(product);
                                }}
                                value={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((product: any) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} (SKU: {product.sku}) - Stock: {product.stockQuantity || 0}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedProduct && (
                          <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Current Stock: <span className="font-semibold">{selectedProduct.stockQuantity || 0}</span>
                              {selectedProduct.weightUnit && (
                                <span className="ml-2">({selectedProduct.weight} {selectedProduct.weightUnit})</span>
                              )}
                            </p>
                          </div>
                        )}

                        <FormField
                          control={form.control}
                          name="adjustmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adjustment Type*</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="add">
                                    <div className="flex items-center">
                                      <ArrowUpIcon className="h-4 w-4 mr-2 text-green-500" />
                                      <span>Add Stock</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="remove">
                                    <div className="flex items-center">
                                      <ArrowDownIcon className="h-4 w-4 mr-2 text-red-500" />
                                      <span>Remove Stock</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="transfer">
                                    <div className="flex items-center">
                                      <Package className="h-4 w-4 mr-2 text-blue-500" />
                                      <span>Transfer</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="correction">
                                    <div className="flex items-center">
                                      <Activity className="h-4 w-4 mr-2 text-purple-500" />
                                      <span>Stock Correction</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  placeholder="Enter quantity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Reason*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Reason for adjustment" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unitCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Cost</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  placeholder="Cost per unit"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="batchNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batch Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Batch/Lot number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="locationFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From Location</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Source location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="locationTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>To Location</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Destination location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Additional notes or comments" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createAdjustmentMutation.isPending}
                        >
                          {createAdjustmentMutation.isPending ? "Creating..." : "Create Adjustment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Adjustments</p>
                <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalAdjustments}
                </h4>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock Added</p>
                <h4 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.stockAdded}
                </h4>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock Removed</p>
                <h4 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.stockRemoved}
                </h4>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approvals</p>
                <h4 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.pendingApprovals}
                </h4>
              </div>
              <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Adjustments Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Adjustments</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Real-time tracking
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments?.map((adjustment: any) => {
                  const typeInfo = getAdjustmentTypeInfo(adjustment.adjustmentType, adjustment.quantity);
                  return (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium">
                        {adjustment.adjustmentNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{adjustment.productName}</p>
                          {adjustment.productSku && (
                            <p className="text-xs text-gray-500">SKU: {adjustment.productSku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center space-x-1 ${typeInfo.color}`}>
                          {typeInfo.icon}
                          <span className="text-sm">{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={adjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                          {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{adjustment.reason}</p>
                          {adjustment.notes && (
                            <p className="text-xs text-gray-500">{adjustment.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {adjustment.totalValue ? formatCurrency(adjustment.totalValue) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={adjustment.approved ? "default" : "secondary"}
                          className={adjustment.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                        >
                          {adjustment.approved ? (
                            <div className="flex items-center space-x-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Approved</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Pending</span>
                            </div>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(adjustment.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {!adjustment.approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveAdjustmentMutation.mutate(adjustment.id)}
                              disabled={approveAdjustmentMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAdjustmentMutation.mutate(adjustment.id)}
                            disabled={deleteAdjustmentMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {adjustments?.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No inventory adjustments found.</p>
                <p className="text-sm text-gray-400">Create your first adjustment to get started.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}