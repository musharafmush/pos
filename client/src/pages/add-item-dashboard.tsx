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
  XIcon
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
} from "@/components/ui/select"

export default function AddItemDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editForm, setEditForm] = useState({
    // Basic Information
    itemCode: "",
    name: "",
    manufacturerName: "",
    supplierName: "",
    alias: "",
    aboutProduct: "",

    // Category Information
    categoryId: "",

    // Tax Information
    taxRate: "",
    hsnCode: "",
    gstCode: "GST 18%",
    cgstRate: "0",
    sgstRate: "0",
    igstRate: "0",
    cessRate: "0",
    taxType: "Tax Inclusive",

    // EAN Code/Barcode
    barcode: "",

    // Packing
    packingType: "",
    packingSize: "",

    // Item Properties
    weight: "",
    weightUnit: "kg",
    dimensions: "",
    color: "",
    size: "",

    // Pricing
    price: "",
    mrp: "",
    cost: "",
    discountPercent: "",

    // Reorder Configurations
    stockQuantity: "",
    alertThreshold: "",
    reorderLevel: "",
    maxStockLevel: "",

    // Purchase Order
    preferredSupplier: "",
    leadTime: "",
    minimumOrderQty: "",

    // Status
    active: true
  });

  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("item-info");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const queryClient = useQueryClient();

  // Fetch products with better error handling
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts, error: productsError } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Fetched products:", data); // Debug log
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
            const errorText = await response.text();
            console.error('Update error response:', errorText);
            
            // Try to parse as JSON first
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              // Handle plain text error responses
              if (errorText.trim()) {
                errorMessage = errorText.trim();
              } else {
                // Fallback to HTTP status messages
                switch (response.status) {
                  case 400:
                    errorMessage = 'Invalid product data provided';
                    break;
                  case 404:
                    errorMessage = 'Product not found';
                    break;
                  case 409:
                    errorMessage = 'Product with this SKU already exists';
                    break;
                  case 500:
                    errorMessage = 'Internal server error occurred';
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
          result = await response.json();
          console.log('Update success result:', result);
        } catch (parseError) {
          console.warn('Could not parse success response as JSON, assuming success');
          result = { message: 'Product updated successfully' };
        }

        return result;
      } catch (networkError) {
        console.error('Network error during update:', networkError);
        
        if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to server. Please check your connection.');
        }
        
        // Re-throw our custom errors
        if (networkError.message.includes('Product') || networkError.message.includes('Server error')) {
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
      setEditForm({
        itemCode: "",
        name: '',
        manufacturerName: "",
        supplierName: "",
        alias: "",
        aboutProduct: "",
        categoryId: '',
        taxRate: '',
        hsnCode: '',
        gstCode: 'GST 18%',
        cgstRate: '0',
        sgstRate: '0',
        igstRate: '0',
        cessRate: '0',
        taxType: 'Tax Inclusive',
        barcode: '',
        packingType: '',
        packingSize: '',
        weight: '',
        weightUnit: 'kg',
        dimensions: '',
        color: '',
        size: '',
        price: '',
        mrp: '',
        cost: '',
        discountPercent: '',
        stockQuantity: '',
        alertThreshold: '',
        reorderLevel: '',
        maxStockLevel: '',
        preferredSupplier: '',
        leadTime: '',
        minimumOrderQty: '',
        active: true
      });
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
    setEditForm({
      itemCode: product.sku || `${product.name.replace(/\s+/g, '').toUpperCase()}001`,
      name: product.name || '',
      manufacturerName: "Select manufacturer",
      supplierName: "Select supplier",
      alias: product.name.split(' ')[0] || "",
      aboutProduct: product.description || '',
      categoryId: product.categoryId?.toString() || '',
      taxRate: totalGst.toString(),
      hsnCode: product.hsnCode || '',
      gstCode: gstCode,
      cgstRate: cgstRate.toString(),
      sgstRate: sgstRate.toString(),
      igstRate: igstRate.toString(),
      cessRate: product.cessRate?.toString() || '0',
      taxType: product.taxCalculationMethod || 'Tax Inclusive',
      barcode: product.barcode || '',
      packingType: "Box",
      packingSize: "1",
      weight: product.weight?.toString() || '1',
      weightUnit: product.weightUnit || 'kg',
      dimensions: '',
      color: '',
      size: '',
      price: product.price?.toString() || '0',
      mrp: product.mrp?.toString() || product.price?.toString() || '0',
      cost: product.cost?.toString() || '0',
      discountPercent: '0',
      stockQuantity: product.stockQuantity?.toString() || '0',
      alertThreshold: product.alertThreshold?.toString() || '5',
      reorderLevel: "10",
      maxStockLevel: "100",
      preferredSupplier: "Primary Supplier",
      leadTime: "7",
      minimumOrderQty: "1",
      active: product.active !== undefined ? product.active : true,
    });

    console.log('Edit form populated with:', {
      name: product.name,
      sku: product.sku,
      price: product.price,
      gstCode: gstCode,
      totalGst: totalGst
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
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

    switch (activeTab) {
      case "active":
        return matchesSearch && product.active;
      case "inactive":
        return matchesSearch && !product.active;
      case "low-stock":
        return matchesSearch && product.stockQuantity <= (product.alertThreshold || 5);
      case "bulk":
        return matchesSearch && (
          product.name.toLowerCase().includes('bulk') ||
          product.name.toLowerCase().includes('bag') ||
          product.name.toLowerCase().includes('container') ||
          product.name.toLowerCase().includes('kg') ||
          product.name.toLowerCase().includes('ltr') ||
          product.name.toLowerCase().includes('wholesale') ||
          product.name.toLowerCase().includes('sack') ||
          (parseFloat(product.weight || "0") >= 1 && product.weightUnit === 'kg') ||
          product.stockQuantity > 10
        );
      case "repackaged":
        return matchesSearch && (
          product.sku.includes('REPACK') ||
          product.name.toLowerCase().includes('pack') ||
          product.description?.toLowerCase().includes('repacked')
        );
      default:
        return matchesSearch;
    }
  });

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
              <Button variant="outline" size="sm">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCcwIcon className="w-4 h-4 mr-2" />
                Refresh
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
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
                      p.name.toLowerCase().includes('container') ||
                      p.name.toLowerCase().includes('kg') ||
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
                          <div className="w-1/4 h-2 bg-purple```tool_code
-600 rounded-full"></div>
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
                                onClick={() => handleEditProduct(product)}
                                title="Edit Product"
                              >
                                <EditIcon className="w-4 h-4" />
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
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Items Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm ? "No items match your search criteria." : "You haven't added any active items yet."}
                    </p>
                    <Link href="/add-item-professional">
                      <Button>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Your First Item
                      </Button>
                    </Link>
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
                                  onClick={() => handleEditProduct(product)}
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

                      const csvContent = [
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

        {/* View Product Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="view-product-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5" />
                Product Details
              </DialogTitle>
              <DialogDescription id="view-product-description">
                Complete information about this product
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product Name</label>
                    <p className="text-lg font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-800">{selectedProduct.description || "No description"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">SKU</label>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-800">{selectedProduct.categoryId}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Price</label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(parseFloat(selectedProduct.price.toString()))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">MRP</label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(parseFloat(selectedProduct.mrp?.toString() || selectedProduct.price.toString()))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stock Quantity</label>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{selectedProduct.stockQuantity}</p>
                      <Badge variant={selectedProduct.stockQuantity <= 5 ? "destructive" : "secondary"}>
                        {selectedProduct.stockQuantity <= 5 ? "Low Stock" : "In Stock"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge variant={selectedProduct.active ? "default" : "secondary"}>
                      {selectedProduct.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {selectedProduct.weight && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Weight</label>
                      <p className="text-gray-800">{selectedProduct.weight} {selectedProduct.weightUnit}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              {selectedProduct && (
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditProduct(selectedProduct);
                }}>
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
                        activeSection === 'properties-info' 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
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

              {/* Main Content Area */}
              <div className="flex-1 bg-white overflow-y-auto">
                {/* Header Section */}
                <div className="bg-white border-b p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Item Information</h2>
                      <p className="text-sm text-gray-500 mt-1">Update complete product information</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="flex items-center gap-2"
                    >
                      <XIcon className="w-4 h-4" />
                      Close
                    </Button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <div className="space-y-8">
                    {/* Basic Information Section */}
                    <div id="item-info" className="bg-white">
                      <div className="border-b pb-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Item Code *</label>
                            <Input
                              value={editForm.itemCode}
                              onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                              placeholder="ITM007797868"
                              className="bg-gray-50 text-gray-900 font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Item Name *</label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="salte 250"
                              className="text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Manufacturer Name *</label>
                            <select
                              value={editForm.manufacturerName}
                              onChange={(e) => setEditForm({ ...editForm, manufacturerName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">Select manufacturer</option>
                              <option value="ABC Manufacturing">ABC Manufacturing</option>
                              <option value="XYZ Industries">XYZ Industries</option>
                              <option value="Local Supplier">Local Supplier</option>
                              <option value="Premium Foods Ltd">Premium Foods Ltd</option>
                              <option value="Quality Products Inc">Quality Products Inc</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Supplier Name *</label>
                            <select
                              value={editForm.supplierName}
                              onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">Select supplier</option>
                              <option value="Primary Supplier">Primary Supplier</option>
                              <option value="Backup Supplier">Backup Supplier</option>
                              <option value="Local Distributor">Local Distributor</option>
                              <option value="Fresh Foods Supply">Fresh Foods Supply</option>
                              <option value="Wholesale Partners">Wholesale Partners</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Alias</label>
                            <Input
                              value={editForm.alias}
                              onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                              placeholder="salte"
                              className="text-gray-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select
                              value={editForm.categoryId}
                              onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">Electronics</option>
                              {categories?.map((category: any) => (
                                <option key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">About Product</label>
                          <textarea
                            value={editForm.aboutProduct}
                            onChange={(e) => setEditForm({ ...editForm, aboutProduct: e.target.value })}
                            placeholder="Enter product description"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div id="pricing-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Cost Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                            <Input
                              type="number"
                              value={editForm.cost}
                              onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                              placeholder="0.00"
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Selling Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                            <Input
                              type="number"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              placeholder="0.00"
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">MRP</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                            <Input
                              type="number"
                              value={editForm.mrp}
                              onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                              placeholder="0.00"
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pricing Analysis */}
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Pricing Analysis</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-green-700">Profit Margin:</span>
                            <span className="font-medium ml-2">
                              {editForm.price && editForm.cost ? 
                                `${(((parseFloat(editForm.price) - parseFloat(editForm.cost)) / parseFloat(editForm.price)) * 100).toFixed(1)}%` 
                                : '0%'}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-700">MRP Discount:</span>
                            <span className="font-medium ml-2">
                              {editForm.mrp && editForm.price ? 
                                `${(((parseFloat(editForm.mrp) - parseFloat(editForm.price)) / parseFloat(editForm.mrp)) * 100).toFixed(1)}%` 
                                : '0%'}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-700">Markup:</span>
                            <span className="font-medium ml-2">
                              {editForm.price && editForm.cost ? 
                                `${(((parseFloat(editForm.price) - parseFloat(editForm.cost)) / parseFloat(editForm.cost)) * 100).toFixed(1)}%` 
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inventory Management */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Management</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Current Stock</label>
                          <Input
                            type="number"
                            value={editForm.stockQuantity}
                            onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Alert Threshold</label>
                          <Input
                            type="number"
                            value={editForm.alertThreshold}
                            onChange={(e) => setEditForm({ ...editForm, alertThreshold: e.target.value })}
                            placeholder="5"
                          />
                        </div>
                      </div>

                      {/* Stock Value Display */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Stock Value</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-700">At Cost Price:</span>
                            <span className="font-medium ml-2">
                              ₹{editForm.stockQuantity && editForm.cost ? 
                                (parseFloat(editForm.stockQuantity) * parseFloat(editForm.cost)).toFixed(2) 
                                : '0.00'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">At Selling Price:</span>
                            <span className="font-medium ml-2">
                              ₹{editForm.stockQuantity && editForm.price ? 
                                (parseFloat(editForm.stockQuantity) * parseFloat(editForm.price)).toFixed(2) 
                                : '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Properties */}
                    <div id="properties-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Properties</h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Barcode</label>
                          <Input
                            value={editForm.barcode}
                            onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                            placeholder="Enter barcode"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Weight</label>
                          <Input
                            type="number"
                            value={editForm.weight}
                            onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                            placeholder="250"
                            step="0.001"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Weight Unit</label>
                          <select
                            value={editForm.weightUnit}
                            onChange={(e) => setEditForm({ ...editForm, weightUnit: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="g">Grams (g)</option>
                            <option value="kg">Kilograms (kg)</option>
                            <option value="piece">Piece</option>
                            <option value="liter">Liter (L)</option>
                            <option value="ml">Milliliter (ml)</option>
                          </select>
                        </div>
                      </div>

                      {/* Additional Properties */}
                      <div className="mt-6 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Dimensions (L×W×H)</label>
                          <Input
                            placeholder="e.g., 10×5×15 cm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Color</label>
                          <Input
                            placeholder="Enter color"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Category Information */}
                    <div id="category-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Primary Category</label>
                          <select
                            value={editForm.categoryId}
                            onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Category</option>
                            {categories?.map((category: any) => (
                              <option key={category.id} value={category.id.toString()}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Sub Category</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select sub category</option>
                            <option value="Spices">Spices</option>
                            <option value="Condiments">Condiments</option>
                            <option value="Seasonings">Seasonings</option>
                            <option value="Table Salt">Table Salt</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Brand</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select brand</option>
                            <option value="Tata Salt">Tata Salt</option>
                            <option value="Captain Cook">Captain Cook</option>
                            <option value="Saffola">Saffola</option>
                            <option value="Aashirvaad">Aashirvaad</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Tags</label>
                          <Input placeholder="e.g., organic, premium, imported" />
                        </div>
                      </div>
                    </div>


                      {/* Tax Information Section */}
                    <div id="tax-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h3>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">GST Rate (%)</label>
                            <select
                              value={editForm.gstCode}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                const rate = selectedValue.match(/\d+/)?.[0] || "18";
                                const cgst = (parseFloat(rate) / 2).toString();
                                const sgst = (parseFloat(rate) / 2).toString();

                                setEditForm({ 
                                  ...editForm, 
                                  gstCode: selectedValue,
                                  taxRate: rate,
                                  cgstRate: cgst,
                                  sgstRate: sgst,
                                  igstRate: "0"
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select GST rate</option>
                              <option value="GST 0%">GST 0% - Nil Rate</option>
                              <option value="GST 5%">GST 5% - Essential goods</option>
                              <option value="GST 12%">GST 12% - Standard rate</option>
                              <option value="GST 18%">GST 18% - Standard rate</option>
                              <option value="GST 28%">GST 28% - Luxury goods</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">HSN Code</label>
                            <Input
                              value={editForm.hsnCode}
                              onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
                              placeholder="Enter HSN code"
                              className="font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-800">GST Breakdown</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">CGST Rate (%)</label>
                              <Input
                                type="number"
                                value={editForm.cgstRate}
                                onChange={(e) => setEditForm({ ...editForm, cgstRate: e.target.value })}
                                placeholder="0"
                                step="0.1"
                                min="0"
                                max="50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">SGST Rate (%)</label>
                              <Input
                                type="number"
                                value={editForm.sgstRate}
                                onChange={(e) => setEditForm({ ...editForm, sgstRate: e.target.value })}
                                placeholder="0"
                                step="0.1"
                                min="0"
                                max="50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">IGST Rate (%)</label>
                              <Input
                                type="number"
                                value={editForm.igstRate}
                                onChange={(e) => setEditForm({ ...editForm, igstRate: e.target.value })}
                                placeholder="0"
                                step="0.1"
                                min="0"
                                max="50"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tax Type</label>
                            <select
                              value={editForm.taxType}
                              onChange={(e) => setEditForm({ ...editForm, taxType: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select tax type</option>
                              <option value="Tax Inclusive">Tax Inclusive</option>
                              <option value="Tax Exclusive">Tax Exclusive</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CESS Rate (%)</label>
                            <Input
                              type="number"
                              value={editForm.cessRate}
                              onChange={(e) => setEditForm({ ...editForm, cessRate: e.target.value })}
                              placeholder="0"
                              step="0.1"
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>

                        {/* Tax Calculation Display */}
                        {editForm.price && editForm.gstCode && (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg">
                            <h4 className="font-medium text-green-900 mb-2">Tax Calculation</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-green-700">Total GST:</span>
                                <span className="font-medium ml-2">
                                  {editForm.taxType === "Tax Inclusive" 
                                    ? `₹${((parseFloat(editForm.price) * parseFloat(editForm.taxRate || "0")) / (100 + parseFloat(editForm.taxRate || "0"))).toFixed(2)}`
                                    : `₹${((parseFloat(editForm.price) * parseFloat(editForm.taxRate || "0")) / 100).toFixed(2)}`
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-green-700">Base Price:</span>
                                <span className="font-medium ml-2">
                                  {editForm.taxType === "Tax Inclusive"
                                    ? `₹${(parseFloat(editForm.price) - ((parseFloat(editForm.price) * parseFloat(editForm.taxRate || "0")) / (100 + parseFloat(editForm.taxRate || "0")))).toFixed(2)}`
                                    : `₹${parseFloat(editForm.price).toFixed(2)}`
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-green-700">CGST Amount:</span>
                                <span className="font-medium ml-2">
                                  ₹{editForm.taxType === "Tax Inclusive"
                                    ? ((parseFloat(editForm.price) * parseFloat(editForm.cgstRate || "0")) / (100 + parseFloat(editForm.taxRate || "0"))).toFixed(2)
                                    : ((parseFloat(editForm.price) * parseFloat(editForm.cgstRate || "0")) / 100).toFixed(2)
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-green-700">SGST Amount:</span>
                                <span className="font-medium ml-2">
                                  ₹{editForm.taxType === "Tax Inclusive"
                                    ? ((parseFloat(editForm.price) * parseFloat(editForm.sgstRate || "0")) / (100 + parseFloat(editForm.taxRate || "0"))).toFixed(2)
                                    : ((parseFloat(editForm.price) * parseFloat(editForm.sgstRate || "0")) / 100).toFixed(2)
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>








                    {/* EAN Code/Barcode */}
                    <div id="barcode-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">EAN Code/Barcode</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Barcode/EAN</label>
                          <Input
                            value={editForm.barcode}
                            onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                            placeholder="Enter barcode or EAN"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Barcode Type</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="EAN13">EAN-13</option>
                            <option value="EAN8">EAN-8</option>
                            <option value="UPC">UPC</option>
                            <option value="CODE128">Code 128</option>
                            <option value="CODE39">Code 39</option>
                          </select>
                        </div>
                      </div>

                      {/* Barcode Generation Tools */}
                      <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-3">Barcode Tools</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const randomEAN = '2' + Math.random().toString().slice(2, 14);
                              setEditForm({ ...editForm, barcode: randomEAN });
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
                              setEditForm({ ...editForm, barcode: randomUPC });
                            }}
                          >
                            Generate UPC
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditForm({ ...editForm, barcode: "" })}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Packing */}
                    <div id="packing-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Packing Information</h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Packing Type</label>
                          <select
                            value={editForm.packingType}
                            onChange={(e) => setEditForm({ ...editForm, packingType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Packet">Packet</option>
                            <option value="Box">Box</option>
                            <option value="Bag">Bag</option>
                            <option value="Bottle">Bottle</option>
                            <option value="Can">Can</option>
                            <option value="Jar">Jar</option>
                            <option value="Pouch">Pouch</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Packing Size</label>
                          <Input
                            value={editForm.packingSize}
                            onChange={(e) => setEditForm({ ...editForm, packingSize: e.target.value })}
                            placeholder="250g"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Units per Pack</label>
                          <Input type="number" placeholder="1" defaultValue="1" />
                        </div>
                      </div>

                      {/* Packing Details */}
                      <div className="mt-6 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Packing Material</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select material</option>
                            <option value="Plastic">Plastic</option>
                            <option value="Paper">Paper</option>
                            <option value="Glass">Glass</option>
                            <option value="Metal">Metal</option>
                            <option value="Cardboard">Cardboard</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Shelf Life</label>
                          <Input placeholder="e.g., 24 months" />
                        </div>
                      </div>
                    </div>

                    {/* Reorder Configurations */}
                    <div id="reorder-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Reorder Configurations</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Reorder Level</label>
                            <Input
                              type="number"
                              value={editForm.reorderLevel}
                              onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })}
                              placeholder="10"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Max Stock Level</label>
                            <Input
                              type="number"
                              value={editForm.maxStockLevel}
                              onChange={(e) => setEditForm({ ...editForm, maxStockLevel: e.target.value })}
                              placeholder="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Economic Order Quantity</label>
                            <Input
                              type="number"
                              placeholder="50"
                            />
                          </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Stock Status</h4>
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Current Stock:</span>
                              <span className="font-medium">{editForm.stockQuantity || '0'} units</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Status:</span>
                              <span className={`font-medium ${Number(editForm.stockQuantity || 0) <= Number(editForm.alertThreshold || 0) 
                                ? 'text-red-600' : 'text-green-600'}`}>
                                {Number(editForm.stockQuantity || 0) <= Number(editForm.alertThreshold || 0) 
                                  ? 'Low Stock' : 'In Stock'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Days to Reorder:</span>
                              <span className="font-medium">
                                {Number(editForm.stockQuantity || 0) > Number(editForm.reorderLevel || 0) 
                                  ? Math.ceil(Number(editForm.stockQuantity || 0) / 2) + ' days' 
                                  : 'Now'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase Order */}
                    <div id="purchase-info" className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Preferred Supplier</label>
                            <select
                              value={editForm.preferredSupplier}
                              onChange={(e) => setEditForm({ ...editForm, preferredSupplier: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Supplier</option>
                              <option value="Primary Supplier">Primary Supplier</option>
                              <option value="Backup Supplier">Backup Supplier</option>
                              <option value="Local Distributor">Local Distributor</option>
                              <option value="Fresh Foods Supply">Fresh Foods Supply</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Lead Time (Days)</label>
                            <Input
                              type="number"
                              value={editForm.leadTime}
                              onChange={(e) => setEditForm({ ...editForm, leadTime: e.target.value })}
                              placeholder="7"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Minimum Order Qty</label>
                            <Input
                              type="number"
                              value={editForm.minimumOrderQty}
                              onChange={(e) => setEditForm({ ...editForm, minimumOrderQty: e.target.value })}
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-2">Purchase Recommendation</h4>
                          <div className="text-sm text-yellow-800 space-y-2">
                            <div>
                              {Number(editForm.stockQuantity || 0) <= Number(editForm.reorderLevel || 0) 
                                ? `⚠️ Reorder needed! Suggested quantity: ${Number(editForm.maxStockLevel || 0) - Number(editForm.stockQuantity || 0)} units`
                                : '✅ Stock levels are adequate'}
                            </div>
                            <div className="mt-3 pt-2 border-t border-yellow-200">
                              <span className="text-yellow-700">Last Purchase Price:</span>
                              <span className="font-medium ml-2">₹{editForm.cost || '0.00'}</span>
                            </div>
                            <div>
                              <span className="text-yellow-700">Estimated Order Value:</span>
                              <span className="font-medium ml-2">
                                ₹{editForm.cost && editForm.minimumOrderQty ? 
                                  (parseFloat(editForm.cost) * parseInt(editForm.minimumOrderQty)).toFixed(2) 
                                  : '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Status & Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="activeStatus"
                            checked={editForm.active}
                            onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="activeStatus" className="text-sm font-medium text-gray-700">
                            Item is active and available for sale
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="trackInventory"
                            defaultChecked
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="trackInventory" className="text-sm font-medium text-gray-700">
                            Track inventory for this item
                          </label>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="allowBackorder"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="allowBackorder" className="text-sm font-medium text-gray-700">
                            Allow selling when out of stock
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateProduct}
                      disabled={updateProductMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {updateProductMutation.isPending ? "Updating..." : "Update Item"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}