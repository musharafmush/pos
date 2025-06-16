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

      try {
        const response = await apiRequest('GET', `/api/products/${editId}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch product:', response.status, errorText);

          // Check if product exists in the products list
          const allProductsResponse = await fetch('/api/products');
          if (allProductsResponse.ok) {
            const allProducts = await allProductsResponse.json();
            const productExists = allProducts.find((p: any) => p.id === parseInt(editId));

            if (!productExists) {
              throw new Error(`Product with ID ${editId} not found in database`);
            }
          }

          throw new Error(`Failed to fetch product: ${response.status} - ${errorText}`);
        }

        const product = await response.json();
        console.log('Fetched product:', product);

        // Validate product data
        if (!product || !product.id) {
          throw new Error('Invalid product data received');
        }

        return product;
      } catch (error) {
        console.error('Product fetch error:', error);
        throw error;
      }
    },
    enabled: !!editId,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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

  // Fetch all products for bulk item selection
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products/all"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Load tax settings from localStorage
  const [taxSettings, setTaxSettings] = useState({
    defaultTaxRate: 18,
    taxCalculationMethod: 'afterDiscount',
    pricesIncludeTax: false,
    enableMultipleTaxRates: true,
    taxCategories: [
      { id: 1, name: 'Food & Groceries', rate: 5, hsn: '1001-2000', description: 'Essential food items and groceries' },
      { id: 2, name: 'General Merchandise', rate: 18, hsn: '3001-9999', description: 'Standard consumer goods' },
      { id: 3, name: 'Luxury Items', rate: 28, hsn: '8701-8800', description: 'High-end consumer products' },
      { id: 4, name: 'Essential Services', rate: 0, hsn: '9801-9900', description: 'Tax-exempt essential services' }
    ]
  });

  // Load tax settings on component mount
  useEffect(() => {
    const savedTaxSettings = localStorage.getItem('taxSettings');
    if (savedTaxSettings) {
      try {
        const settings = JSON.parse(savedTaxSettings);
        setTaxSettings(prev => ({ 
          ...prev, 
          ...settings,
          taxCategories: settings.taxCategories?.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            rate: cat.rate || 0,
            hsn: cat.hsn || '',
            description: cat.description || ''
          })) || prev.taxCategories
        }));
      } catch (error) {
        console.error('Error loading tax settings:', error);
      }
    }
  }, []);

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

  // Set up form with proper default values
  const getDefaultCategoryId = () => {
    if (categories && categories.length > 0) {
      return categories[0].id;
    }
    return 1; // fallback
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      itemCode: !isEditMode ? (allProducts ? generateItemCode() : generateFallbackItemCode()) : "",
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

  // Update form with existing product data when in edit mode
  useEffect(() => {
    if (isEditMode && editingProduct && !isLoadingProduct) {
      // Calculate total GST rate
      const cgstRate = parseFloat(editingProduct.cgstRate || '0');
      const sgstRate = parseFloat(editingProduct.sgstRate || '0');
      const igstRate = parseFloat(editingProduct.igstRate || '0');
      const totalGst = cgstRate + sgstRate + igstRate;

      // Determine GST code based on total rate
      let gstCode = 'GST 18%';
      if (totalGst === 0) gstCode = 'GST 0%';
      else if (totalGst === 5) gstCode = 'GST 5%';
      else if (totalGst === 12) gstCode = 'GST 12%';
      else if (totalGst === 18) gstCode = 'GST 18%';
      else if (totalGst === 28) gstCode = 'GST 28%';

      // Find category by ID
      const category = categories.find((cat: any) => cat.id === editingProduct.categoryId);

      form.reset({
        itemCode: editingProduct.sku || "",
        itemName: editingProduct.name || "",
        manufacturerName: "",
        supplierName: "",
        alias: "",
        aboutProduct: editingProduct.description || "",
        itemProductType: "Standard",
        department: "",
        mainCategory: category?.name || "",
        subCategory: "",
        brand: "",
        buyer: "",
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
        price: editingProduct.price?.toString() || "",
        mrp: editingProduct.mrp?.toString() || "",
        cost: editingProduct.cost?.toString() || "",
        weight: editingProduct.weight ? editingProduct.weight.toString() : "",
        weightUnit: editingProduct.weightUnit || "kg",
        categoryId: editingProduct.categoryId || categories[0]?.id || 1,
        stockQuantity: editingProduct.stockQuantity?.toString() || "0",
        active: editingProduct.active !== false,
        cgstRate: editingProduct.cgstRate || "",
        sgstRate: editingProduct.sgstRate || "",
        igstRate: editingProduct.igstRate || "",
        cessRate: "",
        taxCalculationMethod: "exclusive",
      });
    }
  }, [isEditMode, editingProduct, isLoadingProduct, categories, form]);

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
      console.log('Starting product mutation with data:', data);

      // Enhanced validation with more specific error messages
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

      // Enhanced numeric validation with better error handling
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

      // Enhanced product data with proper null handling
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
        alertThreshold: 5,
        hsnCode: data.hsnCode?.trim() || null,
        // Properly formatted tax rates
        cgstRate: data.cgstRate?.trim() || "0",
        sgstRate: data.sgstRate?.trim() || "0", 
        igstRate: data.igstRate?.trim() || "0",
        cessRate: data.cessRate?.trim() || "0",
        taxCalculationMethod: data.taxCalculationMethod || "exclusive",
      };

      console.log('Final product data for submission:', productData);

      // Enhanced API call with better error handling
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/products/${editId}` : "/api/products";

      try {
        console.log(`Making ${method} request to ${url}`);

        const res = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        console.log('API Response status:', res.status, res.statusText);

        if (!res.ok) {
          let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} product`;
          let errorDetails = '';

          try {
            const errorText = await res.text();
            console.error('API Error Response:', errorText);

            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
              errorDetails = errorData.details || '';
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          }

          throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const result = await res.json();
        console.log('Product operation successful:', result);
        return result;

      } catch (networkError) {
        console.error('Network/API error:', networkError);

        if (networkError.message?.includes('Failed to fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }

        throw networkError;
      }
    },
    onSuccess: (data) => {
      console.log("Product operation successful:", data);

      try {
        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });

        if (isEditMode) {
          // Invalidate specific product query
          queryClient.invalidateQueries({ queryKey: ["/api/products", editId] });

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

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            setLocation("/add-item-dashboard");
          }, 2000);

        } else {
          // Reset form for new entry
          const newItemCode = allProducts ? generateItemCode() : generateFallbackItemCode();

          form.reset({
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
            cgstRate: "",
            sgstRate: "",
            igstRate: "",
            cessRate: "",
            taxCalculationMethod: "exclusive",
          });

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
        console.error("Error in success handler:", successError);
        // Still show success since the main operation worked
        toast({
          title: "Product Saved Successfully",
          description: "The product was saved but there was an issue refreshing the interface.",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Product operation error:", error);

      let errorMessage = error.message || "Please check all required fields and try again";
      let errorTitle = `Error ${isEditMode ? 'Updating' : 'Creating'} Product`;
      let actionButton = null;

      // Handle specific error types with more detailed responses
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
              const newCode = allProducts ? generateItemCode() : generateFallbackItemCode();
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
      } else if (error.message?.includes('categoryId') || error.message?.includes('category')) {
        errorTitle = "Category Selection Required";
        errorMessage = "Please select a valid category for this product.";
      } else if (error.message?.includes('price') || error.message?.includes('Price')) {
        errorTitle = "Invalid Price";
        errorMessage = "Please enter a valid price greater than 0.";
      } else if (error.message?.includes('stock') || error.message?.includes('Stock')) {
        errorTitle = "Invalid Stock Quantity";
        errorMessage = "Please enter a valid stock quantity (0 or greater).";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 7000, // Show error longer for reading
        action: actionButton,
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
              ```python
              <Button 
                onClick={() => {
                  console.log('Retrying product fetch...');
                  window.location.reload();
                }} 
                variant="default"
              >
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
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Closing and returning to dashboard');
                setLocation("/add-item-dashboard");
              }}
            >
              <XIcon className="w-4 h-4 mr-2" />
              {isEditMode ? "Cancel Edit" : "Close"}
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
                        <div className="w-2 h-2 bg-orange-500 rounded-full ml-auto"></div>
                      </button>
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
              <form onSubmit={form.handleSubmit((data) => {
                console.log("Form submission started with data:", data);

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

                  console.log("Validation passed, submitting to mutation...");
                  createProductMutation.mutate(data);

                } catch (validationError) {
                  console.error("Form validation error:", validationError);
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
                              <Input {...field} placeholder="Enter product name" />
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
                                    <SelectContent>
                                      <SelectItem value="FMCG">FMCG</SelectItem>
                                      <SelectItem value="Grocery">Grocery</SelectItem>
                                      <SelectItem value="Electronics">Electronics</SelectItem>
                                      <SelectItem value="Clothing">Clothing</SelectItem>
                                      <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                                      <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                                      <SelectItem value="Sports & Fitness">Sports & Fitness</SelectItem>
                                      <SelectItem value="Automotive">Automotive</SelectItem>
                                      <SelectItem value="Books & Stationery">Books & Stationery</SelectItem>
                                      <SelectItem value="Toys & Games">Toys & Games</SelectItem>
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
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSignIcon className="w-5 h-5" />
                          Tax Information
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open settings in new window/tab to not lose current form data
                            window.open('/settings?tab=tax', '_blank');
                          }}
                          className="text-xs"
                        >
                          <SettingsIcon className="w-3 h-3 mr-1" />
                          Manage Tax Settings
                        </Button>
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
                                {taxSettings.taxCategories.length > 4 && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    +{taxSettings.taxCategories.length - 4} custom
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-calculate breakdown when GST code changes
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
                                }} value={field.value || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select GST rate" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-80 overflow-y-auto">
                                    {/* Standard GST Rates */}
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">Standard GST Rates</div>
                                    <SelectItem value="GST 0%">GST 0% - Nil Rate (Basic necessities)</SelectItem>
                                    <SelectItem value="GST 5%">GST 5% - Essential goods (Food grains, medicines)</SelectItem>
                                    <SelectItem value="GST 12%">GST 12% - Standard rate (Textiles, electronics)</SelectItem>
                                    <SelectItem value="GST 18%">GST 18% - Standard rate (Most goods & services)</SelectItem>
                                    <SelectItem value="GST 28%">GST 28% - Luxury goods (Cars, cigarettes)</SelectItem>
                                    <SelectItem value="EXEMPT">EXEMPT - Tax exempted items</SelectItem>
                                    <SelectItem value="ZERO RATED">ZERO RATED - Export goods</SelectItem>

                                    {/* Custom Tax Categories from Settings */}
                                    {taxSettings.taxCategories.length > 0 && (
                                      <>
                                        <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border-t">Custom Tax Categories</div>
                                        {taxSettings.taxCategories.map((category) => (
                                          <SelectItem 
                                            key={category.id} 
                                            value={`GST ${category.rate}%`}
                                            className="pl-4"
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <span>GST {category.rate}% - {category.name}</span>
                                              <span className="text-xs text-gray-500 ml-2">
                                                {category.hsn && `HSN: ${category.hsn}`}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
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

                        {/* Tax Summary Display */}
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">Total GST Rate</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("gstCode") ? form.watch("gstCode").replace("GST ", "") : "0%"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">CGST + SGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("cgstRate") || "0"}% + {form.watch("sgstRate") || "0"}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700 font-medium">IGST</div>
                              <div className="text-lg font-bold text-blue-900">
                                {form.watch("igstRate") || "0"}%
                              </div>
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
                                    value={field.value || ""}
                                    placeholder="9.00" 
                                    type="number" 
                                    step="0.01"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);

                                      // Auto-sync SGST when CGST changes (for intra-state)
                                      if (!isEditMode || form.getValues("taxSelectionMode") === "auto") {
                                        form.setValue("sgstRate", value, { shouldValidate: true, shouldDirty: true });
                                        if (value && parseFloat(value) > 0) {
                                          form.setValue("igstRate", "0", { shouldValidate: true, shouldDirty: true });
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
                            name="sgstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={field.value || ""}
                                    placeholder="9.00" 
                                    type="number" 
                                    step="0.01"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);

                                      // Auto-sync CGST when SGST changes (for intra-state)
                                      if (!isEditMode || form.getValues("taxSelectionMode") === "auto") {
                                        form.setValue("cgstRate", value, { shouldValidate: true, shouldDirty: true });
                                        if (value && parseFloat(value) > 0) {
                                          form.setValue("igstRate", "0", { shouldValidate: true, shouldDirty: true });
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
                            name="igstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={field.value || ""}
                                    placeholder="18.00" 
                                    type="number" 
                                    step="0.01"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);

                                      // Clear CGST/SGST when IGST is set (for inter-state)
                                      if (!isEditMode || form.getValues("taxSelectionMode") === "auto") {
                                        if (value && parseFloat(value) > 0) {
                                          form.setValue("cgstRate", "0", { shouldValidate: true, shouldDirty: true });
                                          form.setValue("sgstRate", "0", { shouldValidate: true, shouldDirty: true });
                                        }
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

                        {/* Tax Category Information */}
                        {taxSettings.taxCategories.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                              <SettingsIcon className="h-4 w-4" />
                              Available Tax Categories ({taxSettings.taxCategories.length})
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {taxSettings.taxCategories.slice(0, 8).map((category) => (
                                <div key={category.id} className="flex justify-between items-center p-2 bg-white rounded border text-xs">
                                  <span className="font-medium text-blue-900 truncate">{category.name}</span>
                                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                                    {category.rate}%
                                  </span>
                                </div>
                              ))}
                              {taxSettings.taxCategories.length > 8 && (
                                <div className="flex items-center justify-center p-2 bg-gray-100 rounded border text-xs text-gray-600">
                                  +{taxSettings.taxCategories.length - 8} more
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-blue-600">
                              💡 Manage tax categories in Settings → Tax Settings
                            </div>
                          </div>
                        )}

                        {/* Tax Information Help */}
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h5 className="font-medium text-yellow-800 mb-1">Tax Information Guidelines</h5>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• For intra-state transactions: Use CGST + SGST</li>
                            <li>• For inter-state transactions: Use IGST only</li>
                            <li>• Total GST = CGST + SGST or IGST (whichever applicable)</li>
                            <li>• HSN codes help determine the correct tax rates automatically</li>
                            <li>• Custom tax categories are loaded from Settings → Tax Settings</li>
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
                                                <SelectValue placeholder="Select bulk item to repackage" />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-80 overflow-y-auto">
                                          {/* Bulk items as shown in the reference image */}
                                          <SelectItem value="Rice 1kg (500g Pack)">
                                            Rice 1kg (500g Pack) - SKU: ITM670689059-REPACK-500G-174867443241†
                                          </SelectItem>
                                          <SelectItem value="Rice 1kg (Repackcd 100g)">
                                            Rice 1kg (Repackcd 100g) - SKU: ITM670689059-REPACK-174652265274†
                                          </SelectItem>
                                          <SelectItem value="Rice 1kg">
                                            Rice 1kg - SKU: ITM670689059†
                                          </SelectItem>
                                          <SelectItem value="100G">
                                            100G - Small quantity bulk item
                                          </SelectItem>
                                          <SelectItem value="AJINOMOTO BULK">
                                            AJINOMOTO BULK - Seasoning bulk pack
                                          </SelectItem>
                                          <SelectItem value="Rice - 25kg Bag">
                                            Rice - 25kg Bag - Standard rice bulk pack
                                          </SelectItem>
                                          <SelectItem value="Wheat - 50kg Bag">
                                            Wheat - 50kg Bag - Wheat bulk pack
                                          </SelectItem>
                                          <SelectItem value="Dal - 25kg Bag">
                                            Dal - 25kg Bag - Lentils bulk pack
                                          </SelectItem>
                                          <SelectItem value="Sugar - 50kg Bag">
                                            Sugar - 50kg Bag - Sugar bulk pack
                                          </SelectItem>
                                          <SelectItem value="Oil - 15 Ltr Container">
                                            Oil - 15 Ltr Container - Cooking oil bulk
                                          </SelectItem>

                                          {/* Dynamic bulk items from database */}
                                          {allProducts && allProducts.length > 0 && allProducts.map((product: any) => (
                                            <SelectItem key={`product-${product.id}`} value={product.name}>
                                              {product.name} - SKU: {product.sku} • Stock: {product.stockQuantity} • Weight: {product.weight || 0}{product.weightUnit || 'kg'}
                                            </SelectItem>
                                          ))}

                                          {/* Show message if no items available */}
                                          {(!allProducts || allProducts.length === 0) && (
                                            <div className="p-4 text-center text-gray-500">
                                              <p className="text-sm">No bulk items found in inventory.</p>
                                              <p className="text-xs mt-1">Add bulk items first to enable repackaging.</p>
                                            </div>
                                          )}
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
                                  </div>

                                  {/* Right Side - Bulk Item Details */}
                                  <div>
                                    {form.watch("bulkItemName") && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-500 text-white text-center py-2 font-semibold text-sm">
                                          Bulk Item Details
                                        </div>

                                        <div className="p-4 space-y-3 text-sm">
                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Bulk Code:</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-center font-mono text-xs">
                                              {form.watch("bulkItemName")?.includes("Rice 1kg (500g Pack)") ? "ITM670689059" : 
                                               form.watch("bulkItemName")?.includes("Rice 1kg (Repackcd 100g)") ? "ITM670689059" :
                                               form.watch("bulkItemName")?.includes("Rice 1kg") ? "ITM670689059" :
                                               "13254"}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Bulk Item:</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-center text-xs">
                                              {form.watch("bulkItemName")?.toUpperCase()}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Available Stock:</span>
                                            <span className="bg-green-100 px-2 py-1 rounded text-center text-xs font-semibold text-green-800">
                                              {form.watch("bulkItemName")?.includes("Rice 1kg (500g Pack)") ? "8" : 
                                               form.watch("bulkItemName")?.includes("Rice 1kg (Repackcd 100g)") ? "4" :
                                               form.watch("bulkItemName")?.includes("Rice 1kg") ? "0" :
                                               "25"} units
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Unit Cost:</span>
                                            <span className="bg-yellow-100 px-2 py-1 rounded text-center text-xs font-semibold">
                                              ₹{form.watch("bulkItemName")?.includes("Rice") ? "45.00" : "120.00"}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Bulk MRP:</span>
                                            <span className="bg-yellow-100 px-2 py-1 rounded text-center text-xs font-semibold">
                                              ₹{form.watch("bulkItemName")?.includes("Rice") ? "50.00" : "150.00"}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium text-gray-700">Unit Weight:</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded text-center text-xs">
                                              {form.watch("bulkItemName")?.includes("Rice") ? "1000g" : "500g"}
                                            </span>
                                          </div>

                                          <div className="border-t pt-2 mt-3">
                                            <div className="text-xs text-gray-600 text-center">
                                              Last Updated: {new Date().toLocaleDateString()}
                                            </div>
                                          </div>
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

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-4 pt-6 border-t">
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
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          </DashboardLayout>
        );
      }