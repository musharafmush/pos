` tags. I will pay close attention to preserving indentation, structure, and functionality while avoiding the forbidden phrases.

```
<replit_final_file>
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  InfoIcon,
  TagIcon,
  DollarSignIcon,
  BoxIcon,
  SettingsIcon,
  PackageIcon,
  ShoppingCartIcon,
  BarChart3Icon,
  CheckIcon,
  XIcon
} from "lucide-react";
import { PackingSectionBadge } from "@/components/ui/packing-section-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Supplier } from "@shared/schema";

const productFormSchema = z.object({
  // Basic Information
  itemCode: z.string().min(2, "Item code is required"),
  itemName: z.string().min(2, "Item name is required"),
  manufacturerName: z.string().optional(),
  supplierName: z.string().optional(),
  aboutProduct: z.string().optional(),

  // Category
  categoryId: z.number(),
  mainCategory: z.string().optional(),

  // Tax Information
  hsnCode: z.string().optional(),
  gstCode: z.string().optional(),
  cgstRate: z.string().optional(),
  sgstRate: z.string().optional(),
  igstRate: z.string().optional(),

  // Pricing
  price: z.string().min(1, "Price is required"),
  mrp: z.string().min(1, "MRP is required"),
  cost: z.string().optional(),
  stockQuantity: z.string().min(0, "Stock quantity is required"),

  // Packing
  weightsPerUnit: z.string().default("1"),
  batchExpiryDetails: z.string().default("Not Required"),
  itemPreparationsStatus: z.string().default("Trade As Is"),
  weightInGms: z.string().optional(),
  bulkItemName: z.string().optional(),

  // Properties
  decimalPoint: z.string().default("0"),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// Generate item code helper
const generateItemCode = () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ITM${timestamp}${randomNum}`;
};

export default function AddItemProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState("item-information");

  // Fetch data
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  }) as { data: Supplier[] };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      itemCode: generateItemCode(),
      itemName: "",
      manufacturerName: "",
      supplierName: "",
      aboutProduct: "",
      mainCategory: "",
      hsnCode: "",
      gstCode: "GST 12%",
      cgstRate: "",
      sgstRate: "",
      igstRate: "",
      price: "",
      mrp: "",
      cost: "",
      stockQuantity: "0",
      weightsPerUnit: "1",
      batchExpiryDetails: "Not Required",
      itemPreparationsStatus: "Trade As Is",
      weightInGms: "",
      bulkItemName: "",
      decimalPoint: "0",
      categoryId: categories[0]?.id || 1,
      active: true,
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const res = await apiRequest("POST", "/api/products", {
        name: data.itemName,
        sku: data.itemCode,
        description: data.aboutProduct,
        price: parseFloat(data.price),
        mrp: parseFloat(data.mrp),
        cost: data.cost ? parseFloat(data.cost) : 0,
        stockQuantity: parseInt(data.stockQuantity),
        categoryId: data.categoryId,
        barcode: "",
        active: data.active,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset();
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sidebarSections = [
    { id: "item-information", label: "Item Information", icon: <InfoIcon className="w-4 h-4" /> },
    { id: "category-information", label: "Category Information", icon: <TagIcon className="w-4 h-4" /> },
    { id: "tax-information", label: "Tax Information", icon: <DollarSignIcon className="w-4 h-4" /> },
    { id: "packing", label: "Packing", icon: <BoxIcon className="w-4 h-4" /> },
    { id: "pricing", label: "Pricing", icon: <DollarSignIcon className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <PackageIcon className="w-4 h-4 text-blue-600" />
              </div>
              <h1 className="text-xl font-semibold">Add Item</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              <XIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white border-r min-h-screen">
            <div className="p-4">
              <Tabs value="general-information" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general-information" className="text-xs">General Information</TabsTrigger>
                  <TabsTrigger value="outlet-specific" className="text-xs">Outlet Specific</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-1">
                {sidebarSections.map((section) => {
                  if (section.id === "packing") {
                    return (
                      <PackingSectionBadge
                        key={section.id}
                        active={currentSection === section.id}
                        onClick={() => setCurrentSection(section.id)}
                      />
                    );
                  }

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentSection === section.id 
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {section.icon}
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-6">

                {/* Item Information Section */}
                {currentSection === "item-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        Item Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="itemCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Code *</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input {...field} placeholder="Auto-generated code" />
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => field.onChange(generateItemCode())}
                                    className="whitespace-nowrap"
                                  >
                                    Generate New
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div />
                      </div>

                      <FormField
                        control={form.control}
                        name="itemName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter item name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="manufacturerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Manufacturer Name</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manufacturer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {suppliers.map((supplier: Supplier) => (
                                      <SelectItem key={supplier.id} value={supplier.name}>
                                        {supplier.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="supplierName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier Name</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {suppliers.map((supplier: Supplier) => (
                                      <SelectItem key={supplier.id} value={supplier.name}>
                                        {supplier.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="aboutProduct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>About Product</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Enter product description" rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Category Information Section */}
                {currentSection === "category-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TagIcon className="w-5 h-5" />
                        Category Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="mainCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Main Category</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select main category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Tax Information Section */}
                {currentSection === "tax-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Tax Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="hsnCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HSN Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter HSN Code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="gstCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Code</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select GST rate" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="GST 0%">GST 0%</SelectItem>
                                    <SelectItem value="GST 5%">GST 5%</SelectItem>
                                    <SelectItem value="GST 12%">GST 12%</SelectItem>
                                    <SelectItem value="GST 18%">GST 18%</SelectItem>
                                    <SelectItem value="GST 28%">GST 28%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="cgstRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CGST Rate (%)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="9.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sgstRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SGST Rate (%)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="9.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="igstRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IGST Rate (%)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="18.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Packing Section */}
                {currentSection === "packing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Packing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="weightsPerUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight Per Unit</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="1" type="number" step="0.001" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="batchExpiryDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batch/Expiry Date Details</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Not Required" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Required">Not Required</SelectItem>
                                    <SelectItem value="Batch Only">Batch Only</SelectItem>
                                    <SelectItem value="Expiry Only">Expiry Only</SelectItem>
                                    <SelectItem value="Both Required">Both Required</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="itemPreparationsStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Preparations Status</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || "Trade As Is"}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Trade As Is" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Trade As Is">Trade As Is</SelectItem>
                                    <SelectItem value="Repackage">Repackage</SelectItem>
                                    <SelectItem value="Bulk">Bulk</SelectItem>
                                    <SelectItem value="Open Item">Open Item</SelectItem>
                                    <SelectItem value="Weight to Piece">Weight to Piece</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("itemPreparationsStatus") === "Repackage" && (
                          <FormField
                            control={form.control}
                            name="bulkItemName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-red-600">Bulk Item Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter bulk item name" className="border-red-300" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {(form.watch("itemPreparationsStatus") === "Repackage" || 
                        form.watch("itemPreparationsStatus") === "Open Item" ||
                        form.watch("itemPreparationsStatus") === "Weight to Piece" ||
                        form.watch("itemPreparationsStatus") === "Bulk") && (
                        <FormField
                          control={form.control}
                          name="weightInGms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-red-600">Weight in (Gms) *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Weight in grams" type="number" className="border-red-300" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Pricing Section */}
                {currentSection === "pricing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selling Price *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mrp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MRP *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost Price</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0.00" type="number" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="stockQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Quantity *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0" type="number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createProductMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}