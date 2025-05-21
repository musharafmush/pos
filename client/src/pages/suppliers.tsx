import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Save,
  X,
  Building2,
  Mail,
  Phone,
  FileText,
  User,
  MapPin,
  CreditCard,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Form schema for supplier management
const supplierFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  mobileNo: z.string().optional().or(z.literal('')),
  extensionNumber: z.string().optional().or(z.literal('')),
  faxNo: z.string().optional().or(z.literal('')),
  contactPerson: z.string().optional().or(z.literal('')),
  // Address fields
  address: z.string().optional().or(z.literal('')),
  building: z.string().optional().or(z.literal('')),
  street: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  pinCode: z.string().optional().or(z.literal('')),
  landmark: z.string().optional().or(z.literal('')),
  // Business details
  taxId: z.string().optional().or(z.literal('')),
  registrationType: z.string().optional().or(z.literal('')),
  registrationNumber: z.string().optional().or(z.literal('')),
  supplierType: z.string().optional().or(z.literal('')),
  creditDays: z.string().optional().or(z.literal('')),
  discountPercent: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('active')),
  notes: z.string().optional().or(z.literal(''))
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

// Main component
export default function Suppliers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [formOpen, setFormOpen] = useState(false);
  
  // Initialize form for adding/editing suppliers
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobileNo: "",
      extensionNumber: "",
      faxNo: "",
      contactPerson: "",
      address: "",
      building: "",
      street: "",
      city: "",
      state: "",
      country: "",
      pinCode: "",
      landmark: "",
      taxId: "",
      registrationType: "",
      registrationNumber: "",
      supplierType: "",
      creditDays: "",
      discountPercent: "",
      status: "active",
      notes: ""
    },
  });
  
  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/suppliers");
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        return await res.json();
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
      }
    },
  });
  
  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier created",
        description: "The supplier has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      form.reset();
      setFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating supplier",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SupplierFormValues }) => {
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "The supplier has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditingSupplier(null);
      form.reset();
      setFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating supplier",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/suppliers/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier deleted",
        description: "The supplier has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSupplierToDelete(null);
      setOpenDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error deleting supplier",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Filter suppliers based on search term
  const filteredSuppliers = searchTerm
    ? suppliers.filter((supplier: any) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : suppliers;
  
  // Handle form submission for creating a supplier
  const onSubmit = (data: SupplierFormValues) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };
  
  // Set up edit mode
  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    
    form.reset({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      mobileNo: supplier.mobileNo || "",
      extensionNumber: supplier.extensionNumber || "",
      faxNo: supplier.faxNo || "",
      contactPerson: supplier.contactPerson || "",
      address: supplier.address || "",
      building: supplier.building || "",
      street: supplier.street || "",
      city: supplier.city || "",
      state: supplier.state || "",
      country: supplier.country || "",
      pinCode: supplier.pinCode || "",
      landmark: supplier.landmark || "",
      taxId: supplier.taxId || "",
      registrationType: supplier.registrationType || "",
      registrationNumber: supplier.registrationNumber || "",
      supplierType: supplier.supplierType || "",
      creditDays: supplier.creditDays || "",
      discountPercent: supplier.discountPercent || "",
      status: supplier.status || "active",
      notes: supplier.notes || ""
    });
    
    setFormOpen(true);
    setActiveTab("general");
  };
  
  // Set up delete confirmation
  const handleDeleteClick = (id: number) => {
    setSupplierToDelete(id);
    setOpenDeleteDialog(true);
  };
  
  // Confirm deletion
  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete);
    }
  };
  
  // Reset form and close
  const handleCloseForm = () => {
    setEditingSupplier(null);
    form.reset();
    setFormOpen(false);
  };
  
  // Handle new supplier click
  const handleAddSupplier = () => {
    setEditingSupplier(null);
    form.reset();
    setFormOpen(true);
    setActiveTab("general");
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleAddSupplier}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Supplier Management</CardTitle>
            <div className="flex items-center mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search suppliers..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center">
                          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {searchTerm ? (
                          <div>
                            <div className="text-lg mb-1">No suppliers match your search</div>
                            <div className="text-sm text-slate-500">Try a different search term or clear the search</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-lg mb-1">No suppliers found</div>
                            <div className="text-sm text-slate-500">Add your first supplier to get started</div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier: any) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                        <TableCell>{supplier.email || 'N/A'}</TableCell>
                        <TableCell>{supplier.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <span 
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              supplier.status === 'active'
                                ? 'bg-green-100 text-green-800' 
                                : supplier.status === 'inactive'
                                  ? 'bg-slate-100 text-slate-800' 
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {supplier.status === 'active' 
                              ? 'Active' 
                              : supplier.status === 'inactive' 
                                ? 'Inactive' 
                                : 'On Hold'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(supplier.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Supplier Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[90vw] max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 sticky top-0 bg-white z-10">
            <DialogTitle className="text-xl text-blue-700 flex items-center">
              <Building2 className="h-6 w-6 mr-2" />
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription>
              Enter the supplier details below. Fields marked with <span className="text-red-500">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
              {/* Tabs Header - Legacy Style */}
              <div className="mb-4 bg-gray-100 border rounded-t-md sticky top-20 z-10">
                <div className="flex">
                  <div
                    onClick={() => setActiveTab("general")}
                    className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                      activeTab === "general" 
                        ? "bg-white border-t-2 border-t-blue-500 font-medium" 
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <Building2 className="h-4 w-4" /> General
                  </div>
                  <div
                    onClick={() => setActiveTab("contact")}
                    className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                      activeTab === "contact" 
                        ? "bg-white border-t-2 border-t-blue-500 font-medium" 
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <Phone className="h-4 w-4" /> Contact Details
                  </div>
                  <div
                    onClick={() => setActiveTab("business")}
                    className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                      activeTab === "business" 
                        ? "bg-white border-t-2 border-t-blue-500 font-medium" 
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <FileText className="h-4 w-4" /> Business Settings
                  </div>
                </div>
              </div>
              
              {/* General Information Tab */}
              {activeTab === "general" && (
                <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                  <div className="bg-blue-50 border-b border-blue-100 -m-5 mb-4 p-3 rounded-t-lg">
                    <h3 className="text-base font-medium text-blue-700 flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                      Supplier Information
                    </h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 flex items-center">
                          Company/Supplier Name <span className="text-red-500 ml-1">*</span>
                          <div className="ml-2 cursor-help group relative">
                            <Info className="h-4 w-4 text-slate-400" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                              Company or business name of the supplier
                            </div>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Input {...field} placeholder="Enter supplier or company name" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="registrationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">Registration Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select registration type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="composition">Composition</SelectItem>
                              <SelectItem value="unregistered">Unregistered</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">Registration Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. 12ABCDE1234F1Z5" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            GST/Tax ID
                            <div className="ml-2 cursor-help group relative">
                              <Info className="h-4 w-4 text-slate-400" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Tax identification number for business transactions
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. 29AADCB2230M1ZP" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supplierType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">Supplier Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manufacturer">Manufacturer</SelectItem>
                              <SelectItem value="wholesaler">Wholesaler</SelectItem>
                              <SelectItem value="distributor">Distributor</SelectItem>
                              <SelectItem value="retailer">Retailer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || "active"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="onhold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Contact Person
                            <div className="ml-2 cursor-help group relative">
                              <Info className="h-4 w-4 text-slate-400" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Primary person to contact at this supplier
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                              <Input {...field} placeholder="Name of point of contact" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {/* Contact Information Tab */}
              {activeTab === "contact" && (
                <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                  <div className="bg-blue-50 border-b border-blue-100 -m-5 mb-4 p-3 rounded-t-lg">
                    <h3 className="text-base font-medium text-blue-700 flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-blue-600" />
                      Contact Information
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                              <Input {...field} type="email" placeholder="email@company.com" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                            </div>
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
                          <FormLabel className="text-slate-800 flex items-center">
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                              <Input {...field} placeholder="+1 (555) 123-4567" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mobileNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Mobile Number
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mobile number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="extensionNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Extension Number
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Office extension" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="faxNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 flex items-center">
                          Fax Number
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Fax number (if available)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-blue-50 border-b border-blue-100 -mx-5 mt-6 mb-4 p-3">
                    <h3 className="text-base font-medium text-blue-700 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                      Address Details
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="building"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            Building/Premise
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Building name or number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            Street Address
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            City
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            State/Province
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="State or province" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            Country
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || "India"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                              <SelectItem value="Canada">Canada</SelectItem>
                              <SelectItem value="Australia">Australia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pinCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800">
                            PIN/ZIP Code
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Postal code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="landmark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800">
                          Landmark
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nearby landmark for easy location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 flex items-center">
                          Complete Address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Textarea {...field} placeholder="Full address (generated from the fields above or enter manually)" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 min-h-[80px]" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Business Settings Tab */}
              {activeTab === "business" && (
                <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                  <div className="bg-blue-50 border-b border-blue-100 -m-5 mb-4 p-3 rounded-t-lg">
                    <h3 className="text-base font-medium text-blue-700 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Business Settings
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="creditDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Credit Period (Days)
                            <div className="ml-2 cursor-help group relative">
                              <Info className="h-4 w-4 text-slate-400" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Days allowed for payment after purchase
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. 30" type="number" min="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="discountPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Default Discount (%)
                            <div className="ml-2 cursor-help group relative">
                              <Info className="h-4 w-4 text-slate-400" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Standard discount percentage for this supplier
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. 5" type="number" min="0" max="100" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-800 flex items-center">
                          Notes & Additional Information
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional information about this supplier" className="focus-visible:ring-blue-500 focus-visible:border-blue-500 min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center p-4 mt-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="rounded-full bg-blue-100 p-2 mr-3">
                      <Info className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-sm text-slate-700">
                      <p className="font-medium">Important Information</p>
                      <p>All purchase orders for this supplier will use these default settings unless overridden.</p>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseForm}
                  className="border-slate-300"
                >
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                >
                  {(createSupplierMutation.isPending || updateSupplierMutation.isPending) ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSupplierMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : 'Delete Supplier'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}