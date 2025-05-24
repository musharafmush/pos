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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

const productFormSchema = z.object({
  // Item Information
  itemCode: z.string().min(2, "Item code is required"),
  itemName: z.string().min(2, "Item name is required"),
  manufacturerName: z.string().optional(),
  supplierName: z.string().optional(),
  alias: z.string().optional(),
  aboutProduct: z.string().optional(),
  
  // Category Information
  itemProductType: z.string().default("Standard"),
  department: z.string().optional(),
  mainCategory: z.string().optional(),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  buyer: z.string().optional(),
  
  // Tax Information
  hsnCode: z.string().optional(),
  gstCode: z.string().optional(),
  purchaseGstCalculatedOn: z.string().default("MRP"),
  gstUom: z.string().default("PIECES"),
  purchaseAbatement: z.string().optional(),
  configItemWithCommodity: z.boolean().default(false),
  seniorExemptApplicable: z.boolean().default(false),
  
  // EAN Code/Barcode
  eanCodeRequired: z.boolean().default(false),
  
  // Packing
  weightsPerUnit: z.string().default("1"),
  batchExpiryDetails: z.string().default("Not Required"),
  
  // Item Properties
  decimalPoint: z.string().default("0"),
  imageAlignment: z.string().optional(),
  productType: z.string().default("NA"),
  
  // Pricing
  sellBy: z.string().default("None"),
  itemPerUnit: z.string().default("1"),
  maintainSellingMrpBy: z.string().default("Multiple Selling Price & Multiple MRP"),
  batchSelection: z.string().default("Not Applicable"),
  isWeighable: z.boolean().default(false),
  
  // Reorder Configurations
  skuType: z.string().default("Put Away"),
  indentType: z.string().default("Manual"),
  
  // Purchase Order
  gateKeeperMargin: z.string().optional(),
  
  // Approval Configurations
  allowItemFree: z.boolean().default(false),
  
  // Mobile App Configurations
  dailyAuditProcess: z.boolean().default(false),
  
  // Other Information
  itemIngredients: z.string().optional(),
  
  // Basic fields
  price: z.string().min(1, "Price is required"),
  mrp: z.string().min(1, "MRP is required"),
  cost: z.string().optional(),
  weight: z.string().optional(),
  weightUnit: z.string().default("kg"),
  categoryId: z.number(),
  stockQuantity: z.string().min(0, "Stock quantity is required"),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function AddItemProfessional() {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState("item-information");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      itemCode: "",
      itemName: "",
      manufacturerName: "",
      supplierName: "",
      alias: "",
      aboutProduct: "",
      itemProductType: "Standard",
      department: "",
      mainCategory: "",
      subCategory: "",
      brand: "",
      buyer: "",
      hsnCode: "",
      gstCode: "GST 12%",
      purchaseGstCalculatedOn: "MRP",
      gstUom: "PIECES",
      purchaseAbatement: "",
      configItemWithCommodity: false,
      seniorExemptApplicable: false,
      eanCodeRequired: false,
      weightsPerUnit: "1",
      batchExpiryDetails: "Not Required",
      decimalPoint: "0",
      imageAlignment: "",
      productType: "NA",
      sellBy: "None",
      itemPerUnit: "1",
      maintainSellingMrpBy: "Multiple Selling Price & Multiple MRP",
      batchSelection: "Not Applicable",
      isWeighable: false,
      skuType: "Put Away",
      indentType: "Manual",
      gateKeeperMargin: "",
      allowItemFree: false,
      dailyAuditProcess: false,
      itemIngredients: "",
      price: "",
      mrp: "",
      cost: "",
      weight: "",
      weightUnit: "kg",
      categoryId: categories[0]?.id || 1,
      stockQuantity: "0",
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
        weight: data.weight ? parseFloat(data.weight) : null,
        weightUnit: data.weightUnit,
        stockQuantity: parseInt(data.stockQuantity),
        categoryId: data.categoryId,
        barcode: "", // Can be added later
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
    { id: "ean-code-barcode", label: "EAN Code/Barcode", icon: <BarChart3Icon className="w-4 h-4" /> },
    { id: "packing", label: "Packing", icon: <BoxIcon className="w-4 h-4" /> },
    { id: "item-properties", label: "Item Properties", icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "pricing", label: "Pricing", icon: <DollarSignIcon className="w-4 h-4" /> },
    { id: "reorder-configurations", label: "Reorder Configurations", icon: <PackageIcon className="w-4 h-4" /> },
    { id: "purchase-order", label: "Purchase Order", icon: <ShoppingCartIcon className="w-4 h-4" /> },
    { id: "approval-configurations", label: "Approval Configurations", icon: <CheckIcon className="w-4 h-4" /> },
    { id: "mobile-app-config", label: "Mobile App Config", icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "other-information", label: "Other Information", icon: <InfoIcon className="w-4 h-4" /> },
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
            <Button variant="outline" size="sm">
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
                {sidebarSections.map((section) => (
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
                    {section.id === "item-information" && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>
                    )}
                  </button>
                ))}
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
                                <Input {...field} placeholder="23222" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div></div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="itemName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="BUCKET 4" />
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
                              <FormLabel>Manufacturer Name *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manufacturer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manufacturer1">Manufacturer 1</SelectItem>
                                    <SelectItem value="manufacturer2">Manufacturer 2</SelectItem>
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
                              <FormLabel>Supplier Name *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="supplier1">Supplier 1</SelectItem>
                                    <SelectItem value="supplier2">Supplier 2</SelectItem>
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
                          name="alias"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alias</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Enter alias" rows={3} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                      </div>
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
                        name="itemProductType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Product Type</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="Bundle">Bundle</SelectItem>
                                  <SelectItem value="Service">Service</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="border-t pt-4">
                        <h3 className="text-blue-600 font-medium mb-4">Category</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>DEPARTMENT *</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="electronics">Electronics</SelectItem>
                                      <SelectItem value="clothing">Clothing</SelectItem>
                                      <SelectItem value="home">Home & Garden</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="mainCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MAIN CATEGORY</FormLabel>
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
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <FormField
                            control={form.control}
                            name="subCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SUB CATEGORY</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select sub category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="subcategory1">Sub Category 1</SelectItem>
                                      <SelectItem value="subcategory2">Sub Category 2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="brand"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>BRAND</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="brand1">Brand 1</SelectItem>
                                      <SelectItem value="brand2">Brand 2</SelectItem>
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
                          name="buyer"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>BUYER *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select buyer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="buyer1">Buyer 1</SelectItem>
                                    <SelectItem value="buyer2">Buyer 2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="640199002 (GST 12%)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="640199002">640199002 (GST 12%)</SelectItem>
                                    <SelectItem value="640199003">640199003 (GST 18%)</SelectItem>
                                  </SelectContent>
                                </Select>
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
                              <FormLabel>GST Code *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
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
                      
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="purchaseGstCalculatedOn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase GST Calculated On</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MRP">MRP</SelectItem>
                                    <SelectItem value="Cost">Cost</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="purchaseAbatement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase Abatement % *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="gstUom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST UOM</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PIECES">PIECES</SelectItem>
                                  <SelectItem value="KG">KG</SelectItem>
                                  <SelectItem value="LITRE">LITRE</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-center justify-between">
                        <FormField
                          control={form.control}
                          name="configItemWithCommodity"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Config Item With Commodity</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <FormField
                          control={form.control}
                          name="seniorExemptApplicable"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Senior Exempt Applicable</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                          name="sellBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sell By</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Weight">Weight</SelectItem>
                                    <SelectItem value="Unit">Unit</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="itemPerUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Per Unit *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="maintainSellingMrpBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintain Selling & M.R.P By *</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Multiple Selling Price & Multiple MRP">Multiple Selling Price & Multiple MRP</SelectItem>
                                  <SelectItem value="Single Selling Price & Single MRP">Single Selling Price & Single MRP</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="batchSelection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batch Selection</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                    <SelectItem value="FIFO">FIFO</SelectItem>
                                    <SelectItem value="LIFO">LIFO</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center space-x-3">
                          <FormField
                            control={form.control}
                            name="isWeighable"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-3">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel>Is Weighable</FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-green-800">Price & Weight Information</h3>
                        
                        <div className="grid grid-cols-3 gap-6">
                          <FormField
                            control={form.control}
                            name="mrp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>MRP (₹) *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="1" placeholder="₹ 0" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selling Price (₹) *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="1" placeholder="₹ 0" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cost Price (₹)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="1" placeholder="₹ 0" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <FormField
                            control={form.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.001" placeholder="0.000" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="weightUnit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight Unit</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                      <SelectItem value="g">Gram (g)</SelectItem>
                                      <SelectItem value="mg">Milligram (mg)</SelectItem>
                                      <SelectItem value="l">Litre (l)</SelectItem>
                                      <SelectItem value="ml">Millilitre (ml)</SelectItem>
                                      <SelectItem value="piece">Piece</SelectItem>
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
                          name="stockQuantity"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Stock Quantity</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* EAN Code/Barcode Section */}
                {currentSection === "ean-code-barcode" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3Icon className="w-5 h-5" />
                        EAN Code/Barcode Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <FormField
                          control={form.control}
                          name="eanCodeRequired"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>EAN Code Required</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Barcode Configuration</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Configure barcode settings for this product. This will help in quick scanning and inventory management.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Barcode Type</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select barcode type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ean13">EAN-13</SelectItem>
                                <SelectItem value="ean8">EAN-8</SelectItem>
                                <SelectItem value="code128">Code 128</SelectItem>
                                <SelectItem value="code39">Code 39</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Auto Generate</label>
                            <Button variant="outline" className="w-full">
                              Generate Barcode
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Packing Section */}
                {currentSection === "packing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BoxIcon className="w-5 h-5" />
                        Packing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="weightsPerUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weights Per Unit</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="1" />
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
                                    <SelectValue />
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
                      
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Packaging Information</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium">Package Type</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="box">Box</SelectItem>
                                <SelectItem value="bottle">Bottle</SelectItem>
                                <SelectItem value="packet">Packet</SelectItem>
                                <SelectItem value="bag">Bag</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Units per Package</label>
                            <Input placeholder="1" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Package Weight</label>
                            <Input placeholder="0.000 kg" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Item Properties Section */}
                {currentSection === "item-properties" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        Item Properties
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="decimalPoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Decimal Point</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0 (No decimals)</SelectItem>
                                    <SelectItem value="1">1 decimal place</SelectItem>
                                    <SelectItem value="2">2 decimal places</SelectItem>
                                    <SelectItem value="3">3 decimal places</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="imageAlignment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image Alignment</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select alignment" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
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
                        name="productType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Type *</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NA">N/A</SelectItem>
                                  <SelectItem value="FMCG">FMCG</SelectItem>
                                  <SelectItem value="Electronics">Electronics</SelectItem>
                                  <SelectItem value="Clothing">Clothing</SelectItem>
                                  <SelectItem value="Food">Food & Beverages</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Additional Properties</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Perishable Item</span>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Temperature Controlled</span>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Fragile Item</span>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Track Serial Numbers</span>
                            <Switch />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reorder Configurations Section */}
                {currentSection === "reorder-configurations" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PackageIcon className="w-5 h-5" />
                        Reorder Configurations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="skuType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU Type</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Put Away">Put Away</SelectItem>
                                    <SelectItem value="Fast Moving">Fast Moving</SelectItem>
                                    <SelectItem value="Slow Moving">Slow Moving</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="indentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Indent Type</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Manual">Manual</SelectItem>
                                    <SelectItem value="Automatic">Automatic</SelectItem>
                                    <SelectItem value="Semi-Automatic">Semi-Automatic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Reorder Parameters</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium">Minimum Stock Level</label>
                            <Input placeholder="10" type="number" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Reorder Point</label>
                            <Input placeholder="20" type="number" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Economic Order Quantity</label>
                            <Input placeholder="100" type="number" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Purchase Order Section */}
                {currentSection === "purchase-order" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCartIcon className="w-5 h-5" />
                        Purchase Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="gateKeeperMargin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gate Keeper Margin %</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="0" type="number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Purchase Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Default Supplier</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supplier1">Supplier 1</SelectItem>
                                <SelectItem value="supplier2">Supplier 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Lead Time (Days)</label>
                            <Input placeholder="7" type="number" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Other Information Section */}
                {currentSection === "other-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        Other Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="itemIngredients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Ingredients</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Enter item ingredients if applicable" rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Additional Notes</h3>
                        <Textarea placeholder="Any additional notes or special instructions for this product..." rows={3} />
                      </div>
                      
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Compliance Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">FDA Approved</span>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">BIS Certified</span>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Organic Certified</span>
                            <Switch />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button type="button" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit" disabled={createProductMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
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