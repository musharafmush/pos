import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, RotateCcw } from "lucide-react";

// Form schema
const productFormSchema = z.object({
  // Item Information
  itemCode: z.string().min(1, "Item code is required"),
  itemName: z.string().min(1, "Item name is required"),
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
  purchaseGstCalculatedOn: z.string().default("Purchase Rate"),
  gstUom: z.string().optional(),
  purchaseAbatementPercent: z.string().optional(),
  configItemWithCommodity: z.boolean().default(false),
  seniorExemptApplicable: z.boolean().default(false),
  
  // EAN Code/Barcode
  eanCodeRequired: z.boolean().default(false),
  
  // Packing
  weightsPerUnit: z.string().default("1"),
  batchExpiryDateDetails: z.string().default("Not Required"),
  itemPreparationsStatus: z.string().default("Trade As Is"),
  
  // Item Properties
  decimalPoint: z.string().default("0"),
  imageAlignment: z.string().optional(),
  productType: z.string().default("NA"),
  
  // Pricing
  sellBy: z.string().default("None"),
  itemPerUnit: z.string().optional(),
  maintainSellingMrpBy: z.string().default("Multiple Selling Price & Multiple..."),
  batchSelection: z.string().default("Not Applicable"),
  isWeighable: z.boolean().default(false),
  
  // Reorder Configurations
  skuType: z.string().default("Put Away"),
  indentType: z.string().default("Manual"),
  
  // Purchase Order
  gateKeeperMarginPercent: z.string().optional(),
  
  // Approval Configurations
  allowItemFree: z.boolean().default(false),
  
  // Mobile App Configurations
  dailyAuditProcessTrack: z.boolean().default(false),
  
  // Other Information
  itemIngredients: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const navigationSections = [
  { id: "item-info", label: "Item Information", active: true },
  { id: "category-info", label: "Category Information", active: false },
  { id: "tax-info", label: "Tax Information", active: false },
  { id: "ean-barcode", label: "EAN Code/Barcode", active: false },
  { id: "packing", label: "Packing", active: false },
  { id: "item-properties", label: "Item Properties", active: false },
  { id: "pricing", label: "Pricing", active: false },
  { id: "reorder-config", label: "Reorder Configurations", active: false },
  { id: "purchase-order", label: "Purchase Order", active: false },
  { id: "approval-config", label: "Approval Configurations", active: false },
  { id: "mobile-config", label: "Mobile App Config", active: false },
  { id: "other-info", label: "Other Information", active: false },
];

export default function AddProduct() {
  const [activeSection, setActiveSection] = useState("item-info");
  const [isGeneralInfo, setIsGeneralInfo] = useState(true);
  const { toast } = useToast();

  // Fetch categories for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    }
  });

  // Fetch suppliers for dropdowns
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return await res.json();
    }
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
      gstCode: "",
      purchaseGstCalculatedOn: "Purchase Rate",
      gstUom: "",
      purchaseAbatementPercent: "",
      configItemWithCommodity: false,
      seniorExemptApplicable: false,
      eanCodeRequired: false,
      weightsPerUnit: "1",
      batchExpiryDateDetails: "Not Required",
      itemPreparationsStatus: "Trade As Is",
      decimalPoint: "0",
      imageAlignment: "",
      productType: "NA",
      sellBy: "None",
      itemPerUnit: "",
      maintainSellingMrpBy: "Multiple Selling Price & Multiple...",
      batchSelection: "Not Applicable",
      isWeighable: false,
      skuType: "Put Away",
      indentType: "Manual",
      gateKeeperMarginPercent: "",
      allowItemFree: false,
      dailyAuditProcessTrack: false,
      itemIngredients: "",
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const productData = {
        name: data.itemName,
        description: data.aboutProduct || "",
        sku: data.itemCode,
        price: "0.00", // Will be set in pricing section
        cost: "0.00",
        categoryId: 1, // Default category
        stockQuantity: 0,
        alertThreshold: 10,
        barcode: "",
        active: true,
      };
      
      const res = await apiRequest("POST", "/api/products", productData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product created",
        description: "Product has been created successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating product",
        description: error.message || "There was an error creating the product.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    createProductMutation.mutate(data);
  };

  const handleReset = () => {
    form.reset();
  };

  const renderSection = () => {
    switch (activeSection) {
      case "item-info":
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Item Information</h2>
              
              <div className="grid grid-cols-2 gap-8 mb-6">
                <FormField
                  control={form.control}
                  name="itemCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                        Item Code <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="23222" 
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                        Item Name <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="BUCKET 4" 
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <FormField
                  control={form.control}
                  name="manufacturerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                        Manufacturer Name <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Select manufacturer" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier: any) => (
                                <SelectItem key={supplier.id} value={supplier.name}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                        Supplier Name <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier: any) => (
                                <SelectItem key={supplier.id} value={supplier.name}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Alias</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter alias..." 
                          className="mt-1 min-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
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
                      <FormLabel className="text-sm font-medium text-gray-700">About Product</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter product description..." 
                          className="mt-1 min-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case "category-info":
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Category Information</h2>
              
              <div className="grid grid-cols-2 gap-8 mb-6">
                <FormField
                  control={form.control}
                  name="itemProductType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Item Product Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Standard" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Bundle">Bundle</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium text-blue-600 mb-6">Category</h3>
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          DEPARTMENT <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
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
                        <FormLabel className="text-sm font-medium text-gray-700">MAIN CATEGORY</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select main category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">SUB CATEGORY</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select sub category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="subcategory1">Sub Category 1</SelectItem>
                                <SelectItem value="subcategory2">Sub Category 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
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
                        <FormLabel className="text-sm font-medium text-gray-700">BRAND</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="brand1">Brand 1</SelectItem>
                                <SelectItem value="brand2">Brand 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="buyer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          BUYER <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select buyer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buyer1">Buyer 1</SelectItem>
                                <SelectItem value="buyer2">Buyer 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="button" size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700 px-3">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div />
                </div>
              </div>
            </div>
          </div>
        );

      case "tax-info":
        return (
          <div className="space-y-6">
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
                          <SelectValue placeholder="0403000 (GST 12%)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0403000">0403000 (GST 12%)</SelectItem>
                          <SelectItem value="0404000">0404000 (GST 18%)</SelectItem>
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
                    <FormLabel className="flex items-center">
                      GST Code <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="GST 12%" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gst12">GST 12%</SelectItem>
                          <SelectItem value="gst18">GST 18%</SelectItem>
                          <SelectItem value="gst5">GST 5%</SelectItem>
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
                          <SelectValue placeholder="MRP" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Purchase Rate">Purchase Rate</SelectItem>
                          <SelectItem value="MRP">MRP</SelectItem>
                          <SelectItem value="Selling Price">Selling Price</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseAbatementPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Abatement %</FormLabel>
                    <FormControl>
                      <Input placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gstUom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST UOM</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="PIECES" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PIECES">PIECES</SelectItem>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="LITER">LITER</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="configItemWithCommodity"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Config Item With Commodity</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="seniorExemptApplicable"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Senior Exempt Applicable</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "ean-barcode":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">EAN Code/Barcode Configuration</h3>
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="eanCodeRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>EAN Code Required</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "packing":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="weightsPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weights Per Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batchExpiryDateDetails"
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
                          <SelectItem value="Required">Required</SelectItem>
                          <SelectItem value="Optional">Optional</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Trade As Is" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trade As Is">Trade As Is</SelectItem>
                          <SelectItem value="Preparation Required">Preparation Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
            </div>
          </div>
        );

      case "item-properties":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="decimalPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimal Point</FormLabel>
                    <FormControl>
                      <Input placeholder="0" {...field} />
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

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Product Type <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="NA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NA">NA</SelectItem>
                          <SelectItem value="Type A">Type A</SelectItem>
                          <SelectItem value="Type B">Type B</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
            </div>
          </div>
        );

      case "pricing":
        return (
          <div className="space-y-6">
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
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Weight">Weight</SelectItem>
                          <SelectItem value="Quantity">Quantity</SelectItem>
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
                    <FormLabel className="flex items-center">
                      Item Per Unit <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="maintainSellingMrpBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Maintain Selling & M.R.P By <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Multiple Selling Price & Multiple..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Multiple Selling Price & Multiple...">
                            Multiple Selling Price & Multiple...
                          </SelectItem>
                          <SelectItem value="Single Selling Price">Single Selling Price</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batchSelection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Selection</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Not Applicable" />
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
            </div>

            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="isWeighable"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Is Weighable</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "reorder-config":
        return (
          <div className="space-y-6">
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
                          <SelectValue placeholder="Put Away" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Put Away">Put Away</SelectItem>
                          <SelectItem value="Cross Dock">Cross Dock</SelectItem>
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
                          <SelectValue placeholder="Manual" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manual">Manual</SelectItem>
                          <SelectItem value="Automatic">Automatic</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "purchase-order":
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="gateKeeperMarginPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gate Keeper Margin %</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter percentage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "approval-config":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="allowItemFree"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Allow Item Free</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "mobile-config":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="dailyAuditProcessTrack"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Daily Audit Process(track)</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "other-info":
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="itemIngredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Ingredients</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter item ingredients..." 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return <div>Select a section</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <h1 className="text-lg font-medium text-gray-800">Add Item</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="text-gray-600 border-gray-300 hover:bg-gray-50 text-sm px-4 py-1"
          >
            Close
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-300 min-h-screen">
          <div className="p-0">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-300">
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isGeneralInfo 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setIsGeneralInfo(true)}
              >
                General Information
              </button>
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  !isGeneralInfo 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setIsGeneralInfo(false)}
              >
                Outlet Specific
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="py-2">
              {navigationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium text-left transition-colors border-l-4 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-transparent'
                  }`}
                >
                  <span className={`mr-3 w-2 h-2 rounded-full ${
                    activeSection === section.id ? 'bg-blue-600' : 'bg-gray-400'
                  }`} />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {renderSection()}
              </form>
            </Form>
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="bg-gray-50 border-t border-gray-300 px-8 py-4">
            <div className="flex justify-start space-x-3">
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                disabled={createProductMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createProductMutation.isPending ? "Adding..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={createProductMutation.isPending}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}