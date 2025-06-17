import React, { useState, useEffect } from "react";
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
  XIcon,
  EditIcon,
  Loader2Icon,
  CalculatorIcon,
  RefreshCwIcon
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Supplier, Product } from "@shared/schema";

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
  barcode: z.string().optional(),

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
  repackageUnits: z.string().optional(),
  repackageType: z.string().optional(),
  packagingMaterial: z.string().optional(),

  // Item Properties
  decimalPoint: z.string().default("0"),
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
  showOnMobileDashboard: z.boolean().default(false),
  enableMobileNotifications: z.boolean().default(false),
  quickAddToCart: z.boolean().default(false),

  // Additional Properties
  perishableItem: z.boolean().default(false),
  temperatureControlled: z.boolean().default(false),
  fragileItem: z.boolean().default(false),
  trackSerialNumbers: z.boolean().default(false),

  // Compliance Information
  fdaApproved: z.boolean().default(false),
  bisCertified: z.boolean().default(false),
  organicCertified: z.boolean().default(false),

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

// HSN to GST mapping with enhanced data
const HSN_GST_MAPPING: Record<string, { gst: number; description: string; category: string }> = {
  // Food & Beverages - 0% & 5% GST
  "10019000": { gst: 5, description: "Rice", category: "Food Grains" },
  "15179010": { gst: 5, description: "Edible Oil", category: "Food" },
  "17019900": { gst: 5, description: "Sugar", category: "Food" },
  "04070010": { gst: 0, description: "Fresh Eggs", category: "Food" },
  "07010000": { gst: 0, description: "Fresh Vegetables", category: "Food" },
  "08010000": { gst: 0, description: "Fresh Fruits", category: "Food" },
  "21069099": { gst: 5, description: "Spices & Condiments", category: "Food" },

  // Processed Foods - 12% & 18% GST
  "19059090": { gst: 18, description: "Biscuits", category: "Processed Food" },
  "21039090": { gst: 12, description: "Sauces", category: "Processed Food" },
  "22021000": { gst: 28, description: "Soft Drinks", category: "Beverages" },

  // Textiles & Clothing - 5% & 12% GST
  "62019000": { gst: 12, description: "Men's Garments", category: "Textiles" },
  "62029000": { gst: 12, description: "Women's Garments", category: "Textiles" },
  "63010000": { gst: 5, description: "Bed Sheets", category: "Textiles" },
  "64029100": { gst: 18, description: "Footwear", category: "Footwear" },

  // Electronics - 12% & 18% GST
  "85171200": { gst: 12, description: "Mobile Phones", category: "Electronics" },
  "84713000": { gst: 18, description: "Laptops", category: "Electronics" },
  "85285200": { gst: 18, description: "LED TV", category: "Electronics" },
  "85044090": { gst: 18, description: "Mobile Charger", category: "Electronics" },

  // Personal Care - 18% GST
  "33061000": { gst: 18, description: "Toothpaste", category: "Personal Care" },
  "34012000": { gst: 18, description: "Soap", category: "Personal Care" },
  "33051000": { gst: 18, description: "Shampoo", category: "Personal Care" },
  "96031000": { gst: 18, description: "Toothbrush", category: "Personal Care" },

  // Healthcare - 5% & 12% GST
  "30049099": { gst: 5, description: "Medicines", category: "Healthcare" },
  "90183900": { gst: 12, description: "Medical Equipment", category: "Healthcare" },
  "30059090": { gst: 18, description: "Health Supplements", category: "Healthcare" },

  // Automobiles - 28% GST
  "87032390": { gst: 28, description: "Passenger Cars", category: "Automobiles" },
  "87111000": { gst: 28, description: "Motorcycles", category: "Automobiles" },
  "87120000": { gst: 12, description: "Bicycles", category: "Automobiles" },

  // Books & Stationery - 5% & 12% GST
  "49019900": { gst: 5, description: "Books", category: "Stationery" },
  "48201000": { gst: 12, description: "Notebooks", category: "Stationery" },
  "96085000": { gst: 18, description: "Pens", category: "Stationery" },
};

// Department to typical GST rates mapping
const DEPARTMENT_GST_DEFAULTS: Record<string, number> = {
  "FMCG": 18,
  "Grocery": 5,
  "Electronics": 18,
  "Clothing": 12,
  "Home & Garden": 18,
  "Health & Beauty": 18,
  "Sports & Fitness": 18,
  "Automotive": 28,
  "Books & Stationery": 12,
  "Toys & Games": 18,
};

export default function AddItemProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState("item-information");
  const [calculatedAlias, setCalculatedAlias] = useState("");
  const [totalGST, setTotalGST] = useState(0);
  const [isCalculatingGST, setIsCalculatingGST] = useState(false);

  // Extract edit ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;

  // Fetch product data if in edit mode
  const { data: editingProduct, isLoading: isLoadingProduct, error: productError } = useQuery({
    queryKey: ["/api/products", editId],
    queryFn: async () => {
      if (!editId) return null;
      console.log('Fetching product with ID:', editId);
      const response = await fetch(`/api/products/${editId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch product:', response.status, errorText);
        throw new Error(`Failed to fetch product: ${response.status}`);
      }
      const product = await response.json();
      console.log('Fetched product:', product);
      return product;
    },
    enabled: !!editId,
    retry: 1,
  });

  // Fetch categories with live data
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      console.log('🔄 Fetching categories from backend...');
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const categoriesData = await response.json();
      console.log('✅ Categories loaded:', categoriesData.length, 'categories');
      return categoriesData;
    },
  });

  // Fetch suppliers with live data binding
  const { data: suppliers = [], isLoading: isLoadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      console.log('🏭 Fetching suppliers from backend...');
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const suppliersData = await response.json();
      console.log('✅ Suppliers loaded:', suppliersData.length, 'suppliers');
      return suppliersData;
    },
  }) as { data: Supplier[], isLoading: boolean, refetch: () => void };

  // Fetch all products for reference
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Generate sequential item code
  const generateItemCode = () => {
    const existingProducts = allProducts || [];
    let maxNumber = 0;

    existingProducts.forEach((product: any) => {
      if (product.sku && product.sku.startsWith('ITM')) {
        const numberPart = product.sku.replace('ITM', '');
        const num = parseInt(numberPart);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(6, '0');
    return `ITM${nextNumber}`;
  };

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
      gstCode: "GST 18%",
      purchaseGstCalculatedOn: "MRP",
      gstUom: "PIECES",
      purchaseAbatement: "",
      configItemWithCommodity: false,
      seniorExemptApplicable: false,
      eanCodeRequired: false,
      barcode: "",
      weightsPerUnit: "1",
      batchExpiryDetails: "Not Required",
      itemPreparationsStatus: "Trade As Is",
      grindingCharge: "",
      weightInGms: "",
      bulkItemName: "",
      repackageUnits: "",
      repackageType: "",
      packagingMaterial: "",
      decimalPoint: "0",
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
      showOnMobileDashboard: false,
      enableMobileNotifications: false,
      quickAddToCart: false,
      perishableItem: false,
      temperatureControlled: false,
      fragileItem: false,
      trackSerialNumbers: false,
      fdaApproved: false,
      bisCertified: false,
      organicCertified: false,
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

  // Dynamic alias calculation
  const calculateAlias = (itemName: string, brand: string, department: string) => {
    if (!itemName) return "";

    const parts = [];
    if (brand && brand.trim()) parts.push(brand.trim().toUpperCase());
    if (department && department.trim()) parts.push(department.trim().toUpperCase().slice(0, 3));

    const nameWords = itemName.trim().split(' ').filter(word => word.length > 0);
    const nameAlias = nameWords.map(word => word.slice(0, 2).toUpperCase()).join('');
    parts.push(nameAlias);

    return parts.join('-');
  };

  // Dynamic GST calculation based on HSN code
  const calculateGSTFromHSN = (hsnCode: string) => {
    if (!hsnCode || hsnCode.length < 4) return null;

    setIsCalculatingGST(true);

    setTimeout(() => {
      const hsnMapping = HSN_GST_MAPPING[hsnCode];
      if (hsnMapping) {
        const gstRate = hsnMapping.gst;
        const gstCode = `GST ${gstRate}%`;

        // Update form with calculated GST
        form.setValue("gstCode", gstCode);

        // Calculate breakdown
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

        setTotalGST(gstRate);

        toast({
          title: "GST Auto-Calculated",
          description: `Applied ${gstRate}% GST for ${hsnMapping.description}`,
        });
      } else {
        // Try department-based fallback
        const department = form.getValues("department");
        const defaultRate = DEPARTMENT_GST_DEFAULTS[department] || 18;

        form.setValue("gstCode", `GST ${defaultRate}%`);
        const cgstSgstRate = (defaultRate / 2).toString();
        form.setValue("cgstRate", cgstSgstRate);
        form.setValue("sgstRate", cgstSgstRate);
        form.setValue("igstRate", "0");

        setTotalGST(defaultRate);

        toast({
          title: "Default GST Applied",
          description: `Applied ${defaultRate}% GST based on department`,
          variant: "default",
        });
      }

      setIsCalculatingGST(false);
    }, 500);
  };

  // Watch for changes to calculate alias dynamically
  useEffect(() => {
    const subscription = form.watch((value) => {
      const newAlias = calculateAlias(
        value.itemName || "",
        value.brand || "",
        value.department || ""
      );
      setCalculatedAlias(newAlias);

      if (newAlias !== value.alias) {
        form.setValue("alias", newAlias);
      }

      // Calculate total GST
      const cgst = parseFloat(value.cgstRate || "0");
      const sgst = parseFloat(value.sgstRate || "0");
      const igst = parseFloat(value.igstRate || "0");
      const cess = parseFloat(value.cessRate || "0");
      const total = cgst + sgst + igst + cess;
      setTotalGST(total);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Enhanced edit mode data loading with live backend sync
  useEffect(() => {
    if (isEditMode && editingProduct && !isLoadingProduct && categories.length > 0 && suppliers.length > 0) {
      console.log('🔄 Loading edit data with live backend sync:', editingProduct);

      // Enhanced GST calculation
      const cgstRate = parseFloat(editingProduct.cgstRate || '0');
      const sgstRate = parseFloat(editingProduct.sgstRate || '0');
      const igstRate = parseFloat(editingProduct.igstRate || '0');
      const totalGst = cgstRate + sgstRate + igstRate;

      // Dynamic GST code determination
      let gstCode = 'GST 18%';
      if (totalGst === 0) gstCode = 'GST 0%';
      else if (totalGst === 5) gstCode = 'GST 5%';
      else if (totalGst === 12) gstCode = 'GST 12%';
      else if (totalGst === 18) gstCode = 'GST 18%';
      else if (totalGst === 28) gstCode = 'GST 28%';
      else if (totalGst > 0) gstCode = `GST ${totalGst}%`;

      // Dynamic category resolution
      const category = categories.find((cat: any) => cat.id === editingProduct.categoryId);

      // Enhanced supplier resolution
      const matchedManufacturer = suppliers.find((sup: any) => 
        sup.name === editingProduct.manufacturerName || 
        sup.id === editingProduct.manufacturerId
      );
      const matchedSupplier = suppliers.find((sup: any) => 
        sup.name === editingProduct.supplierName || 
        sup.id === editingProduct.supplierId
      );

      // Comprehensive form data population
      const formData = {
        itemCode: editingProduct.sku || "",
        itemName: editingProduct.name || "",
        manufacturerName: matchedManufacturer?.name || editingProduct.manufacturerName || "",
        supplierName: matchedSupplier?.name || editingProduct.supplierName || "",
        alias: editingProduct.alias || "",
        aboutProduct: editingProduct.description || "",
        itemProductType: editingProduct.itemProductType || "Standard",
        department: editingProduct.department || "",
        mainCategory: category?.name || "",
        subCategory: editingProduct.subCategory || "",
        brand: editingProduct.brand || "",
        buyer: editingProduct.buyer || "",
        hsnCode: editingProduct.hsnCode || "",
        gstCode: gstCode,
        purchaseGstCalculatedOn: editingProduct.purchaseGstCalculatedOn || "MRP",
        gstUom: editingProduct.gstUom || "PIECES",
        purchaseAbatement: editingProduct.purchaseAbatement || "",
        configItemWithCommodity: editingProduct.configItemWithCommodity || false,
        seniorExemptApplicable: editingProduct.seniorExemptApplicable || false,
        cgstRate: editingProduct.cgstRate || "0",
        sgstRate: editingProduct.sgstRate || "0",
        igstRate: editingProduct.igstRate || "0",
        cessRate: editingProduct.cessRate || "0",
        taxCalculationMethod: editingProduct.taxCalculationMethod || "exclusive",
        eanCodeRequired: editingProduct.eanCodeRequired || false,
        barcode: editingProduct.barcode || "",
        weightsPerUnit: editingProduct.weightsPerUnit || "1",
        batchExpiryDetails: editingProduct.batchExpiryDetails || "Not Required",
        itemPreparationsStatus: editingProduct.itemPreparationsStatus || "Trade As Is",
        grindingCharge: editingProduct.grindingCharge || "",
        weightInGms: editingProduct.weightInGms || "",
        bulkItemName: editingProduct.bulkItemName || "",
        repackageUnits: editingProduct.repackageUnits || "",
        repackageType: editingProduct.repackageType || "",
        packagingMaterial: editingProduct.packagingMaterial || "",
        decimalPoint: editingProduct.decimalPoint || "0",
        productType: editingProduct.productType || "NA",
        sellBy: editingProduct.sellBy || "None",
        itemPerUnit: editingProduct.itemPerUnit || "1",
        maintainSellingMrpBy: editingProduct.maintainSellingMrpBy || "Multiple Selling Price & Multiple MRP",
        batchSelection: editingProduct.batchSelection || "Not Applicable",
        isWeighable: editingProduct.isWeighable || false,
        skuType: editingProduct.skuType || "Put Away",
        indentType: editingProduct.indentType || "Manual",
        gateKeeperMargin: editingProduct.gateKeeperMargin || "",
        allowItemFree: editingProduct.allowItemFree || false,
        showOnMobileDashboard: editingProduct.showOnMobileDashboard || false,
        enableMobileNotifications: editingProduct.enableMobileNotifications || false,
        quickAddToCart: editingProduct.quickAddToCart || false,
        perishableItem: editingProduct.perishableItem || false,
        temperatureControlled: editingProduct.temperatureControlled || false,
        fragileItem: editingProduct.fragileItem || false,
        trackSerialNumbers: editingProduct.trackSerialNumbers || false,
        fdaApproved: editingProduct.fdaApproved || false,
        bisCertified: editingProduct.bisCertified || false,
        organicCertified: editingProduct.organicCertified || false,
        itemIngredients: editingProduct.itemIngredients || "",
        price: editingProduct.price?.toString() || "",
        mrp: editingProduct.mrp?.toString() || "",
        cost: editingProduct.cost?.toString() || "",
        weight: editingProduct.weight ? editingProduct.weight.toString() : "",
        weightUnit: editingProduct.weightUnit || "kg",
        categoryId: editingProduct.categoryId || categories[0]?.id || 1,
        stockQuantity: editingProduct.stockQuantity?.toString() || "0",
        active: editingProduct.active !== false,
      };

      form.reset(formData);
      setTotalGST(totalGst);
    }
  }, [isEditMode, editingProduct, isLoadingProduct, categories, suppliers, form]);

  // Update item code when products data loads (only for create mode)
  useEffect(() => {
    if (!isEditMode && allProducts && allProducts.length > 0) {
      const currentItemCode = form.getValues('itemCode');
      if (!currentItemCode) {
        form.setValue('itemCode', generateItemCode());
      }
    }
  }, [isEditMode, allProducts, form]);

  // Create/Update product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      console.log('🚀 Submitting product with live data:', data);

      // Enhanced validation
      const requiredFields = [];
      if (!data.itemName?.trim()) requiredFields.push("Item Name");
      if (!data.itemCode?.trim()) requiredFields.push("Item Code");
      if (!data.price?.trim()) requiredFields.push("Price");

      if (requiredFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${requiredFields.join(", ")}`);
      }

      // Enhanced product data with supplier ID resolution
      const productData = {
        name: data.itemName.trim(),
        sku: data.itemCode.trim(),
        description: data.aboutProduct?.trim() || "",
        price: parseFloat(data.price),
        mrp: parseFloat(data.mrp || data.price),
        cost: parseFloat(data.cost || "0"),
        weight: data.weight ? parseFloat(data.weight) : null,
        weightUnit: data.weightUnit || "kg",
        stockQuantity: parseInt(data.stockQuantity || "0"),
        categoryId: data.categoryId || null,
        barcode: data.barcode?.trim() || "",
        active: data.active !== undefined ? data.active : true,
        alertThreshold: 5,
        hsnCode: data.hsnCode?.trim() || "",
        cgstRate: data.cgstRate || "0",
        sgstRate: data.sgstRate || "0", 
        igstRate: data.igstRate || "0",
        cessRate: data.cessRate || "0",
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",
        manufacturerName: data.manufacturerName?.trim() || "",
        supplierName: data.supplierName?.trim() || "",
        manufacturerId: suppliers.find((sup: any) => sup.name === data.manufacturerName?.trim())?.id || null,
        supplierId: suppliers.find((sup: any) => sup.name === data.supplierName?.trim())?.id || null,
        alias: data.alias?.trim() || "",
        itemProductType: data.itemProductType || "Standard",
        department: data.department?.trim() || "",
        brand: data.brand?.trim() || "",
        buyer: data.buyer?.trim() || "",
        purchaseGstCalculatedOn: data.purchaseGstCalculatedOn || "MRP",
        gstUom: data.gstUom || "PIECES",
        purchaseAbatement: data.purchaseAbatement?.trim() || "",
        configItemWithCommodity: data.configItemWithCommodity || false,
        seniorExemptApplicable: data.seniorExemptApplicable || false,
        eanCodeRequired: data.eanCodeRequired || false,
        weightsPerUnit: data.weightsPerUnit || "1",
        batchExpiryDetails: data.batchExpiryDetails || "Not Required",
        itemPreparationsStatus: data.itemPreparationsStatus || "Trade As Is",
        grindingCharge: data.grindingCharge?.trim() || "",
        weightInGms: data.weightInGms?.trim() || "",
        bulkItemName: data.bulkItemName?.trim() || "",
        repackageUnits: data.repackageUnits?.trim() || "",
        repackageType: data.repackageType?.trim() || "",
        packagingMaterial: data.packagingMaterial?.trim() || "",
        decimalPoint: data.decimalPoint || "0",
        productType: data.productType || "NA",
        sellBy: data.sellBy || "None",
        itemPerUnit: data.itemPerUnit || "1",
        maintainSellingMrpBy: data.maintainSellingMrpBy || "Multiple Selling Price & Multiple MRP",
        batchSelection: data.batchSelection || "Not Applicable",
        isWeighable: data.isWeighable || false,
        skuType: data.skuType || "Put Away",
        indentType: data.indentType || "Manual",
        gateKeeperMargin: data.gateKeeperMargin?.trim() || "",
        allowItemFree: data.allowItemFree || false,
        showOnMobileDashboard: data.showOnMobileDashboard || false,
        enableMobileNotifications: data.enableMobileNotifications || false,
        quickAddToCart: data.quickAddToCart || false,
        perishableItem: data.perishableItem || false,
        temperatureControlled: data.temperatureControlled || false,
        fragileItem: data.fragileItem || false,
        trackSerialNumbers: data.trackSerialNumbers || false,
        fdaApproved: data.fdaApproved || false,
        bisCertified: data.bisCertified || false,
        organicCertified: data.organicCertified || false,
        itemIngredients: data.itemIngredients?.trim() || "",
      };

      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${editId}` : "/api/products";

      const res = await apiRequest(method, url, productData);

      if (!res.ok) {
        let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} product`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      if (isEditMode) {
        toast({
          title: "Success! 🎉", 
          description: `Product "${data.name}" updated successfully with live data`,
        });
      } else {
        form.reset({
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
          gstCode: "GST 18%",
          purchaseGstCalculatedOn: "MRP",
          gstUom: "PIECES",
          purchaseAbatement: "",
          configItemWithCommodity: false,
          seniorExemptApplicable: false,
          eanCodeRequired: false,
          barcode: "",
          weightsPerUnit: "1",
          batchExpiryDetails: "Not Required",
          itemPreparationsStatus: "Trade As Is",
          grindingCharge: "",
          weightInGms: "",
          bulkItemName: "",
          repackageUnits: "",
          repackageType: "",
          packagingMaterial: "",
          decimalPoint: "0",
          productType: "NA",
          sellBy: "None",
          itemPerUnit: "1",
          maintainSellingMrpBy: "Multiple Selling Price & Multiple MRP",
          batchSelection: "NotApplicable",
          isWeighable: false,
          skuType: "Put Away",
          indentType: "Manual",
          gateKeeperMargin: "",
          allowItemFree: false,
          showOnMobileDashboard: false,
          enableMobileNotifications: false,
          quickAddToCart: false,
          perishableItem: false,
          temperatureControlled: false,
          fragileItem: false,
          trackSerialNumbers: false,
          fdaApproved: false,
          bisCertified: false,
          organicCertified: false,
          itemIngredients: "",
          price: "",
          mrp: "",
          cost: "",
          weight: "",
          weightUnit: "kg",
          categoryId: categories[0]?.id || 1,
          stockQuantity: "0",
          active: true,
        });

        toast({
          title: "Success! 🎉", 
          description: `Product "${data.name}" created successfully with live backend data`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Product operation error:", error);
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Creating'} Product`,
        description: error.message || "Please check all required fields and try again",
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
    { id: "mobile-app-config", label: "Mobile App Config", icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "other-information", label: "Other Information", icon: <InfoIcon className="w-4 h-4" /> },
  ];

  // Loading state with enhanced backend sync info
  if (isEditMode && (isLoadingProduct || isLoadingSuppliers || isLoadingCategories)) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-lg border">
              <Loader2Icon className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Loading Live Data...</h2>
              <p className="text-gray-600 mb-4">Syncing with backend for real-time information</p>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!isLoadingProduct ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Product data: {!isLoadingProduct ? 'Loaded' : 'Loading...'}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!isLoadingSuppliers ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Suppliers: {!isLoadingSuppliers ? 'Loaded' : 'Loading...'}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!isLoadingCategories ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Categories: {!isLoadingCategories ? 'Loaded' : 'Loading...'}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">Product ID: {editId}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if product fetch failed
  if (isEditMode && productError) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <XIcon className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-red-800">Failed to Load Product</h2>
            <p className="text-gray-600 mb-4">Could not fetch product data for editing.</p>
            <Button onClick={() => setLocation("/add-item-dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                {isEditMode ? <EditIcon className="w-4 h-4 text-blue-600" /> : <PackageIcon className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">
                  {isEditMode ? "Edit Item" : "Add Item"} - Live Data Sync
                </h1>
                {isEditMode && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <EditIcon className="w-3 h-3 mr-1" />
                    Edit Mode
                  </Badge>
                )}
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  <RefreshCwIcon className="w-3 h-3 mr-1" />
                  Live Backend
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Live Data Status */}
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700">Live Data Active</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation("/add-item-dashboard")}
              >
                <XIcon className="w-4 h-4 mr-2" />
                {isEditMode ? "Cancel Edit" : "Close"}
              </Button>
            </div>
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

              {/* Enhanced Progress Indicator with Live Data Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-2">
                  Section {sidebarSections.findIndex(s => s.id === currentSection) + 1} of {sidebarSections.length}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{
                      width: `${((sidebarSections.findIndex(s => s.id === currentSection) + 1) / sidebarSections.length) * 100}%`
                    }}
                  ></div>
                </div>

                {/* Dynamic Alias Display */}
                {calculatedAlias && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Alias: {calculatedAlias}
                  </div>
                )}

                {/* Total GST Display */}
                {totalGST > 0 && (
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded mt-1 flex items-center gap-1">
                    <CalculatorIcon className="w-3 h-3" />
                    Total GST: {totalGST}%
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {sidebarSections.map((section, index) => {
                  const isCompleted = sidebarSections.findIndex(s => s.id === currentSection) > index;
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isCurrent 
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700" 
                          : isCompleted
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {section.icon}
                      <span className="flex-1 text-left">{section.label}</span>

                      {isCurrent && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      )}
                      {isCompleted && !isCurrent && (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-xs text-gray-500 mb-2">Live Data Actions</div>
                <div className="space-y-1">
                  <button
                    onClick={() => refetchSuppliers()}
                    className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                  >
                    <RefreshCwIcon className="w-3 h-3" />
                    Refresh Suppliers
                  </button>
                  <button
                    onClick={() => setCurrentSection("tax-information")}
                    className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Auto-Calculate GST
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                console.log("Form submission with live data:", data);
                createProductMutation.mutate(data);
              })} className="space-y-6">

                {/* Item Information Section */}
                {currentSection === "item-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        Item Information
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                          Live Data Sync
                        </Badge>
                        {isEditMode && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Editing: {editingProduct?.name}
                          </Badge>
                        )}
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
                                  {!isEditMode && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const newCode = generateItemCode();
                                        field.onChange(newCode);
                                      }}
                                      className="whitespace-nowrap"
                                    >
                                      Generate New
                                    </Button>
                                  )}
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
                              <Input {...field} placeholder="Enter product name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Dynamic Supplier Selection with Live Data */}
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="manufacturerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Manufacturer Name *
                                <Badge variant="outline" className="text-xs">
                                  {suppliers.length} Live Options
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manufacturer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {suppliers.map((supplier: Supplier) => (
                                      <SelectItem key={supplier.id} value={supplier.name}>
                                        <div className="flex items-center gap-2">
                                          <span>{supplier.name}</span>
                                          {supplier.city && (
                                            <Badge variant="outline" className="text-xs">
                                              {supplier.city}
                                            </Badge>
                                          )}
                                        </div>
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
                              <FormLabel className="flex items-center gap-2">
                                Supplier Name *
                                <Badge variant="outline" className="text-xs">
                                  {suppliers.length} Live Options
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {suppliers.map((supplier: Supplier) => (
                                      <SelectItem key={supplier.id} value={supplier.name}>
                                        <div className="flex items-center gap-2">
                                          <span>{supplier.name}</span>
                                          {supplier.supplierType && (
                                            <Badge variant="outline" className="text-xs">
                                              {supplier.supplierType}
                                            </Badge>
                                          )}
                                        </div>
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

                      {/* Dynamic Alias Field */}
                      <FormField
                        control={form.control}
                        name="alias"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Product Alias
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Auto-Generated
                              </Badge>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Auto-generated from item details"
                                className="bg-green-50"
                              />
                            </FormControl>
                            <div className="text-xs text-gray-500">
                              Automatically generated from brand, department, and item name
                            </div>
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
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Category Information Section with Live Data */}
                {currentSection === "category-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TagIcon className="w-5 h-5" />
                        Category Information
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                          Live Categories: {categories.length}
                        </Badge>
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
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h3 className="text-blue-600 font-medium">Category Selection</h3>
                          <Badge variant="outline" className="text-xs">Live Data</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  DEPARTMENT *
                                  <Badge variant="outline" className="text-xs">
                                    Auto-GST
                                  </Badge>
                                </FormLabel>
                                <FormControl>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Auto-apply department-based GST
                                    const defaultGST = DEPARTMENT_GST_DEFAULTS[value] || 18;
                                    form.setValue("gstCode", `GST ${defaultGST}%`);
                                    const cgstSgstRate = (defaultGST / 2).toString();
                                    form.setValue("cgstRate", cgstSgstRate);
                                    form.setValue("sgstRate", cgstSgstRate);
                                    form.setValue("igstRate", "0");
                                    setTotalGST(defaultGST);
                                  }} value={field.value}>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.keys(DEPARTMENT_GST_DEFAULTS).map(dept => (
                                        <SelectItem key={dept} value={dept}>
                                          <div className="flex items-center gap-2">
                                            <span>{dept}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {DEPARTMENT_GST_DEFAULTS[dept]}% GST
                                            </Badge>
                                          </div>
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
                            name="mainCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  MAIN CATEGORY
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                    {categories.length} Available
                                  </Badge>
                                </FormLabel>
                                <FormControl>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      const category = categories.find((cat: any) => cat.name === value);
                                      if (category) {
                                        form.setValue("categoryId", category.id);
                                      }
                                    }} 
                                    value={field.value}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select main category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categories.map((category: any) => (
                                        <SelectItem key={category.id} value={category.name}>
                                          <div className="flex items-center gap-2">
                                            <span>{category.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              ID: {category.id}
                                            </Badge>
                                          </div>
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
                            name="brand"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Brand</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter brand name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="buyer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Buyer</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter buyer name" />
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

                {/* Enhanced Tax Information Section with Dynamic GST Calculation */}
                {currentSection === "tax-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Tax Information & GST Calculator
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700">
                          <CalculatorIcon className="w-3 h-3 mr-1" />
                          Auto-Calculate
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="hsnCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                HSN Code
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                  Auto-GST Trigger
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input 
                                      value={field.value || ""}
                                      placeholder="Enter HSN Code (e.g., 10019000)" 
                                      onChange={(e) => {
                                        const hsnValue = e.target.value;
                                        field.onChange(hsnValue);

                                        if (hsnValue.length >= 4) {
                                          calculateGSTFromHSN(hsnValue);
                                        }
                                      }}
                                    />
                                    {isCalculatingGST && (
                                      <Button disabled variant="outline" size="sm">
                                        <Loader2Icon className="w-4 h-4 animate-spin" />
                                      </Button>
                                    )}
                                  </div>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    calculateGSTFromHSN(value);
                                  }} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Or select from common HSN codes" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 overflow-y-auto">
                                      {Object.entries(HSN_GST_MAPPING).map(([hsn, data]) => (
                                        <SelectItem key={hsn} value={hsn}>
                                          <div className="flex items-center gap-2">
                                            <span>{hsn}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {data.gst}% GST
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                              {data.description}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
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
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                  Auto-Updated
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  const gstRate = parseFloat(value.replace("GST ", "").replace("%", ""));
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
                                  setTotalGST(gstRate);
                                }} value={field.value || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select GST rate" />
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

                      {/* Enhanced GST Breakdown Section with Live Calculation */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                          GST Breakdown & Live Calculation
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Dynamic
                          </Badge>
                        </h4>

                        {/* Enhanced Tax Summary Display */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-4 border border-blue-200">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">Total GST Rate</div>
                              <div className="text-2xl font-bold text-blue-900 flex items-center justify-center gap-1">
                                {totalGST}%
                                {isCalculatingGST && <Loader2Icon className="w-4 h-4 animate-spin" />}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">CGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("cgstRate") || "0"}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">SGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("sgstRate") || "0"}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">IGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("igstRate") || "0"}%
                              </div>
                            </div>
                          </div>

                          {/* HSN Info Display */}
                          {form.watch("hsnCode") && HSN_GST_MAPPING[form.watch("hsnCode")] && (
                            <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                              <div className="text-xs text-blue-700">
                                HSN: {form.watch("hsnCode")} - {HSN_GST_MAPPING[form.watch("hsnCode")].description} 
                                ({HSN_GST_MAPPING[form.watch("hsnCode")].category})
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="cgstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="9.00" 
                                    type="number" 
                                    step="0.01"
                                    className="bg-green-50"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      const cgstValue = e.target.value;
                                      form.setValue("sgstRate", cgstValue);
                                      form.setValue("igstRate", "0");
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="sgstRate"
                            render={({ field }) =>(
                              <FormItem>
                                <FormLabel>SGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="9.00" 
                                    type="number" 
                                    step="0.01"
                                    className="bg-green-50"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      const sgstValue = e.target.value;
                                      form.setValue("cgstRate", sgstValue);
                                      form.setValue("igstRate", "0");
                                    }}
                                  />
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
                                  <Input 
                                    {...field} 
                                    placeholder="18.00" 
                                    type="number" 
                                    step="0.01"
                                    className="bg-yellow-50"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      if (e.target.value && parseFloat(e.target.value) > 0) {
                                        form.setValue("cgstRate", "0");
                                        form.setValue("sgstRate", "0");
                                      }
                                    }}
                                  />
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

                        {/* Enhanced Tax Information Help */}
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h5 className="font-medium text-yellow-800 mb-1">Live GST Calculation Guidelines</h5>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• HSN Code automatically calculates GST rates</li>
                            <li>• Department selection applies default GST rates</li>
                            <li>• For intra-state: Use CGST + SGST | Inter-state: Use IGST only</li>
                            <li>• Total GST = CGST + SGST or IGST (whichever applicable)</li>
                            <li>• Live data sync ensures accurate tax calculations</li>
                          </ul>
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
                              <FormLabel>Purchase Abatement %</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0" type="number" step="0.01" />
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
                                  <SelectItem value="GRAM">GRAM</SelectItem>
                                  <SelectItem value="ML">ML</SelectItem>
                                  <SelectItem value="DOZEN">DOZEN</SelectItem>
                                  <SelectItem value="PACKET">PACKET</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="configItemWithCommodity"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <FormLabel className="text-sm font-medium">Config Item With Commodity</FormLabel>
                                <p className="text-xs text-gray-500">Link this item with commodity exchange rates</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="seniorExemptApplicable"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <FormLabel className="text-sm font-medium">Senior Citizen Tax Exemption</FormLabel>
                                <p className="text-xs text-gray-500">Apply tax exemptions for senior citizens</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Pricing Section */}
                {currentSection === "pricing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Pricing Information
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700">
                          With Tax Calculation
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Enhanced Pricing Fields with Tax Display */}
                      <div className="grid grid-cols-3 gap-6">
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

                      {/* Live Tax Calculation Display */}
                      {(form.watch("price") || form.watch("mrp")) && totalGST > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <CalculatorIcon className="w-4 h-4" />
                            Live Tax Calculation
                          </h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-blue-700">Price (Excl. Tax):</div>
                              <div className="font-bold">₹{form.watch("price") || "0"}</div>
                            </div>
                            <div>
                              <div className="text-blue-700">GST Amount ({totalGST}%):</div>
                              <div className="font-bold">₹{((parseFloat(form.watch("price") || "0") * totalGST) / 100).toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-blue-700">Price (Incl. Tax):</div>
                              <div className="font-bold text-green-600">
                                ₹{(parseFloat(form.watch("price") || "0") * (1 + totalGST / 100)).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-blue-700">MRP:</div>
                              <div className="font-bold">₹{form.watch("mrp") || "0"}</div>
                            </div>
                          </div>
                        </div>
                      )}

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

                      {/* Stock Quantity */}
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="stockQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Quantity *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="0" type="number" min="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input {...field} placeholder="0.00" type="number" step="0.001" />
                                  <Select 
                                    value={form.watch("weightUnit")} 
                                    onValueChange={(value) => form.setValue("weightUnit", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="kg">kg</SelectItem>
                                      <SelectItem value="g">g</SelectItem>
                                      <SelectItem value="ltr">ltr</SelectItem>
                                      <SelectItem value="ml">ml</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation("/add-item-dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createProductMutation.isPending ? (
                      <>
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4 mr-2" />
                        {isEditMode ? 'Update Product' : 'Create Product'}
                      </>
                    )}
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