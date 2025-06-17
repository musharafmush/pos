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
  SaveIcon,
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
  taxSelectionMode: z.string().default("auto"),

  // EAN Code/Barcode
  eanCodeRequired: z.boolean().default(false),
  barcode: z.string().optional(),

  // Weight & Packing
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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<ProductFormValues | null>(null);

  // Extract edit ID from URL parameters with better validation
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const isEditMode = !!(editId && editId !== 'null' && editId !== 'undefined' && !isNaN(Number(editId)));

  console.log('🔍 Edit mode detection:', { editId, isEditMode });

  // Fetch product data if in edit mode with better error handling
  const { 
    data: editingProduct, 
    isLoading: isLoadingProduct, 
    error: productError,
    refetch: refetchProduct 
  } = useQuery({
    queryKey: ["/api/products", editId],
    queryFn: async () => {
      if (!editId || !isEditMode) return null;

      console.log('📡 Fetching product with ID:', editId);

      try {
        const response = await fetch(`/api/products/${editId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch product:', response.status, errorText);

          if (response.status === 404) {
            throw new Error(`Product with ID ${editId} not found`);
          }

          throw new Error(`Failed to fetch product: ${response.status} - ${errorText}`);
        }

        const product = await response.json();
        console.log('✅ Fetched product for edit:', product);

        if (!product || !product.id) {
          throw new Error('Invalid product data received');
        }

        return product;
      } catch (error) {
        console.error('❌ Product fetch error:', error);
        throw error;
      }
    },
    enabled: isEditMode && !!editId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    }
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

  // Fetch all products for bulk item selection and SKU generation
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products/all"],
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

  // Generate fallback item code when products aren't loaded yet
  const generateFallbackItemCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ITM${timestamp}`;
  };

  // Get default category ID
  const getDefaultCategoryId = () => {
    if (categories && categories.length > 0) {
      return categories[0].id;
    }
    return 1;
  };

  // Set up form with proper default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      itemCode: !isEditMode ? (allProducts.length > 0 ? generateItemCode() : generateFallbackItemCode()) : "",
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
      categoryId: getDefaultCategoryId(),
      stockQuantity: "0",
      active: true,
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "0",
      cessRate: "0",
      taxCalculationMethod: "exclusive",
      taxSelectionMode: "auto",
    },
  });

  // Watch form changes to detect if dirty
  const formValues = form.watch();

  useEffect(() => {
    if (lastSavedData) {
      const hasChanges = JSON.stringify(formValues) !== JSON.stringify(lastSavedData);
      setIsFormDirty(hasChanges);
    }
  }, [formValues, lastSavedData]);

  // Populate form with existing product data when in edit mode
  useEffect(() => {
    if (isEditMode && editingProduct && !isLoadingProduct && categories.length > 0) {
      console.log('🔄 Populating form with product data:', editingProduct);

      // Calculate total GST rate with proper parsing
      const cgstRate = parseFloat(editingProduct.cgstRate?.toString() || '0');
      const sgstRate = parseFloat(editingProduct.sgstRate?.toString() || '0');
      const igstRate = parseFloat(editingProduct.igstRate?.toString() || '0');
      const totalGst = cgstRate + sgstRate + igstRate;

      // Determine GST code based on total rate
      let gstCode = editingProduct.gstCode || 'GST 18%';
      if (!editingProduct.gstCode) {
        if (totalGst === 0) gstCode = 'GST 0%';
        else if (totalGst === 5) gstCode = 'GST 5%';
        else if (totalGst === 12) gstCode = 'GST 12%';
        else if (totalGst === 18) gstCode = 'GST 18%';
        else if (totalGst === 28) gstCode = 'GST 28%';
      }

      // Find category by ID
      const category = categories.find((cat: any) => cat.id === editingProduct.categoryId);

      const formData: ProductFormValues = {
        itemCode: editingProduct.sku || "",
        itemName: editingProduct.name || "",
        manufacturerName: editingProduct.manufacturerName || "",
        supplierName: editingProduct.supplierName || "",
        alias: editingProduct.alias || "",
        aboutProduct: editingProduct.description || "",
        itemProductType: "Standard",
        department: editingProduct.department || "",
        mainCategory: category?.name || "",
        subCategory: editingProduct.subCategory || "",
        brand: editingProduct.brand || "",
        buyer: editingProduct.buyer || "",
        hsnCode: editingProduct.hsnCode || "",
        gstCode: gstCode,
        purchaseGstCalculatedOn: "MRP",
        gstUom: "PIECES",
        purchaseAbatement: "",
        configItemWithCommodity: false,
        seniorExemptApplicable: false,
        eanCodeRequired: false,
        barcode: editingProduct.barcode || "",
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
        price: (editingProduct.price || 0).toString(),
        mrp: (editingProduct.mrp || editingProduct.price || 0).toString(),
        cost: (editingProduct.cost || 0).toString(),
        weight: editingProduct.weight ? editingProduct.weight.toString() : "",
        weightUnit: editingProduct.weightUnit || "kg",
        categoryId: editingProduct.categoryId || categories[0]?.id || 1,
        stockQuantity: (editingProduct.stockQuantity || 0).toString(),
        active: editingProduct.active !== false,
        cgstRate: (editingProduct.cgstRate || "0").toString(),
        sgstRate: (editingProduct.sgstRate || "0").toString(),
        igstRate: (editingProduct.igstRate || "0").toString(),
        cessRate: (editingProduct.cessRate || "0").toString(),
        taxCalculationMethod: editingProduct.taxCalculationMethod || "exclusive",
        taxSelectionMode: editingProduct.taxSelectionMode || "auto",
      };

      console.log('📝 Setting form data:', formData);
      form.reset(formData);
      setLastSavedData(formData);

      // Force trigger validation after setting data
      setTimeout(() => {
        form.trigger();
      }, 100);
    }
  }, [isEditMode, editingProduct, isLoadingProduct, categories, form]);

  // Update item code when products data loads (only for create mode)
  useEffect(() => {
    if (!isEditMode && allProducts && allProducts.length > 0) {
      const currentItemCode = form.getValues('itemCode');
      if (!currentItemCode || (currentItemCode.length === 9 && !currentItemCode.startsWith('ITM0'))) {
        const newCode = generateItemCode();
        form.setValue('itemCode', newCode);
      }
    }
  }, [isEditMode, allProducts, form]);

  // Update categoryId when categories are loaded
  useEffect(() => {
    if (!isEditMode && categories && categories.length > 0) {
      const currentCategoryId = form.getValues('categoryId');
      if (!currentCategoryId || currentCategoryId === 1) {
        form.setValue('categoryId', categories[0].id);
      }
    }
  }, [isEditMode, categories, form]);

  // Create/Update product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      console.log('🚀 Starting product mutation with data:', data);

      // Enhanced validation
      const validationErrors = [];

      if (!data.itemName?.trim()) {
        validationErrors.push("Item Name is required");
      }

      if (!data.itemCode?.trim()) {
        validationErrors.push("Item Code is required");
      }

      if (!data.price?.trim()) {
        validationErrors.push("Price is required");
      }

      if (!data.categoryId || data.categoryId === 0) {
        validationErrors.push("Category selection is required");
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(", "));
      }

      // Enhanced numeric validation
      const price = parseFloat(data.price);
      const mrp = data.mrp?.trim() ? parseFloat(data.mrp) : price;
      const cost = data.cost?.trim() ? parseFloat(data.cost) : 0;
      const stockQuantity = data.stockQuantity?.trim() ? parseInt(data.stockQuantity) : 0;
      const weight = data.weight?.trim() ? parseFloat(data.weight) : null;

      // Validate parsed numbers
      if (isNaN(price) || price <= 0) {
        throw new Error("Price must be a valid positive number");
      }

      if (data.mrp?.trim() && (isNaN(mrp) || mrp < 0)) {
        throw new Error("MRP must be a valid positive number");
      }

      if (data.cost?.trim() && (isNaN(cost) || cost < 0)) {
        throw new Error("Cost must be a valid positive number");
      }

      if (isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error("Stock quantity must be a valid non-negative number");
      }

      if (data.weight?.trim() && (isNaN(weight) || weight <= 0)) {
        throw new Error("Weight must be a valid positive number");
      }

      // Enhanced product data
      const productData = {
        name: data.itemName.trim(),
        sku: data.itemCode.trim(),
        description: data.aboutProduct?.trim() || "",
        price: Number(price.toFixed(2)),
        mrp: Number(mrp.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        weight: weight,
        weightUnit: data.weightUnit || "kg",
        stockQuantity: stockQuantity,
        categoryId: Number(data.categoryId),
        barcode: data.barcode?.trim() || null,
        active: Boolean(data.active),
        alertThreshold: isEditMode ? (editingProduct?.alertThreshold || 5) : 5,
        hsnCode: data.hsnCode?.trim() || null,
        gstCode: data.gstCode?.trim() || "GST 18%",
        cgstRate: data.cgstRate?.trim() || "0",
        sgstRate: data.sgstRate?.trim() || "0", 
        igstRate: data.igstRate?.trim() || "0",
        cessRate: data.cessRate?.trim() || "0",
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",
        taxSelectionMode: data.taxSelectionMode || "auto",
        ...(isEditMode && editingProduct && {
          id: editingProduct.id,
          createdAt: editingProduct.createdAt,
          updatedAt: new Date().toISOString(),
        })
      };

      console.log('📦 Final product data for submission:', productData);

      // Enhanced API call
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${editId}` : "/api/products";

      try {
        console.log(`📡 Making ${method} request to ${url}`);

        const res = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        console.log('📊 API Response status:', res.status, res.statusText);

        if (!res.ok) {
          let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} product`;
          let errorDetails = '';

          try {
            const errorText = await res.text();
            console.error('❌ API Error Response:', errorText);

            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
              errorDetails = errorData.details || '';
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('❌ Failed to parse error response:', parseError);
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }

          throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const result = await res.json();
        console.log('✅ Product operation successful:', result);
        return result;

      } catch (networkError) {
        console.error('❌ Network/API error:', networkError);

        if (networkError.message?.includes('Failed to fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }

        throw networkError;
      }
    },
    onSuccess: (data) => {
      console.log("✅ Product operation successful:", data);

      try {
        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });

        if (isEditMode) {
          // Invalidate specific product query
          queryClient.invalidateQueries({ queryKey: ["/api/products", editId] });

          // Update last saved data to reset dirty state
          setLastSavedData(formValues);
          setIsFormDirty(false);

          toast({
            title: "Success! 🎉", 
            description: `Product "${data.name || data.itemName}" updated successfully`,
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
          // Reset form for new entry
          const newItemCode = allProducts.length > 0 ? generateItemCode() : generateFallbackItemCode();

          const resetData: ProductFormValues = {
            itemCode: newItemCode,
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
            cgstRate: "9",
            sgstRate: "9",
            igstRate: "0",
            cessRate: "0",
            taxCalculationMethod: "exclusive",
            taxSelectionMode: "auto",
          };

          form.reset(resetData);
          setLastSavedData(resetData);
          setIsFormDirty(false);

          toast({
            title: "Success! 🎉", 
            description: `Product "${data.name || data.itemName}" created successfully with SKU: ${data.sku || data.itemCode}`,
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
      } catch (successError) {
        console.error("❌ Error in success handler:", successError);
        toast({
          title: "Product Saved Successfully",
          description: "The product was saved but there was an issue refreshing the interface.",
        });
      }
    },
    onError: (error: Error) => {
      console.error("❌ Product operation error:", error);

      let errorMessage = error.message || "Please check all required fields and try again";
      let errorTitle = `Error ${isEditMode ? 'Updating' : 'Creating'} Product`;
      let actionButton = null;

      // Handle specific error types
      if (error.message?.includes('readonly') || error.message?.includes('READONLY')) {
        errorTitle = "Database Access Error";
        errorMessage = "Cannot save product data. Database permissions issue detected. Please contact administrator.";
      } else if (error.message?.includes('SKU already exists') || error.message?.includes('UNIQUE constraint failed')) {
        errorTitle = "Duplicate Item Code";
        errorMessage = "This item code already exists. Please use a different item code.";
        actionButton = (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const newCode = allProducts.length > 0 ? generateItemCode() : generateFallbackItemCode();
              form.setValue('itemCode', newCode);
            }}
          >
            Generate New Code
          </Button>
        );
      } else if (error.message?.includes('required fields') || error.message?.includes('Missing Required')) {
        errorTitle = "Missing Required Information";
        errorMessage = "Please fill in all required fields: Item Name, Item Code, Price, and Category.";
      } else if (error.message?.includes('Network connection error')) {
        errorTitle = "Connection Error";
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
        action: actionButton,
      });
    },
  });

  // Refresh data function
  const refreshData = async () => {
    try {
      console.log('🔄 Refreshing product data...');

      if (isEditMode) {
        await refetchProduct();
        toast({
          title: "Data Refreshed",
          description: "Product information has been updated from the database.",
        });
      } else {
        // For create mode, refresh categories and products for SKU generation
        await queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });

        toast({
          title: "Data Refreshed",
          description: "Form data and references have been updated.",
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  // Show loading state when fetching product data
  if (isEditMode && isLoadingProduct) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Loading Product Data...</h2>
            <p className="text-gray-600">Please wait while we fetch the product information.</p>
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
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <XIcon className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Failed to Load Product</h2>
            <p className="text-gray-600 mb-4">
              {productError.message?.includes('not found') 
                ? `Product with ID ${editId} was not found in the database.`
                : 'Could not fetch product data for editing. Please try again.'
              }
            </p>
            <div className="text-xs text-gray-500 mb-4 p-3 bg-gray-100 rounded border font-mono">
              Error: {productError.message}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setLocation("/add-item-dashboard")} variant="outline">
                Back to Dashboard
              </Button>
              <Button onClick={refreshData} variant="default">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Retry
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
                  {isEditMode ? "Edit Item" : "Add Item"}
                </h1>
                {isEditMode && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <EditIcon className="w-3 h-3 mr-1" />
                    Edit Mode
                  </Badge>
                )}
                {isFormDirty && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                    Unsaved Changes
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshData}
                  disabled={isLoadingProduct}
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (isFormDirty) {
                    const confirmed = confirm("You have unsaved changes. Are you sure you want to leave?");
                    if (!confirmed) return;
                  }
                  setLocation("/add-item-dashboard");
                }}
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

              <div className="space-y-1">
                {sidebarSections.map((section) => {
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
              <form onSubmit={form.handleSubmit((data) => {
                console.log("📝 Form submission started with data:", data);

                try {
                  // Enhanced validation for repackaging
                  if (data.itemPreparationsStatus === "Repackage") {
                    if (!data.bulkItemName?.trim()) {
                      toast({
                        title: "Validation Error",
                        description: "Please select a bulk item for repackaging",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (!data.weightInGms?.trim()) {
                      toast({
                        title: "Validation Error", 
                        description: "Please specify the weight for repackaged units",
                        variant: "destructive",
                      });
                      return;
                    }
                  }

                  // Validate required fields before submission
                  const requiredFieldErrors = [];

                  if (!data.itemName?.trim()) requiredFieldErrors.push("Item Name");
                  if (!data.itemCode?.trim()) requiredFieldErrors.push("Item Code");
                  if (!data.price?.trim()) requiredFieldErrors.push("Price");
                  if (!data.categoryId || data.categoryId === 0) requiredFieldErrors.push("Category");

                  if (requiredFieldErrors.length > 0) {
                    toast({
                      title: "Missing Required Fields",
                      description: `Please fill in: ${requiredFieldErrors.join(", ")}`,
                      variant: "destructive",
                    });
                    return;
                  }

                  // Additional numeric validation
                  const priceValue = parseFloat(data.price);
                  if (isNaN(priceValue) || priceValue <= 0) {
                    toast({
                      title: "Invalid Price",
                      description: "Please enter a valid price greater than 0",
                      variant: "destructive",
                    });
                    return;
                  }

                  const stockValue = parseInt(data.stockQuantity || "0");
                  if (isNaN(stockValue) || stockValue < 0) {
                    toast({
                      title: "Invalid Stock Quantity",
                      description: "Please enter a valid stock quantity",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Validate MRP if provided
                  if (data.mrp?.trim()) {
                    const mrpValue = parseFloat(data.mrp);
                    if (isNaN(mrpValue) || mrpValue < priceValue) {
                      toast({
                        title: "Invalid MRP",
                        description: "MRP must be greater than or equal to selling price",
                        variant: "destructive",
                      });
                      return;
                    }
                  }

                  console.log("✅ Validation passed, submitting to mutation...");
                  createProductMutation.mutate(data);

                } catch (validationError) {
                  console.error("❌ Form validation error:", validationError);
                  toast({
                    title: "Validation Error",
                    description: validationError.message || "Please check your form data and try again",
                    variant: "destructive",
                  });
                }
              })} className="space-y-6">

                {/* Item Information Section */}
                {currentSection === "item-information" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5" />
                        {isEditMode ? "Edit Item Information" : "Item Information"}
                        {isEditMode && editingProduct && (
                          <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-700">
                            <EditIcon className="w-3 h-3 mr-1" />
                            Editing: {editingProduct.name}
                          </Badge>
                        )}
                      </CardTitle>
                      {isEditMode && editingProduct && (
                        <div className="text-sm text-gray-600 mt-2">
                          Product ID: {editingProduct.id} • SKU: {editingProduct.sku} • Last Updated: {new Date(editingProduct.updatedAt || editingProduct.createdAt).toLocaleDateString()}
                        </div>
                      )}
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
                                  <Input 
                                    {...field} 
                                    placeholder="Auto-generated code"
                                    readOnly={isEditMode}
                                    className={isEditMode ? "bg-gray-100" : ""}
                                  />
                                  {!isEditMode && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const newCode = allProducts.length > 0 ? generateItemCode() : generateFallbackItemCode();
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
                              <Input 
                                {...field} 
                                placeholder="Enter product name"
                                onChange={(e) => {
                                  field.onChange(e);
                                  console.log('📝 Item name changed to:', e.target.value);
                                }}
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
                            <FormLabel>About Product</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Enter product description"
                                rows={3}
                              />
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
                                <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                <Input {...field} placeholder="Alternative name or code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div />
                      </div>

                      {/* Basic Pricing in Item Information for quick access */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          Basic Pricing Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Selling Price *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="0.00" 
                                    type="number" 
                                    step="0.01"
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      console.log('💰 Price changed to:', e.target.value);
                                    }}
                                  />
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

                      {/* Category Information in same section */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                          Category Information
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="mainCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">MAIN CATEGORY *</FormLabel>
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
                          <FormField
                            control={form.control}
                            name="brand"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700">BRAND</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter brand name" />
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center bg-white p-4 border-t sticky bottom-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {isFormDirty && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        You have unsaved changes
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (isFormDirty) {
                          const confirmed = confirm("You have unsaved changes. Are you sure you want to reset?");
                          if (!confirmed) return;
                        }

                        if (isEditMode && editingProduct) {
                          // Reset to original data
                          window.location.reload();
                        } else {
                          // Reset to empty form
                          form.reset();
                          setIsFormDirty(false);
                        }
                      }}
                      disabled={createProductMutation.isPending}
                    >
                      <RefreshCwIcon className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={createProductMutation.isPending || (!isFormDirty && isEditMode)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createProductMutation.isPending ? (
                        <>
                          <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          <SaveIcon className="w-4 h-4 mr-2" />
                          {isEditMode ? "Update Item" : "Create Item"}
                        </>
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