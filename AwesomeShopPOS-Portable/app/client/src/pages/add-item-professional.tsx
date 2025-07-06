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
  Loader2Icon
} from "lucide-react";
import { RefreshCw } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Supplier, Product } from "@shared/schema";
import { 
  calculateGSTBreakdown, 
  suggestGSTRate, 
  generateAlias as autoGenerateAlias, 
  HSN_CODE_DATABASE, 
  formatGSTBreakdown,
  validateHSNCode
} from "@/lib/gst-calculator";

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
  barcodeType: z.string().optional(),

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

  // Extract edit ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!editId;

  console.log('Edit mode:', isEditMode, 'Edit ID:', editId); // Debug log

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

  // Generate sequential item code
  const generateItemCode = () => {
    // Get all existing products to find the highest item code number
    const existingProducts = allProducts || [];
    let maxNumber = 0;

    // Extract numbers from existing item codes
    existingProducts.forEach((product: any) => {
      if (product.sku && product.sku.startsWith('ITM')) {
        const numberPart = product.sku.replace('ITM', '');
        const num = parseInt(numberPart);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    // Generate next sequential number
    const nextNumber = (maxNumber + 1).toString().padStart(6, '0');
    return `ITM${nextNumber}`;
  };

  // Generate fallback item code when products aren't loaded yet
  const generateFallbackItemCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ITM${timestamp}`;
  };

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/categories"],
  }) as { data: Category[], isLoading: boolean };

  // Fetch suppliers with enhanced debugging
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      console.log('🏭 Fetching suppliers data...');
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const suppliersData = await response.json();
      console.log('✅ Suppliers data loaded:', suppliersData.length, 'suppliers');
      return suppliersData;
    },
  }) as { data: Supplier[], isLoading: boolean };

  // Fetch all products for bulk item selection
  const { data: allProducts = [], isLoading: isLoadingProducts, error: allProductsError } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Method to refresh all data
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
  };

  // Department options for dynamic selection
  const departmentOptions = [
    "FMCG", "Grocery", "Electronics", "Clothing", "Home & Garden", 
    "Health & Beauty", "Sports & Fitness", "Automotive", "Books & Stationery", 
    "Toys & Games", "Beverages", "Dairy & Frozen", "Personal Care", "Hardware"
  ];

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

  // Watch form values for dynamic calculations
  const watchedValues = form.watch();

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

  // Function to create bulk item - moved here to be accessible in JSX
  const createBulkItem = async (bulkItemName: string) => {
    try {
      const bulkProduct = {
        name: bulkItemName,
        sku: `BULK${Date.now()}`,
        description: `Bulk item for repackaging - ${bulkItemName}`,
        price: "0",
        cost: "0", 
        mrp: "0",
        weight: "1",
        weightUnit: "kg",
        categoryId: categories.length > 0 ? categories[0].id : 1,
        stockQuantity: 0,
        alertThreshold: 5,
        barcode: "",
        hsnCode: "",
        cgstRate: "9",
        sgstRate: "9", 
        igstRate: "0",
        cessRate: "0",
        taxCalculationMethod: "exclusive",
        manufacturerName: form.getValues("manufacturerName") || "",
        supplierName: suppliers.length > 0 ? suppliers[0].name : "",
        manufacturerId: null,
        supplierId: suppliers.length > 0 ? suppliers[0].id : null,
        active: true,
        itemPreparationsStatus: "Bulk",
        alias: `BULK${bulkItemName.replace(/\s+/g, '')}`,
        itemProductType: "Standard",
        department: "Bulk Items",
        weightInGms: "1000"
      };

      const response = await apiRequest("/api/products", "POST", bulkProduct);
      
      if (response.ok) {
        toast({
          title: "Bulk Item Created",
          description: `${bulkItemName} has been created as a bulk item`,
        });
        
        // Refresh products to include the new bulk item
        queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      } else {
        throw new Error("Failed to create bulk item");
      }
    } catch (error) {
      toast({
        title: "Error Creating Bulk Item",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };


  // State for dynamic GST calculations
  const [gstBreakdown, setGstBreakdown] = useState({ cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0, isInterState: false });
  const [isIntraState, setIsIntraState] = useState(true);

  // Dynamic GST calculation and display
  const calculateTotalGST = () => {
    const cgst = parseFloat(watchedValues.cgstRate || '0');
    const sgst = parseFloat(watchedValues.sgstRate || '0'); 
    const igst = parseFloat(watchedValues.igstRate || '0');
    const cess = parseFloat(watchedValues.cessRate || '0');

    if (igst > 0) {
      return igst + cess;
    } else {
      return cgst + sgst + cess;
    }
  };

  // Auto-calculate GST based on HSN code
  const handleHSNCodeChange = (hsnCode: string) => {
    if (validateHSNCode(hsnCode)) {
      const suggestedRate = suggestGSTRate(hsnCode);
      const amount = parseFloat(watchedValues.price || '0');
      
      if (amount > 0) {
        const breakdown = calculateGSTBreakdown(amount, suggestedRate, "MH", "MH");
        setGstBreakdown(breakdown);
        
        if (breakdown.isInterState) {
          form.setValue('igstRate', breakdown.igst.toString());
          form.setValue('cgstRate', '0');
          form.setValue('sgstRate', '0');
        } else {
          form.setValue('cgstRate', breakdown.cgst.toString());
          form.setValue('sgstRate', breakdown.sgst.toString());
          form.setValue('igstRate', '0');
        }
      }
    }
  };

  // Toggle between Intra-State and Inter-State GST
  const toggleGSTType = () => {
    const newIsIntraState = !isIntraState;
    setIsIntraState(newIsIntraState);
    
    const totalRate = calculateTotalGST();
    
    if (newIsIntraState) {
      // Split into CGST + SGST
      const half = totalRate / 2;
      form.setValue('cgstRate', half.toString());
      form.setValue('sgstRate', half.toString());
      form.setValue('igstRate', '0');
    } else {
      // Combine into IGST
      form.setValue('igstRate', totalRate.toString());
      form.setValue('cgstRate', '0');
      form.setValue('sgstRate', '0');
    }
  };

  // Dynamic alias generation
  const generateAlias = (itemName: string, manufacturer: string) => {
    if (!itemName) return '';

    const nameWords = itemName.split(' ').slice(0, 2);
    const manufacturerPrefix = manufacturer ? manufacturer.substring(0, 3).toUpperCase() : '';

    return `${manufacturerPrefix}${nameWords.join('')}`.substring(0, 15);
  };

  // Auto-update alias when item name or manufacturer changes
  useEffect(() => {
    const itemName = watchedValues.itemName;
    const manufacturer = watchedValues.manufacturerName;

    if (itemName && !watchedValues.alias) {
      const generatedAlias = generateAlias(itemName || '', manufacturer || '');
      form.setValue('alias', generatedAlias);
    }
  }, [watchedValues.itemName, watchedValues.manufacturerName, form]);

  // Enhanced dynamic data uploading and form synchronization for edit mode
  useEffect(() => {
    if (isEditMode && editingProduct && !isLoadingProduct && categories.length > 0 && suppliers.length > 0) {
      console.log('🔄 Dynamic data upload - Populating edit form with product data:', editingProduct);

      // Enhanced GST calculation with better accuracy
      const cgstRate = parseFloat(editingProduct.cgstRate?.toString() || '0');
      const sgstRate = parseFloat(editingProduct.sgstRate?.toString() || '0');
      const igstRate = parseFloat(editingProduct.igstRate?.toString() || '0');
      const cessRate = parseFloat(editingProduct.cessRate?.toString() || '0');
      const totalGst = cgstRate + sgstRate + igstRate + cessRate;

      // Dynamic GST code determination with better mapping
      let gstCode = 'GST 18%'; // Default
      if (totalGst === 0) gstCode = 'GST 0%';
      else if (totalGst === 5) gstCode = 'GST 5%';
      else if (totalGst === 12) gstCode = 'GST 12%';
      else if (totalGst === 18) gstCode = 'GST 18%';
      else if (totalGst === 28) gstCode = 'GST 28%';
      else if (totalGst > 0) gstCode = `GST ${totalGst}%`; // Custom rate

      // Dynamic category resolution
      const category = categories.find((cat: any) => cat.id === editingProduct.categoryId);
      console.log('📂 Dynamic category mapping:', { categoryId: editingProduct.categoryId, category: category?.name });

      // Enhanced manufacturer and supplier resolution
      const matchedManufacturer = suppliers.find((sup: any) => 
        sup.name === editingProduct.manufacturerName || 
        sup.id === editingProduct.manufacturerId
      );
      const matchedSupplier = suppliers.find((sup: any) => 
        sup.name === editingProduct.supplierName || 
        sup.id === editingProduct.supplierId
      );

      console.log('🏭 Dynamic manufacturer/supplier mapping:', { 
        manufacturerName: editingProduct.manufacturerName,
        supplierName: editingProduct.supplierName,
        matchedManufacturer: matchedManufacturer?.name,
        matchedSupplier: matchedSupplier?.name 
      });

      // Comprehensive form data with enhanced field mapping
      const formData = {
        // Item Information - Enhanced with proper supplier matching
        itemCode: editingProduct.sku || "",
        itemName: editingProduct.name || "",
        manufacturerName: matchedManufacturer?.name || editingProduct.manufacturerName || "",
        supplierName: matchedSupplier?.name || editingProduct.supplierName || "",
        alias: editingProduct.alias || "",
        aboutProduct: editingProduct.description || "",

        // Category Information - Dynamic
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
        cgstRate: editingProduct.cgstRate?.toString() || "0",
        sgstRate: editingProduct.sgstRate?.toString() || "0",
        igstRate: editingProduct.igstRate?.toString() || "0",
        cessRate: editingProduct.cessRate?.toString() || "0",
        taxCalculationMethod: editingProduct.taxCalculationMethod || "exclusive",

        // EAN Code/Barcode - Enhanced
        eanCodeRequired: editingProduct.eanCodeRequired || false,
        barcode: editingProduct.barcode || "",
        barcodeType: editingProduct.barcodeType || "ean13",

        // Weight & Packing - Comprehensive
        weightsPerUnit: editingProduct.weightsPerUnit || "1",
        bulkWeight: editingProduct.bulkWeight || "",
        bulkWeightUnit: editingProduct.bulkWeightUnit || "kg",
        packingType: editingProduct.packingType || "Bulk",
        unitsPerPack: editingProduct.unitsPerPack || "1",
        batchExpiryDetails: editingProduct.batchExpiryDetails || "Not Required",
        itemPreparationsStatus: editingProduct.itemPreparationsStatus || "Trade As Is",
        grindingCharge: editingProduct.grindingCharge || "",
        weightInGms: editingProduct.weightInGms || "",
        bulkItemName: editingProduct.bulkItemName || "",
        repackageUnits: editingProduct.repackageUnits || "",
        repackageType: editingProduct.repackageType || "",
        packagingMaterial: editingProduct.packagingMaterial || "",

        // Item Properties - Enhanced
        decimalPoint: editingProduct.decimalPoint || "0",
        productType: editingProduct.productType || "NA",
        perishableItem: editingProduct.perishableItem || false,
        temperatureControlled: editingProduct.temperatureControlled || false,
        fragileItem: editingProduct.fragileItem || false,
        trackSerialNumbers: editingProduct.trackSerialNumbers || false,

        // Pricing - Dynamic calculation support
        sellBy: editingProduct.sellBy || "None",
        itemPerUnit: editingProduct.itemPerUnit || "1",
        maintainSellingMrpBy: editingProduct.maintainSellingMrpBy || "Multiple Selling Price & Multiple MRP",
        batchSelection: editingProduct.batchSelection || "Not Applicable",
        isWeighable: editingProduct.isWeighable || false,
        price: editingProduct.price?.toString() || "",
        mrp: editingProduct.mrp?.toString() || "",
        cost: editingProduct.cost?.toString() || "",

        // Reorder Configurations
        skuType: editingProduct.skuType || "Put Away",
        indentType: editingProduct.indentType || "Manual",
        gateKeeperMargin: editingProduct.gateKeeperMargin || "",
        allowItemFree: editingProduct.allowItemFree || false,

        // Mobile App Configurations
        showOnMobileDashboard: editingProduct.showOnMobileDashboard || false,
        enableMobileNotifications: editingProduct.enableMobileNotifications || false,
        quickAddToCart: editingProduct.quickAddToCart || false,

        // Compliance Information
        fdaApproved: editingProduct.fdaApproved || false,
        bisCertified: editingProduct.bisCertified || false,
        organicCertified: editingProduct.organicCertified || false,

        // Additional Information
        itemIngredients: editingProduct.itemIngredients || "",
        weight: editingProduct.weight ? editingProduct.weight.toString() : "",
        weightUnit: editingProduct.weightUnit || "kg",
        categoryId: editingProduct.categoryId || categories[0]?.id || 1,
        stockQuantity: editingProduct.stockQuantity?.toString() || "0",
        active: editingProduct.active !== false,
      };

      console.log('✅ Dynamic form data prepared:', formData);
      console.log('🔄 Uploading overall data dynamically to form...');

      // Apply the dynamic data upload
      form.reset(formData);

      // Trigger reactive updates for dependent fields
      setTimeout(() => {
        console.log('🔄 Triggering reactive field updates...');
        // Ensure category selection triggers dependent updates
        if (category?.name) {
          form.setValue("mainCategory", category.name);
          form.setValue("categoryId", category.id);
        }

        // Update GST breakdown display
        form.setValue("gstCode", gstCode);

        console.log('✅ Dynamic data upload completed successfully');
      }, 100);
    }
  }, [isEditMode, editingProduct, isLoadingProduct, categories, suppliers, form]);

  // Dynamic data synchronization watcher
  useEffect(() => {
    if (isEditMode && editingProduct) {
      console.log('🔄 Dynamic data sync active for product ID:', editId);

      // Watch for form changes and log them
      const subscription = form.watch((value, { name, type }) => {
        if (type === 'change' && name) {
          console.log(`📝 Dynamic field update: ${name} = ${value[name]}`);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [isEditMode, editingProduct, form, editId]);

  // Update item code when products data loads (only for create mode)
  useEffect(() => {
    if (!isEditMode && allProducts && allProducts.length > 0) {
      const currentItemCode = form.getValues('itemCode');
      // Only update if current code is a fallback code (contains timestamp) or empty
      if (!currentItemCode || (currentItemCode.length === 9 && !currentItemCode.startsWith('ITM0'))) {
        form.setValue('itemCode', generateItemCode());
      }
    }
  }, [isEditMode, allProducts, form]);

  // Enhanced Create/Update product mutation with dynamic data handling
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      console.log('🚀 Starting product mutation with enhanced data:', data);
      console.log(`📊 ${isEditMode ? 'Updating' : 'Creating'} product with dynamic validation...`);

      // Enhanced validation for required fields with better error messages
      const requiredFields = [];
      if (!data.itemName?.trim()) requiredFields.push("Item Name");
      if (!data.itemCode?.trim()) requiredFields.push("Item Code");
      if (!data.price?.trim()) requiredFields.push("Price");

      if (requiredFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${requiredFields.join(", ")}`);
      }

      // Enhanced numeric validation with dynamic checks
      const price = parseFloat(data.price);
      const mrp = data.mrp ? parseFloat(data.mrp) : price;
      const cost = data.cost ? parseFloat(data.cost) : 0;
      const stockQuantity = data.stockQuantity ? parseInt(data.stockQuantity) : 0;

      // Dynamic validation checks
      const validationErrors = [];
      if (isNaN(price) || price <= 0) validationErrors.push("Price must be a valid positive number");
      if (isNaN(stockQuantity) || stockQuantity < 0) validationErrors.push("Stock quantity must be a valid positive number");
      if (mrp > 0 && mrp < price) validationErrors.push("MRP cannot be less than selling price");
      if (cost > 0 && price < cost) validationErrors.push("Selling price should typically be higher than cost price");

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("; "));
      }

      console.log('✅ Dynamic validation passed successfully');

      // Enhanced product data with all form fields
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

        // Enhanced tax breakdown for better synchronization
        cgstRate: data.cgstRate || "0",
        sgstRate: data.sgstRate || "0", 
        igstRate: data.igstRate || "0",
        cessRate: data.cessRate || "0",
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",

        // Enhanced fields for comprehensive data storage with supplier ID resolution
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

      console.log('Submitting enhanced product data:', productData);

      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${editId}` : "/api/products";

      try {
        const res = await apiRequest(method, url, productData);

        if (!res.ok) {
          let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} product`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
            console.error('Server error response:', errorData);
          } catch {
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await res.json();
        console.log('Product operation successful:', result);
        return result;
      } catch (error) {
        console.error('Product operation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      if (isEditMode) {
        toast({
          title: "Success! 🎉", 
          description: `Product "${data.name}" updated successfully`,
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
          description: `Product "${data.name}" created successfully with SKU: ${data.sku}`,
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

  // Enhanced loading state with dynamic upload progress
  if (isEditMode && (isLoadingProduct || isLoadingSuppliers)) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-lg border">
              <Loader2Icon className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Loading Product Data...</h2>
              <p className="text-gray-600 mb-4">Uploading overall data dynamically for edit mode including suppliers</p>

              {/* Dynamic progress indicator */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!isLoadingProduct ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Fetching product information...</span>
                </div>
                <div className={`flex items-center justify-center gap-2`}>
                  <div className={`w-2 h-2 rounded-full ${!isLoadingSuppliers ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Loading suppliers data...</span>
                </div>
                <div className={`flex items-center justify-center gap-2`}>
                  <div className={`w-2 h-2 rounded-full ${!isLoadingCategories ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                  <span>Loading categories data...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Preparing dynamic form...</span>
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
                  {isEditMode ? "Edit Item" : "Add Item"}
                </h1>
                {isEditMode && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <EditIcon className="w-3 h-3 mr-1" />
                    Edit Mode
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">{isEditMode ? "Edit Mode" : "Add New Item"}</div>
                <div className="text-lg font-semibold text-blue-600">Professional System</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={isLoadingSuppliers || isLoadingCategories || isLoadingProducts}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSuppliers || isLoadingCategories || isLoadingProducts ? 'animate-spin' : ''}`} />
                Refresh Data
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

              {/* Progress Indicator */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-2">
                  Section {sidebarSections.findIndex(s => s.id === currentSection) + 1} of {sidebarSections.length}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{
                      width: `${((sidebarSections.findIndex(s => s.id === currentSection) + 1) / sidebarSections.length) * 100}%`
                    }}
                  ></div>
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

                      {/* Section status indicators */}
                      {isCurrent && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      )}
                      {isCompleted && !isCurrent && (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      )}
                      {section.id === "packing" && !isCompleted && !isCurrent && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
                <div className="space-y-1">
                  <button
                    onClick={() => setCurrentSection("item-information")}
                    className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Go to Start
                  </button>
                  <button
                    onClick={() => {
                      const lastSection = sidebarSections[sidebarSections.length - 1];
                      setCurrentSection(lastSection.id);
                    }}
                    className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Skip to End
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                console.log("Form submission data:", data);

                // Additional validation for repackaging
                if (data.itemPreparationsStatus === "Repackage") {
                  if (!data.bulkItemName) {
                    toast({
                      title: "Validation Error",
                      description: "Please select a bulk item for repackaging",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!data.weightInGms) {
                    toast({
                      title: "Validation Error", 
                      description: "Please specify the weight for repackaged units",
                      variant: "destructive",
                    });
                    return;
                  }
                }

                createProductMutation.mutate(data);
              })} className="space-y-6">

                {/* Item Information Section */}
                {currentSection === "item-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        Item Information
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
                        <div />
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
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    // Auto-update alias when manufacturer changes
                                    if (watchedValues.itemName) {
                                      const newAlias = generateAlias(watchedValues.itemName, value);
                                      form.setValue('alias', newAlias);
                                    }
                                  }} 
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manufacturer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSuppliers ? (
                                      <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
                                    ) : suppliers.length > 0 ? (
                                      suppliers.map((supplier: Supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.name}>
                                          <div className="flex items-center justify-between w-full">
                                            <span>{supplier.name}</span>
                                            {supplier.city && (
                                              <span className="text-xs text-gray-500 ml-2">
                                                {supplier.city}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-suppliers" disabled>No suppliers available</SelectItem>
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
                              <FormLabel>Supplier Name *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSuppliers ? (
                                      <SelectItem value="loading" disabled>Loading suppliers...</SelectItem>
                                    ) : suppliers.length > 0 ? (
                                      suppliers.map((supplier: Supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.name}>
                                          <div className="flex items-center justify-between w-full">
                                            <span>{supplier.name}</span>
                                            <div className="text-xs text-gray-500 ml-2">
                                              {supplier.phone && <div>📞 {supplier.phone}</div>}
                                              {supplier.email && <div>✉️ {supplier.email}</div>}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="no-suppliers" disabled>No suppliers available</SelectItem>
                                    )}
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
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                Auto-generated
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Product alias (auto-generated from name + manufacturer)"
                                className="bg-green-50 border-green-200"
                              />
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
                          <h3 className="text-blue-600 font-medium">Category</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">DEPARTMENT *</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64 overflow-y-auto">
                                      {departmentOptions.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            {dept}
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
                                <FormLabel className="text-sm font-medium text-gray-700">MAIN CATEGORY</FormLabel>
                                <FormControl>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Also update the categoryId for the backend
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
                              <FormLabel className="flex items-center gap-2">
                                HSN Code
                                {field.value && field.value.length >= 6 && (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                    ✓ Valid HSN
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Input 
                                    value={field.value || ""}
                                    placeholder="Enter HSN Code manually (e.g., 10019000)" 
                                    maxLength={8}
                                    onChange={async (e) => {
                                      const hsnValue = e.target.value.replace(/\D/g, ''); // Only allow digits
                                      field.onChange(hsnValue);

                                      // Auto-lookup tax rates from database when HSN code is valid
                                      if (hsnValue.length >= 4) {
                                        try {
                                          // First try to fetch exact HSN code from our tax database
                                          const response = await fetch(`/api/tax/hsn-codes/${hsnValue}/rates`);
                                          if (response.ok) {
                                            const taxRates = await response.json();
                                            
                                            // Apply the tax rates from database
                                            form.setValue("cgstRate", taxRates.cgst || "0");
                                            form.setValue("sgstRate", taxRates.sgst || "0");
                                            form.setValue("igstRate", taxRates.igst || "0");
                                            form.setValue("cessRate", taxRates.cess || "0");

                                            // Calculate total GST rate for display
                                            const totalGst = parseFloat(taxRates.cgst || "0") + parseFloat(taxRates.sgst || "0") + parseFloat(taxRates.igst || "0");
                                            form.setValue("gstCode", `GST ${totalGst}%`);

                                            console.log(`HSN ${hsnValue}: Found in database - CGST: ${taxRates.cgst}%, SGST: ${taxRates.sgst}%, IGST: ${taxRates.igst}%`);
                                            return;
                                          }
                                        } catch (error) {
                                          console.log('Database lookup failed, using fallback logic');
                                        }

                                        // Fallback to manual HSN code logic if database lookup fails
                                        let suggestedGst = "";
                                        let suggestedDescription = "";

                                        if (hsnValue.startsWith("04") || hsnValue.startsWith("07") || hsnValue.startsWith("08") || hsnValue.startsWith("1006") || hsnValue.startsWith("1701") || hsnValue.startsWith("0401")) {
                                          suggestedGst = "GST 0%";
                                          suggestedDescription = "Basic food items - Nil rate";
                                        } else if (hsnValue.startsWith("10") || hsnValue.startsWith("15") || hsnValue.startsWith("17") || hsnValue.startsWith("21") || hsnValue.startsWith("30") || hsnValue.startsWith("49") || hsnValue.startsWith("1905") || hsnValue.startsWith("0712")) {
                                          suggestedGst = "GST 5%";
                                          suggestedDescription = "Essential goods - Food items, medicines";
                                        } else if (hsnValue.startsWith("62") || hsnValue.startsWith("6203") || hsnValue.startsWith("48") || hsnValue.startsWith("90")) {
                                          suggestedGst = "GST 12%";
                                          suggestedDescription = "Standard rate - Textiles, electronics";
                                        } else if (hsnValue.startsWith("33") || hsnValue.startsWith("34") || hsnValue.startsWith("64") || hsnValue.startsWith("84") || hsnValue.startsWith("85") || hsnValue.startsWith("8517") || hsnValue.startsWith("8471") || hsnValue.startsWith("96") || hsnValue.startsWith("19")) {
                                          suggestedGst = "GST 18%";
                                          suggestedDescription = "Standard rate - Most goods & services";
                                        } else if (hsnValue.startsWith("22") || hsnValue.startsWith("24") || hsnValue.startsWith("2402") || hsnValue.startsWith("2208") || hsnValue.startsWith("87032") || hsnValue.startsWith("87111")) {
                                          suggestedGst = "GST 28%";
                                          suggestedDescription = "Luxury goods - Cars, tobacco";
                                        } else if (hsnValue.startsWith("71") || hsnValue.startsWith("7113") || hsnValue.startsWith("7114") || hsnValue.startsWith("7116") || hsnValue.startsWith("9701") || hsnValue.startsWith("9702") || hsnValue.startsWith("9703") || hsnValue.startsWith("8801") || hsnValue.startsWith("8802") || hsnValue.startsWith("8903") || hsnValue.startsWith("9401")) {
                                          suggestedGst = "GST 40%";
                                          suggestedDescription = "Premium luxury - Jewelry, art, aircraft";
                                        }

                                        if (suggestedGst) {
                                          form.setValue("gstCode", suggestedGst);

                                          // Auto-calculate GST breakdown for intra-state transactions
                                          const gstRate = parseFloat(suggestedGst.replace("GST ", "").replace("%", ""));
                                          if (gstRate > 0) {
                                            const cgstSgstRate = (gstRate / 2).toString();
                                            form.setValue("cgstRate", cgstSgstRate);
                                            form.setValue("sgstRate", cgstSgstRate);
                                            form.setValue("igstRate", "0");
                                            form.setValue("cessRate", "0");
                                          } else {
                                            form.setValue("cgstRate", "0");
                                            form.setValue("sgstRate", "0");
                                            form.setValue("igstRate", "0");
                                            form.setValue("cessRate", "0");
                                          }

                                          console.log(`HSN ${hsnValue}: ${suggestedGst} - ${suggestedDescription}`);
                                        }
                                      }
                                    }}
                                    className={`${field.value && field.value.length >= 6 ? 'border-green-500 bg-green-50' : ''}`}
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
                                    } else if (value.includes("71131900") || value.includes("97011000") || value.includes("97021000") || value.includes("88011000") || value.includes("88021100")) {
                                      suggestedGst = "GST 40%";
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

                                      {/* Premium Luxury Items - 40% GST */}
                                      <SelectItem value="71131900">71131900 - Gold Jewelry (40%)</SelectItem>
                                      <SelectItem value="97011000">97011000 - Paintings & Art (40%)</SelectItem>
                                      <SelectItem value="97021000">97021000 - Antiques (40%)</SelectItem>
                                      <SelectItem value="88011000">88011000 - Aircraft (40%)</SelectItem>
                                      <SelectItem value="88021100">88021100 - Helicopters (40%)</SelectItem>
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
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-calculate breakdown when GST code changes
                                  const gstRate = parseFloat(value.replace("GST ","").replace("%", ""));
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
                                    <SelectItem value="GST 40%">GST 40% - Premium luxury goods (High-end items)</SelectItem>
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
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                          GST Breakdown & Compliance
                        </h4>

                        {/* Dynamic Tax Summary Display */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-200">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">Total GST Rate</div>
                              <div className="text-xl font-bold text-blue-900">
                                {calculateTotalGST().toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">CGST + SGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {parseFloat(watchedValues.cgstRate || "0").toFixed(2)}% + {parseFloat(watchedValues.sgstRate || "0").toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">IGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {parseFloat(watchedValues.igstRate || "0").toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">Cess</div>
                              <div className="text-lg font-bold text-orange-600">
                                {parseFloat(watchedValues.cessRate || "0").toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {/* Tax calculation indicator */}
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-600">
                                Tax Method: {watchedValues.taxCalculationMethod || 'exclusive'}
                              </span>
                              <span className="text-green-600 bg-green-100 px-2 py-1 rounded">
                                {parseFloat(watchedValues.igstRate || "0") > 0 ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                              </span>
                            </div>
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
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.trigger("taxCalculationMethod");
                                  }} 
                                  value={field.value || "exclusive"}
                                >
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

                        {/* Tax Information Help */}
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h5 className="font-medium text-yellow-800 mb-1">Tax Information Guidelines</h5>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• For intra-state transactions: Use CGST + SGST</li>
                            <li>• For inter-state transactions: Use IGST only</li>
                            <li>• Total GST = CGST + SGST or IGST (whichever applicable)</li>
                            <li>• HSN codes help determine the correct tax rates automatically</li>
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

                      {/* Live Pricing Calculations Display */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mt-4">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                          Live Pricing Calculations
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-green-700 font-medium">Selling Price</div>
                            <div className="text-lg font-bold text-green-900">
                              ₹{parseFloat(watchedValues.price || "0").toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-green-700 font-medium">MRP</div>
                            <div className="text-lg font-bold text-green-900">
                              ₹{parseFloat(watchedValues.mrp || "0").toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-green-700 font-medium">Profit Margin</div>
                            <div className="text-lg font-bold text-blue-600">
                              {(() => {
                                const cost = parseFloat(watchedValues.cost || "0");
                                const price = parseFloat(watchedValues.price || "0");
                                if (cost > 0 && price > 0) {
                                  const margin = ((price - cost) / cost * 100);
                                  return `${margin.toFixed(1)}%`;
                                }
                                return "0%";
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Tax inclusive price calculation */}
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600">Tax Inclusive Price:</span>
                            <span className="font-bold text-green-800">
                              ₹{(() => {
                                const price = parseFloat(watchedValues.price || "0");
                                const totalGst = calculateTotalGST();
                                const taxInclusivePrice = price + (price * totalGst / 100);
                                return taxInclusivePrice.toFixed(2);
                              })()}
                            </span>
                          </div>
                        </div>
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
                              <div className="space-y-2">
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
                                  <Select 
                                    value={field.value || ""}
                                    onValueChange={field.onChange}
                                  >
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
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BoxIcon className="w-5 h-5" />
                              Weight & Packing Configuration
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

                            <div className="space-y-6">
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

                              {/* Enhanced Bulk Item Selection with Details - Only for Repackage */}
                              {form.watch("itemPreparationsStatus") === "Repackage" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Left Side - Bulk Item Selection */}
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name="bulkItemName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-red-600">Select Bulk Item to Repackage *</FormLabel>
                                          <FormControl>
                                            <Select 
                                              onValueChange={(value) => {
                                                if (value === "create-new") {
                                                  // Don't change field value, let user type custom name
                                                  return;
                                                }
                                                field.onChange(value);
                                                // Auto-populate bulk item details when selected
                                                const selectedProduct = bulkItems?.find((p: any) => p.name === value) || allProducts?.find((p: any) => p.name === value);
                                                if (selectedProduct) {
                                                  form.setValue("cost", selectedProduct.price?.toString() || "0");
                                                  form.setValue("mrp", selectedProduct.mrp?.toString() || "0");
                                                }
                                              }} 
                                              value={field.value || ""}
                                            >
                                              <SelectTrigger className="border-red-300 focus:border-red-500">
                                                <SelectValue placeholder="Select or type bulk item name" />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                                {/* Option to create new bulk item */}
                                                <SelectItem value="create-new" className="bg-blue-50 font-medium">
                                                  ➕ Create New Bulk Item
                                                </SelectItem>
                                                
                                                {/* Existing bulk items */}
                                                {bulkItems && bulkItems.length > 0 ? (
                                                  bulkItems.map((product: any) => (
                                                    <SelectItem key={`bulk-${product.id}`} value={product.name}>
                                                      <div className="flex flex-col">
                                                        <div className="font-medium">
                                                          {product.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          SKU: {product.sku} • Stock: {product.stockQuantity} • 
                                                          Weight: {product.weight || 1}{product.weightUnit || 'kg'} • 
                                                          Price: ₹{product.price}
                                                        </div>
                                                      </div>
                                                    </SelectItem>
                                                  ))
                                                ) : null}
                                                
                                                {/* All products as fallback */}
                                                {allProducts && allProducts.length > 0 ? (
                                                  allProducts.filter((product: any) => !bulkItems?.find((b: any) => b.id === product.id)).map((product: any) => (
                                                    <SelectItem key={`product-${product.id}`} value={product.name}>
                                                      <div className="flex flex-col">
                                                        <div className="font-medium">
                                                          {product.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                          SKU: {product.sku} • Stock: {product.stockQuantity} • 
                                                          Weight: {product.weight || 1}{product.weightUnit || 'kg'} • 
                                                          Price: ₹{product.price}
                                                        </div>
                                                      </div>
                                                    </SelectItem>
                                                  ))
                                                ) : null}
                                              </SelectContent>
                                            </Select>
                                          </FormControl>
                                          
                                          {/* Custom input field for manual entry */}
                                          <div className="mt-2">
                                            <Input
                                              placeholder="Or type custom bulk item name (e.g., VELLAM BULK)"
                                              value={field.value || ""}
                                              onChange={(e) => {
                                                field.onChange(e.target.value);
                                              }}
                                              className="border-blue-300 focus:border-blue-500"
                                            />
                                          </div>
                                    <div className="text-xs text-red-500 mt-1">
                                      Bulk Item Name is required for repackaging
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                                  />
                                  </div>

                                  {/* Right Side - Bulk Item Details */}
                                  <div>
                                    {form.watch("bulkItemName") && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-500 text-white text-center py-2 font-semibold text-sm">
                                          Bulk Item Details
                                        </div>

                                        <div className="p-4 space-y-3 text-sm">
                                          {(() => {
                                            const selectedBulkItem = bulkItems?.find((p: any) => p.name === form.watch("bulkItemName")) || 
                                                                   allProducts?.find((p: any) => p.name === form.watch("bulkItemName"));
                                            
                                            if (!selectedBulkItem && form.watch("bulkItemName")) {
                                              return (
                                                <div className="text-center text-gray-500 py-4">
                                                  <p className="text-sm mb-3">"{form.watch("bulkItemName")}" not found in inventory</p>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                      // Create bulk item with the selected name
                                                      const bulkItemName = form.watch("bulkItemName");
                                                      if (bulkItemName) {
                                                        createBulkItem(bulkItemName);
                                                      }
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-medium"
                                                  >
                                                    ➕ Create "{form.watch("bulkItemName")}" as Bulk Item
                                                  </Button>
                                                  <p className="text-xs mt-2 text-gray-400">
                                                    This will create a new bulk product that you can use for repackaging
                                                  </p>
                                                </div>
                                              );
                                            }
                                            
                                            if (!selectedBulkItem) {
                                              return (
                                                <div className="text-center text-gray-500 py-4">
                                                  <p className="text-sm">Type a bulk item name above to get started</p>
                                                  <p className="text-xs mt-1">You can select existing items or create new ones</p>
                                                </div>
                                              );
                                            }

                                            return (
                                              <>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Bulk Code:</span>
                                                  <span className="bg-gray-100 px-2 py-1 rounded text-center font-mono text-xs">
                                                    {selectedBulkItem.sku || 'N/A'}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Bulk Item:</span>
                                                  <span className="bg-gray-100 px-2 py-1 rounded text-center text-xs">
                                                    {selectedBulkItem.name?.toUpperCase()}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Available Stock:</span>
                                                  <span className={`px-2 py-1 rounded text-center text-xs font-semibold ${
                                                    selectedBulkItem.stockQuantity > 10 ? 'bg-green-100 text-green-800' :
                                                    selectedBulkItem.stockQuantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                  }`}>
                                                    {selectedBulkItem.stockQuantity || 0} units
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Unit Cost:</span>
                                                  <span className="bg-yellow-100 px-2 py-1 rounded text-center text-xs font-semibold">
                                                    ₹{parseFloat(selectedBulkItem.price || 0).toFixed(2)}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Bulk MRP:</span>
                                                  <span className="bg-yellow-100 px-2 py-1 rounded text-center text-xs font-semibold">
                                                    ₹{parseFloat(selectedBulkItem.mrp || 0).toFixed(2)}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                  <span className="font-medium text-gray-700">Unit Weight:</span>
                                                  <span className="bg-gray-100 px-2 py-1 rounded text-center text-xs">
                                                    {selectedBulkItem.weight || 1}{selectedBulkItem.weightUnit || 'kg'}
                                                  </span>
                                                </div>

                                                <div className="border-t pt-3 mt-3">
                                                  <Button
                                                    type="button"
                                                    onClick={() => {
                                                      // Debug: Check selectedBulkItem data
                                                      console.log('🔍 selectedBulkItem data:', selectedBulkItem);
                                                      console.log('💰 Pricing debug:', {
                                                        cost: selectedBulkItem.cost,
                                                        price: selectedBulkItem.price,
                                                        mrp: selectedBulkItem.mrp
                                                      });
                                                      
                                                      // Navigate to repacking-professional with pre-filled data
                                                      const repackingData = {
                                                        bulkProduct: {
                                                          id: selectedBulkItem.id,
                                                          name: selectedBulkItem.name,
                                                          sku: selectedBulkItem.sku,
                                                          costPrice: parseFloat(selectedBulkItem.cost || "0"), // Cost Price
                                                          sellingPrice: parseFloat(selectedBulkItem.price || "0"), // Selling Price
                                                          mrp: parseFloat(selectedBulkItem.mrp || "0"), // MRP
                                                          weight: selectedBulkItem.weight,
                                                          weightUnit: selectedBulkItem.weightUnit,
                                                          stockQuantity: selectedBulkItem.stockQuantity,
                                                          category: selectedBulkItem.category,
                                                          supplier: selectedBulkItem.supplier
                                                        },
                                                        newProduct: {
                                                          itemCode: form.getValues("itemCode"),
                                                          itemName: form.getValues("itemName"),
                                                          manufacturerName: form.getValues("manufacturerName"),
                                                          alias: form.getValues("alias")
                                                        }
                                                      };
                                                      
                                                      console.log('💾 Storing repackingData:', repackingData);
                                                      
                                                      // Store data in localStorage for repacking-professional
                                                      localStorage.setItem('repackingIntegrationData', JSON.stringify(repackingData));
                                                      
                                                      // Verify data was stored
                                                      const stored = localStorage.getItem('repackingIntegrationData');
                                                      console.log('✅ Data stored successfully:', stored);
                                                      
                                                      // Navigate to repacking-professional
                                                      setLocation('/repacking-professional');
                                                    }}
                                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                                                  >
                                                    <PackageIcon className="w-4 h-4" />
                                                    Start Professional Repackaging
                                                  </Button>
                                                  
                                                  <div className="text-xs text-gray-600 text-center mt-2">
                                                    Last Updated: {new Date().toLocaleDateString()}
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
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
                                        <p>• Bulk item: {form.watch("bulkItemName") || "Not selected"}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Quick Unit Conversion Buttons */}
                                  <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Unit Templates:</label>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          form.setValue("weightInGms", "250");
                                          form.setValue("repackageUnits", "4");
                                        }}
                                        className="text-xs"
                                      >
                                        1kg → 4×250g
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          form.setValue("weightInGms", "500");
                                          form.setValue("repackageUnits", "2");
                                        }}
                                        className="text-xs"
                                      >
                                        1kg → 2×500g
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          form.setValue("weightInGms", "100");
                                          form.setValue("repackageUnits", "10");
                                        }}
                                        className="text-xs"
                                      >
                                        1kg → 10×100g
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          form.setValue("weightInGms", "50");
                                          form.setValue("repackageUnits", "20");
                                        }}
                                        className="text-xs"
                                      >
                                        1kg → 20×50g
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Conditional Weight in Gms Field for other statuses */}
                            {(form.watch("itemPreparationsStatus") === "Open Item" || 
                              form.watch("itemPreparationsStatus") === "Weight to Piece" ||
                              form.watch("itemPreparationsStatus") === "Bulk") && 
                              form.watch("itemPreparationsStatus") !== "Repackage" && (
                              <div>
                                <div className="grid grid-cols-2 gap-6">
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
                                        <div className="text-xs text-red-500 mt-1">Weight(gms) is required</div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div />
                                </div>
                              </div>
                            )}
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

                              <div />
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

                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Pricing Information</h3>
                              <div className="grid grid-cols-2 gap-4">
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

                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <FormField
                                  control={form.control}
                                  name="cost"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cost Price *</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="0.00" 
                                          type="number" 
                                          step="0.01"
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value);
                                            // Auto-update selling price if not set and not in edit mode
                                            if (!isEditMode) {
                                              const currentSellingPrice = form.getValues("price");
                                              if (!currentSellingPrice || currentSellingPrice === "0" || currentSellingPrice === "") {
                                                const costValue = parseFloat(value) || 0;
                                                const suggestedPrice = costValue * 1.2; // 20% markup
                                                form.setValue("price", suggestedPrice.toString());
                                              }
                                            }
                                          }}
                                        />
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
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Weight</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Weight of item" type="number" />
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
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select unit" />
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

                            <div className="bg-purple-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Additional Properties</h3>
                              <div className="space-y-3">
                                <FormField
                                  control={form.control}
                                  name="perishableItem"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Perishable Item</FormLabel>
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
                                <FormField
                                  control={form.control}
                                  name="temperatureControlled"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Temperature Controlled</FormLabel>
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
                                <FormField
                                  control={form.control}
                                  name="fragileItem"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Fragile Item</FormLabel>
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
                                <FormField
                                  control={form.control}
                                  name="trackSerialNumbers"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Track Serial Numbers</FormLabel>
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

                      {/* Section Navigation */}
                      <div className="flex justify-between items-center pt-6 border-t">
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const sections = sidebarSections.map(s => s.id);
                              const currentIndex = sections.indexOf(currentSection);
                              if (currentIndex > 0) {
                                setCurrentSection(sections[currentIndex - 1]);
                              }
                            }}
                            disabled={sidebarSections.findIndex(s => s.id === currentSection) === 0}
                          >
                            ← Previous
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const sections = sidebarSections.map(s => s.id);
                              const currentIndex = sections.indexOf(currentSection);
                              if (currentIndex < sections.length - 1) {
                                setCurrentSection(sections[currentIndex + 1]);
                              }
                            }}
                            disabled={sidebarSections.findIndex(s => s.id === currentSection) === sidebarSections.length - 1}
                          >
                            Next →
                          </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              console.log('Cancel/Reset button clicked');
                              if (isEditMode) {
                                setLocation("/add-item-dashboard");
                              } else {
                                form.reset();
                                // Generate new item code for next item
                                const newCode = allProducts ? generateItemCode() : generateFallbackItemCode();
                                form.setValue('itemCode', newCode);
                              }
                            }}
                          >
                            {isEditMode ? "Cancel Edit" : "Reset Form"}
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createProductMutation.isPending} 
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {createProductMutation.isPending ? (
                              <>
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                {isEditMode ? "Updating..." : "Adding..."}
                              </>
                            ) : (
                              isEditMode ? "Update Product" : "Add Product"
                            )}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          </DashboardLayout>
        );
      }