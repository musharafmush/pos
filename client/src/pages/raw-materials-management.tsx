import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Eye, Edit2, Trash2, Package, AlertTriangle, CheckCircle, Settings, Factory, Beaker } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/dashboard-layout";

// Schema for raw material form
const rawMaterialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  unit_cost: z.number().min(0, "Unit cost must be positive"),
  current_stock: z.number().min(0, "Current stock must be positive"),
  min_stock_level: z.number().min(0, "Minimum stock level must be positive")
});

// Schema for manufacturing order form
const manufacturingOrderSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  batch_size: z.number().min(1, "Batch size must be at least 1"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  raw_materials: z.array(z.object({
    material_id: z.number(),
    quantity: z.number().min(0.1, "Quantity must be positive")
  })).min(1, "At least one raw material is required")
});

type RawMaterialFormData = z.infer<typeof rawMaterialSchema>;
type ManufacturingOrderFormData = z.infer<typeof manufacturingOrderSchema>;

export default function RawMaterialsManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("raw-materials");
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch raw materials
  const { data: rawMaterials = [], isLoading: isLoadingMaterials } = useQuery<any[]>({
    queryKey: ['/api/manufacturing/raw-materials'],
    refetchInterval: 15000,
    staleTime: 5000
  });

  // Fetch manufacturing orders
  const { data: manufacturingOrders = [], isLoading: isLoadingOrders } = useQuery<any[]>({
    queryKey: ['/api/manufacturing/orders'],
    refetchInterval: 15000,
    staleTime: 5000
  });

  // Forms
  const materialForm = useForm<RawMaterialFormData>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "",
      unit_cost: 0,
      current_stock: 0,
      min_stock_level: 0
    }
  });

  const orderForm = useForm<ManufacturingOrderFormData>({
    resolver: zodResolver(manufacturingOrderSchema),
    defaultValues: {
      product_name: "",
      description: "",
      quantity: 1,
      batch_size: 1,
      priority: "medium",
      status: "pending",
      raw_materials: []
    }
  });

  // Mutations for raw materials
  const createMaterialMutation = useMutation({
    mutationFn: async (data: RawMaterialFormData) => {
      console.log('Creating material with data:', data);
      const response = await apiRequest('POST', '/api/manufacturing/raw-materials', data);
      console.log('Create response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Create material success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/raw-materials'] });
      setIsAddMaterialOpen(false);
      setSelectedMaterial(null);
      materialForm.reset();
      toast({
        title: "Success",
        description: "Raw material created successfully"
      });
    },
    onError: (error: any) => {
      console.error('Create material error:', error);
      
      // Handle duplicate name error specifically
      if (error.status === 400 && error.message?.includes('already exists')) {
        toast({
          title: "Duplicate Name",
          description: error.message || "A material with this name already exists. Please choose a different name.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create raw material. Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      return apiRequest('PUT', `/api/manufacturing/raw-materials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/raw-materials'] });
      setSelectedMaterial(null);
      setIsAddMaterialOpen(false);
      materialForm.reset();
      toast({
        title: "Success",
        description: "Raw material updated successfully"
      });
    }
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/manufacturing/raw-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/raw-materials'] });
      toast({
        title: "Success",
        description: "Raw material deleted successfully"
      });
    }
  });

  // Mutations for manufacturing orders
  const createOrderMutation = useMutation({
    mutationFn: async (data: ManufacturingOrderFormData) => {
      return apiRequest('POST', '/api/manufacturing/orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      setIsAddOrderOpen(false);
      orderForm.reset();
      toast({
        title: "Success",
        description: "Manufacturing order created successfully"
      });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      return apiRequest('PUT', `/api/manufacturing/orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      setSelectedOrder(null);
      toast({
        title: "Success",
        description: "Manufacturing order updated successfully"
      });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/manufacturing/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/orders'] });
      toast({
        title: "Success",
        description: "Manufacturing order deleted successfully"
      });
    }
  });

  // Helper functions
  const getStockStatus = (current: number, min: number) => {
    if (current <= min) return { status: "low", color: "destructive" };
    if (current <= min * 1.5) return { status: "medium", color: "warning" };
    return { status: "good", color: "success" };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "warning";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in_progress": return "warning";
      case "pending": return "default";
      case "cancelled": return "destructive";
      default: return "default";
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Factory className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Raw Materials Management</h1>
                <p className="text-gray-600">Manage raw materials inventory and create manufacturing orders for production planning</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-blue-600">
                <Beaker className="h-4 w-4 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="raw-materials" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Raw Materials</span>
              <Badge variant="secondary">{rawMaterials.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="manufacturing-orders" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manufacturing Orders</span>
              <Badge variant="secondary">{manufacturingOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Raw Materials Tab */}
          <TabsContent value="raw-materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Raw Materials Inventory</h2>
                <p className="text-gray-600">Manage your raw materials stock and monitor inventory levels</p>
              </div>
              <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Raw Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}</DialogTitle>
                    <DialogDescription>
                      {selectedMaterial ? 'Update the raw material information' : 'Create a new raw material for your inventory'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...materialForm}>
                    <form onSubmit={materialForm.handleSubmit((data) => {
                      console.log('Form submitted with data:', data);
                      console.log('Selected material:', selectedMaterial);
                      console.log('Form errors:', materialForm.formState.errors);
                      
                      if (selectedMaterial) {
                        console.log('Updating material...');
                        updateMaterialMutation.mutate({ id: selectedMaterial.id, ...data });
                      } else {
                        console.log('Creating new material...');
                        createMaterialMutation.mutate(data);
                      }
                    })} className="space-y-4">
                      <FormField
                        control={materialForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter material name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={materialForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Material description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={materialForm.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="kg, liters, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={materialForm.control}
                          name="unit_cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Cost (₹)</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={materialForm.control}
                          name="current_stock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Stock</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={materialForm.control}
                          name="min_stock_level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Stock Level</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsAddMaterialOpen(false);
                          setSelectedMaterial(null);
                          materialForm.reset({
                            name: "",
                            description: "",
                            unit: "",
                            unit_cost: 0,
                            current_stock: 0,
                            min_stock_level: 0
                          });
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMaterialMutation.isPending || updateMaterialMutation.isPending}>
                          {selectedMaterial 
                            ? (updateMaterialMutation.isPending ? "Updating..." : "Update Material")
                            : (createMaterialMutation.isPending ? "Creating..." : "Create Material")
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* View Material Dialog */}
              <Dialog open={!!selectedMaterial && !isAddMaterialOpen} onOpenChange={() => setSelectedMaterial(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Raw Material Details</DialogTitle>
                    <DialogDescription>
                      View complete information for {selectedMaterial?.name}
                    </DialogDescription>
                  </DialogHeader>
                  {selectedMaterial && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Material Name</label>
                          <p className="font-semibold">{selectedMaterial.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Unit</label>
                          <p className="font-semibold">{selectedMaterial.unit}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="font-semibold">{selectedMaterial.description || "No description"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Current Stock</label>
                          <p className="font-semibold">{selectedMaterial.current_stock} {selectedMaterial.unit}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Unit Cost</label>
                          <p className="font-semibold">₹{selectedMaterial.unit_cost}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Min Stock Level</label>
                          <p className="font-semibold">{selectedMaterial.min_stock_level} {selectedMaterial.unit}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Storage Location</label>
                          <p className="font-semibold">{selectedMaterial.storage_location || "Not specified"}</p>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setSelectedMaterial(null)}>
                          Close
                        </Button>
                        <Button onClick={() => {
                          materialForm.reset(selectedMaterial);
                          setIsAddMaterialOpen(true);
                        }}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Material
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Raw Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingMaterials ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                rawMaterials.map((material: any) => {
                  const stockStatus = getStockStatus(material.current_stock, material.min_stock_level);
                  return (
                    <Card key={material.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{material.name}</CardTitle>
                            <CardDescription>{material.description || "No description"}</CardDescription>
                          </div>
                          <Badge variant={stockStatus.color as any}>
                            {stockStatus.status === "low" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {stockStatus.status === "good" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {stockStatus.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Current Stock</p>
                            <p className="font-semibold">{material.current_stock} {material.unit}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Unit Cost</p>
                            <p className="font-semibold">₹{material.unit_cost}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Min Stock Level</p>
                            <p className="font-medium">{material.min_stock_level} {material.unit}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Storage</p>
                            <p className="font-medium">{material.storage_location || "Not specified"}</p>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedMaterial(material)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              materialForm.reset(material);
                              setSelectedMaterial(material);
                              setIsAddMaterialOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => deleteMaterialMutation.mutate(material.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Manufacturing Orders Tab */}
          <TabsContent value="manufacturing-orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Manufacturing Orders</h2>
                <p className="text-gray-600">Create and manage production orders for manufactured products</p>
              </div>
              <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Manufacturing Order</DialogTitle>
                    <DialogDescription>
                      Create a new production order with required materials
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...orderForm}>
                    <form onSubmit={orderForm.handleSubmit((data) => createOrderMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={orderForm.control}
                        name="product_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter product name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={orderForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Product description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={orderForm.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={orderForm.control}
                          name="batch_size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batch Size</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={orderForm.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <FormControl>
                                <select {...field} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddOrderOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createOrderMutation.isPending}>
                          {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Manufacturing Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingOrders ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                manufacturingOrders.map((order: any) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.product_name || order.productName}</CardTitle>
                          <CardDescription>{order.description || "No description"}</CardDescription>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Badge variant={getPriorityColor(order.priority) as any}>
                            {order.priority}
                          </Badge>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-semibold">{order.quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Batch Size</p>
                          <p className="font-semibold">{order.batch_size || order.batchSize}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-600">Created</p>
                        <p className="font-medium">{new Date(order.created_at || order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => deleteOrderMutation.mutate(order.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </DashboardLayout>
  );
}