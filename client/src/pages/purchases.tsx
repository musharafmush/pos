
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  PlusIcon, 
  SearchIcon, 
  ClipboardEditIcon, 
  ExternalLinkIcon, 
  TrashIcon,
  PackageIcon,
  FileText
} from "lucide-react";
import PurchaseOrderPDF from "@/components/purchase/pdf-generator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const purchaseFormSchema = z.object({
  supplierId: z.coerce.number({
    required_error: "Supplier is required",
    invalid_type_error: "Supplier must be a number",
  }),
  items: z.array(
    z.object({
      productId: z.coerce.number({
        required_error: "Product is required",
        invalid_type_error: "Product must be a number",
      }),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
      unitCost: z.coerce.number().min(0.01, "Unit cost must be at least 0.01"),
    })
  ).min(1, "At least one item is required")
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

const updatePurchaseStatusSchema = z.object({
  status: z.enum(["pending", "ordered", "received", "cancelled"]),
  receivedDate: z.date().optional()
});

type UpdatePurchaseStatusValues = z.infer<typeof updatePurchaseStatusSchema>;

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [itemCount, setItemCount] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purchaseForm = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: 0,
      items: [
        {
          productId: 0,
          quantity: 1,
          unitCost: 0
        }
      ]
    },
  });

  const statusForm = useForm<UpdatePurchaseStatusValues>({
    resolver: zodResolver(updatePurchaseStatusSchema),
    defaultValues: {
      status: "pending",
      receivedDate: undefined
    },
  });

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['/api/purchases'],
    queryFn: async () => {
      const response = await fetch('/api/purchases');
      if (!response.ok) {
        throw new Error('Failed to fetch purchases');
      }
      return response.json();
    }
  });

  const { data: suppliers } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      return response.json();
    }
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      return await apiRequest("POST", "/api/purchases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      setIsCreateDialogOpen(false);
      purchaseForm.reset();
      setItemCount(1);
      toast({
        title: "Purchase order created",
        description: "Purchase order has been successfully created",
      });
    },
    onError: (error) => {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase order. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updatePurchaseStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, data }: { purchaseId: number, data: UpdatePurchaseStatusValues }) => {
      return await apiRequest("PUT", `/api/purchases/${purchaseId}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setIsStatusDialogOpen(false);
      statusForm.reset();
      toast({
        title: "Purchase status updated",
        description: "Purchase status has been successfully updated",
      });
    },
    onError: (error) => {
      console.error("Error updating purchase status:", error);
      toast({
        title: "Error",
        description: "Failed to update purchase status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PurchaseFormValues) => {
    createPurchaseMutation.mutate(data);
  };

  const onStatusSubmit = (data: UpdatePurchaseStatusValues) => {
    if (!selectedPurchase) return;
    updatePurchaseStatusMutation.mutate({ 
      purchaseId: selectedPurchase.id,
      data
    });
  };

  const addItemField = () => {
    const items = purchaseForm.getValues("items");
    purchaseForm.setValue("items", [
      ...items,
      { productId: 0, quantity: 1, unitCost: 0 }
    ]);
    setItemCount(itemCount + 1);
  };

  const removeItemField = (index: number) => {
    const items = purchaseForm.getValues("items");
    if (items.length <= 1) return;
    
    const newItems = items.filter((_, i) => i !== index);
    purchaseForm.setValue("items", newItems);
    setItemCount(itemCount - 1);
  };

  const handleViewPurchase = async (purchase: any) => {
    setSelectedPurchase(purchase);
    setIsViewDialogOpen(true);
  };

  const handleUpdateStatus = (purchase: any) => {
    setSelectedPurchase(purchase);
    statusForm.reset({
      status: purchase.status,
      receivedDate: purchase.status === 'received' && purchase.receivedDate 
        ? new Date(purchase.receivedDate) 
        : undefined
    });
    setIsStatusDialogOpen(true);
  };

  // Filter purchases based on search term
  const filteredPurchases = purchases?.filter((purchase: any) => {
    if (!searchTerm) return true;
    
    return (
      purchase.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (purchase.supplier?.name && purchase.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Purchase Orders</h2>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Input 
                placeholder="Search purchases..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
            <Button 
              onClick={() => window.location.href = "/purchase-entry-professional"} 
              className="bg-blue-500 hover:bg-blue-600"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>
              Track and manage your purchase orders from suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                Loading purchase orders...
              </div>
            ) : filteredPurchases && filteredPurchases.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.orderNumber}
                        </TableCell>
                        <TableCell>
                          {purchase.supplier?.name || "Unknown Supplier"}
                        </TableCell>
                        <TableCell>
                          {purchase.orderDate && format(new Date(purchase.orderDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          ${typeof purchase.total === 'number' 
                            ? purchase.total.toFixed(2) 
                            : parseFloat(purchase.total || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            purchase.status === 'pending' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300 hover:bg-yellow-100",
                            purchase.status === 'ordered' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-300 hover:bg-blue-100",
                            purchase.status === 'received' && "bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-300 hover:bg-green-100",
                            purchase.status === 'cancelled' && "bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300 hover:bg-red-100"
                          )}>
                            {purchase.status?.charAt(0).toUpperCase() + purchase.status?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleViewPurchase(purchase)}
                              title="View Details"
                              data-testid={`button-view-${purchase.id}`}
                            >
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleUpdateStatus(purchase)}
                              title="Update Status"
                              disabled={purchase.status === 'cancelled' || purchase.status === 'received'}
                              data-testid={`button-status-${purchase.id}`}
                            >
                              <ClipboardEditIcon className="h-4 w-4" />
                            </Button>
                            {purchase.items && purchase.items.length > 0 && (
                              <div className="inline-flex">
                                <PurchaseOrderPDF purchaseOrder={purchase} />
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? "No purchase orders found matching your search." 
                  : "No purchase orders found. Create your first purchase order!"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Purchase Dialog */}
      {selectedPurchase && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Purchase Order Details
                {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                  <PurchaseOrderPDF purchaseOrder={selectedPurchase} />
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedPurchase.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</h3>
                  <p className="text-sm font-medium">{selectedPurchase.supplier?.name || "Unknown Supplier"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                  <Badge className={cn(
                    "mt-1",
                    selectedPurchase.status === 'pending' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-300 hover:bg-yellow-100",
                    selectedPurchase.status === 'ordered' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-300 hover:bg-blue-100",
                    selectedPurchase.status === 'received' && "bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-30 dark:text-green-300 hover:bg-green-100",
                    selectedPurchase.status === 'cancelled' && "bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-300 hover:bg-red-100"
                  )}>
                    {selectedPurchase.status?.charAt(0).toUpperCase() + selectedPurchase.status?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Date</h3>
                  <p className="text-sm">
                    {selectedPurchase.orderDate && format(new Date(selectedPurchase.orderDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</h3>
                  <p className="text-lg font-bold">
                    ${typeof selectedPurchase.total === 'number' 
                      ? selectedPurchase.total.toFixed(2) 
                      : parseFloat(selectedPurchase.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Update Status Dialog */}
      {selectedPurchase && (
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Purchase Status</DialogTitle>
              <DialogDescription>
                Update the status for purchase order {selectedPurchase.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...statusForm}>
              <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
                <FormField
                  control={statusForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {statusForm.watch("status") === "received" && (
                  <FormField
                    control={statusForm.control}
                    name="receivedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined;
                              field.onChange(date);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsStatusDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePurchaseStatusMutation.isPending}
                  >
                    {updatePurchaseStatusMutation.isPending ? "Updating..." : "Update Status"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
