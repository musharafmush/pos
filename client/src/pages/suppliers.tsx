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
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

// Form schema for supplier management
const supplierFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  contactPerson: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
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
  
  // Initialize form for adding/editing suppliers
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      contactPerson: "",
      address: "",
      taxId: "",
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
    createSupplierMutation.mutate(data);
  };
  
  // Handle form submission for updating a supplier
  const onEditSubmit = (data: SupplierFormValues) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    }
  };
  
  // Set up edit mode
  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    
    form.reset({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      contactPerson: supplier.contactPerson || "",
      address: supplier.address || "",
      taxId: supplier.taxId || "",
      notes: supplier.notes || ""
    });
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
  
  return (
    <DashboardLayout>
      <div className="container max-w-7xl pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl text-blue-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  Add New Supplier
                </DialogTitle>
                <DialogDescription>
                  Enter the supplier details below. Fields marked with <span className="text-red-500">*</span> are required.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
                  <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                    <h3 className="text-base font-medium text-blue-700 pb-2 border-b flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                      Basic Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Company/Supplier Name <span className="text-red-500 ml-1">*</span>
                            <div className="ml-2 cursor-help group relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Company or business name of the supplier
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
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
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-800 flex items-center">
                              GST/Tax ID
                              <div className="ml-2 cursor-help group relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                  Tax identification number for business transactions
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 12H8"/><path d="m16 12 2 2 4-4"/></svg>
                                <Input {...field} placeholder="e.g. 29AADCB2230M1ZP" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                              </div>
                            </FormControl>
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
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                  Primary person to contact at this supplier
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <Input {...field} placeholder="Name of point of contact" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                    <h3 className="text-base font-medium text-blue-700 pb-2 border-b flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Contact Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-800 flex items-center">
                              Email Address
                              <div className="ml-2 cursor-help group relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                  Primary contact email for this supplier
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                                <Input {...field} placeholder="email@example.com" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
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
                              <div className="ml-2 cursor-help group relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                  Contact phone number for this supplier
                                </div>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <Input {...field} placeholder="e.g. +1 555-123-4567" className="pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500" />
                              </div>
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
                          <FormLabel className="text-slate-800 flex items-center">
                            Address
                            <div className="ml-2 cursor-help group relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Physical address of the supplier's location
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                              <Textarea 
                                {...field} 
                                placeholder="Full address including city, state and postal code"
                                className="resize-none pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                                rows={3}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4 border rounded-lg p-5 bg-white shadow-sm">
                    <h3 className="text-base font-medium text-blue-700 pb-2 border-b flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 17h6"/><path d="M9 13h6"/></svg>
                      Additional Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-800 flex items-center">
                            Notes
                            <div className="ml-2 cursor-help group relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Any additional notes about this supplier that could be helpful for your team
                              </div>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 17h6"/><path d="M9 13h6"/></svg>
                              <Textarea 
                                {...field} 
                                placeholder="Enter any additional details about this supplier (e.g., payment terms, lead times, special requirements, etc.)"
                                className="resize-none pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                                rows={4}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Supplier Management Best Practices</p>
                        <ul className="list-disc pl-5 space-y-0.5">
                          <li>Include payment terms and credit information</li>
                          <li>Document lead times and minimum order requirements</li>
                          <li>Note any special handling or shipping requirements</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="mt-6 pt-6 border-t flex items-center justify-between">
                    <div className="text-sm text-slate-500 flex items-center">
                      <span className="text-red-500 mr-1">*</span> Required fields must be completed
                    </div>
                    <div className="flex space-x-3">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className="border-slate-300 px-4">
                          <X className="mr-2 h-4 w-4 text-slate-500" /> Cancel
                        </Button>
                      </DialogClose>
                      <Button 
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 px-5"
                        disabled={createSupplierMutation.isPending}
                      >
                        {createSupplierMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving Supplier...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" /> Save Supplier
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white rounded-t-lg border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-slate-800">Supplier Directory</CardTitle>
                <CardDescription>
                  Manage your suppliers and their contact information
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search suppliers..."
                  className="pl-8 border-slate-300 focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-48 bg-white">
                <svg className="animate-spin -ml-1 mr-2 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-slate-600 font-medium">Loading suppliers...</span>
              </div>
            ) : (
              filteredSuppliers.length === 0 ? (
                <div className="text-center p-10 bg-white">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    {searchTerm ? (
                      <Search className="h-8 w-8 text-slate-400" />
                    ) : (
                      <Plus className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  {searchTerm ? (
                    <>
                      <p className="text-lg font-medium text-slate-800 mb-2">No matching suppliers</p>
                      <p className="text-slate-500">No suppliers match your search term "<span className="font-medium">{searchTerm}</span>"</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-slate-800 mb-2">No suppliers found</p>
                      <p className="text-slate-500 mb-6">Get started by adding your first supplier</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Your First Supplier
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-700">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700">Contact Details</TableHead>
                        <TableHead className="font-semibold text-slate-700">GST/Tax ID</TableHead>
                        <TableHead className="font-semibold text-slate-700">Address</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier: any) => (
                        <TableRow key={supplier.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            <div>{supplier.name}</div>
                            {supplier.contactPerson && (
                              <div className="text-sm text-slate-500 mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                {supplier.contactPerson}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {supplier.email && (
                                <div className="flex items-center text-slate-700">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-slate-500"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                                  <span>{supplier.email}</span>
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center text-slate-700">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-slate-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              {!supplier.email && !supplier.phone && (
                                <span className="text-slate-400 italic">No contact information</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {supplier.taxId ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                {supplier.taxId}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No tax ID provided</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[250px] truncate text-slate-700">
                              {supplier.address || <span className="text-slate-400 italic">No address provided</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="h-8 w-8 border-slate-300 hover:bg-slate-100"
                                    onClick={() => handleEdit(supplier)}
                                  >
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                  <DialogHeader>
                                    <DialogTitle>Edit Supplier</DialogTitle>
                                    <DialogDescription>
                                      Update the supplier details below. Click save when you're done.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  {editingSupplier && (
                                    <Form {...form}>
                                      <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                                          <h3 className="text-sm font-medium text-slate-500 pb-2 border-b">Basic Information</h3>
                                          
                                          <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-slate-800">Company/Supplier Name *</FormLabel>
                                                <FormControl>
                                                  <Input {...field} placeholder="Enter supplier or company name" className="focus-visible:ring-blue-500" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          
                                          <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                              control={form.control}
                                              name="taxId"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-slate-800">GST/Tax ID</FormLabel>
                                                  <FormControl>
                                                    <Input {...field} placeholder="e.g. 29AADCB2230M1ZP" className="focus-visible:ring-blue-500" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            
                                            <FormField
                                              control={form.control}
                                              name="contactPerson"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-slate-800">Contact Person</FormLabel>
                                                  <FormControl>
                                                    <Input {...field} placeholder="Name of point of contact" className="focus-visible:ring-blue-500" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                                          <h3 className="text-sm font-medium text-slate-500 pb-2 border-b">Contact Information</h3>
                                          
                                          <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                              control={form.control}
                                              name="email"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel className="text-slate-800">Email Address</FormLabel>
                                                  <FormControl>
                                                    <Input {...field} placeholder="email@example.com" className="focus-visible:ring-blue-500" />
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
                                                  <FormLabel className="text-slate-800">Phone Number</FormLabel>
                                                  <FormControl>
                                                    <Input {...field} placeholder="e.g. +1 555-123-4567" className="focus-visible:ring-blue-500" />
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
                                                <FormLabel className="text-slate-800">Address</FormLabel>
                                                <FormControl>
                                                  <Textarea 
                                                    {...field} 
                                                    placeholder="Full address including city, state and postal code"
                                                    className="resize-none focus-visible:ring-blue-500"
                                                    rows={3}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        
                                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                                          <h3 className="text-sm font-medium text-slate-500 pb-2 border-b">Additional Information</h3>
                                          
                                          <FormField
                                            control={form.control}
                                            name="notes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-slate-800">Notes</FormLabel>
                                                <FormControl>
                                                  <Textarea 
                                                    {...field} 
                                                    placeholder="Additional information about this supplier"
                                                    className="resize-none focus-visible:ring-blue-500"
                                                    rows={3}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        
                                        <DialogFooter className="mt-6 pt-4 border-t">
                                          <DialogClose asChild>
                                            <Button 
                                              type="button" 
                                              variant="outline"
                                              className="border-slate-300"
                                              onClick={() => setEditingSupplier(null)}
                                            >
                                              Cancel
                                            </Button>
                                          </DialogClose>
                                          <Button 
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            disabled={updateSupplierMutation.isPending}
                                          >
                                            {updateSupplierMutation.isPending ? (
                                              <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Updating...
                                              </>
                                            ) : (
                                              <>
                                                <Save className="mr-2 h-4 w-4" /> Update Supplier
                                              </>
                                            )}
                                          </Button>
                                        </DialogFooter>
                                      </form>
                                    </Form>
                                  )}
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog open={openDeleteDialog && supplierToDelete === supplier.id} onOpenChange={setOpenDeleteDialog}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-slate-300 hover:bg-red-50 text-red-600 hover:text-red-700 hover:border-red-200"
                                    onClick={() => handleDeleteClick(supplier.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the supplier "{supplier.name}". 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={confirmDelete}
                                      className="bg-destructive hover:bg-destructive/90"
                                      disabled={deleteSupplierMutation.isPending}
                                    >
                                      {deleteSupplierMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}