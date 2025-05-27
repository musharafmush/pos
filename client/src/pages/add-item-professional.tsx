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
import { PackingSectionBadge } from "@/components/ui/packing-section-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Supplier } from "@shared/schema";

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
  
  // GST Breakdown
  cgstRate: z.string().optional(),
  sgstRate: z.string().optional(),
  igstRate: z.string().optional(),
  cessRate: z.string().optional(),
  taxCalculationMethod: z.string().optional(),
  
  // EAN Code/Barcode
  eanCodeRequired: z.boolean().default(false),
  
  // Weight & Packing (Enhanced for Bulk Items)
  weightsPerUnit: z.string().default("1"),
  bulkWeight: z.string().optional(),
  bulkWeightUnit: z.string().default("kg"),
  packingType: z.string().default("Bulk"),
  unitsPerPack: z.string().default("1"),
  batchExpiryDetails: z.string().default("Not Required"),
  itemPreparationsStatus: z.string().default("Trade As Is"),
  grindingCharge: z.string().optional(),
  weightInGms: z.string().optional(),
  bulkItemName: z.string().optional(),
  
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
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState("item-information");

  // Generate default item code
  const generateItemCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ITM${timestamp}${randomNum}`;
  };

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch suppliers
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
      itemPreparationsStatus: "Trade As Is",
      grindingCharge: "",
      weightInGms: "",
      bulkItemName: "",
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
                      {section.id === "item-information" && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>
                      )}
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
                              <FormLabel>Supplier Name *</FormLabel>
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
                                <div className="space-y-2">
                                  <Input 
                                    value={field.value || ""}
                                    placeholder="Enter HSN Code manually (e.g., 10019000)" 
                                    onChange={(e) => {
                                      const hsnValue = e.target.value;
                                      field.onChange(hsnValue);
                                      
                                      // Auto-suggest GST code based on HSN
                                      let suggestedGst = "";
                                      if (hsnValue.startsWith("04") || hsnValue.startsWith("07") || hsnValue.startsWith("08")) {
                                        suggestedGst = "GST 0%";
                                      } else if (hsnValue.startsWith("10") || hsnValue.startsWith("15") || hsnValue.startsWith("17") || hsnValue.startsWith("21") || hsnValue.startsWith("30") || hsnValue.startsWith("49") || hsnValue.startsWith("63")) {
                                        suggestedGst = "GST 5%";
                                      } else if (hsnValue.startsWith("62") || hsnValue.startsWith("85171") || hsnValue.startsWith("48") || hsnValue.startsWith("87120") || hsnValue.startsWith("90")) {
                                        suggestedGst = "GST 12%";
                                      } else if (hsnValue.startsWith("33") || hsnValue.startsWith("34") || hsnValue.startsWith("64") || hsnValue.startsWith("84") || hsnValue.startsWith("85") || hsnValue.startsWith("96") || hsnValue.startsWith("19") || hsnValue.startsWith("30059")) {
                                        suggestedGst = "GST 18%";
                                      } else if (hsnValue.startsWith("22") || hsnValue.startsWith("24") || hsnValue.startsWith("87032") || hsnValue.startsWith("87111")) {
                                        suggestedGst = "GST 28%";
                                      }
                                      
                                      if (suggestedGst && hsnValue.length >= 4) {
                                        form.setValue("gstCode", suggestedGst);
                                        
                                        // Auto-calculate GST breakdown for intra-state transactions
                                        const gstRate = parseFloat(suggestedGst.replace("GST ", "").replace("%", ""));
                                        if (gstRate > 0) {
                                          const cgstSgstRate = (gstRate / 2).toString();
                                          form.setValue("cgstRate", cgstSgstRate);
                                          form.setValue("sgstRate", cgstSgstRate);
                                          form.setValue("igstRate", "0");
                                        } else {
                                          form.setValue("cgstRate", "0");
                                          form.setValue("sgstRate", "0");
                                          form.setValue("igstRate", "0");
                                        }
                                      }
                                    }}
                                  />
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Or select from common HSN codes" />
                                    </SelectTrigger>
                                  <SelectContent className="max-h-80 overflow-y-auto">
                                    {/* Food & Beverages - 0% & 5% GST */}
                                    <SelectItem value="10019000">10019000 - Rice (5%)</SelectItem>
                                    <SelectItem value="15179010">15179010 - Edible Oil (5%)</SelectItem>
                                    <SelectItem value="17019900">17019900 - Sugar (5%)</SelectItem>
                                    <SelectItem value="04070010">04070010 - Eggs (0%)</SelectItem>
                                    <SelectItem value="07010000">07010000 - Fresh Vegetables (0%)</SelectItem>
                                    <SelectItem value="08010000">08010000 - Fresh Fruits (0%)</SelectItem>
                                    <SelectItem value="19059090">19059090 - Biscuits (18%)</SelectItem>
                                    <SelectItem value="21069099">21069099 - Spices & Condiments (5%)</SelectItem>
                                    
                                    {/* Textiles & Clothing - 5% & 12% GST */}
                                    <SelectItem value="62019000">62019000 - Men's Garments (12%)</SelectItem>
                                    <SelectItem value="62029000">62029000 - Women's Garments (12%)</SelectItem>
                                    <SelectItem value="63010000">63010000 - Bed Sheets (5%)</SelectItem>
                                    <SelectItem value="64029100">64029100 - Footwear (18%)</SelectItem>
                                    
                                    {/* Electronics - 12% & 18% GST */}
                                    <SelectItem value="85171200">85171200 - Mobile Phones (12%)</SelectItem>
                                    <SelectItem value="84713000">84713000 - Laptops (18%)</SelectItem>
                                    <SelectItem value="85285200">85285200 - LED TV (18%)</SelectItem>
                                    <SelectItem value="85287100">85287100 - Set Top Box (18%)</SelectItem>
                                    <SelectItem value="85044090">85044090 - Mobile Charger (18%)</SelectItem>
                                    
                                    {/* Personal Care - 18% GST */}
                                    <SelectItem value="33061000">33061000 - Toothpaste (18%)</SelectItem>
                                    <SelectItem value="34012000">34012000 - Soap (18%)</SelectItem>
                                    <SelectItem value="33051000">33051000 - Shampoo (18%)</SelectItem>
                                    <SelectItem value="96031000">96031000 - Toothbrush (18%)</SelectItem>
                                    
                                    {/* Beverages & Luxury - 28% GST */}
                                    <SelectItem value="22021000">22021000 - Soft Drinks (28%)</SelectItem>
                                    <SelectItem value="24021000">24021000 - Cigarettes (28%)</SelectItem>
                                    <SelectItem value="22030000">22030000 - Beer (28%)</SelectItem>
                                    <SelectItem value="22084000">22084000 - Wine (28%)</SelectItem>
                                    
                                    {/* Automobiles - 28% GST */}
                                    <SelectItem value="87032390">87032390 - Passenger Cars (28%)</SelectItem>
                                    <SelectItem value="87111000">87111000 - Motorcycles (28%)</SelectItem>
                                    <SelectItem value="87120000">87120000 - Bicycles (12%)</SelectItem>
                                    
                                    {/* Medicines & Healthcare - 5% & 12% GST */}
                                    <SelectItem value="30049099">30049099 - Medicines (5%)</SelectItem>
                                    <SelectItem value="90183900">90183900 - Medical Equipment (12%)</SelectItem>
                                    <SelectItem value="30059090">30059090 - Health Supplements (18%)</SelectItem>
                                    
                                    {/* Books & Stationery - 5% & 12% GST */}
                                    <SelectItem value="49019900">49019900 - Books (5%)</SelectItem>
                                    <SelectItem value="48201000">48201000 - Notebooks (12%)</SelectItem>
                                    <SelectItem value="96085000">96085000 - Pens (18%)</SelectItem>
                                  </SelectContent>
                                </Select>
                                </div>
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
                              <FormLabel className="flex items-center gap-2">
                                GST Code *
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  Auto-updated from HSN
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="GST 5% - Essential goods (Food grains, medicines)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="GST 0%">GST 0% - Nil Rate (Basic necessities)</SelectItem>
                                    <SelectItem value="GST 5%">GST 5% - Essential goods (Food grains, medicines)</SelectItem>
                                    <SelectItem value="GST 12%">GST 12% - Standard rate (Textiles, electronics)</SelectItem>
                                    <SelectItem value="GST 18%">GST 18% - Standard rate (Most goods & services)</SelectItem>
                                    <SelectItem value="GST 28%">GST 28% - Luxury goods (Cars, cigarettes)</SelectItem>
                                    <SelectItem value="EXEMPT">EXEMPT - Tax exempted items</SelectItem>
                                    <SelectItem value="ZERO RATED">ZERO RATED - Export goods</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* GST Breakdown Section */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">GST Breakdown & Compliance</h4>
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
                        
                        <div className="grid grid-cols-2 gap-6 mt-4">
                          <FormField
                            control={form.control}
                            name="taxCalculationMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax Calculation Method</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                                      <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cessRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cess Rate (%) - Optional</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
                        
                        {/* Enhanced Weight & Packing for Bulk Items */}
                        <div className="bg-blue-50 p-4 rounded-lg mt-6">
                          <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <PackageIcon className="w-4 h-4" />
                            Weight & Packing (Bulk Items)
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="weight"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Weight (for 25kg = 25000)</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="1" placeholder="25000" />
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
                                        <SelectItem value="g">Gram (g)</SelectItem>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
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
                            <FormField
                              control={form.control}
                              name="stockQuantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Stock Quantity (bags/units)</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="1" placeholder="5" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name="packingType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Packing Type</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Bulk">Bulk</SelectItem>
                                        <SelectItem value="Retail">Retail</SelectItem>
                                        <SelectItem value="Wholesale">Wholesale</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="unitsPerPack"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Units Per Pack</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="1" placeholder="1" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
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
                      
                      {/* Manual Barcode Entry */}
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manual Barcode Entry</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <Input 
                                  {...field} 
                                  placeholder="Enter barcode manually (e.g., 1234567890123)" 
                                  className="font-mono"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Generate random 13-digit EAN code
                                      const randomEAN = '2' + Math.random().toString().slice(2, 14);
                                      field.onChange(randomEAN);
                                    }}
                                  >
                                    Generate EAN-13
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Generate random 12-digit UPC code
                                      const randomUPC = Math.random().toString().slice(2, 14);
                                      field.onChange(randomUPC);
                                    }}
                                  >
                                    Generate UPC
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => field.onChange("")}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Barcode Configuration</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Configure barcode settings for this product. This will help in quick scanning and inventory management.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="barcodeType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Barcode Type</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select barcode type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ean13">EAN-13 (European)</SelectItem>
                                      <SelectItem value="ean8">EAN-8 (Short)</SelectItem>
                                      <SelectItem value="upc">UPC (Universal)</SelectItem>
                                      <SelectItem value="code128">Code 128</SelectItem>
                                      <SelectItem value="code39">Code 39</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Barcode Preview</label>
                            <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[40px] flex items-center">
                              {form.watch("barcode") ? (
                                <div className="font-mono text-sm">
                                  {form.watch("barcode")}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No barcode entered</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Packing Section */}
                {currentSection === "packing" && (
                  <Card>
                    <CardHeader className="bg-blue-50 border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BoxIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        Packing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
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
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue("itemPreparationsStatus", value);
                                    
                                    // Clear conditional fields when status changes
                                    if (value !== "Bulk" && value !== "Repackage" && value !== "Open Item" && value !== "Weight to Piece") {
                                      form.setValue("grindingCharge", "");
                                    }
                                    if (value !== "Repackage" && value !== "Assembly" && value !== "Kit" && value !== "Combo Pack") {
                                      form.setValue("bulkItemName", "");
                                    }
                                    if (value !== "Open Item" && value !== "Weight to Piece" && value !== "Bulk") {
                                      form.setValue("weightInGms", "");
                                    }
                                  }} 
                                  value={field.value || "Trade As Is"}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Trade As Is" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-80 overflow-y-auto">
                                    <SelectItem value="Trade As Is">
                                      <div className="flex flex-col">
                                        <span>Trade As Is</span>
                                        <span className="text-xs text-gray-500">Sold exactly as received, no modification</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Create">Create</SelectItem>
                                    <SelectItem value="Bulk">
                                      <div className="flex flex-col">
                                        <span>Bulk</span>
                                        <span className="text-xs text-gray-500">Stored and sold in bulk quantities</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Repackage">
                                      <div className="flex flex-col">
                                        <span>Repackage</span>
                                        <span className="text-xs text-gray-500">Bought in bulk, repackaged into smaller units</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Standard Preparation">
                                      <div className="flex flex-col">
                                        <span>Standard Preparation</span>
                                        <span className="text-xs text-gray-500">Processed in a specific, consistent way</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Customer Prepared">
                                      <div className="flex flex-col">
                                        <span>Customer Prepared</span>
                                        <span className="text-xs text-gray-500">Prepped based on customer instructions</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Parent">Parent</SelectItem>
                                    <SelectItem value="Child">Child</SelectItem>
                                    <SelectItem value="Assembly">
                                      <div className="flex flex-col">
                                        <span>Assembly</span>
                                        <span className="text-xs text-gray-500">Assembled from multiple products</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Kit">
                                      <div className="flex flex-col">
                                        <span>Kit</span>
                                        <span className="text-xs text-gray-500">Grouped items or meal kits</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Ingredients">
                                      <div className="flex flex-col">
                                        <span>Ingredients</span>
                                        <span className="text-xs text-gray-500">Non-sellable items for preparation</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Packing Material">
                                      <div className="flex flex-col">
                                        <span>Packing Material</span>
                                        <span className="text-xs text-gray-500">Items used for packaging</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Combo Pack">
                                      <div className="flex flex-col">
                                        <span>Combo Pack</span>
                                        <span className="text-xs text-gray-500">Multiple items sold together</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Open Item">
                                      <div className="flex flex-col">
                                        <span>Open Item</span>
                                        <span className="text-xs text-gray-500">Sold without barcodes or fixed quantities</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Weight to Piece">
                                      <div className="flex flex-col">
                                        <span>Weight to Piece</span>
                                        <span className="text-xs text-gray-500">Converts weight-based to pieces</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Conditional Grinding Charge Field */}
                        {(form.watch("itemPreparationsStatus") === "Bulk" || 
                          form.watch("itemPreparationsStatus") === "Repackage" ||
                          form.watch("itemPreparationsStatus") === "Open Item" ||
                          form.watch("itemPreparationsStatus") === "Weight to Piece") && (
                          <FormField
                            control={form.control}
                            name="grindingCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-red-600">Grinding Charge *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="0.00" 
                                    type="number" 
                                    step="0.01"
                                    className="border-red-300 focus:border-red-500"
                                  />
                                </FormControl>
                                <div className="text-xs text-red-500 mt-1">Grinding Charge is required for {form.watch("itemPreparationsStatus")}</div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {/* Show empty div when grinding charge is not needed to maintain grid layout */}
                        {!(form.watch("itemPreparationsStatus") === "Bulk" || 
                          form.watch("itemPreparationsStatus") === "Repackage" ||
                          form.watch("itemPreparationsStatus") === "Open Item" ||
                          form.watch("itemPreparationsStatus") === "Weight to Piece") && (
                          <div></div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Conditional Weight in Gms Field */}
                        {(form.watch("itemPreparationsStatus") === "Open Item" || 
                          form.watch("itemPreparationsStatus") === "Weight to Piece" ||
                          form.watch("itemPreparationsStatus") === "Bulk") && (
                          <FormField
                            control={form.control}
                            name="weightInGms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-red-600">Weight in (Gms) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Weight(gms) is required" 
                                    type="number" 
                                    step="0.001"
                                    className="border-red-300 focus:border-red-500" 
                                  />
                                </FormControl>
                                <div className="text-xs text-red-500 mt-1">Weight(gms) is required for {form.watch("itemPreparationsStatus")}</div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
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

                      {/* Conditional Bulk Item Name Field - Only for Repackage */}
                      {form.watch("itemPreparationsStatus") === "Repackage" && (
                        <FormField
                          control={form.control}
                          name="bulkItemName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-red-600">Bulk Item Name *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="border-red-300 focus:border-red-500">
                                    <SelectValue placeholder="Select bulk item to repackage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="100G">100G</SelectItem>
                                    <SelectItem value="AJINOMOTO BULK">AJINOMOTO BULK</SelectItem>
                                    <SelectItem value="ARUVADAM KURUVAI RICE BULK">ARUVADAM KURUVAI RICE BULK</SelectItem>
                                    <SelectItem value="AVARE BULK">AVARE BULK</SelectItem>
                                    <SelectItem value="AVUL NICE BULK">AVUL NICE BULK</SelectItem>
                                    <SelectItem value="AVUL ODD BULK">AVUL ODD BULK</SelectItem>
                                    <SelectItem value="rice-25kg">Rice - 25kg Bag</SelectItem>
                                    <SelectItem value="wheat-50kg">Wheat - 50kg Bag</SelectItem>
                                    <SelectItem value="dal-25kg">Dal - 25kg Bag</SelectItem>
                                    <SelectItem value="sugar-50kg">Sugar - 50kg Bag</SelectItem>
                                    <SelectItem value="oil-15ltr">Oil - 15 Ltr Container</SelectItem>
                                    <SelectItem value="flour-25kg">Flour - 25kg Bag</SelectItem>
                                    <SelectItem value="spices-10kg">Spices - 10kg Container</SelectItem>
                                    <SelectItem value="dry-fruits-5kg">Dry Fruits - 5kg Box</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <div className="text-xs text-red-500 mt-1">
                                Bulk Item Name is required for repackaging
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Status-specific Information Badge */}
                      {form.watch("itemPreparationsStatus") && form.watch("itemPreparationsStatus") !== "Trade As Is" && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                          <div className="flex items-start">
                            <InfoIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-blue-900">
                                {form.watch("itemPreparationsStatus")} Requirements
                              </h4>
                              <p className="text-sm text-blue-700 mt-1">
                                {form.watch("itemPreparationsStatus") === "Bulk" && 
                                  "This item is stored and sold in bulk quantities. Weight and grinding charge fields are required."}
                                {form.watch("itemPreparationsStatus") === "Repackage" && 
                                  "This item is bought in bulk and repackaged into smaller units. Select the bulk item source and specify repackaging details."}
                                {form.watch("itemPreparationsStatus") === "Open Item" && 
                                  "This item is sold without barcodes or fixed quantities (e.g., fresh vegetables). Weight information is required."}
                                {form.watch("itemPreparationsStatus") === "Weight to Piece" && 
                                  "This item converts weight-based inventory to pieces for easier sale. Both weight and grinding charge are required."}
                                {form.watch("itemPreparationsStatus") === "Standard Preparation" && 
                                  "This item is processed in a specific, consistent way according to standard operating procedures."}
                                {form.watch("itemPreparationsStatus") === "Customer Prepared" && 
                                  "This item is prepared based on specific customer instructions and requirements."}
                                {form.watch("itemPreparationsStatus") === "Create" && 
                                  "This item will be created or manufactured as needed."}
                                {(form.watch("itemPreparationsStatus") === "Ingredients" || 
                                  form.watch("itemPreparationsStatus") === "Packing Material") && 
                                  "This is a non-sellable item used for preparation or packaging of other products."}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3">Additional Packaging Information</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="packageType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Package Type</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="box">Box</SelectItem>
                                      <SelectItem value="bottle">Bottle</SelectItem>
                                      <SelectItem value="packet">Packet</SelectItem>
                                      <SelectItem value="bag">Bag</SelectItem>
                                      <SelectItem value="jar">Jar</SelectItem>
                                      <SelectItem value="can">Can</SelectItem>
                                      <SelectItem value="pouch">Pouch</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="unitsPerPackage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Units per Package</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="1" type="number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="packageWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Package Weight</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="0.000 kg" type="number" step="0.001" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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