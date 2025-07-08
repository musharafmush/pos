import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  PackageIcon,
  TrendingUpIcon,
  BarChart3Icon,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  PlusIcon,
  EyeIcon,
  EditIcon,
  Package,
  Plus,
  Trash,
  ShoppingCart,
  Star,
  AlertTriangle,
  Check,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost: number;
  mrp: number;
  stockQuantity: number;
  alertThreshold?: number;
  weight?: number;
  weightUnit?: string;
  categoryId: number;
  active: boolean;
  weightInGms?: number;
};

export default function RepackingDashboardProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRepackDialogOpen, setIsRepackDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBulkProduct, setSelectedBulkProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    cost: "",
    stockQuantity: "",
    weight: "",
    weightUnit: "g",
    alertThreshold: ""
  });

  const [repackFormData, setRepackFormData] = useState({
    sourceQuantity: "1",
    sourceUnit: "kg", // Source bulk input unit
    targetQuantity: "8",
    unitWeight: "250",
    unitWeightUnit: "g", // Target repack unit
    targetName: "",
    targetSku: "",
    sellingPrice: "",
    costPrice: "",
    mrp: "",
    customWeight: "",
    customWeightUnit: "g", // Custom weight unit
    selectedPresetWeight: "250",
    marginPercentage: "15",
    mrpMarginPercentage: "25",
    // Enhanced customization options
    packagingType: "standard",
    customPackagingType: "",
    brandName: "",
    productVariant: "",
    expiryDays: "365",
    batchPrefix: "",
    customDescription: "",
    nutritionalInfo: "",
    storageInstructions: "",
    allergenInfo: "",
    countryOfOrigin: "India",
    manufacturerName: "",
    packagingMaterial: "plastic",
    labelColor: "white",
    priorityLevel: "normal",
    qualityGrade: "A",
    organicCertified: false,
    customBarcode: "",
    seasonalTag: "",
    promotionalText: ""
  });

  // Unit conversion functions
  const convertToGrams = (value: number, unit: string): number => {
    return unit === 'kg' ? value * 1000 : value;
  };

  const convertFromGrams = (value: number, unit: string): number => {
    return unit === 'kg' ? value / 1000 : value;
  };

  const formatWeightDisplay = (value: number, unit: string): string => {
    if (unit === 'kg') {
      return value >= 1 ? `${value}kg` : `${value * 1000}g`;
    }
    return value >= 1000 ? `${(value / 1000).toFixed(1)}kg` : `${value}g`;
  };

  // Dynamic calculation functions for smart repacking
  const calculateQuantityFromWeight = (originalWeight: number, targetWeight: number) => {
    return Math.floor(originalWeight / targetWeight);
  };

  const calculatePriceFromWeight = (originalPrice: number, originalWeight: number, targetWeight: number, marginPercentage: number = 15) => {
    const weightRatio = targetWeight / originalWeight;
    const basePrice = originalPrice * weightRatio;
    return (basePrice * (1 + marginPercentage / 100)).toFixed(2);
  };

  const recalculateRepackData = (weight: string, unit: string = 'g', isCustom: boolean = false) => {
    if (!selectedBulkProduct) return;

    const targetWeightInput = parseFloat(weight);
    const targetWeight = convertToGrams(targetWeightInput, unit);
    
    // Get source bulk weight with unit conversion
    const sourceQuantity = parseFloat(repackFormData.sourceQuantity);
    const sourceBulkWeight = convertToGrams(sourceQuantity, repackFormData.sourceUnit);
    
    const basePrice = parseFloat(selectedBulkProduct.price.toString());
    const baseCost = parseFloat(selectedBulkProduct.cost.toString());
    const marginPercent = parseFloat(repackFormData.marginPercentage);
    const mrpMarginPercent = parseFloat(repackFormData.mrpMarginPercentage);
    
    const suggestedQuantity = calculateQuantityFromWeight(sourceBulkWeight, targetWeight);
    const weightRatio = targetWeight / sourceBulkWeight;
    
    const unitCostPrice = (baseCost * weightRatio).toFixed(2);
    const unitSellingPrice = calculatePriceFromWeight(basePrice, sourceBulkWeight, targetWeight, marginPercent);
    const unitMrp = calculatePriceFromWeight(basePrice, sourceBulkWeight, targetWeight, mrpMarginPercent);

    // Generate new SKU and name with proper unit display
    const timestamp = Date.now();
    const cleanName = selectedBulkProduct.name.replace(/\b(bulk|BULK|Bulk)\b/gi, '').trim();
    const displayWeight = formatWeightDisplay(targetWeightInput, unit);
    const targetName = `${cleanName} (${displayWeight} Pack)`;
    const baseSku = selectedBulkProduct.sku.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
    const unitSuffix = unit === 'kg' ? 'KG' : 'G';
    const targetSku = `${baseSku}-RP${targetWeightInput}${unitSuffix}-${timestamp.toString().slice(-6)}`;

    setRepackFormData(prev => ({
      ...prev,
      unitWeight: weight,
      unitWeightUnit: unit,
      targetQuantity: suggestedQuantity.toString(),
      sellingPrice: unitSellingPrice,
      costPrice: unitCostPrice,
      mrp: unitMrp,
      targetName,
      targetSku,
      selectedPresetWeight: isCustom ? "" : weight,
      customWeight: isCustom ? weight : "",
      customWeightUnit: isCustom ? unit : prev.customWeightUnit
    }));
  };

  // Enhanced preset weight options with kg/g units
  const presetWeights = [
    { value: "100", unit: "g", label: "100g", display: "100g" },
    { value: "200", unit: "g", label: "200g", display: "200g" },
    { value: "250", unit: "g", label: "250g", display: "250g" },
    { value: "300", unit: "g", label: "300g", display: "300g" },
    { value: "400", unit: "g", label: "400g", display: "400g" },
    { value: "500", unit: "g", label: "500g", display: "500g" },
    { value: "600", unit: "g", label: "600g", display: "600g" },
    { value: "700", unit: "g", label: "700g", display: "700g" },
    { value: "800", unit: "g", label: "800g", display: "800g" },
    { value: "900", unit: "g", label: "900g", display: "900g" },
    { value: "1", unit: "kg", label: "1kg", display: "1 kg" },
    { value: "1.5", unit: "kg", label: "1.5kg", display: "1.5 kg" },
    { value: "2", unit: "kg", label: "2kg", display: "2 kg" },
    { value: "2.5", unit: "kg", label: "2.5kg", display: "2.5 kg" },
    { value: "5", unit: "kg", label: "5kg", display: "5 kg" },
    { value: "10", unit: "kg", label: "10kg", display: "10 kg" }
  ];

  const handleWeightChangeWithCalculation = (weight: string, isPreset: boolean, unit: string = 'g') => {
    if (isPreset) {
      setRepackFormData(prev => ({
        ...prev,
        unitWeight: weight,
        unitWeightUnit: unit,
        selectedPresetWeight: weight,
        customWeight: "",
        customWeightUnit: unit
      }));
    } else {
      setRepackFormData(prev => ({
        ...prev,
        customWeight: weight,
        customWeightUnit: unit,
        unitWeight: weight,
        unitWeightUnit: unit,
        selectedPresetWeight: ""
      }));
    }
    recalculateRepackData(weight, unit, !isPreset);
  };

  // Fetch all products to identify repacked items
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Filter bulk products (products suitable for repacking)
  const bulkProducts = products.filter((product: Product) => {
    const isBulk = product.name.toLowerCase().includes('bulk') || 
                   (product.weight && product.weight > 1000) ||
                   product.stockQuantity > 50;
    return isBulk && product.active;
  });

  // Filter repacked products (products created from repacking)
  const repackedProducts = products.filter((product: Product) => {
    const isRepacked = product.sku.includes('-RP') || 
                       product.name.includes('Pack)') ||
                       product.description?.includes('repacked');
    return isRepacked && product.active;
  });

  // Handle opening repack dialog
  const handleRepackProduct = (product: Product) => {
    setSelectedBulkProduct(product);
    
    // Reset form with intelligent defaults
    const initialWeight = "250";
    const initialUnit = "g";
    
    setRepackFormData({
      sourceQuantity: "1",
      sourceUnit: "kg",
      targetQuantity: "8",
      unitWeight: initialWeight,
      unitWeightUnit: initialUnit,
      targetName: "",
      targetSku: "",
      sellingPrice: "",
      costPrice: "",
      mrp: "",
      customWeight: "",
      customWeightUnit: initialUnit,
      selectedPresetWeight: initialWeight,
      marginPercentage: "15",
      mrpMarginPercentage: "25",
      // Enhanced customization options
      packagingType: "standard",
      customPackagingType: "",
      brandName: "",
      productVariant: "",
      expiryDays: "365",
      batchPrefix: "",
      customDescription: "",
      nutritionalInfo: "",
      storageInstructions: "",
      allergenInfo: "",
      countryOfOrigin: "India",
      manufacturerName: "",
      packagingMaterial: "plastic",
      labelColor: "white",
      priorityLevel: "normal",
      qualityGrade: "A",
      organicCertified: false,
      customBarcode: "",
      seasonalTag: "",
      promotionalText: ""
    });
    
    setIsRepackDialogOpen(true);
    
    // Auto-calculate initial values
    setTimeout(() => {
      recalculateRepackData(initialWeight, initialUnit, false);
    }, 100);
  };

  // Create repacked product mutation
  const createRepackedProductMutation = useMutation({
    mutationFn: async (repackData: any) => {
      // Calculate final weight in grams for storage
      const finalWeightInGrams = convertToGrams(
        parseFloat(repackData.unitWeight), 
        repackData.unitWeightUnit
      );
      
      // Create comprehensive description with customization details
      const descriptionParts = [
        `Repacked from ${selectedBulkProduct?.name}`,
        repackData.customDescription && `${repackData.customDescription}`,
        repackData.brandName && `Brand: ${repackData.brandName}`,
        repackData.productVariant && `Variant: ${repackData.productVariant}`,
        repackData.qualityGrade && `Quality: Grade ${repackData.qualityGrade}`,
        repackData.packagingType !== "standard" && `Packaging: ${repackData.packagingType === "custom" ? repackData.customPackagingType : repackData.packagingType}`,
        repackData.organicCertified && "Organic Certified",
        repackData.seasonalTag && `${repackData.seasonalTag}`,
        repackData.promotionalText && `${repackData.promotionalText}`,
        repackData.storageInstructions && `Storage: ${repackData.storageInstructions}`,
        repackData.allergenInfo && `Allergens: ${repackData.allergenInfo}`,
        repackData.nutritionalInfo && `Nutrition: ${repackData.nutritionalInfo}`,
        repackData.manufacturerName && `Manufacturer: ${repackData.manufacturerName}`,
        repackData.countryOfOrigin !== "India" && `Origin: ${repackData.countryOfOrigin}`,
        `Shelf Life: ${repackData.expiryDays} days`,
        `Priority: ${repackData.priorityLevel}`,
        repackData.batchPrefix && `Batch: ${repackData.batchPrefix}`
      ].filter(Boolean).join(" | ");

      const productData = {
        name: repackData.targetName,
        sku: repackData.targetSku,
        description: descriptionParts,
        price: parseFloat(repackData.sellingPrice),
        cost: parseFloat(repackData.costPrice),
        mrp: parseFloat(repackData.mrp),
        stockQuantity: parseInt(repackData.targetQuantity),
        weight: finalWeightInGrams,
        weightUnit: "g",
        categoryId: selectedBulkProduct?.categoryId || 1,
        alertThreshold: Math.max(5, Math.floor(parseInt(repackData.targetQuantity) * 0.2)),
        active: true,
        weightInGms: finalWeightInGrams,
        barcode: repackData.customBarcode || undefined
      };

      return await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Repacked product created successfully",
      });
      setIsRepackDialogOpen(false);
      setRepackFormData({
        sourceQuantity: "1",
        sourceUnit: "kg",
        targetQuantity: "8",
        unitWeight: "250",
        unitWeightUnit: "g",
        targetName: "",
        targetSku: "",
        sellingPrice: "",
        costPrice: "",
        mrp: "",
        customWeight: "",
        customWeightUnit: "g",
        selectedPresetWeight: "250",
        marginPercentage: "15",
        mrpMarginPercentage: "25",
        // Enhanced customization options
        packagingType: "standard",
        customPackagingType: "",
        brandName: "",
        productVariant: "",
        expiryDays: "365",
        batchPrefix: "",
        customDescription: "",
        nutritionalInfo: "",
        storageInstructions: "",
        allergenInfo: "",
        countryOfOrigin: "India",
        manufacturerName: "",
        packagingMaterial: "plastic",
        labelColor: "white",
        priorityLevel: "normal",
        qualityGrade: "A",
        organicCertified: false,
        customBarcode: "",
        seasonalTag: "",
        promotionalText: ""
      });
    },
    onError: (error) => {
      console.error("Error creating repacked product:", error);
      toast({
        title: "Error",
        description: "Failed to create repacked product",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRepack = () => {
    if (!selectedBulkProduct || !repackFormData.unitWeight || !repackFormData.targetName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createRepackedProductMutation.mutate({
      ...repackFormData,
      selectedBulkProduct
    });
  };

  // Filter products based on search and filters
  const filteredBulkProducts = bulkProducts.filter((product: Product) => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && product.active) ||
      (statusFilter === "low-stock" && product.stockQuantity <= (product.alertThreshold || 10));

    return matchesSearch && matchesStatus;
  });

  const filteredRepackedProducts = repackedProducts.filter((product: Product) => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading repacking dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Professional Repacking Dashboard</h1>
            <p className="text-muted-foreground">
              Manage bulk products and create repackaged items with kg/g unit conversion
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bulk Products</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bulkProducts.length}</div>
              <p className="text-xs text-muted-foreground">Available for repacking</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repacked Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repackedProducts.length}</div>
              <p className="text-xs text-muted-foreground">Created from bulk items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{bulkProducts.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Bulk inventory value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bulkProducts.filter(p => p.stockQuantity <= (p.alertThreshold || 10)).length}
              </div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Product Management Tabs */}
        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bulk">Bulk Products ({bulkProducts.length})</TabsTrigger>
            <TabsTrigger value="repacked">Repacked Products ({repackedProducts.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Products for Repacking</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Large quantity products suitable for breaking down into smaller packages
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Weight/Unit</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBulkProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="text-center">
                              <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-semibold text-gray-900">No bulk products</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                No bulk products found matching your criteria.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBulkProducts.map((product: Product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {product.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {product.sku}
                              </code>
                            </TableCell>
                            <TableCell>
                              {product.weight ? (
                                <div className="text-sm">
                                  <div>{product.weight}{product.weightUnit || 'g'}</div>
                                  {product.weight >= 1000 && (
                                    <div className="text-muted-foreground">
                                      ({(product.weight / 1000).toFixed(1)}kg)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not specified</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{product.stockQuantity}</span>
                                {product.stockQuantity <= (product.alertThreshold || 10) && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={product.active ? "default" : "secondary"}>
                                {product.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleRepackProduct(product)}
                                className="mr-2"
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Repack
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repacked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Repacked Products</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Products created by repacking bulk items into smaller units
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Weight/Unit</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRepackedProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="text-center">
                              <Package className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-semibold text-gray-900">No repacked products</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Start repacking bulk products to see them here.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRepackedProducts.map((product: Product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {product.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {product.sku}
                              </code>
                            </TableCell>
                            <TableCell>
                              {product.weight ? (
                                <div className="text-sm">
                                  <div>{product.weight}{product.weightUnit || 'g'}</div>
                                  {product.weight >= 1000 && (
                                    <div className="text-muted-foreground">
                                      ({(product.weight / 1000).toFixed(1)}kg)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not specified</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{product.stockQuantity}</span>
                                {product.stockQuantity <= (product.alertThreshold || 10) && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                            <TableCell>₹{Number(product.mrp).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={product.active ? "default" : "secondary"}>
                                {product.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Professional Repack Dialog with kg/g Unit Support */}
        <Dialog open={isRepackDialogOpen} onOpenChange={setIsRepackDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Professional Repacking - {selectedBulkProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Create smaller packaged products from bulk inventory with intelligent weight conversion (kg ↔ g)
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              {/* Source Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <PackageIcon className="w-4 h-4" />
                  Source Bulk Configuration
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source-quantity">Bulk Quantity to Use</Label>
                    <Input
                      id="source-quantity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={repackFormData.sourceQuantity}
                      onChange={(e) => {
                        setRepackFormData({ ...repackFormData, sourceQuantity: e.target.value });
                        if (selectedBulkProduct && repackFormData.unitWeight) {
                          recalculateRepackData(repackFormData.unitWeight, repackFormData.unitWeightUnit, false);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-unit">Source Unit</Label>
                    <Select 
                      value={repackFormData.sourceUnit} 
                      onValueChange={(value) => {
                        setRepackFormData({ ...repackFormData, sourceUnit: value });
                        if (selectedBulkProduct && repackFormData.unitWeight) {
                          recalculateRepackData(repackFormData.unitWeight, repackFormData.unitWeightUnit, false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="g">Grams (g)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Source Weight</Label>
                    <div className="text-sm bg-gray-100 p-2 rounded">
                      {repackFormData.sourceQuantity} {repackFormData.sourceUnit}
                      {repackFormData.sourceUnit === 'kg' && (
                        <span className="text-gray-500 ml-2">
                          ({(parseFloat(repackFormData.sourceQuantity) * 1000).toFixed(0)}g)
                        </span>
                      )}
                      {repackFormData.sourceUnit === 'g' && parseFloat(repackFormData.sourceQuantity) >= 1000 && (
                        <span className="text-gray-500 ml-2">
                          ({(parseFloat(repackFormData.sourceQuantity) / 1000).toFixed(1)}kg)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Configuration with Unit Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Target Package Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-quantity">Expected Packages</Label>
                    <Input
                      id="target-quantity"
                      type="number"
                      min="1"
                      value={repackFormData.targetQuantity}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 col-span-1">
                    <Label>Package Weight Unit</Label>
                    <Select 
                      value={repackFormData.unitWeightUnit} 
                      onValueChange={(value) => {
                        setRepackFormData({ ...repackFormData, unitWeightUnit: value });
                        if (repackFormData.unitWeight) {
                          recalculateRepackData(repackFormData.unitWeight, value, false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">Grams (g)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Enhanced Weight Selection with Units */}
                <div className="space-y-3">
                  <Label>Package Weight Selection</Label>
                  
                  {/* Preset Weight Buttons with Units */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700">Quick Select:</div>
                    <div className="grid grid-cols-4 gap-2">
                      {presetWeights.map((preset) => (
                        <Button
                          key={preset.value + preset.unit}
                          type="button"
                          variant={repackFormData.selectedPresetWeight === preset.value && repackFormData.unitWeightUnit === preset.unit ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => handleWeightChangeWithCalculation(preset.value, true, preset.unit)}
                        >
                          {preset.display}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Weight Input with Unit */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Custom Weight:</div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter custom weight"
                        value={repackFormData.customWeight}
                        onChange={(e) => handleWeightChangeWithCalculation(e.target.value, false, repackFormData.customWeightUnit)}
                        className="flex-1"
                      />
                      <Select 
                        value={repackFormData.customWeightUnit} 
                        onValueChange={(value) => {
                          setRepackFormData({ ...repackFormData, customWeightUnit: value });
                          if (repackFormData.customWeight) {
                            handleWeightChangeWithCalculation(repackFormData.customWeight, false, value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Current Selection Display with Conversion */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium text-blue-900">Selected Weight: </span>
                      <span className="text-blue-700">
                        {repackFormData.unitWeight ? 
                          `${repackFormData.unitWeight}${repackFormData.unitWeightUnit}` : 
                          'None selected'
                        }
                        {repackFormData.unitWeight && (
                          <span className="ml-2 text-blue-600">
                            {repackFormData.unitWeightUnit === 'kg' && parseFloat(repackFormData.unitWeight) < 1 ? 
                              `(${(parseFloat(repackFormData.unitWeight) * 1000).toFixed(0)}g)` :
                              repackFormData.unitWeightUnit === 'g' && parseFloat(repackFormData.unitWeight) >= 1000 ?
                              `(${(parseFloat(repackFormData.unitWeight) / 1000).toFixed(1)}kg)` : ''
                            }
                          </span>
                        )}
                      </span>
                    </div>
                    {repackFormData.unitWeight && repackFormData.sourceQuantity && (
                      <div className="text-sm mt-1">
                        <span className="font-medium text-blue-900">Calculation: </span>
                        <span className="text-blue-700">
                          {repackFormData.sourceQuantity}{repackFormData.sourceUnit} ÷ {repackFormData.unitWeight}{repackFormData.unitWeightUnit} = {repackFormData.targetQuantity} packages
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-name">New Product Name</Label>
                    <Input
                      id="target-name"
                      value={repackFormData.targetName}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-sku">New SKU</Label>
                    <Input
                      id="target-sku"
                      value={repackFormData.targetSku}
                      onChange={(e) => setRepackFormData({ ...repackFormData, targetSku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling-price">Selling Price</Label>
                    <Input
                      id="selling-price"
                      type="number"
                      step="0.01"
                      value={repackFormData.sellingPrice}
                      onChange={(e) => setRepackFormData({ ...repackFormData, sellingPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost-price">Cost Price</Label>
                    <Input
                      id="cost-price"
                      type="number"
                      step="0.01"
                      value={repackFormData.costPrice}
                      onChange={(e) => setRepackFormData({ ...repackFormData, costPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrp">MRP</Label>
                    <Input
                      id="mrp"
                      type="number"
                      step="0.01"
                      value={repackFormData.mrp}
                      onChange={(e) => setRepackFormData({ ...repackFormData, mrp: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Pricing Controls */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <TrendingUpIcon className="w-4 h-4" />
                  Smart Pricing Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="margin-percentage">Selling Price Margin (%)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="margin-percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={repackFormData.marginPercentage}
                        onChange={(e) => {
                          setRepackFormData({ ...repackFormData, marginPercentage: e.target.value });
                          if (selectedBulkProduct && repackFormData.unitWeight) {
                            recalculateRepackData(repackFormData.unitWeight, repackFormData.unitWeightUnit, false);
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrp-margin-percentage">MRP Margin (%)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="mrp-margin-percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={repackFormData.mrpMarginPercentage}
                        onChange={(e) => {
                          setRepackFormData({ ...repackFormData, mrpMarginPercentage: e.target.value });
                          if (selectedBulkProduct && repackFormData.unitWeight) {
                            recalculateRepackData(repackFormData.unitWeight, repackFormData.unitWeightUnit, false);
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedBulkProduct && repackFormData.unitWeight) {
                          recalculateRepackData(repackFormData.unitWeight, repackFormData.unitWeightUnit, false);
                        }
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recalculate Prices with New Margins
                    </Button>
                  </div>
                </div>
              </div>

              {/* Professional Customization Options */}
              <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Professional Customization Options
                </h4>
                
                <div className="grid gap-6">
                  {/* Packaging & Branding */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="packaging-type">Packaging Type</Label>
                      <Select 
                        value={repackFormData.packagingType} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, packagingType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Package</SelectItem>
                          <SelectItem value="premium">Premium Package</SelectItem>
                          <SelectItem value="eco-friendly">Eco-Friendly</SelectItem>
                          <SelectItem value="vacuum-sealed">Vacuum Sealed</SelectItem>
                          <SelectItem value="resealable">Resealable Pouch</SelectItem>
                          <SelectItem value="jar">Glass Jar</SelectItem>
                          <SelectItem value="tin">Metal Tin</SelectItem>
                          <SelectItem value="custom">Custom Type</SelectItem>
                        </SelectContent>
                      </Select>
                      {repackFormData.packagingType === "custom" && (
                        <Input
                          placeholder="Enter custom packaging type"
                          value={repackFormData.customPackagingType}
                          onChange={(e) => setRepackFormData({ ...repackFormData, customPackagingType: e.target.value })}
                        />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="brand-name">Brand Name</Label>
                      <Input
                        id="brand-name"
                        placeholder="e.g., Fresh Choice, Nature's Best"
                        value={repackFormData.brandName}
                        onChange={(e) => setRepackFormData({ ...repackFormData, brandName: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="product-variant">Product Variant</Label>
                      <Input
                        id="product-variant"
                        placeholder="e.g., Premium, Organic, Special"
                        value={repackFormData.productVariant}
                        onChange={(e) => setRepackFormData({ ...repackFormData, productVariant: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Quality & Certification */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quality-grade">Quality Grade</Label>
                      <Select 
                        value={repackFormData.qualityGrade} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, qualityGrade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Grade A (Premium)</SelectItem>
                          <SelectItem value="B">Grade B (Standard)</SelectItem>
                          <SelectItem value="C">Grade C (Economy)</SelectItem>
                          <SelectItem value="Export">Export Quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority-level">Priority Level</Label>
                      <Select 
                        value={repackFormData.priorityLevel} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, priorityLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="expiry-days">Shelf Life (Days)</Label>
                      <Input
                        id="expiry-days"
                        type="number"
                        min="1"
                        value={repackFormData.expiryDays}
                        onChange={(e) => setRepackFormData({ ...repackFormData, expiryDays: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={repackFormData.organicCertified}
                          onChange={(e) => setRepackFormData({ ...repackFormData, organicCertified: e.target.checked })}
                          className="rounded"
                        />
                        Organic Certified
                      </Label>
                    </div>
                  </div>

                  {/* Product Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-description">Custom Description</Label>
                      <Textarea
                        id="custom-description"
                        placeholder="Additional product description for packaging"
                        value={repackFormData.customDescription}
                        onChange={(e) => setRepackFormData({ ...repackFormData, customDescription: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="storage-instructions">Storage Instructions</Label>
                      <Textarea
                        id="storage-instructions"
                        placeholder="e.g., Store in cool, dry place"
                        value={repackFormData.storageInstructions}
                        onChange={(e) => setRepackFormData({ ...repackFormData, storageInstructions: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-prefix">Batch Prefix</Label>
                      <Input
                        id="batch-prefix"
                        placeholder="e.g., RP2025, BATCH"
                        value={repackFormData.batchPrefix}
                        onChange={(e) => setRepackFormData({ ...repackFormData, batchPrefix: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="seasonal-tag">Seasonal Tag</Label>
                      <Select 
                        value={repackFormData.seasonalTag} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, seasonalTag: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Season</SelectItem>
                          <SelectItem value="winter">Winter Special</SelectItem>
                          <SelectItem value="summer">Summer Fresh</SelectItem>
                          <SelectItem value="monsoon">Monsoon Ready</SelectItem>
                          <SelectItem value="festival">Festival Edition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="promotional-text">Promotional Text</Label>
                      <Input
                        id="promotional-text"
                        placeholder="e.g., New Launch, Best Seller"
                        value={repackFormData.promotionalText}
                        onChange={(e) => setRepackFormData({ ...repackFormData, promotionalText: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Manufacturing & Origin */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer-name">Manufacturer Name</Label>
                      <Input
                        id="manufacturer-name"
                        placeholder="Company manufacturing this product"
                        value={repackFormData.manufacturerName}
                        onChange={(e) => setRepackFormData({ ...repackFormData, manufacturerName: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country-origin">Country of Origin</Label>
                      <Input
                        id="country-origin"
                        value={repackFormData.countryOfOrigin}
                        onChange={(e) => setRepackFormData({ ...repackFormData, countryOfOrigin: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="custom-barcode">Custom Barcode</Label>
                      <Input
                        id="custom-barcode"
                        placeholder="Enter custom barcode (optional)"
                        value={repackFormData.customBarcode}
                        onChange={(e) => setRepackFormData({ ...repackFormData, customBarcode: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Allergen & Nutritional Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allergen-info">Allergen Information</Label>
                      <Textarea
                        id="allergen-info"
                        placeholder="e.g., Contains nuts, May contain traces of..."
                        value={repackFormData.allergenInfo}
                        onChange={(e) => setRepackFormData({ ...repackFormData, allergenInfo: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nutritional-info">Nutritional Information</Label>
                      <Textarea
                        id="nutritional-info"
                        placeholder="Per 100g: Energy, Protein, Carbs, etc."
                        value={repackFormData.nutritionalInfo}
                        onChange={(e) => setRepackFormData({ ...repackFormData, nutritionalInfo: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Visual Customization */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="packaging-material">Packaging Material</Label>
                      <Select 
                        value={repackFormData.packagingMaterial} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, packagingMaterial: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plastic">Food Grade Plastic</SelectItem>
                          <SelectItem value="paper">Paper/Cardboard</SelectItem>
                          <SelectItem value="foil">Aluminum Foil</SelectItem>
                          <SelectItem value="glass">Glass</SelectItem>
                          <SelectItem value="biodegradable">Biodegradable</SelectItem>
                          <SelectItem value="laminated">Laminated Pouch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="label-color">Label Color Theme</Label>
                      <Select 
                        value={repackFormData.labelColor} 
                        onValueChange={(value) => setRepackFormData({ ...repackFormData, labelColor: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">White/Clean</SelectItem>
                          <SelectItem value="green">Green/Natural</SelectItem>
                          <SelectItem value="blue">Blue/Premium</SelectItem>
                          <SelectItem value="red">Red/Bold</SelectItem>
                          <SelectItem value="gold">Gold/Luxury</SelectItem>
                          <SelectItem value="black">Black/Elegant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-5 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Repack Summary & Analysis
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="text-green-800">
                      <span className="font-medium">Source Usage:</span>
                      <p>• {repackFormData.sourceQuantity} {repackFormData.sourceUnit} of {selectedBulkProduct?.name}</p>
                      <p>• Remaining stock: {selectedBulkProduct ? selectedBulkProduct.stockQuantity - parseInt(repackFormData.sourceQuantity || "0") : 0}</p>
                    </div>
                    <div className="text-blue-800">
                      <span className="font-medium">Output:</span>
                      <p>• {repackFormData.targetQuantity} packages of {repackFormData.unitWeight}{repackFormData.unitWeightUnit} each</p>
                      <p>• Total packaged weight: {
                        repackFormData.unitWeight && repackFormData.targetQuantity ? 
                        `${(parseFloat(repackFormData.unitWeight) * parseInt(repackFormData.targetQuantity)).toFixed(1)}${repackFormData.unitWeightUnit}` : 
                        'Calculating...'
                      }</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-purple-800">
                      <span className="font-medium">Financial Analysis:</span>
                      <p>• Cost per unit: ₹{repackFormData.costPrice}</p>
                      <p>• Selling price: ₹{repackFormData.sellingPrice}</p>
                      <p>• Profit margin: {repackFormData.sellingPrice && repackFormData.costPrice ? 
                        `₹${(parseFloat(repackFormData.sellingPrice) - parseFloat(repackFormData.costPrice)).toFixed(2)} (${((parseFloat(repackFormData.sellingPrice) - parseFloat(repackFormData.costPrice)) / parseFloat(repackFormData.sellingPrice) * 100).toFixed(1)}%)` : 
                        'Calculating...'
                      }</p>
                    </div>
                    <div className="text-indigo-800">
                      <span className="font-medium">Total Revenue Potential:</span>
                      <p>• ₹{repackFormData.sellingPrice && repackFormData.targetQuantity ? 
                        (parseFloat(repackFormData.sellingPrice) * parseInt(repackFormData.targetQuantity)).toFixed(2) : 
                        '0.00'
                      }</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRepackDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRepack}
                disabled={!repackFormData.targetName || !repackFormData.unitWeight || createRepackedProductMutation.isPending}
              >
                {createRepackedProductMutation.isPending ? "Creating..." : "Create Repacked Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}