import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, 
  Phone, 
  FileText, 
  Info, 
  User,
  Mail,
  MapPin,
  Save,
  X
} from "lucide-react";

// UI Components
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  editingSupplier: any | null;
  onCancel: () => void;
}

export function SupplierForm({ editingSupplier, onCancel }: SupplierFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("general");

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

  // Set up form with editing values if present
  useEffect(() => {
    if (editingSupplier) {
      form.reset({
        name: editingSupplier.name || "",
        email: editingSupplier.email || "",
        phone: editingSupplier.phone || "",
        mobileNo: editingSupplier.mobileNo || "",
        extensionNumber: editingSupplier.extensionNumber || "",
        faxNo: editingSupplier.faxNo || "",
        contactPerson: editingSupplier.contactPerson || "",
        address: editingSupplier.address || "",
        building: editingSupplier.building || "",
        street: editingSupplier.street || "",
        city: editingSupplier.city || "",
        state: editingSupplier.state || "",
        country: editingSupplier.country || "",
        pinCode: editingSupplier.pinCode || "",
        landmark: editingSupplier.landmark || "",
        taxId: editingSupplier.taxId || "",
        registrationType: editingSupplier.registrationType || "",
        registrationNumber: editingSupplier.registrationNumber || "",
        supplierType: editingSupplier.supplierType || "",
        creditDays: editingSupplier.creditDays || "",
        discountPercent: editingSupplier.discountPercent || "",
        status: editingSupplier.status || "active",
        notes: editingSupplier.notes || ""
      });
    }
  }, [editingSupplier, form]);

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
      onCancel();
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
    mutationFn: async (data: SupplierFormValues) => {
      const res = await apiRequest("PUT", `/api/suppliers/${editingSupplier.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "The supplier has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      form.reset();
      onCancel();
    },
    onError: (error) => {
      toast({
        title: "Error updating supplier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: SupplierFormValues) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate(data);
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
        {/* Tabs Header - Legacy Style */}
        <div className="mb-4 bg-gray-100 border rounded-t-md">
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
        
        <DialogFooter className="pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
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
  );
}