import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  PackageIcon, 
  PlusIcon, 
  SearchIcon, 
  EditIcon, 
  TrashIcon, 
  EyeIcon, 
  DownloadIcon, 
  RefreshCcwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShoppingCartIcon,
  CurrencyIcon,
  FilterIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BoxIcon,
  TagIcon,
  BarChart3Icon,
  WeightIcon,
  DollarSignIcon,
  WarehouseIcon,
  QrCodeIcon,
  XIcon,
  InfoIcon,
  SettingsIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import { Link } from "wouter";
import { ProductsTable } from "@/components/products-table";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";

export default function AddItemDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeSection, setActiveSection] = useState("item-info");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentEditSection, setCurrentEditSection] = useState("item-information");
  const [, setLocation] = useLocation();

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const queryClient = useQueryClient();

  const suppliers = [
    { id: 1, name: "Primary Supplier" },
    { id: 2, name: "Backup Supplier" },
    { id: 3, name: "Local Distributor" },
    { id: 4, name: "Fresh Foods Supply" },
    { id: 5, name: "Wholesale Partners" },
  ];

  const editForm = useForm({
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
      hsnCode: "",
      gstCode: "GST 18%",
      cgstRate: "",
      sgstRate: "",
      igstRate: "",
      barcode: "",
      eanCodeRequired: false,
      weightsPerUnit: "1",
      weight: "",
      weightUnit: "kg",
      price: "",
      mrp: "",
      cost: "",
      stockQuantity: "",
      active: true,
      isWeighable: false,
      sellBy: "None",
      skuType: "Put Away",
      itemIngredients: "",
    },
  });

  const { toast } = useToast();


  // Fetch products with enhanced error handling and debugging
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts, error: productsError } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching products from API...');
        
        // Test server connectivity first
        try {
          const healthResponse = await fetch("/api/dashboard/stats");
          if (!healthResponse.ok) {
            throw new Error('Server connectivity issue');
          }
        } catch (healthError) {
          console.error('🚨 Server connectivity test failed:', healthError);
          throw new Error('Unable to connect to server. Please check if the application is running properly.');
        }

        const response = await fetch("/api/products");
        
        console.log('📊 Products API Response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          let errorMessage = `Server Error: ${response.status} ${response.statusText}`;
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseError) {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          
          console.error('❌ API Error Response:', errorMessage);
          
          // Provide specific error messages based on status
          if (response.status === 500) {
            throw new Error('Database connection error. Please restart the application.');
          } else if (response.status === 404) {
            throw new Error('Products API endpoint not found. Please check server configuration.');
          } else {
            throw new Error(errorMessage);
          }
        }
        
        const data = await response.json();
        console.log('📦 Products data received:', {
          type: Array.isArray(data) ? 'array' : typeof data,
          length: Array.isArray(data) ? data.length : 'N/A',
          sample: Array.isArray(data) && data.length > 0 ? [data[0]] : 'No data'
        });
        
        // Ensure we always return an array
        const products = Array.isArray(data) ? data : [];
        
        if (products.length === 0) {
          console.log('⚠️ No products found in database');
        }
        
        return products;
      } catch (error) {
        console.error("💥 Error fetching products:", error);
        
        // Don't show toast here, let the error boundary handle it
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry server connectivity issues
      if (error.message.includes('connect to server')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('📊 Query error:', error);
      
      let errorTitle = "Failed to Load Data";
      let errorDescription = error.message;
      
      // Customize error messages based on error type
      if (error.message.includes('connect to server')) {
        errorTitle = "Server Connection Failed";
        errorDescription = "Unable to connect to the server. Please ensure the application is running.";
      } else if (error.message.includes('Database connection')) {
        errorTitle = "Database Error";
        errorDescription = "Database connection failed. Please restart the application.";
      } else if (error.message.includes('API endpoint not found')) {
        errorTitle = "Configuration Error";
        errorDescription = "Server configuration issue detected. Please contact support.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      console.log('✅ Products loaded successfully:', data.length, 'items');
    }
  });

  // Fetch categories for the edit form
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async ({ productId, force = false }: { productId: number; force?: boolean }) => {
      try {
        const url = force ? `/api/products/${productId}?force=true` : `/api/products/${productId}`;
        console.log('Attempting to delete product:', productId, 'URL:', url);

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Delete response status:', response.status);

        if (!response.ok) {
          let errorData;
          try {
            const text = await response.text();
            try {
              errorData = JSON.parse(text);
            } catch {
              // If response is not JSON, create error object
              errorData = {
                message: text || `Failed to delete product (${response.status})`,
                canForceDelete: false,
                references: { saleItems: 0, purchaseItems: 0 }
              };
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = {
              message: `HTTP ${response.status}: ${response.statusText}`,
              canForceDelete: false,
              references: { saleItems: 0, purchaseItems: 0 }
            };
          }

          console.log('Delete error data:', errorData);

          // Handle specific error cases
          if (response.status === 400 && (
            errorData.message?.includes('purchaseItems') || 
            errorData.message?.includes('referenced') ||
            errorData.message?.includes('cannot delete')
          )) {
            throw new Error(JSON.stringify({
              message: errorData.message || "Product cannot be deleted because it has related records",
              canForceDelete: true,
              references: errorData.references || { saleItems: 0, purchaseItems: 1 },
              productId,
              status: response.status
            }));
          }

          throw new Error(JSON.stringify({
            message: errorData.message || `Failed to delete product (${response.status})`,
            canForceDelete: errorData.canForceDelete || false,
            references: errorData.references || { saleItems: 0, purchaseItems: 0 },
            productId,
            status: response.status
          }));
        }

        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          // If no JSON response, return success message
          responseData = { message: "Product deleted successfully" };
        }

        console.log('Delete success data:', responseData);
        return responseData;
      } catch (error) {
        console.error('Delete mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Delete mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.refetchQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: data?.message || "Product deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Delete mutation onError:', error);

      try {
        const errorData = JSON.parse(error.message);

        if ((errorData.status === 400 || errorData.status === 409) && errorData.canForceDelete) {
          const confirmMessage = `${errorData.message}\n\n` +
            `This product is referenced in:\n` +
            `• ${errorData.references.saleItems || 0} sale records\n` +
            `• ${errorData.references.purchaseItems || 0} purchase records\n\n` +
            `Do you want to delete the product and ALL related records? This action cannot be undone.`;

          if (window.confirm(confirmMessage)) {
            deleteProductMutation.mutate({ productId: errorData.productId, force: true });
          }
          return;
        }
      } catch (parseError) {
        console.error('Failed to parse error data:', parseError);

        // Handle simple error messages
        if (error.message.includes('purchaseItems') || error.message.includes('referenced')) {
          toast({
            title: "Cannot Delete Product",
            description: "This product has related purchase records. Please remove those records first or contact support for force deletion.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Updating product with data:', data);

      if (!editingProduct || !editingProduct.id) {
        throw new Error('No product selected for editing');
      }

      // Enhanced validation for required fields
      const validationErrors = [];

      if (!data.name?.trim()) {
        validationErrors.push('Product name is required');
      }

      if (!data.itemCode?.trim()) {
        validationErrors.push('Item code (SKU) is required');
      }

      if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0) {
        validationErrors.push('Valid price greater than 0 is required');
      }

      // Check for duplicate SKU (excluding current product)
      const existingProduct = products.find(p => 
        p.sku.toLowerCase() === data.itemCode.trim().toLowerCase() && 
        p.id !== editingProduct.id
      );
      if (existingProduct) {
        validationErrors.push('Item code already exists for another product');
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('; '));
      }

      // Prepare update data with proper field mapping and validation
      const updateData = {
        name: data.name.trim(),
        sku: data.itemCode.trim(),
        description: data.aboutProduct?.trim() || '',
        price: parseFloat(data.price),
        cost: data.cost ? parseFloat(data.cost) : 0,
        mrp: data.mrp ? parseFloat(data.mrp) : parseFloat(data.price),
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : 0,
        alertThreshold: data.alertThreshold ? parseInt(data.alertThreshold) : 5,
        categoryId: data.categoryId && data.categoryId !== "" ? parseInt(data.categoryId) : null,
        hsnCode: data.hsnCode?.trim() || '',
        barcode: data.barcode?.trim() || '',
        cgstRate: data.cgstRate ? parseFloat(data.cgstRate) : 0,
        sgstRate: data.sgstRate ? parseFloat(data.sgstRate) : 0,
        igstRate: data.igstRate ? parseFloat(data.igstRate) : 0,
        cessRate: data.cessRate ? parseFloat(data.cessRate) : 0,
        taxCalculationMethod: data.taxType === 'Tax Inclusive' ? 'inclusive' : 'exclusive',
        weight: data.weight ? parseFloat(data.weight) : null,
        weightUnit: data.weightUnit || 'kg',
        active: data.active !== undefined ? Boolean(data.active) : true
      };

      // Validate numeric fields
      if (isNaN(updateData.price) || updateData.price < 0) {
        throw new Error('Price must be a valid positive number');
      }
      if (isNaN(updateData.cost) || updateData.cost < 0) {
        throw new Error('Cost must be a valid positive number');
      }
      if (isNaN(updateData.stockQuantity) || updateData.stockQuantity < 0) {
        throw new Error('Stock quantity must be a valid positive number');
      }

      console.log('Formatted update data:', updateData);

      try {
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        console.log('Update response status:', response.status);

        if (!response.ok) {
          let errorMessage = 'Failed to update product';

          try {
            const contentType = response.headers.get('content-type');
            let errorText = '';

            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } else {
              errorText = await response.text();

              if (errorText.trim()) {
                errorMessage = errorText.trim();
              } else {
                // Fallback to HTTP status messages
                switch (response.status) {
                  case 400:
                    errorMessage = 'Invalid product data provided. Please check all required fields.';
                    break;
                  case 404:
                    errorMessage = 'Product not found. Please refresh and try again.';
                    break;
                  case 409:
                    errorMessage = 'Product with this SKU already exists. Please use a different item code.';
                    break;
                  case 422:
                    errorMessage = 'Validation error. Please check your input data.';
                    break;
                  case 500:
                    errorMessage = 'Internal server error. Please try again later.';
                    break;
                  default:
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
              }
            }
          } catch (responseError) {
            console.error('Error reading response:', responseError);
            errorMessage = `HTTP ${response.status}: Unable to read server response`;
          }

          throw new Error(errorMessage);
        }

        let result;
        try {
          const contentType = response.headers.get('content-type');

          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
          } else {
            result = { message: 'Product updated successfully' };
          }

          console.log('Update success result:', result);
        } catch (parseError) {
          console.warn('Could not parse success response as JSON, assuming success');
          result = { message: 'Product updated successfully' };
        }

        return result;
      } catch (networkError) {
        console.error('Network error during update:', networkError);

        if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          throw new Error('Network connection failed. Please check your internet connection and try again.');
        }

        // Re-throw our custom errors with context
        if (networkError.message.includes('Product') || 
            networkError.message.includes('Server error') ||
            networkError.message.includes('Invalid') ||
            networkError.message.includes('not found') ||
            networkError.message.includes('already exists')) {
          throw networkError;
        }

        throw new Error('Unexpected error occurred while updating product. Please try again.');
      }
    },
    onSuccess: (result) => {
      console.log('Product update successful:', result);
      toast({
        title: "Product updated successfully! ✅",
        description: "The product has been updated with new information.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.refetchQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setEditingProduct(null);

      // Reset edit form

    },
    onError: (error) => {
      console.error('Product update error:', error);
      toast({
        variant: "destructive",
        title: "Failed to update product",
        description: error.message || "An unexpected error occurred while updating the product. Please check the form fields and try again.",
      });
    },
  });

  // Handler functions
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    console.log("Editing product:", product); // Debug log
    openEditModal(product);
    setSelectedProduct(product);
  };

  const handleDeleteProduct = async (productId: number) => {
    console.log('handleDeleteProduct called with ID:', productId);

    if (!productId || productId <= 0) {
      toast({
        title: "Invalid Product",
        description: "Cannot delete product with invalid ID",
        variant: "destructive",
      });
      return;
    }

    try {
      deleteProductMutation.mutate({ productId });
    } catch (error) {
      console.error('Error in handleDeleteProduct:', error);
      toast({
        title: "Delete Error",
        description: "An unexpected error occurred while deleting the product",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = () => {
    console.log('Handling product update with form data:', editForm);

    // Comprehensive validation with better error messages
    const validationErrors = [];

    // Required field validation
    if (!editForm.name?.trim()) {
      validationErrors.push("Product name is required");
    } else if (editForm.name.trim().length < 2) {
      validationErrors.push("Product name must be at least 2 characters long");
    }

    if (!editForm.itemCode?.trim()) {
      validationErrors.push("Item Code (SKU) is required");
    } else if (editForm.itemCode.trim().length < 3) {
      validationErrors.push("Item Code must be at least 3 characters long");
    }

    // Price validation
    if (!editForm.price?.trim()) {
      validationErrors.push("Price is required");
    } else {
      const price = parseFloat(editForm.price);
      if (isNaN(price) || price <= 0) {
        validationErrors.push("Price must be a valid number greater than 0");
      } else if (price > 999999) {
        validationErrors.push("Price cannot exceed ₹999,999");
      }
    }

    // Cost validation
    if (editForm.cost?.trim()) {
      const cost = parseFloat(editForm.cost);
      if (isNaN(cost) || cost < 0) {
        validationErrors.push("Cost must be a valid positive number");
      } else if (cost > 999999) {
        validationErrors.push("Cost cannot exceed ₹999,999");
      }
    }

    // MRP validation
    if (editForm.mrp?.trim()) {
      const mrp = parseFloat(editForm.mrp);
      const price = parseFloat(editForm.price || "0");
      if (isNaN(mrp) || mrp < 0) {
        validationErrors.push("MRP must be a valid positive number");
      } else if (mrp < price) {
        validationErrors.push("MRP cannot be less than selling price");
      }
    }

    // Stock quantity validation
    if (editForm.stockQuantity?.trim()) {
      const stock = parseInt(editForm.stockQuantity);
      if (isNaN(stock) || stock < 0) {
        validationErrors.push("Stock quantity must be a valid positive number");
      } else if (stock > 999999) {
        validationErrors.push("Stock quantity cannot exceed 999,999");
      }
    }

    // Alert threshold validation
    if (editForm.alertThreshold?.trim()) {
      const threshold = parseInt(editForm.alertThreshold);
      if (isNaN(threshold) || threshold < 0) {
        validationErrors.push("Alert threshold must be a valid positive number");
      }
    }

    // GST rate validation
    if (editForm.cgstRate?.trim()) {
      const cgst = parseFloat(editForm.cgstRate);
      if (isNaN(cgst) || cgst < 0 || cgst > 50) {
        validationErrors.push("CGST rate must be between 0 and 50");
      }
    }

    if (editForm.sgstRate?.trim()) {
      const sgst = parseFloat(editForm.sgstRate);
      if (isNaN(sgst) || sgst < 0 || sgst > 50) {
        validationErrors.push("SGST rate must be between 0 and 50");
      }
    }

    if (editForm.igstRate?.trim()) {
      const igst = parseFloat(editForm.igstRate);
      if (isNaN(igst) || igst < 0 || igst > 50) {
        validationErrors.push("IGST rate must be between 0 and 50");
      }
    }

    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationErrors.slice(0, 3).join("; ") + 
          (validationErrors.length > 3 ? `... and ${validationErrors.length - 3} more errors` : ""),
      });
      return;
    }

    // Check if editing product exists
    if (!editingProduct || !editingProduct.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No product selected for editing. Please close and reopen the edit dialog.",
      });
      return;
    }

    // Check if form data has actually changed
    const hasChanges = (
      editForm.name !== editingProduct.name ||
      editForm.itemCode !== editingProduct.sku ||
      parseFloat(editForm.price || "0") !== parseFloat(editingProduct.price.toString()) ||
      parseFloat(editForm.cost || "0") !== parseFloat(editingProduct.cost?.toString() || "0") ||
      parseInt(editForm.stockQuantity || "0") !== editingProduct.stockQuantity ||
      editForm.aboutProduct !== (editingProduct.description || "")
    );

    if (!hasChanges) {
      toast({
        title: "No Changes",
        description: "No changes detected to update.",
      });
      return;
    }

    // Prepare the update data with proper field mapping
    const updateData = {
      ...editForm,
      id: editingProduct.id,
    };

    console.log('Submitting update data:', updateData);

    // Show loading state
    updateProductMutation.mutate(updateData);
  };

  const handleEditSubmit = (values: any) => {
    console.log("Formatted values:", values);
  };

  const openEditModal = (product: any) => {
    console.log('Opening edit modal for product:', product);
    setEditingProduct(product);

    // Calculate total GST rate
    const cgstRate = parseFloat(product.cgstRate || '0');
    const sgstRate = parseFloat(product.sgstRate || '0');
    const igstRate = parseFloat(product.igstRate || '0');
    const totalGst = cgstRate + sgstRate + igstRate;

    // Determine GST code based on total rate
    let gstCode = 'GST 18%';
    if (totalGst === 0) gstCode = 'GST 0%';
    else if (totalGst === 5) gstCode = 'GST 5%';
    else if (totalGst === 12) gstCode = 'GST 12%';
    else if (totalGst === 18) gstCode = 'GST 18%';
    else if (totalGst === 28) gstCode = 'GST 28%';

    // Populate form with existing product data

    setIsEditDialogOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setCurrentEditSection("item-information"); // Reset to first section
    editForm.reset({
      itemCode: product.sku,
      itemName: product.name,
      manufacturerName: "",
      supplierName: "",
      alias: "",
      aboutProduct: product.description || "",
      itemProductType: "Standard",
      department: "",
      mainCategory: "",
      subCategory: "",
      brand: "",
      hsnCode: product.hsnCode || "",
      gstCode: product.taxRate ? `GST ${product.taxRate}%` : "GST 18%",
      cgstRate: product.cgstRate || "",
      sgstRate: product.sgstRate || "",
      igstRate: product.igstRate || "",
      barcode: product.barcode || "",
      eanCodeRequired: false,
      weightsPerUnit: "1",
      weight: product.weight?.toString() || "",
      weightUnit: product.weightUnit || "kg",
      price: product.price?.toString() || "",
      mrp: product.mrp?.toString() || "",
      cost: product.cost?.toString() || "",
      stockQuantity: product.stockQuantity?.toString() || "",
      active: product.active,
      isWeighable: false,
      sellBy: "None",
      skuType: "Put Away",
      itemIngredients: "",
    });
    setIsEditDialogOpen(true);
  };

  // Calculate statistics
  const totalProducts = products.length;
  const activeProducts = products.filter((p: Product) => p.active).length;
  const lowStockProducts = products.filter((p: Product) => p.stockQuantity <= 5).length;
  const totalInventoryValue = products.reduce((sum: number, p: Product) => {
    return sum + (parseFloat(p.price.toString()) * p.stockQuantity);
  }, 0);

  // Enhanced product filtering to include bulk and repackaged items
  const filteredProducts = Array.isArray(products) ? products.filter((product: Product) => {
    // Ensure product object has required properties
    if (!product || typeof product !== 'object') {
      console.warn('Invalid product object:', product);
      return false;
    }

    const productName = product.name || '';
    const productSku = product.sku || '';
    const productDescription = product.description || '';
    
    const matchesSearch = !searchTerm || 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productDescription.toLowerCase().includes(searchTerm.toLowerCase());

    switch (activeTab) {
      case "active":
        return matchesSearch && product.active !== false;
      case "inactive":
        return matchesSearch && product.active === false;
      case "low-stock":
        return matchesSearch && (product.stockQuantity || 0) <= (product.alertThreshold || 5);
      case "bulk":
        return matchesSearch && (
          productName.toLowerCase().includes('bulk') ||
          productName.toLowerCase().includes('bag') ||
          productName.toLowerCase().includes('container') ||
          productName.toLowerCase().includes('kg') ||
          productName.toLowerCase().includes('ltr') ||
          productName.toLowerCase().includes('wholesale') ||
          productName.toLowerCase().includes('sack') ||
          (parseFloat(product.weight || "0") >= 1 && product.weightUnit === 'kg') ||
          (product.stockQuantity || 0) > 10
        );
      case "repackaged":
        return matchesSearch && (
          productSku.includes('REPACK') ||
          productName.toLowerCase().includes('pack') ||
          productDescription.toLowerCase().includes('repacked')
        );
      default:
        return matchesSearch;
    }
  }) : [];

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Recent products (last 10)
  const recentProducts = products.slice(-10).reverse();

  // Reset to first page when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Mock data for demonstration - replace with real API calls
  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.active).length,
    lowStockItems: products.filter(p => p.stockQuantity <= p.alertThreshold).length,
    totalValue: products.reduce((sum, p) => sum + (parseFloat(p.price.toString()) * p.stockQuantity), 0)
  };

  // Function to save comprehensive product data to backend
  const saveProductToDatabase = async (productData: any) => {
    try {
      console.log('🔄 Saving comprehensive product data:', productData);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Product saved successfully:', result);

      // Refresh the products list
      await refetchProducts();

      toast({
        title: "Success! 🎉",
        description: `Product "${productData.name}" saved successfully with SKU: ${productData.sku}`,
      });

      return result;
    } catch (error) {
      console.error('❌ Error saving product:', error);
      toast({
        title: "Error Saving Product",
        description: error.message || "Failed to save product to database",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Function to create the example product
  const createExampleProduct = async () => {
    const exampleProductData = {
      // Basic Information
      name: 'oil 1l',
      sku: 'ITM912756138',
      description: '',
      price: 100,
      mrp: 120,
      cost: 90,
      weight: null,
      weightUnit: 'kg',
      stockQuantity: 0,
      categoryId: 1,
      barcode: '2178850459134',
      active: true,
      alertThreshold: 5,

      // Tax Information
      hsnCode: '24021000',
      cgstRate: '14',
      sgstRate: '14',
      igstRate: '0',
      cessRate: '0',
      taxCalculationMethod: 'exclusive',
      gstCode: '',

      // Supplier Information
      manufacturerName: 'Tech Distributors Ltd',
      supplierName: 'Tech Distributors Ltd',
      manufacturerId: 1,
      supplierId: 1,

      // Product Classification
      alias: '',
      itemProductType: 'Standard',
      department: 'Grocery',
      brand: '',
      buyer: '',
      purchaseGstCalculatedOn: 'MRP',
      gstUom: 'PIECES',
      purchaseAbatement: '',

      // Configuration Options
      configItemWithCommodity: false,
      seniorExemptApplicable: false,
      eanCodeRequired: false,
      weightsPerUnit: '1',
      batchExpiryDetails: 'Not Required',
      itemPreparationsStatus: 'Trade As Is',

      // Pricing & Charges
      grindingCharge: '',
      weightInGms: '',
      bulkItemName: '',
      repackageUnits: '',
      repackageType: '',
      packagingMaterial: '',
      decimalPoint: '0',
      productType: 'NA',
      sellBy: 'None',
      itemPerUnit: '1',
      maintainSellingMrpBy: 'Multiple Selling Price & Multiple MRP',
      batchSelection: 'Not Applicable',

      // Item Properties
      isWeighable: false,
      skuType: 'Put Away',
      indentType: 'Manual',
      gateKeeperMargin: '',
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
      itemIngredients: ''
    };

    await saveProductToDatabase(exampleProductData);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Professional Add Item Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage and overview your product creation activities</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const csvContent = products.map(p => 
                    `"${p.name}","${p.sku}","${p.price}","${p.stockQuantity}","${p.active ? 'Active' : 'Inactive'}"`
                  ).join('\n');
                  const blob = new Blob([`Name,SKU,Price,Stock,Status\n${csvContent}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                disabled={products.length === 0}
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  refetchProducts();
                  toast({
                    title: "Refreshing Data",
                    description: "Fetching latest product information...",
                  });
                }}
              >
                <RefreshCcwIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  console.log('🔍 Testing API connection...');
                  try {
                    const response = await fetch('/api/products');
                    const data = await response.json();
                    toast({
                      title: "Connection Test",
                      description: `API Status: ${response.status}. Found ${Array.isArray(data) ? data.length : 0} products.`,
                    });
                    console.log('🔍 API Test Result:', { status: response.status, data });
                  } catch (error) {
                    console.error('🔍 API Test Failed:', error);
                    toast({
                      title: "Connection Failed",
                      description: "Unable to connect to API server.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <AlertTriangleIcon className="w-4 h-4 mr-2" />
                Test Connection
              </Button>
              <Button 
                onClick={createExampleProduct}
                className="bg-green-600 hover:bg-green-700 mr-2"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Save Example Product
              </Button>
              <Link href="/add-item-professional">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          {/* Error Display */}
          {productsError && (
            <div className="col-span-full mb-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangleIcon className="w-5 h-5" />
                    <div>
                      <h3 className="font-semibold">Unable to Load Data</h3>
                      <p className="text-sm text-red-700">
                        {productsError.message || "Failed to fetch product data from the server."}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => refetchProducts()}
                          className="text-red-700 border-red-300 hover:bg-red-100"
                        >
                          <RefreshCcwIcon className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                        <Link href="/add-item-professional">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Add First Product
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Products</p>
                  {productsLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 bg-gray-200 animate-pulse rounded"></div>
                      <RefreshCcwIcon className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                  )}
                </div>
                <PackageIcon className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Active Items</p>
                  <p className="text-2xl font-bold text-green-600">
                    {products.filter((p: Product) => p.active).length}
                  </p>
                </div>
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {products.filter((p: Product) => p.stockQuantity <= (p.alertThreshold || 5)).length}
                  </p>
                </div>
                <AlertTriangleIcon className="w-6 h-6 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Bulk Items</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {products.filter((p: Product) => 
                      p.name.toLowerCase().includes('bulk') ||
                      p.name.toLowerCase().includes('bag') ||
                      p.name.toLowerCase().includes('container') ||                      p.name.toLowerCase().includes('kg') ||
                      p.name.toLowerCase().includes('ltr') ||
                      p.name.toLowerCase().includes('wholesale') ||
                      p.name.toLowerCase().includes('sack') ||
                      (parseFloat(p.weight || "0") >= 1 && p.weightUnit === 'kg') ||
                      p.stockQuantity > 10
                    ).length}
                  </p>
                </div>
                <BoxIcon className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Repackaged</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {products.filter((p: Product) => 
                      p.sku.includes('REPACK') ||
                      p.description?.toLowerCase().includes('repacked')
                    ).length}
                  </p>
                </div>
                <ShoppingCartIcon className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{products.reduce((sum: number, p: Product) => 
                      sum + (parseFloat(p.price) * p.stockQuantity), 0
                    ).toLocaleString()}
                  </p>
                </div>
                <CurrencyIcon className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="active">Active Items</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Items</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Items</TabsTrigger>
            <TabsTrigger value="repackaged">Repackaged</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/add-item-professional">
                    <Button className="w-full justify-start" variant="outline">
                      <PackageIcon className="w-4 h-4 mr-3" />
                      Add New Product
                    </Button>
                  </Link>
                  <Button className="w-full justify-start" variant="outline">
                    <TagIcon className="w-4 h-4 mr-3" />
                    Bulk Import Products
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3Icon className="w-4 h-4 mr-3" />
                    Generate Barcodes
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <WeightIcon className="w-4 h-4 mr-3" />
                    Update Pricing
                  </Button>
                </CardContent>
              </Card>

              {/* Product Categories Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Electronics</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">75%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Clothing</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">50%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Food & Beverages</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/3 h-2 bg-orange-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">33%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Home & Garden</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/4 h-2 bg-purple-600 rounded-full"></div>
                        </div>
                        <span className="text-sm text-gray-600">25%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangleIcon className="w-5 h-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 mb-4">
                    {lowStockProducts} products are running low on stock and need immediate attention.
                  </p>
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    View Low Stock Items
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recent Items Tab */}
          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Products</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                    <Button variant="outline" size="sm">
                      <FilterIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <PackageIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {product.sku}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.barcode ? (
                              <div className="flex items-center justify-center">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${product.barcode}`}
                                  alt="Barcode"
                                  className="w-8 h-8"
                                />
                              </div>
                            ) : (
                              <span>No Barcode</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(product.price.toString()))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(product.mrp?.toString() || product.price.toString()))}</TableCell>
                          <TableCell>
                            <Badge variant={product.stockQuantity <= 5 ? "destructive" : "secondary"}>
                              {product.stockQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.active ? "default" : "secondary"}>
                              {product.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewProduct(product)}
                                title="View Product"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  console.log('Navigating to edit page for product:', product.id);
                                  setLocation(`/add-item-professional?edit=${product.id}`);
                                }}
                                title="Edit Product"
                                className="h-8 w-8 p-0 hover:bg-orange-100"
                              >
                                <EditIcon className="w-4 h-4 text-orange-600" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="Delete Product">
                                    <TrashIcon className="w-4 h-4 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination Controls */}
                {filteredProducts.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-gray-700">Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                    </div>

                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {/* Page Numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }

                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNumber)}
                                  isActive={currentPage === pageNumber}
                                  className="cursor-pointer"
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Creation Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Analytics Chart Coming Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Electronics</span>
                      <Badge className="bg-blue-600">{formatCurrency(45000)}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Clothing</span>
                      <Badge className="bg-green-600">{formatCurrency(32000)}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium">Food & Beverages</span>
                      <Badge className="bg-orange-600">{formatCurrency(28000)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Electronics Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Pre-configured for electronic products with GST and warranty</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Clothing Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Optimized for apparel with size and color variations</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <WeightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Food & Beverage Template</h3>
                  <p className="text-sm text-gray-600 mb-4">Includes expiry dates and nutritional information</p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="inactive" className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <PackageIcon className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Inactive Items</h3>
              </div>
              <p className="text-gray-700 text-sm">
                Items that are currently inactive and not available for sale.
              </p>
            </div>
            <ProductsTable products={filteredProducts} />
          </TabsContent>

          {/* Active Items Tab */}
          <TabsContent value="low-stock" className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Low Stock Alert</h3>
              </div>
              <p className="text-yellow-700 text-sm">
                Items below their alert threshold. Consider restocking these products.
              </p>
            </div>
            <ProductsTable products={filteredProducts} />
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <PackageIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Bulk Items</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Large quantity items available for repackaging into smaller consumer units.
              </p>
            </div>
            <ProductsTable products={filteredProducts} />
          </TabsContent>

          <TabsContent value="repackaged" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCartIcon className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Repackaged Items</h3>
              </div>
              <p className="text-green-700 text-sm">
                Items that have been repackaged from bulk quantities into consumer-friendly sizes.
              </p>
            </div>
            <ProductsTable products={filteredProducts} />
          </TabsContent>

          {/* Active Items Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <PackageIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Active Items</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Items that are currently active and available for sale.
              </p>
            </div>

            {/* Enhanced Active Items CRUD Interface */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Items Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search active items..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Link href="/add-item-professional">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add New Item
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading active items...</p>
                    <p className="text-xs text-gray-500 mt-1">Fetching data from database...</p>
                  </div>
                ) : productsError ? (
                  <div className="text-center py-12">
                    <AlertTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Data</h3>
                    <p className="text-red-600 mb-4">
                      Unable to fetch product data from the server. Please check your connection.
                    </p>
                    <div className="space-x-2">
                      <Button onClick={() => refetchProducts()} variant="outline">
                        <RefreshCcwIcon className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      <Link href="/add-item-professional">
                        <Button>
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Add New Item
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {products.length === 0 ? "No Items Found" : "No Active Items Found"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {products.length === 0 
                        ? "Your inventory is empty. Start by adding your first product."
                        : searchTerm 
                        ? "No items match your search criteria." 
                        : "You haven't added any active items yet."
                      }
                    </p>
                    <div className="space-x-2">
                      {products.length === 0 && (
                        <Button 
                          onClick={createExampleProduct}
                          variant="outline"
                          className="mr-2"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Add Sample Product
                        </Button>
                      )}
                      <Link href="/add-item-professional">
                        <Button>
                          <PlusIcon className="w-4 h-4 mr-2" />
                          {products.length === 0 ? "Add Your First Item" : "Add New Item"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>MRP</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product: Product) => (
                          <TableRow key={product.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <PackageIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                    {product.description || "No description"}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded max-w-fit">
                                {product.sku}
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.barcode ? (
                                <div className="flex items-center justify-center">
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${product.barcode}`}
                                    alt="Barcode"
                                    className="w-8 h-8"
                                  />
                                </div>
                              ) : (
                                <span>No Barcode</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(parseFloat(product.price.toString()))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-gray-900">
                                {formatCurrency(parseFloat(product.mrp?.toString() || product.price.toString()))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={product.stockQuantity <= (product.alertThreshold || 5) ? "destructive" : "default"}
                                className="font-medium"
                              >
                                {product.stockQuantity} units
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewProduct(product)}
                                  title="View Details"
                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                >
                                  <EyeIcon className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    console.log('Navigating to edit page for product:', product.id);
                                    setLocation(`/add-item-professional?edit=${product.id}`);
                                  }}
                                  title="Edit Product"
                                  className="h-8 w-8 p-0 hover:bg-orange-100"
                                >
                                  <EditIcon className="w-4 h-4 text-orange-600" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      title="Delete Product"
                                      className="h-8 w-8 p-0 hover:bg-red-100"
                                      disabled={deleteProductMutation.isPending}
                                    >
                                      <TrashIcon className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Active Item</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{product.name}"? This will remove the item from your active inventory. This action cannot be undone.
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                          <strong>Product ID:</strong> {product.id}<br />
                                          <strong>SKU:</strong> {product.sku}<br />
                                          <strong>Current Stock:</strong> {product.stockQuantity} units
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={deleteProductMutation.isPending}>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={deleteProductMutation.isPending}
                                      >
                                        {deleteProductMutation.isPending ? "Deleting..." : "Delete Item"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination for Active Items */}
                    {filteredProducts.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} active items
                        </div>

                        {totalPages > 1 && (
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>

                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }

                                return (
                                  <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(pageNumber)}
                                      isActive={currentPage === pageNumber}
                                      className="cursor-pointer"
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}

                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions for Active Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCcwIcon className="w-5 h-5" />
                  Quick Actions for Active Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2 h-12"
                    onClick={() => {
                      // Bulk activate/deactivate functionality
                      toast({
                        title: "Feature Coming Soon",
                        description: "Bulk operations will be available soon",
                      });
                    }}
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Bulk Activate/Deactivate
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2 h-12"
                    onClick={() => {
                      // Export active items to CSV
                      const activeItems = filteredProducts.filter(product => product.active);
                      if (activeItems.length === 0) {
                        toast({
                          title: "No Data",
                          description: "No active items to export",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Create CSV content
                      const headers = [
                        'Product Name',
                        'SKU',
                        'Price',
                        'MRP', 
                        'Stock',
                        'Status',
                        'Category',
                        'Description',
                        'Weight',
                        'Weight Unit',
                        'Barcode',
                        'Alert Threshold'
                      ];

                      const csvContent =[
                        headers.join(','),
                        ...activeItems.map(product => [
                          `"${product.name}"`,
                          `"${product.sku}"`,
                          product.price,
                          product.mrp || product.price,
                          product.stockQuantity,
                          product.active ? 'Active' : 'Inactive',
                          product.categoryId,
                          `"${product.description || ''}"`,
                          product.weight || '',
                          product.weightUnit || '',
                          `"${product.barcode || ''}"`,
                          product.alertThreshold || 5
                        ].join(','))
                      ].join('\n');

                      // Create and download file
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `active-items-${new Date().toISOString().split('T')[0]}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      toast({
                        title: "Export Successful",
                        description: `Exported ${activeItems.length} active items to CSV`,
                      });
                    }}
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Export Active Items
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2 h-12"
                    onClick={() => {
                      // Refresh data
                      refetchProducts();
                      toast({
                        title: "Data Refreshed",
                        description: "Active items list has been updated",
                      });
                    }}
                  >
                    <RefreshCcwIcon className="w-4 h-4" />
                    Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced View Product Dialog with All Details */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto" aria-describedby="view-product-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <PackageIcon className="w-6 h-6 text-blue-600" />
                Complete Product Details
              </DialogTitle>
              <DialogDescription id="view-product-description">
                Comprehensive information about this product including all fields and configurations
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-blue-600 text-lg">
                      <InfoIcon className="w-5 h-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product Name</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedProduct.name || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">SKU</label>
                        <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded max-w-fit">{selectedProduct.sku || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge variant={selectedProduct.active ? "default" : "secondary"} className="mt-1">
                          {selectedProduct.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Alias</label>
                        <p className="text-gray-800">{selectedProduct.alias || selectedProduct.name || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product Type</label>
                        <p className="text-gray-800">{selectedProduct.itemProductType || selectedProduct.productType || "Standard"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Department</label>
                        <p className="text-gray-800">{selectedProduct.department || "General"}</p>
                      </div>
                    </div>
                    {(selectedProduct.description || selectedProduct.aboutProduct) && (
                      <div className="mt-6">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-gray-800 bg-gray-50 p-3 rounded mt-1">
                          {selectedProduct.description || selectedProduct.aboutProduct || "No description available"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                      <DollarSignIcon className="w-5 h-5" />
                      Pricing & Financial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border">
                        <label className="text-sm font-medium text-green-700">Selling Price</label>
                        <p className="text-2xl font-bold text-green-800">
                          {formatCurrency(parseFloat(selectedProduct.price?.toString() || "0"))}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border">
                        <label className="text-sm font-medium text-blue-700">MRP</label>
                        <p className="text-2xl font-bold text-blue-800">
                          {formatCurrency(parseFloat(selectedProduct.mrp?.toString() || selectedProduct.price?.toString() || "0"))}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border">
                        <label className="text-sm font-medium text-orange-700">Cost Price</label>
                        <p className="text-2xl font-bold text-orange-800">
                          {formatCurrency(parseFloat(selectedProduct.cost?.toString() || "0"))}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border">
                        <label className="text-sm font-medium text-purple-700">Profit Margin</label>
                        <p className="text-2xl font-bold text-purple-800">
                          {(selectedProduct.cost && selectedProduct.price) ? 
                            `${(((parseFloat(selectedProduct.price.toString()) - parseFloat(selectedProduct.cost.toString())) / parseFloat(selectedProduct.cost.toString())) * 100).toFixed(1)}%` 
                            : "N/A"
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Sell By</label>
                        <p className="text-gray-800">{selectedProduct.sellBy || "Unit"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Item Per Unit</label>
                        <p className="text-gray-800">{selectedProduct.itemPerUnit || "1"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Is Weighable</label>
                        <Badge variant={selectedProduct.isWeighable ? "default" : "secondary"}>
                          {selectedProduct.isWeighable ? "✓ Yes" : "✗ No"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-red-600 text-lg">
                      <DollarSignIcon className="w-5 h-5" />
                      Tax & Compliance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">HSN Code</label>
                        <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">
                          {selectedProduct.hsnCode || selectedProduct.hsn_code || "24021000"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">CGST Rate</label>
                        <p className="text-gray-800 font-semibold">
                          {selectedProduct.cgstRate || selectedProduct.cgst_rate || "14"}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">SGST Rate</label>
                        <p className="text-gray-800 font-semibold">
                          {selectedProduct.sgstRate || selectedProduct.sgst_rate || "14"}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">IGST Rate</label>
                        <p className="text-gray-800 font-semibold">
                          {selectedProduct.igstRate || selectedProduct.igst_rate || "0"}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cess Rate</label>
                        <p className="text-gray-800">{selectedProduct.cessRate || selectedProduct.cess_rate || "0"}%</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tax Method</label>
                        <p className="text-gray-800 capitalize">
                          {selectedProduct.taxCalculationMethod || selectedProduct.tax_calculation_method || "Exclusive"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">GST UOM</label>
                        <p className="text-gray-800">{selectedProduct.gstUom || selectedProduct.gst_uom || "PIECES"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total GST</label>
                        <p className="text-gray-800 font-bold text-lg">
                          {(
                            parseFloat(selectedProduct.cgstRate || selectedProduct.cgst_rate || "0") + 
                            parseFloat(selectedProduct.sgstRate || selectedProduct.sgst_rate || "0") + 
                            parseFloat(selectedProduct.igstRate || selectedProduct.igst_rate || "0")
                          ).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory & Stock */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-yellow-600 text-lg">
                      <WarehouseIcon className="w-5 h-5" />
                      Inventory & Stock Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-yellow-50 p-4 rounded-lg border">
                        <label className="text-sm font-medium text-yellow-700">Current Stock</label>
                        <p className="text-2xl font-bold text-yellow-800">{selectedProduct.stockQuantity || 0}</p>
                        <Badge 
                          variant={(selectedProduct.stockQuantity || 0) <= (selectedProduct.alertThreshold || 5) ? "destructive" : "default"} 
                          className="mt-2"
                        >
                          {(selectedProduct.stockQuantity || 0) <= (selectedProduct.alertThreshold || 5) ? "⚠️ Low Stock" : "✅ In Stock"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Alert Threshold</label>
                        <p className="text-xl font-bold text-gray-800">{selectedProduct.alertThreshold || 5}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">SKU Type</label>
                        <p className="text-gray-800">{selectedProduct.skuType || "Put Away"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Batch Selection</label>
                        <p className="text-gray-800">{selectedProduct.batchSelection || "Not Applicable"}</p>
                      </div>
                    </div>

                    <div className="mt-4 bg-green-50 p-4 rounded-lg border">
                      <label className="text-sm font-medium text-green-700">Total Inventory Value</label>
                      <p className="text-3xl font-bold text-green-800">
                        {formatCurrency((parseFloat(selectedProduct.price?.toString() || "0")) * (selectedProduct.stockQuantity || 0))}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Supplier & Manufacturer */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-indigo-600 text-lg">
                      <PackageIcon className="w-5 h-5" />
                      Supplier & Manufacturer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Manufacturer</label>
                        <p className="text-gray-800 font-semibold text-lg">
                          {selectedProduct.manufacturerName || selectedProduct.manufacturer_name || "Tech Distributors Ltd"}
                        </p>
                        <p className="text-xs text-gray-500">ID: {selectedProduct.manufacturerId || selectedProduct.manufacturer_id || "1"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Supplier</label>
                        <p className="text-gray-800 font-semibold text-lg">
                          {selectedProduct.supplierName || selectedProduct.supplier_name || "Tech Distributors Ltd"}
                        </p>
                        <p className="text-xs text-gray-500">ID: {selectedProduct.supplierId || selectedProduct.supplier_id || "1"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Brand</label>
                        <p className="text-gray-800">{selectedProduct.brand || "Generic"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Buyer</label>
                        <p className="text-gray-800">{selectedProduct.buyer || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weight & Packaging */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-cyan-600 text-lg">
                      <WeightIcon className="w-5 h-5" />
                      Weight & Packaging Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Weight</label>
                        <p className="text-gray-800 font-semibold">
                          {selectedProduct.weight ? 
                            `${selectedProduct.weight} ${selectedProduct.weightUnit || "kg"}` : 
                            "Not specified"
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Weight Per Unit</label>
                        <p className="text-gray-800">{selectedProduct.weightsPerUnit || "1"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Decimal Point</label>
                        <p className="text-gray-800">{selectedProduct.decimalPoint || "0"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Item Preparation</label>
                        <p className="text-gray-800">{selectedProduct.itemPreparationsStatus || "Trade As Is"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Batch/Expiry</label>
                        <p className="text-gray-800">{selectedProduct.batchExpiryDetails || "Not Required"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Weight in Grams</label>
                        <p className="text-gray-800">{selectedProduct.weightInGms || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode & Identification */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-600 text-lg">
                      <QrCodeIcon className="w-5 h-5" />
                      Barcode & Identification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Barcode</label>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded border">
                            {selectedProduct.barcode || "2178850459134"}
                          </p>
                          {(selectedProduct.barcode || "2178850459134") && (
                            <div className="w-20 h-20 border rounded flex items-center justify-center bg-white shadow-sm">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${selectedProduct.barcode || "2178850459134"}`}
                                alt="Product Barcode"
                                className="w-16 h-16"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">EAN Code Required</label>
                        <Badge variant={selectedProduct.eanCodeRequired ? "default" : "secondary"} className="mt-2">
                          {selectedProduct.eanCodeRequired ? "✓ Required" : "✗ Not Required"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Properties */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-teal-600 text-lg">
                      <SettingsIcon className="w-5 h-5" />
                      Product Properties & Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Perishable Item</span>
                        <Badge variant={selectedProduct.perishableItem ? "default" : "secondary"}>
                          {selectedProduct.perishableItem ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Temperature Controlled</span>
                        <Badge variant={selectedProduct.temperatureControlled ? "default" : "secondary"}>
                          {selectedProduct.temperatureControlled ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Fragile Item</span>
                        <Badge variant={selectedProduct.fragileItem ? "default" : "secondary"}>
                          {selectedProduct.fragileItem ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Track Serial Numbers</span>
                        <Badge variant={selectedProduct.trackSerialNumbers ? "default" : "secondary"}>
                          {selectedProduct.trackSerialNumbers ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">FDA Approved</span>
                        <Badge variant={selectedProduct.fdaApproved ? "default" : "secondary"}>
                          {selectedProduct.fdaApproved ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">BIS Certified</span>
                        <Badge variant={selectedProduct.bisCertified ? "default" : "secondary"}>
                          {selectedProduct.bisCertified ? "✓" : "✗"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile & Other Configurations */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-pink-600 text-lg">
                      <SettingsIcon className="w-5 h-5" />
                      Mobile & Configuration Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Show on Mobile Dashboard</span>
                        <Badge variant={selectedProduct.showOnMobileDashboard ? "default" : "secondary"}>
                          {selectedProduct.showOnMobileDashboard ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Mobile Notifications</span>
                        <Badge variant={selectedProduct.enableMobileNotifications ? "default" : "secondary"}>
                          {selectedProduct.enableMobileNotifications ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Quick Add to Cart</span>
                        <Badge variant={selectedProduct.quickAddToCart ? "default" : "secondary"}>
                          {selectedProduct.quickAddToCart ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Allow Item Free</span>
                        <Badge variant={selectedProduct.allowItemFree ? "default" : "secondary"}>
                          {selectedProduct.allowItemFree ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Config with Commodity</span>
                        <Badge variant={selectedProduct.configItemWithCommodity ? "default" : "secondary"}>
                          {selectedProduct.configItemWithCommodity ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">Senior Exempt Applicable</span>
                        <Badge variant={selectedProduct.seniorExemptApplicable ? "default" : "secondary"}>
                          {selectedProduct.seniorExemptApplicable ? "✓" : "✗"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                {(selectedProduct.itemIngredients || selectedProduct.item_ingredients) && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-orange-600 text-lg">
                        <InfoIcon className="w-5 h-5" />
                        Additional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Item Ingredients</label>
                        <p className="text-gray-800 bg-gray-50 p-3 rounded mt-1 border">
                          {selectedProduct.itemIngredients || selectedProduct.item_ingredients}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* System Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-600 text-lg">
                      <InfoIcon className="w-5 h-5" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Product ID</label>
                        <p className="text-gray-800 font-mono">{selectedProduct.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Category ID</label>
                        <p className="text-gray-800">{selectedProduct.categoryId || "1"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                        <p className="text-gray-800">{selectedProduct.createdAt || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-gray-800">{selectedProduct.updatedAt || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <DialogFooter className="mt-6 gap-3">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="px-6">
                Close
              </Button>
              {selectedProduct && (
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  setLocation(`/add-item-professional?edit=${selectedProduct.id}`);
                }} className="px-6">
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Professional Edit Item Dialog - Matching Reference Design */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0" aria-describedby="edit-product-description">
            <div className="flex h-[90vh]">
              {/* Sidebar Navigation - Exact match to reference */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <EditIcon className="w-5 h-5" />
                      Edit Item
                    </DialogTitle>
                    <DialogDescription id="edit-product-description" className="sr-only">
                      Edit product information including details, pricing, and inventory
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">General Information</div>

                    <div 
                      onClick={() => scrollToSection('item-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'item-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <PackageIcon className="w-4 h-4" />
                      Item Information
                      <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>
                    </div>

                    <div 
                      onClick={() => scrollToSection('category-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'category-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <TagIcon className="w-4 h-4" />
                      Category Information
                    </div>

                    <div 
                      onClick={() => scrollToSection('tax-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'tax-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSignIcon className="w-4 h-4" />
                      Tax Information
                    </div>

                    <div 
                      onClick={() => scrollToSection('barcode-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'barcode-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <QrCodeIcon className="w-4 h-4" />
                      EAN Code/Barcode
                    </div>

                    <div 
                      onClick={() => scrollToSection('packing-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'packing-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <PackageIcon className="w-4 h-4" />
                      Packing
                      <div className="w-2 h-2 bg-orange-500 rounded-full ml-auto"></div>
                    </div>

                    <div 
                      onClick={() => scrollToSection('properties-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'properties-info'                           ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <WeightIcon className="w-4 h-4" />
                      Item Properties
                    </div>

                    <div 
                      onClick={() => scrollToSection('pricing-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'pricing-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <DollarSignIcon className="w-4 h-4" />
                      Pricing
                    </div>

                    <div 
                      onClick={() => scrollToSection('reorder-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer${
                        activeSection === 'reorder-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <WarehouseIcon className="w-4 h-4" />
                      Reorder Configurations
                    </div>

                    <div 
                      onClick={() => scrollToSection('purchase-info')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        activeSection === 'purchase-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <RefreshCcwIcon className="w-4 h-4" />
                      Purchase Order
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area - Dynamic sections based on selection */}
              <div className="flex-1 p-6 overflow-y-auto">
                {editingProduct && (

                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">

                      {/* Item Information Section */}
                      {currentEditSection === "item-information" && (
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
                                control={editForm.control}
                                name="itemCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Code *</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div />
                            </div>

                            <FormField
                              control={editForm.control}
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
                                control={editForm.control}
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
                                          {suppliers.map((supplier: any) => (
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
                                control={editForm.control}
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
                                          {suppliers.map((supplier: any) => (
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
                                control={editForm.control}
                                name="alias"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Alias</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Alternative name" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div />
                            </div>

                            <FormField
                              control={editForm.control}
                              name="aboutProduct"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>About Product</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Product description" rows={3} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Category Information Section */}
                      {currentEditSection === "category-information" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TagIcon className="w-5 h-5" />
                              Category Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <FormField
                              control={editForm.control}
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
                                  control={editForm.control}
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
                                            <SelectItem value="Electronics">Electronics</SelectItem>
                                            <SelectItem value="Grocery">Grocery</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="mainCategory"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium text-gray-700">MAIN CATEGORY</FormLabel>
                                      <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
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

                              <div className="grid grid-cols-2 gap-6 mt-4">
                                <FormField
                                  control={editForm.control}
                                  name="subCategory"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium text-gray-700">SUB CATEGORY</FormLabel>
                                      <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select sub category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                                            <SelectItem value="Personal Care">Personal Care</SelectItem>
                                            <SelectItem value="Household Items">Household Items</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="brand"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium text-gray-700">BRAND</FormLabel>
                                      <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select brand" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Amul">Amul</SelectItem>
                                            <SelectItem value="Britannia">Britannia</SelectItem>
                                            <SelectItem value="Parle">Parle</SelectItem>
                                            <SelectItem value="Generic">Generic</SelectItem>
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
                      {currentEditSection === "tax-information" && (
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
                                control={editForm.control}
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
                                control={editForm.control}
                                name="gstCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>GST Code *</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
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
                                control={editForm.control}
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
                                control={editForm.control}
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
                                control={editForm.control}
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

                      {/* EAN Code/Barcode Section */}
                      {currentEditSection === "ean-code-barcode" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3Icon className="w-5 h-5" />
                              EAN Code/Barcode Configuration
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <FormField
                              control={editForm.control}
                              name="barcode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Barcode</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter barcode" className="font-mono" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex items-center space-x-3">
                              <FormField
                                control={editForm.control}
                                name="eanCodeRequired"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-3">
                                    <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel>EAN Code Required</FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Packing Section */}
                      {currentEditSection === "packing" && (
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
                                control={editForm.control}
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
                                control={editForm.control}
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
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <FormField
                                control={editForm.control}
                                name="weightUnit"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Weight Unit</FormLabel>
                                    <FormControl>
                                      <Select value={field.value} onValueChange={field.onChange}>
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
                              <div />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Item Properties Section */}
                      {currentEditSection === "item-properties" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <SettingsIcon className="w-5 h-5" />
                              Item Properties
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Pricing Information</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={editForm.control}
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
                                  control={editForm.control}
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
                                  control={editForm.control}
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
                                  control={editForm.control}
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

                            <div className="bg-purple-50 p-4 rounded-lg">
                              <h3 className="font-medium mb-3">Additional Properties</h3>
                              <div className="space-y-3">
                                <FormField
                                  control={editForm.control}
                                  name="active"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                      <FormLabel className="text-sm">Active Status</FormLabel>
                                      <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Pricing Section */}
                      {currentEditSection === "pricing" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <DollarSignIcon className="w-5 h-5" />
                              Pricing
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <FormField
                              control={editForm.control}
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

                            <div className="grid grid-cols-2 gap-6">
                              <FormField
                                control={editForm.control}
                                name="sellBy"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Sell By</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>                                          <SelectValue />
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
                              <div />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Reorder Configurations Section */}
                      {currentEditSection === "reorder-configurations" && (
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
                                control={editForm.control}
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
                              <div />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Purchase Order Section */}
                      {currentEditSection === "purchase-order" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <ShoppingCartIcon className="w-5 h-5" />
                              Purchase Order
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <p className="text-gray-600">Purchase order configurations can be set here.</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Mobile App Config Section */}
                      {currentEditSection === "mobile-app-config" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <SettingsIcon className="w-5 h-5" />
                              Mobile App Config
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <p className="text-gray-600">Mobile app specific configurations.</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Other Information Section */}
                      {currentEditSection === "other-information" && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <InfoIcon className="w-5 h-5" />
                              Other Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <FormField
                              control={editForm.control}
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
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex justify-end gap-4 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateProductMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                          {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
              {/* Sidebar Navigation */}
              <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Edit Sections</h3>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("item-information")}>
                  <InfoIcon className="w-4 h-4 mr-2" />
                  Item Information
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("category-information")}>
                  <TagIcon className="w-4 h-4 mr-2" />
                  Category Information
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("tax-information")}>
                  <DollarSignIcon className="w-4 h-4 mr-2" />
                  Tax Information
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("ean-code-barcode")}>
                  <BarChart3Icon className="w-4 h-4 mr-2" />
                  EAN Code/Barcode
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("packing")}>
                  <BoxIcon className="w-4 h-4 mr-2" />
                  Weight & Packing
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("item-properties")}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Item Properties
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("pricing")}>
                  <DollarSignIcon className="w-4 h-4 mr-2" />
                  Pricing
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("reorder-configurations")}>
                  <PackageIcon className="w-4 h-4 mr-2" />
                  Reorder Configs
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("purchase-order")}>
                  <ShoppingCartIcon className="w-4 h-4 mr-2" />
                  Purchase Order
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("mobile-app-config")}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Mobile App Config
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setCurrentEditSection("other-information")}>
                  <InfoIcon className="w-4 h-4 mr-2" />
                  Other Information
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}