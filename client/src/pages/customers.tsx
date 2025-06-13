import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Filter, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const customerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  taxNumber: z.string().optional().or(z.literal("")),
  creditLimit: z.string().optional().or(z.literal("")),
  businessName: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return await res.json();
    }
  });

  // Create customer form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxNumber: "",
      creditLimit: "",
      businessName: "",
    },
    // This ensures the form doesn't switch from uncontrolled to controlled
    mode: "onChange"
  });

  // Edit customer form
  const editForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxNumber: "",
      creditLimit: "",
      businessName: "",
    },
    // This ensures the form doesn't switch from uncontrolled to controlled
    mode: "onChange"
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      console.log("Submitting customer data:", data);

      // Enhanced validation before API call
      if (!data.name?.trim()) {
        throw new Error("Customer name is required");
      }

      if (data.email && !data.email.includes('@')) {
        throw new Error("Please enter a valid email address");
      }

      if (data.creditLimit && isNaN(parseFloat(data.creditLimit))) {
        throw new Error("Credit limit must be a valid number");
      }

      // Map form fields to API expected format
      const customerPayload = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit).toString() : "0",
        businessName: data.businessName?.trim() || null,
      };

      const res = await apiRequest("POST", "/api/customers", customerPayload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.details || `HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Customer created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "✅ Customer Created",
        description: `${data.name} has been added successfully with ID: C${String(data.id).padStart(5, '0')}`,
      });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Customer creation error:", error);
      toast({
        title: "❌ Error Creating Customer",
        description: error.message || "There was an error creating the customer. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormValues }) => {
      // Enhanced validation before API call
      if (!data.name?.trim()) {
        throw new Error("Customer name is required");
      }

      if (data.email && !data.email.includes('@')) {
        throw new Error("Please enter a valid email address");
      }

      if (data.creditLimit && isNaN(parseFloat(data.creditLimit))) {
        throw new Error("Credit limit must be a valid number");
      }

      // Clean and format data
      const customerPayload = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        taxNumber: data.taxNumber?.trim() || null,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit).toString() : "0",
        businessName: data.businessName?.trim() || null,
      };

      const res = await apiRequest("PUT", `/api/customers/${id}`, customerPayload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "✅ Customer Updated",
        description: `${data.name}'s information has been updated successfully.`,
      });
      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error Updating Customer",
        description: error.message || "There was an error updating the customer.",
        variant: "destructive",
      });
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      // Find the deleted customer name for better feedback
      const deletedCustomer = customers.find((c: any) => c.id === variables);
      const customerName = deletedCustomer?.name || `Customer ID: ${variables}`;

      toast({
        title: "🗑️ Customer Deleted",
        description: `${customerName} has been permanently removed from the system.`,
      });
      setIsDeleteAlertOpen(false);
      setSelectedCustomerId(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error Deleting Customer",
        description: error.message || "This customer may have associated transactions that prevent deletion.",
        variant: "destructive",
      });
      setIsDeleteAlertOpen(false);
      setSelectedCustomerId(null);
    }
  });

  // Handle adding a new customer
  const onSubmit = (data: CustomerFormValues) => {
    createCustomerMutation.mutate(data);
  };

  // Handle editing a customer
  const onEditSubmit = (data: CustomerFormValues) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    }
  };

  // Handle opening edit dialog
  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    editForm.reset({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      taxNumber: customer.taxId || "",
      creditLimit: customer.creditLimit || "",
      businessName: customer.businessName || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle opening delete dialog
  const handleDeleteClick = (id: number) => {
    setSelectedCustomerId(id);
    setIsDeleteAlertOpen(true);
  };

  // Handle confirming deletion
  const confirmDelete = () => {
    if (selectedCustomerId) {
      deleteCustomerMutation.mutate(selectedCustomerId);
    }
  };

  // Enhanced filter customers based on search term with better matching
  const filteredCustomers = customers.filter((customer: any) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();

    // Search in multiple fields with partial matching
    const searchableFields = [
      customer.name,
      customer.email,
      customer.phone,
      customer.businessName,
      customer.taxId,
      customer.address,
      `C${String(customer.id).padStart(5, '0')}` // Customer ID format
    ];

    return searchableFields.some(field => 
      field && field.toString().toLowerCase().includes(searchLower)
    );
  });

  // Sort customers by name for better organization
  const sortedCustomers = filteredCustomers.sort((a: any, b: any) => {
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Customers</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taxNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Tax identification number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Limit</FormLabel>
                            <FormControl>
                              <Input placeholder="₹0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button 
                        type="submit" 
                        disabled={createCustomerMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {createCustomerMutation.isPending ? "Saving..." : "Save Customer"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <div className="flex justify-between items-center">
                <CardTitle>All your Customers</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Filter className="h-4 w-4" /> Filters
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    Showing {Math.min(entriesPerPage, sortedCustomers.length)} of {sortedCustomers.length} customers
                    {searchTerm && ` (filtered from ${customers.length} total)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                  <Select
                    value={entriesPerPage.toString()}
                    onValueChange={(value) => setEntriesPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-[70px] h-9">
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                      Export Excel
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                      Print
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                      Column visibility
                    </Button>
                    <Button variant="outline" size="sm" className="h-9">
                      Export PDF
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Search customers by name, email, phone, or ID..."
                      className="w-[300px] h-9 pr-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[80px]">Action</TableHead>
                      <TableHead className="w-[80px]">Contact ID</TableHead>
                      <TableHead className="w-[200px]">Business Name</TableHead>
                      <TableHead className="w-[150px]">Name</TableHead>
                      <TableHead className="w-[200px]">Email</TableHead>
                      <TableHead className="w-[150px]">Tax number</TableHead>
                      <TableHead className="w-[120px]">Credit Limit</TableHead>
                      <TableHead className="w-[120px]">Pay term</TableHead>
                      <TableHead className="w-[120px]">Opening Balance</TableHead>
                      <TableHead className="w-[120px]">Advance Balance</TableHead>
                      <TableHead className="w-[120px]">Added On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCustomers.slice(0, entriesPerPage).map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(customer.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>C{String(customer.id).padStart(5, '0')}</TableCell>
                        <TableCell>{customer.businessName || '-'}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>
                          {customer.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>{customer.email}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{customer.taxId || '-'}</TableCell>
                        <TableCell>{formatCurrency(customer.creditLimit || 0)}</TableCell>
                        <TableCell>{customer.paymentTerm || '-'}</TableCell>
                        <TableCell>{formatCurrency(customer.openingBalance || 0)}</TableCell>
                        <TableCell>{formatCurrency(customer.advanceBalance || 0)}</TableCell>
                        <TableCell>
                          {customer.createdAt 
                            ? format(new Date(customer.createdAt), 'MM/dd/yyyy')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          {searchTerm ? (
                            <div className="text-gray-500">
                              <p className="text-lg font-medium">No customers found</p>
                              <p className="text-sm">Try adjusting your search terms or <button 
                                onClick={() => setSearchTerm("")}
                                className="text-blue-600 hover:underline"
                              >clear search</button></p>
                            </div>
                          ) : (
                            <div className="text-gray-500">
                              <p className="text-lg font-medium">No customers yet</p>
                              <p className="text-sm">Add your first customer to get started</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Tax identification number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={updateCustomerMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateCustomerMutation.isPending ? "Saving..." : "Update Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {deleteCustomerMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}