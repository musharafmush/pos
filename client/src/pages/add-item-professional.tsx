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
  RefreshCwIcon,
  CalculatorIcon
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

export default function AddItemProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState("item-information");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [calculatedGstData, setCalculatedGstData] = useState({
    totalGst: 0,
    taxType: "Intra-State",
    effectiveRate: 0
  });

  // Extract edit ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;

  console.log('🔍 Add Item Professional - Mode:', isEditMode ? 'Edit' : 'Create', 'ID:', editId);

  // Fetch product data if in edit mode with enhanced error handling
  const { data: editingProduct, isLoading: isLoadingProduct, error: productError, refetch: refetchProduct } = useQuery({
    queryKey: ["/api/products", editId],
    queryFn: async () => {
      if (!editId) return null;
      console.log('🔄 Fetching product for editing:', editId);

      try {
        const response = await fetch(`/api/products/${editId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch product:', response.status, errorText);
          throw new Error(`Failed to fetch product: ${response.status} - ${errorText}`);
        }
        const product = await response.json();
        console.log('✅ Product data loaded for editing:', product);
        return product;
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        throw error;
      }
    },
    enabled: !!editId,
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch categories with live data
  const { data: categories = [], isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      console.log('🔄 Fetching categories...');
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      console.log('✅ Categories loaded:', data.length, 'items');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch suppliers with live data and enhanced debugging
  const { data: suppliers = [], isLoading: isLoadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      console.log('🔄 Fetching suppliers data...');
      try {
        const response = await fetch("/api/suppliers");
        if (!response.ok) throw new Error("Failed to fetch suppliers");
        const suppliersData = await response.json();
        console.log('✅ Suppliers data loaded:', suppliersData.length, 'suppliers');
        console.log('📊 Supplier names:', suppliersData.map((s: Supplier) => s.name));
        return suppliersData;
      } catch (error) {
        console.error('❌ Error fetching suppliers:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  }) as { data: Supplier[], isLoading: boolean, refetch: () => void };

  // Fetch all products for bulk item selection and SKU generation
  const { data: allProducts = [], refetch: refetchProducts } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: async () => {
      console.log('🔄 Fetching all products...');
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      console.log('✅ All products loaded:', data.length, 'items');
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
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

  // Generate fallback item code when products aren't loaded yet
  const generateFallbackItemCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ITM${timestamp}`;
  };

  // Filter bulk items from all products
  const bulkItems = allProducts.filter((product: any) => 
    product.name && (
      product.name.toLowerCase().includes('bulk') ||
      product.name.toLowerCase().includes('bag') ||
      product.name.toLowerCase().includes('container') ||
      product.name.toLowerCase().includes('kg') ||
      product.name.toLowerCase().includes('ltr') ||
      (parseFloat(product.weight || "0") >= 1 && product.weightUnit === 'kg') ||
      product.stockQuantity > 10
    )
  );

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

  // Dynamic alias generation based on product details
  const generateAlias = (itemName: string, department: string, brand: string) => {
    const parts = [];
    if (brand) parts.push(brand.substring(0, 3).toUpperCase());
    if (department) parts.push(department.substring(0, 3).toUpperCase());
    if (itemName) {
      const words = itemName.split(' ').filter(word => word.length > 2);
      parts.push(...words.slice(0, 2).map(word => word.substring(0, 3).toUpperCase()));
    }
    return parts.join('-') || 'ITEM';
  };

  // Dynamic GST calculation function
  const calculateGstBreakdown = (gstCode: string, taxMethod: string = "intra") => {
    if (!gstCode) return { cgst: "0", sgst: "0", igst: "0", total: 0 };

    const rate = parseFloat(gstCode.replace(/[^\d.]/g, '')) || 0;

    if (rate === 0) {
      return { cgst: "0", sgst: "0", igst: "0", total: 0 };
    }

    let cgst = "0", sgst = "0", igst = "0";

    if (taxMethod === "inter") {
      // Inter-state: Only IGST
      igst = rate.toString();
    } else {
      // Intra-state: CGST + SGST
      const halfRate = (rate / 2).toString();
      cgst = halfRate;
      sgst = halfRate;
    }

    return { cgst, sgst, igst, total: rate };
  };

  // Watch for form changes to update calculated fields
  const watchedValues = form.watch(['itemName', 'department', 'brand', 'hsnCode', 'gstCode', 'cgstRate', 'sgstRate', 'igstRate', 'taxCalculationMethod']);

  useEffect(() => {
    const [itemName, department, brand, hsnCode, gstCode, cgstRate, sgstRate, igstRate, taxMethod] = watchedValues;

    // Auto-generate alias when key fields change
    if (itemName || department || brand) {
      const newAlias = generateAlias(itemName || "", department || "", brand || "");
      if (newAlias !== form.getValues('alias')) {
        form.setValue('alias', newAlias);
      }
    }

    // Calculate total GST and determine tax type
    const cgst = parseFloat(cgstRate || "0");
    const sgst = parseFloat(sgstRate || "0"); 
    const igst = parseFloat(igstRate || "0");
    const totalGst = cgst + sgst + igst;

    const taxType = igst > 0 ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)";
    const effectiveRate = totalGst;

    setCalculatedGstData({
      totalGst,
      taxType,
      effectiveRate
    });

    console.log('📊 GST Calculation Updated:', { totalGst, taxType, effectiveRate });
  }, watchedValues);

  // Enhanced dynamic data loading for edit mode
  useEffect(() => {
    if (isEditMode && editingProduct && !isLoadingProduct && categories.length > 0 && suppliers.length > 0) {
      console.log('🔄 Loading edit data dynamically...');
      setIsLoadingData(true);

      try {
        // Enhanced GST calculation with proper validation
        const cgstRate = parseFloat(editingProduct.cgstRate || '0');
        const sgstRate = parseFloat(editingProduct.sgstRate || '0');
        const igstRate = parseFloat(editingProduct.igstRate || '0');
        const totalGst = cgstRate + sgstRate + igstRate;

        // Dynamic GST code determination
        let gstCode = 'GST 18%'; // Default
        if (totalGst === 0) gstCode = 'GST 0%';
        else if (totalGst === 5) gstCode = 'GST 5%';
        else if (totalGst === 12) gstCode = 'GST 12%';
        else if (totalGst === 18) gstCode = 'GST 18%';
        else if (totalGst === 28) gstCode = 'GST 28%';
        else if (totalGst > 0) gstCode = `GST ${totalGst}%`;

        // Dynamic category resolution
        const category = categories.find((cat: any) => cat.id === editingProduct.categoryId);
        console.log('📂 Category mapping:', { categoryId: editingProduct.categoryId, category: category?.name });

        // Enhanced manufacturer and supplier resolution
        const matchedManufacturer = suppliers.find((sup: any) => 
          sup.name === editingProduct.manufacturerName || 
          sup.id === editingProduct.manufacturerId
        );
        const matchedSupplier = suppliers.find((sup: any) => 
          sup.name === editingProduct.supplierName || 
          sup.id === editingProduct.supplierId
        );

        console.log('🏭 Supplier mapping:', { 
          manufacturerName: editingProduct.manufacturerName,
          supplierName: editingProduct.supplierName,
          matchedManufacturer: matchedManufacturer?.name,
          matchedSupplier: matchedSupplier?.name 
        });

        // Auto-generate alias if missing
        const currentAlias = editingProduct.alias || generateAlias(
          editingProduct.name || "", 
          editingProduct.department || "", 
          editingProduct.brand || ""
        );

        // Comprehensive form data with enhanced field mapping
        const formData = {
          // Item Information
          itemCode: editingProduct.sku || "",
          itemName: editingProduct.name || "",
          manufacturerName: matchedManufacturer?.name || editingProduct.manufacturerName || "",
          supplierName: matchedSupplier?.name || editingProduct.supplierName || "",
          alias: currentAlias,
          aboutProduct: editingProduct.description || "",

          // Category Information
          itemProductType: editingProduct.itemProductType || "Standard",
          department: editingProduct.department || "",
          mainCategory: category?.name || "",
          subCategory: editingProduct.subCategory || "",
          brand: editingProduct.brand || "",
          buyer: editingProduct.buyer || "",

          // Tax Information - Enhanced with dynamic calculation
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

          // All other fields...
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

        console.log('✅ Form data prepared for editing:', formData);
        form.reset(formData);

        // Update calculated GST data
        setCalculatedGstData({
          totalGst,
          taxType: igstRate > 0 ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)",
          effectiveRate: totalGst
        });

      } catch (error) {
        console.error('❌ Error loading edit data:', error);
        toast({
          title: "Data Loading Error",
          description: "Failed to load product data for editing",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    }
  }, [isEditMode, editingProduct, isLoadingProduct, categories, suppliers, form, toast]);

  // Update item code when products data loads (only for create mode)
  useEffect(() => {
    if (!isEditMode && allProducts && allProducts.length > 0) {
      const currentItemCode = form.getValues('itemCode');
      if (!currentItemCode || (currentItemCode.length === 9 && !currentItemCode.startsWith('ITM0'))) {
        form.setValue('itemCode', generateItemCode());
      }
    }
  }, [isEditMode, allProducts, form]);

  // Refresh all data function
  const refreshAllData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        refetchCategories(),
        refetchSuppliers(),
        refetchProducts(),
        isEditMode ? refetchProduct() : Promise.resolve()
      ]);
      toast({
        title: "Data Refreshed",
        description: "All data has been updated from the backend",
      });
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh data from backend",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Enhanced Create/Update product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      console.log('🚀 Starting product operation with live data:', data);

      // Enhanced validation
      const requiredFields = [];
      if (!data.itemName?.trim()) requiredFields.push("Item Name");
      if (!data.itemCode?.trim()) requiredFields.push("Item Code");
      if (!data.price?.trim()) requiredFields.push("Price");

      if (requiredFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${requiredFields.join(", ")}`);
      }

      // Enhanced numeric validation
      const price = parseFloat(data.price);
      const mrp = data.mrp ? parseFloat(data.mrp) : price;
      const cost = data.cost ? parseFloat(data.cost) : 0;
      const stockQuantity = data.stockQuantity ? parseInt(data.stockQuantity) : 0;

      const validationErrors = [];
      if (isNaN(price) || price <= 0) validationErrors.push("Price must be a valid positive number");
      if (isNaN(stockQuantity) || stockQuantity < 0) validationErrors.push("Stock quantity must be a valid positive number");
      if (mrp > 0 && mrp < price) validationErrors.push("MRP cannot be less than selling price");

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("; "));
      }

      // Enhanced product data with live supplier/manufacturer resolution
      const productData = {
        name: data.itemName.trim(),
        sku: data.itemCode.trim(),
        description: data.aboutProduct?.trim() || "",
        price: price,
        mrp: mrp,
        cost: cost,
        weight: data.weight ? parseFloat(data.weight) : null,
        weightUnit: data.weightUnit || "kg",
        stockQuantity: stockQuantity,
        categoryId: data.categoryId || null,
        barcode: data.barcode?.trim() || "",
        active: data.active !== undefined ? data.active : true,
        alertThreshold: 5,
        hsnCode: data.hsnCode?.trim() || "",

        // Enhanced tax data
        cgstRate: data.cgstRate || "0",
        sgstRate: data.sgstRate || "0", 
        igstRate: data.igstRate || "0",
        cessRate: data.cessRate || "0",
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",

        // Enhanced supplier data with ID resolution
        manufacturerName: data.manufacturerName?.trim() || "",
        supplierName: data.supplierName?.trim() || "",
        manufacturerId: suppliers.find((sup: any) => sup.name === data.manufacturerName?.trim())?.id || null,
        supplierId: suppliers.find((sup: any) => sup.name === data.supplierName?.trim())?.id || null,
        alias: data.alias?.trim() || "",
        itemProductType: data.itemProductType || "Standard",
        department: data.department?.trim() || "",
        brand: data.brand?.trim() || "",
        buyer: data.buyer?.trim() || "",

        // All other comprehensive fields...
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

      console.log('📤 Submitting product data:', productData);

      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${editId}` : "/api/products";

      try {
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

        const result = await res.json();
        console.log('✅ Product operation successful:', result);
        return result;
      } catch (error) {
        console.error('❌ Product operation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      if (isEditMode) {
        toast({
          title: "Success! 🎉", 
          description: `Product "${data.name}" updated successfully with live data`,
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/add-item-dashboard")}
            >
              View Dashboard
            </Button>
          ),
        });
      } else {
        // Reset form with new generated code
        form.reset({
          itemCode: allProducts ? generateItemCode() : generateFallbackItemCode(),
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
          perishableItem:```text
 false,
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
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/add-item-dashboard")}
            >
              View Dashboard
            </Button>
          ),
        });
      }
    },
    onError: (error: Error) => {
      console.error("❌ Product operation error:", error);
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

  // Enhanced loading state
  if (isEditMode && (isLoadingProduct || isLoadingSuppliers || isLoadingData)) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-lg border">
              <Loader2Icon className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Loading Live Data...</h2>
              <p className="text-gray-600 mb-4">Fetching product, tax, and supplier information from backend</p>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Product information loaded</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Loading suppliers & tax data</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Computing dynamic calculations</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">Product ID: {editId}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
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
            <div className="space-x-2">
              <Button onClick={() => refetchProduct()} variant="outline">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => setLocation("/add-item-dashboard")} variant="outline">
                Back to Dashboard
              </Button>
            </div>
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
                  {isEditMode ? "Edit Item" : "Add Item"} - Live Data
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshAllData}
                disabled={isLoadingData}
              >
                {isLoadingData ? (
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                )}
                Refresh Data
              </Button>
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

              {/* Progress Indicator with Live Data Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-2 flex items-center justify-between">
                  <span>Section {sidebarSections.findIndex(s => s.id === currentSection) + 1} of {sidebarSections.length}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Live</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{
                      width: `${((sidebarSections.findIndex(s => s.id === currentSection) + 1) / sidebarSections.length) * 100}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  Categories: {categories.length} | Suppliers: {suppliers.length}
                </div>
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

              {/* Live Data Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-xs text-gray-500 mb-2">Live Data Summary</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span className="font-medium text-green-600">{calculatedGstData.totalGst}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Type:</span>
                    <span className="font-medium">{calculatedGstData.taxType}</span>
                  </div>
                  {form.watch('alias') && (
                    <div className="flex justify-between">
                      <span>Auto Alias:</span>
                      <span className="font-medium text-blue-600">{form.watch('alias')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                console.log("🚀 Form submission with live data:", data);
                createProductMutation.mutate(data);
              })} className="space-y-6">

                {/* Item Information Section */}
                {currentSection === "item-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        Item Information
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          <RefreshCwIcon className="w-3 h-3 mr-1" />
                          Live Data Binding
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
                                        const newCode = allProducts ? generateItemCode() : generateFallbackItemCode();
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
                        <FormField
                          control={form.control}
                          name="alias"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Alias
                                <Badge variant="secondary" className="text-xs">
                                  <CalculatorIcon className="w-3 h-3 mr-1" />
                                  Auto-Generated
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Auto-generated from name+department+brand" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="manufacturerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Manufacturer Name *
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                  Live: {suppliers.length} suppliers loaded
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manufacturer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSuppliers ? (
                                      <div className="p-2 text-center">
                                        <Loader2Icon className="w-4 h-4 animate-spin mx-auto" />
                                        Loading suppliers...
                                      </div>
                                    ) : (
                                      suppliers.map((supplier: Supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.name}>
                                          {supplier.name}
                                          {supplier.city && (
                                            <span className="text-gray-500 ml-2">({supplier.city})</span>
                                          )}
                                        </SelectItem>
                                      ))
                                    )}
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
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                  Live Backend Data
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSuppliers ? (
                                      <div className="p-2 text-center">
                                        <Loader2Icon className="w-4 h-4 animate-spin mx-auto" />
                                        Loading suppliers...
                                      </div>
                                    ) : (
                                      suppliers.map((supplier: Supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.name}>
                                          {supplier.name}
                                          {supplier.phone && (
                                            <span className="text-gray-500 ml-2">({supplier.phone})</span>
                                          )}
                                        </SelectItem>
                                      ))
                                    )}
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
                              <Textarea {...field} placeholder="Product description..." rows={3} />
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
                        <Badge variant="outline" className="bg-green-100 text-green-700">
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
                                  <SelectItem value="Digital">Digital</SelectItem>
                                  <SelectItem value="Subscription">Subscription</SelectItem>
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
                          <h3 className="text-blue-600 font-medium">Category & Department</h3>
                          <Badge variant="secondary" className="text-xs">
                            Live Data Sync
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">
                                  DEPARTMENT *
                                </FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="FMCG">FMCG (Fast Moving Consumer Goods)</SelectItem>
                                      <SelectItem value="Grocery">Grocery & Food Items</SelectItem>
                                      <SelectItem value="Electronics">Electronics & Gadgets</SelectItem>
                                      <SelectItem value="Clothing">Clothing & Apparel</SelectItem>
                                      <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                                      <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                                      <SelectItem value="Sports & Fitness">Sports & Fitness</SelectItem>
                                      <SelectItem value="Automotive">Automotive Parts</SelectItem>
                                      <SelectItem value="Books & Stationery">Books & Stationery</SelectItem>
                                      <SelectItem value="Toys & Games">Toys & Games</SelectItem>
                                      <SelectItem value="Medical & Pharma">Medical & Pharmaceutical</SelectItem>
                                      <SelectItem value="Industrial">Industrial Supplies</SelectItem>
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
                                  <Badge variant="outline" className="text-xs">
                                    {isLoadingCategories ? 'Loading...' : `${categories.length} loaded`}
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
                                      {isLoadingCategories ? (
                                        <div className="p-2 text-center">
                                          <Loader2Icon className="w-4 h-4 animate-spin mx-auto" />
                                          Loading categories...
                                        </div>
                                      ) : (
                                        categories.map((category: any) => (
                                          <SelectItem key={category.id} value={category.name}>
                                            {category.name}
                                            {category.description && (
                                              <span className="text-gray-500 ml-2">
                                                ({category.description})
                                              </span>
                                            )}
                                          </SelectItem>
                                        ))
                                      )}
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

                {/* Tax Information Section - Enhanced with Dynamic Calculations */}
                {currentSection === "tax-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Tax Information & GST Compliance
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                          <CalculatorIcon className="w-3 h-3 mr-1" />
                          Dynamic GST Calculation
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Live GST Summary Display */}
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-blue-900">Live GST Summary</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-700">Real-time calculation</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-white p-3 rounded-lg border border-blue-100">
                            <div className="text-blue-700 font-medium text-sm">Total GST Rate</div>
                            <div className="text-2xl font-bold text-blue-900">
                              {calculatedGstData.totalGst}%
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-green-100">
                            <div className="text-green-700 font-medium text-sm">CGST + SGST</div>
                            <div className="text-lg font-bold text-green-900">
                              {form.watch("cgstRate") || "0"}% + {form.watch("sgstRate") || "0"}%
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-orange-100">
                            <div className="text-orange-700 font-medium text-sm">IGST</div>
                            <div className="text-lg font-bold text-orange-900">
                              {form.watch("igstRate") || "0"}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-center">
                          <span className="text-sm text-gray-600">Tax Type: </span>
                          <span className="font-medium text-gray-800">{calculatedGstData.taxType}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="hsnCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                HSN Code
                                <Badge variant="secondary" className="text-xs">
                                  Auto-suggests GST
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Input 
                                    value={field.value || ""}
                                    placeholder="Enter HSN Code (e.g., 10019000)" 
                                    onChange={(e) => {
                                      const hsnValue = e.target.value;
                                      field.onChange(hsnValue);

                                      // Enhanced Auto-suggest GST code based on HSN with more categories
                                      let suggestedGst = "";
                                      if (hsnValue.startsWith("04") || hsnValue.startsWith("07") || hsnValue.startsWith("08") || hsnValue.startsWith("09") || hsnValue.startsWith("10")) {
                                        suggestedGst = "GST 5%";
                                      } else if (hsnValue.startsWith("15") || hsnValue.startsWith("17") || hsnValue.startsWith("21") || hsnValue.startsWith("30")) {
                                        suggestedGst = "GST 5%";
                                      } else if (hsnValue.startsWith("62") || hsnValue.startsWith("48") || hsnValue.startsWith("87120") || hsnValue.startsWith("90")) {
                                        suggestedGst = "GST 12%";
                                      } else if (hsnValue.startsWith("33") || hsnValue.startsWith("34") || hsnValue.startsWith("64") || hsnValue.startsWith("84") || hsnValue.startsWith("85") || hsnValue.startsWith("96") || hsnValue.startsWith("19")) {
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

                                        toast({
                                          title: "GST Auto-Suggested",
                                          description: `HSN ${hsnValue} → ${suggestedGst}`,
                                        });
                                      }
                                    }}
                                  />
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Auto-update GST code when HSN is selected from dropdown
                                    let suggestedGst = "";
                                    if (value.includes("10019000") || value.includes("15179010") || value.includes("17019900") || value.includes("21069099")) {
                                      suggestedGst = "GST 5%";
                                    } else if (value.includes("04070010") || value.includes("07010000") || value.includes("08010000")) {
                                      suggestedGst = "GST 0%";
                                    } else if (value.includes("62019000") || value.includes("62029000") || value.includes("85171200") || value.includes("87120000")) {
                                      suggestedGst = "GST 12%";
                                    } else if (value.includes("19059090") || value.includes("64029100") || value.includes("84713000") || value.includes("85285200") || value.includes("33061000") || value.includes("34012000")) {
                                      suggestedGst = "GST 18%";
                                    } else if (value.includes("22021000") || value.includes("24021000") || value.includes("87032390") || value.includes("87111000")) {
                                      suggestedGst = "GST 28%";
                                    }

                                    if (suggestedGst) {
                                      form.setValue("gstCode", suggestedGst);
                                      const gstRate = parseFloat(suggestedGst.replace("GST ", "").replace("%", ""));
                                      if (gstRate > 0) {
                                        const cgstSgstRate = (gstRate / 2).toString();
                                        form.setValue("cgstRate", cgstSgstRate);
                                        form.setValue("sgstRate", cgstSgstRate);
                                        form.setValue("igstRate", "0");
                                      }
                                    }
                                  }} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Or select from common HSN codes" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 overflow-y-auto">
                                      {/* Food & Beverages */}
                                      <SelectItem value="10019000">10019000 - Rice (5%)</SelectItem>
                                      <SelectItem value="15179010">15179010 - Edible Oil (5%)</SelectItem>
                                      <SelectItem value="17019900">17019900 - Sugar (5%)</SelectItem>
                                      <SelectItem value="04070010">04070010 - Eggs (0%)</SelectItem>
                                      <SelectItem value="07010000">07010000 - Fresh Vegetables (0%)</SelectItem>
                                      <SelectItem value="08010000">08010000 - Fresh Fruits (0%)</SelectItem>
                                      <SelectItem value="19059090">19059090 - Biscuits (18%)</SelectItem>
                                      <SelectItem value="21069099">21069099 - Spices & Condiments (5%)</SelectItem>

                                      {/* Textiles & Clothing */}
                                      <SelectItem value="62019000">62019000 - Men's Garments (12%)</SelectItem>
                                      <SelectItem value="62029000">62029000 - Women's Garments (12%)</SelectItem>
                                      <SelectItem value="63010000">63010000 - Bed Sheets (5%)</SelectItem>
                                      <SelectItem value="64029100">64029100 - Footwear (18%)</SelectItem>

                                      {/* Electronics */}
                                      <SelectItem value="85171200">85171200 - Mobile Phones (12%)</SelectItem>
                                      <SelectItem value="84713000">84713000 - Laptops (18%)</SelectItem>
                                      <SelectItem value="85285200">85285200 - LED TV (18%)</SelectItem>

                                      {/* Personal Care */}
                                      <SelectItem value="33061000">33061000 - Toothpaste (18%)</SelectItem>
                                      <SelectItem value="34012000">34012000 - Soap (18%)</SelectItem>

                                      {/* Beverages & Luxury */}
                                      <SelectItem value="22021000">22021000 - Soft Drinks (28%)</SelectItem>
                                      <SelectItem value="24021000">24021000 - Cigarettes (28%)</SelectItem>

                                      {/* Automobiles */}
                                      <SelectItem value="87032390">87032390 - Passenger Cars (28%)</SelectItem>
                                      <SelectItem value="87111000">87111000 - Motorcycles (28%)</SelectItem>
                                      <SelectItem value="87120000">87120000 - Bicycles (12%)</SelectItem>

                                      {/* Healthcare */}
                                      <SelectItem value="30049099">30049099 - Medicines (5%)</SelectItem>
                                      <SelectItem value="90183900">90183900 - Medical Equipment (12%)</SelectItem>

                                      {/* Books & Stationery */}
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
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  Auto-updated from HSN
                                </Badge>
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // Enhanced auto-calculate breakdown when GST code changes
                                  const gstRate = parseFloat(value.replace("GST ", "").replace("%", ""));
                                  if (gstRate > 0) {
                                    const cgstSgstRate = (gstRate / 2).toString();
                                    form.setValue("cgstRate", cgstSgstRate);
                                    form.setValue("sgstRate", cgstSgstRate);
                                    form.setValue("igstRate", "0");
                                    form.setValue("taxCalculationMethod", "exclusive");
                                  } else {
                                    form.setValue("cgstRate", "0");
                                    form.setValue("sgstRate", "0");
                                    form.setValue("igstRate", "0");
                                  }
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

                      {/* Enhanced GST Breakdown Section with Tax Type Toggle */}
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                            GST Breakdown & Tax Type
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Switch to Intra-state (CGST+SGST)
                                const totalGst = calculatedGstData.totalGst;
                                if (totalGst > 0) {
                                  const halfRate = (totalGst / 2).toString();
                                  form.setValue("cgstRate", halfRate);
                                  form.setValue("sgstRate", halfRate);
                                  form.setValue("igstRate", "0");
                                }
                              }}
                              className={calculatedGstData.taxType.includes("Intra") ? "bg-blue-100" : ""}
                            >
                              Intra-State
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Switch to Inter-state (IGST)
                                const totalGst = calculatedGstData.totalGst;
                                if (totalGst > 0) {
                                  form.setValue("cgstRate", "0");
                                  form.setValue("sgstRate", "0");
                                  form.setValue("igstRate", totalGst.toString());
                                }
                              }}
                              className={calculatedGstData.taxType.includes("Inter") ? "bg-orange-100" : ""}
                            >
                              Inter-State
                            </Button>
                          </div>
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
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      // When CGST changes, update SGST to match and clear IGST
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
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="9.00" 
                                    type="number" 
                                    step="0.01"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      // When SGST changes, update CGST to match and clear IGST
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
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      // When IGST is set, clear CGST and SGST
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
                                      <SelectItem value="inclusive">Tax Inclusive (Price includes tax)</SelectItem>
                                      <SelectItem value="exclusive">Tax Exclusive (Tax added to price)</SelectItem>
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
                        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                          <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                            <InfoIcon className="w-4 h-4" />
                            Dynamic Tax Information Guidelines
                          </h5>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• For intra-state transactions: Use CGST + SGST (automatically calculated)</li>
                            <li>• For inter-state transactions: Use IGST only (click Inter-State button)</li>
                            <li>• Total GST = CGST + SGST or IGST (dynamically computed: {calculatedGstData.totalGst}%)</li>
                            <li>• HSN codes automatically suggest the correct tax rates</li>
                            <li>• Current tax type: <strong>{calculatedGstData.taxType}</strong></li>
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
                                    <SelectItem value="MRP">MRP (Maximum Retail Price)</SelectItem>
                                    <SelectItem value="Cost">Cost Price</SelectItem>
                                    <SelectItem value="Landing Cost">Landing Cost</SelectItem>
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
                            <FormLabel>GST UOM (Unit of Measurement)</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PIECES">PIECES</SelectItem>
                                  <SelectItem value="KG">KG (Kilograms)</SelectItem>
                                  <SelectItem value="LITRE">LITRE</SelectItem>
                                  <SelectItem value="GRAM">GRAM</SelectItem>
                                  <SelectItem value="ML">ML (Milliliters)</SelectItem>
                                  <SelectItem value="DOZEN">DOZEN</SelectItem>
                                  <SelectItem value="PACKET">PACKET</SelectItem>
                                  <SelectItem value="BOX">BOX</SelectItem>
                                  <SelectItem value="CARTON">CARTON</SelectItem>
                                  <SelectItem value="BUNDLE">BUNDLE</SelectItem>
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
                                <p className="text-xs text-gray-500">Link this item with commodity exchange rates for dynamic pricing</p>
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
                                <p className="text-xs text-gray-500">Apply tax exemptions for senior citizens (live compliance)</p>
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

                {/* Pricing Section */}
                {currentSection === "pricing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5" />
                        Pricing Configuration
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
                                    <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                                    <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
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

                      {/* Item Pricing */}
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-green-200">
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selling Price *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter selling price" type="number" step="0.01" />
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
                                  <Input {...field} placeholder="Enter MRP" type="number" step="0.01" />
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
                                <FormLabel>Cost Price *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter cost price" type="number" step="0.01" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="stockQuantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock Quantity *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter stock quantity" type="number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="alertThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Alert Threshold</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter alert threshold" type="number" />
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

                {/* Packing Section */}
                {currentSection === "packing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BoxIcon className="w-5 h-5" />
                        Packing Information
                      </CardTitle>
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
                                <Input {...field} placeholder="Enter weight per unit" type="number" step="0.001" />
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
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="lb">lb</SelectItem>
                                    <SelectItem value="oz">oz</SelectItem>
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
                                    <SelectItem value="Packet">Packet</SelectItem>
                                    <SelectItem value="Box">Box</SelectItem>
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
                                <Input {...field} placeholder="Enter units per pack" type="number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
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
                                    <SelectValue placeholder="Select preparation status" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-80 overflow-y-auto">
                                    <SelectItem value="Trade As Is">Trade As Is - Sold exactly as received</SelectItem>
                                    <SelectItem value="Create">Create</SelectItem>
                                    <SelectItem value="Bulk">Bulk - Stored and sold in bulk quantities</SelectItem>
                                    <SelectItem value="Repackage">Repackage - Bought in bulk, repackaged into smaller units</SelectItem>
                                    <SelectItem value="Standard Preparation">Standard Preparation</SelectItem>
                                    <SelectItem value="Customer Prepared">Customer Prepared</SelectItem>
                                    <SelectItem value="Parent">Parent</SelectItem>
                                    <SelectItem value="Child">Child</SelectItem>
                                    <SelectItem value="Assembly">Assembly</SelectItem>
                                    <SelectItem value="Kit">Kit</SelectItem>
                                    <SelectItem value="Ingredients">Ingredients</SelectItem>
                                    <SelectItem value="Packing Material">Packing Material</SelectItem>
                                    <SelectItem value="Combo Pack">Combo Pack</SelectItem>
                                    <SelectItem value="Open Item">Open Item</SelectItem>
                                    <SelectItem value="Weight to Piece">Weight to Piece</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Enhanced Repackaging Configuration */}
                      {form.watch("itemPreparationsStatus") === "Repackage" && (
                        <div className="space-y-6">
                          <Separator />
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-4 text-blue-800 flex items-center gap-2">
                              <PackageIcon className="w-5 h-5" />
                              Repackaging Configuration
                            </h4>

                            <div className="grid grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="weightInGms"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-red-600">Target Package Weight (grams) *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="e.g., 500 (for 500g packages)" 
                                        type="number" 
                                        step="0.001"
                                        className="border-red-300 focus:border-red-500" 
                                      />
                                    </FormControl>
                                    <div className="text-xs text-red-500 mt-1">Weight for each repackaged unit</div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="repackageUnits"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Number of Units to Create</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="e.g., 20 (create 20 units)" 
                                        type="number" 
                                        min="1"
                                        className="border-blue-300 focus:border-blue-500" 
                                      />
                                    </FormControl>
                                    <div className="text-xs text-gray-500 mt-1">How many repackaged units to create</div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-4">
                              <FormField
                                control={form.control}
                                name="repackageType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Repackaging Type</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                          <SelectValue>
                                            {field.value || "Select repackaging type"}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="weight-division">Weight Division (1kg → 500g packs)</SelectItem>
                                          <SelectItem value="portion-control">Portion Control</SelectItem>
                                          <SelectItem value="consumer-size">Consumer Size Packaging</SelectItem>
                                          <SelectItem value="sample-size">Sample/Trial Size</SelectItem>
                                          <SelectItem value="bulk-to-retail">Bulk to Retail</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="packagingMaterial"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Packaging Material</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                          <SelectValue>
                                            {field.value || "Select packaging material"}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="plastic-pouch">Plastic Pouch</SelectItem>
                                          <SelectItem value="paper-bag">Paper Bag</SelectItem>
                                          <SelectItem value="glass-jar">Glass Jar</SelectItem>
                                          <SelectItem value="tin-container">Tin Container</SelectItem>
                                          <SelectItem value="cardboard-box">Cardboard Box</SelectItem>
                                          <SelectItem value="vacuum-sealed">Vacuum Sealed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Repackaging Preview */}
                            {form.watch("weightInGms") && form.watch("repackageUnits") && (
                              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                                                              <h5 className="font-medium text-green-800 mb-2">Repackaging Preview</h5>
                                <div className="text-sm text-green-700">
                                  <p>• Each unit: {form.watch("weightInGms")}g</p>
                                  <p>• Total units: {form.watch("repackageUnits") || 0}</p>
                                  <p>• Total weight needed: {(parseFloat(form.watch("weightInGms") || "0") * parseInt(form.watch("repackageUnits") || "0")) / 1000}kg</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Item Properties Section */}
                      {currentSection === "item-properties" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <SettingsIcon className="w-5 h-5" />
                              Item Properties & Preferences
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Decimal Point Configuration */}
                            <FormField
                              control={form.control}
                              name="decimalPoint"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Decimal Point Precision</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select decimal precision" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0 - No Decimals (e.g., 10)</SelectItem>
                                        <SelectItem value="1">1 - One Decimal Place (e.g., 10.5)</SelectItem>
                                        <SelectItem value="2">2 - Two Decimal Places (e.g., 10.55)</SelectItem>
                                        <SelectItem value="3">3 - Three Decimal Places (e.g., 10.555)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Product Type Selection */}
                            <FormField
                              control={form.control}
                              name="productType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Product Type *</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select product type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="NA">N/A - Not Applicable</SelectItem>
                                        <SelectItem value="FMCG">FMCG - Fast Moving Consumer Goods</SelectItem>
                                        <SelectItem value="Electronics">Electronics & Gadgets</SelectItem>
                                        <SelectItem value="Clothing">Clothing & Apparel</SelectItem>
                                        <SelectItem value="Food">Food & Beverages</SelectItem>
                                        <SelectItem value="HomeGoods">Home Goods</SelectItem>
                                        <SelectItem value="Books">Books & Media</SelectItem>
                                        <SelectItem value="Toys">Toys & Games</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Additional Item Properties */}
                            <div className="mt-6 border-t pt-4">
                              <h4 className="text-sm font-semibold mb-3">Additional Item Properties</h4>
                              <p className="text-xs text-gray-500 mb-3">Configure additional properties for the item:</p>

                              <div className="grid grid-cols-2 gap-6">
                                {/* Perishable Item */}
                                <FormField
                                  control={form.control}
                                  name="perishableItem"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                      <div>
                                        <FormLabel className="text-sm font-medium">Perishable Item</FormLabel>
                                        <p className="text-xs text-gray-500">Indicates if this item is perishable.</p>
                                      </div>
                                      <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Temperature Controlled */}
                                <FormField
                                  control={form.control}
                                  name="temperatureControlled"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                      <div>
                                        <FormLabel className="text-sm font-medium">Temperature Controlled</FormLabel>
                                        <p className="text-xs text-gray-500">Requires temperature-controlled storage.</p>
                                      </div>
                                      <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-6 mt-4">
                                {/* Fragile Item */}
                                <FormField
                                  control={form.control}
                                  name="fragileItem"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                      <div>
                                        <FormLabel className="text-sm font-medium">Fragile Item</FormLabel>
                                        <p className="text-xs text-gray-500">Needs careful handling due to fragility.</p>
                                      </div>
                                      <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Track Serial Numbers */}
                                <FormField
                                  control={form.control}
                                  name="trackSerialNumbers"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                      <div>
                                        <FormLabel className="text-sm font-medium">Track Serial Numbers</FormLabel>
                                        <p className="text-xs text-gray-500">Enable serial number tracking for this item.</p>
                                      </div>
                                      <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                            {/* EAN Code Required Switch */}
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
                                    <div className="space-y-2">
                                      <Input 
                                        {...field} 
                                        placeholder="Enter barcode manually (e.g., 1234567890123)" 
                                        className="font-mono"
                                      />
                                      <div className="flex gap-2">
                                        {/* Generate EAN-13 Button */}
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const randomEAN = '2' + Math.random().toString().slice(2, 14);
                                            field.onChange(randomEAN);
                                          }}
                                        >
                                          Generate EAN-13
                                        </Button>

                                        {/* Generate UPC Button */}
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const randomUPC = Math.random().toString().slice(2, 14);
                                            field.onChange(randomUPC);
                                          }}
                                        >
                                          Generate UPC
                                        </Button>

                                        {/* Clear Barcode Button */}
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => field.onChange("")}
                                        >
                                          Clear Barcode
                                        </Button>
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
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
                              {/* SKU Type */}
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

                              {/* Indent Type */}
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

                            {/* Reorder Parameters */}
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
                              Purchase Order Configuration
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Gate Keeper Margin */}
                            <FormField
                              control={form.control}
                              name="gateKeeperMargin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Gate Keeper Margin %</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter margin percentage" type="number" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Purchase Settings */}
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
                                  <Input placeholder="Enter lead time" type="number" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Mobile App Config Section */}
                      {currentSection === "mobile-app-config" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <SettingsIcon className="w-5 h-5" />
                              Mobile App Config
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Mobile App Settings</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Configure mobile application specific settings for this product.
                              </p>
                              <div className="space-y-3">
                                {/* Show on Mobile Dashboard */}
                                <FormField
                                  control={form.control}
                                  name="showOnMobileDashboard"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Show on Mobile Dashboard</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Enable Mobile Notifications */}
                                <FormField
                                  control={form.control}
                                  name="enableMobileNotifications"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Enable Mobile Notifications</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Quick Add to Cart */}
                                <FormField
                                  control={form.control}
                                  name="quickAddToCart"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Quick Add to Cart</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
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
                            {/* Item Ingredients */}
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

                            {/* Compliance Information */}
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Compliance Information</h3>
                              <div className="space-y-3">
                                {/* FDA Approved */}
                                <FormField
                                  control={form.control}
                                  name="fdaApproved"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">FDA Approved</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* BIS Certified */}
                                <FormField
                                  control={form.control}
                                  name="bisCertified"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">BIS Certified</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Organic Certified */}
                                <FormField
                                  control={form.control}
                                  name="organicCertified"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Organic Certified</FormLabel>
                                      <FormControl>
                                        <Switch 
                                          checked={field.value || false} 
                                          onCheckedChange={field.onChange} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Additional Notes */}
                            <div className="mt-6 border-t pt-4">
                              <h4 className="text-sm font-semibold mb-3">Additional Notes</h4>
                              <p className="text-xs text-gray-500 mb-3">Any additional notes or special instructions for this product:</p>
                              <Textarea placeholder="Enter additional notes here" rows={3} />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Section Navigation */}
                      <div className="flex items-center justify-between pt-6 border-t">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const currentIndex = sidebarSections.findIndex(s => s.id === currentSection);
                              if (currentIndex > 0) {
                                setCurrentSection(sidebarSections[currentIndex - 1].id);
                              }
                            }}
                            disabled={sidebarSections.findIndex(s => s.id === currentSection) === 0}
                          >
                            Previous Section
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const currentIndex = sidebarSections.findIndex(s => s.id === currentSection);
                              if (currentIndex < sidebarSections.length - 1) {
                                setCurrentSection(sidebarSections[currentIndex + 1].id);
                              }
                            }}
                            disabled={sidebarSections.findIndex(s => s.id === currentSection) === sidebarSections.length - 1}
                          >
                            Next Section
                          </Button>
                        </div>

                        <div className="flex gap-2">
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
                            className="bg-green-600 hover:bg-green-700"
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
                      </div>
                    </CardContent>
                  </Card>
                )}

              </form>
            </Form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}