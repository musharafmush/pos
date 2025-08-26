import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Save, Printer, ArrowLeft, Trash2, Package, Edit2, List, Download, FileText, Search, X, QrCode as QrCodeIcon } from "lucide-react";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Types
interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  mrp: string;
  cost: string;
  wholesalePrice?: string;
  stockQuantity: number;
  hsnCode?: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
  description?: string;
}

interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Purchase Item Schema
const purchaseItemSchema = z.object({
  productId: z.number().min(1, "Product is required"),
  description: z.string().optional(),
  receivedQty: z.number().min(0, "Received quantity cannot be negative"),
  freeQty: z.number().min(0, "Free quantity cannot be negative").optional(),
  cost: z.number().min(0, "Cost must be at least 0"),
  hsnCode: z.string().optional(),
  taxPercent: z.number().min(0, "Tax percent cannot be negative").default(18),
  discountAmount: z.number().min(0, "Discount amount cannot be negative").optional(),
  netCost: z.number().min(0, "Net cost cannot be negative").optional(),
  roiPercent: z.number().optional()
});

// Purchase Form Schema
const purchaseFormSchema = z.object({
  supplierId: z.number().min(1, "Supplier is required"),
  orderDate: z.string(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentTerms: z.string().default("Cash"),
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

// Product Search Component
const ProductSearchWithSuggestions = ({ 
  products, 
  onProductSelect, 
  placeholder = "Search products..." 
}: {
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (searchTerm.length >= 1) {
      const searchLower = searchTerm.toLowerCase().trim();
      const filtered = products.filter(product => {
        const name = (product.name || '').toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        return name.includes(searchLower) || sku.includes(searchLower);
      }).slice(0, 8);

      setFilteredProducts(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const selectProduct = (product: Product) => {
    onProductSelect(product);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-8"
          onFocus={() => {
            if (searchTerm.length >= 1 && filteredProducts.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          data-testid="input-product-search"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setShowSuggestions(false);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSuggestions && filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => selectProduct(product)}
              className="p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              data-testid={`suggestion-product-${product.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 mb-1 truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {product.sku}
                    </span>
                    <span className="font-medium text-green-600">₹{product.price}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    product.stockQuantity <= 5 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    Stock: {product.stockQuantity}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Form setup
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: 0,
      orderDate: today,
      invoiceNumber: "",
      invoiceDate: today,
      paymentTerms: "Cash",
      remarks: "",
      items: [{
        productId: 0,
        description: "",
        receivedQty: 1,
        freeQty: 0,
        cost: 0,
        hsnCode: "",
        taxPercent: 18,
        discountAmount: 0,
        netCost: 0,
        roiPercent: 0
      }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch data
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // State for totals calculation
  const [totals, setTotals] = useState({
    totalItems: 0,
    totalQuantity: 0,
    subtotal: 0,
    totalTax: 0,
    grandTotal: 0
  });

  // Calculate totals
  const calculateTotals = () => {
    const items = form.getValues("items") || [];
    let totalItems = 0;
    let totalQuantity = 0;
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      if (item.productId && item.productId > 0) {
        totalItems++;
        const qty = Number(item.receivedQty) || 0;
        totalQuantity += qty;

        const itemCost = (item.cost || 0) * qty;
        const discountAmount = item.discountAmount || 0;
        const taxableAmount = itemCost - discountAmount;
        const tax = (taxableAmount * (item.taxPercent || 0)) / 100;

        subtotal += itemCost;
        totalTax += tax;

        // Update net cost for the item
        const netCost = taxableAmount + tax;
        form.setValue(`items.${items.indexOf(item)}.netCost`, Math.round(netCost * 100) / 100);
      }
    });

    const grandTotal = subtotal - items.reduce((sum, item) => sum + (item.discountAmount || 0), 0) + totalTax;

    setTotals({
      totalItems,
      totalQuantity,
      subtotal,
      totalTax,
      grandTotal
    });
  };

  // Recalculate totals when items change
  useEffect(() => {
    calculateTotals();
  }, [form.watch("items")]);

  // Handle product selection
  const handleProductSelection = (index: number, product: Product) => {
    form.setValue(`items.${index}.productId`, product.id);
    form.setValue(`items.${index}.description`, product.name);
    form.setValue(`items.${index}.cost`, parseFloat(product.cost) || 0);
    form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
    
    // Set tax rate from product
    const cgstRate = parseFloat(product.cgstRate || "0");
    const sgstRate = parseFloat(product.sgstRate || "0");
    const igstRate = parseFloat(product.igstRate || "0");
    const totalTax = igstRate > 0 ? igstRate : (cgstRate + sgstRate);
    
    form.setValue(`items.${index}.taxPercent`, totalTax || 18);
    
    calculateTotals();
  };

  // Add new item
  const addNewItem = () => {
    append({
      productId: 0,
      description: "",
      receivedQty: 1,
      freeQty: 0,
      cost: 0,
      hsnCode: "",
      taxPercent: 18,
      discountAmount: 0,
      netCost: 0,
      roiPercent: 0
    });
  };

  // Save purchase mutation
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const purchaseData = {
        orderNumber: `PO-${Date.now()}`,
        supplierId: data.supplierId,
        total: totals.grandTotal.toString(),
        status: "pending",
        invoiceNo: data.invoiceNumber || "",
        invoiceDate: data.invoiceDate || null,
        invoiceAmount: totals.grandTotal.toString(),
        paymentMethod: data.paymentTerms,
        remarks: data.remarks || "",
        orderDate: new Date(data.orderDate).toISOString(),
        items: data.items
          .filter(item => item.productId > 0)
          .map(item => ({
            productId: item.productId,
            quantity: item.receivedQty,
            unitCost: item.cost.toString(),
            subtotal: (item.netCost || 0).toString(),
            hsnCode: item.hsnCode,
            taxPercentage: item.taxPercent?.toString()
          }))
      };
      
      return await apiRequest('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save purchase order",
      });
    }
  });

  const onSubmit = (data: PurchaseFormData) => {
    savePurchaseMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/purchase-dashboard">
                <Button variant="outline" size="sm" data-testid="button-back-to-purchases">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Purchases
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900" data-testid="text-page-title">Purchase Entry</h1>
                <p className="text-sm text-gray-600">Create new purchase order</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-save-draft">
                <FileText className="h-4 w-4 mr-2" />
                Hold
              </Button>
              <Button variant="outline" size="sm" data-testid="button-print">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                type="submit" 
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={savePurchaseMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                {savePurchaseMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" data-testid="tab-purchase-details">Purchase Details</TabsTrigger>
                <TabsTrigger value="items" data-testid="tab-line-items">Line Items</TabsTrigger>
                <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
              </TabsList>

              {/* Purchase Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Purchase Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier *</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-supplier">
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orderDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-order-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-terms">
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Credit">Credit</SelectItem>
                              <SelectItem value="Net 7">Net 7</SelectItem>
                              <SelectItem value="Net 15">Net 15</SelectItem>
                              <SelectItem value="Net 30">Net 30</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter invoice number" {...field} data-testid="input-invoice-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-invoice-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-2 lg:col-span-1">
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter any remarks"
                                rows={3}
                                {...field} 
                                data-testid="textarea-remarks"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Barcode Entry */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCodeIcon className="h-5 w-5" />
                      Quick Barcode Entry
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ProductSearchWithSuggestions
                        products={products}
                        onProductSelect={(product) => {
                          // Add product to the items list
                          const currentItems = form.getValues("items");
                          const emptyItemIndex = currentItems.findIndex(item => item.productId === 0);
                          
                          if (emptyItemIndex >= 0) {
                            handleProductSelection(emptyItemIndex, product);
                          } else {
                            append({
                              productId: 0,
                              description: "",
                              receivedQty: 1,
                              freeQty: 0,
                              cost: 0,
                              hsnCode: "",
                              taxPercent: 18,
                              discountAmount: 0,
                              netCost: 0,
                              roiPercent: 0
                            });
                            const newIndex = currentItems.length;
                            setTimeout(() => handleProductSelection(newIndex, product), 100);
                          }
                        }}
                        placeholder="Scan barcode or type product code to quickly add items..."
                      />
                      <p className="text-sm text-gray-600">
                        💡 Tip: Use a barcode scanner or manually enter product codes to quickly add items
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Line Items Tab */}
              <TabsContent value="items" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Line Items
                    </CardTitle>
                    <Button 
                      type="button" 
                      onClick={addNewItem}
                      size="sm"
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Product</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Previous Stock</TableHead>
                            <TableHead className="w-[100px]">Received Qty</TableHead>
                            <TableHead className="w-[100px]">Free Qty</TableHead>
                            <TableHead className="w-[100px]">Cost</TableHead>
                            <TableHead className="w-[100px]">HSN Code</TableHead>
                            <TableHead className="w-[80px]">Tax %</TableHead>
                            <TableHead className="w-[100px]">Discount</TableHead>
                            <TableHead className="w-[100px]">Net Cost</TableHead>
                            <TableHead className="w-[80px]">ROI %</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const selectedProduct = products.find(p => p.id === form.watch(`items.${index}.productId`));
                            
                            return (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <ProductSearchWithSuggestions
                                    products={products}
                                    onProductSelect={(product) => handleProductSelection(index, product)}
                                    placeholder="Search products..."
                                  />
                                  {selectedProduct && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      Selected: {selectedProduct.name}
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.description`}
                                    render={({ field }) => (
                                      <Input {...field} className="text-xs" data-testid={`input-description-${index}`} />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <div className="text-xs text-center py-2">
                                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                      {selectedProduct?.stockQuantity || 0}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.receivedQty`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        className="text-xs text-center"
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                        data-testid={`input-received-qty-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.freeQty`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        className="text-xs text-center"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        data-testid={`input-free-qty-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        step="0.01"
                                        className="text-xs text-right"
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                        data-testid={`input-cost-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.hsnCode`}
                                    render={({ field }) => (
                                      <Input {...field} className="text-xs" data-testid={`input-hsn-code-${index}`} />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.taxPercent`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        className="text-xs text-center"
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                        data-testid={`input-tax-percent-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.discountAmount`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        step="0.01"
                                        className="text-xs text-right"
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value) || 0);
                                          calculateTotals();
                                        }}
                                        data-testid={`input-discount-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  <div className="text-xs text-right font-medium py-2" data-testid={`text-net-cost-${index}`}>
                                    {formatCurrency(form.watch(`items.${index}.netCost`) || 0)}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.roiPercent`}
                                    render={({ field }) => (
                                      <Input 
                                        {...field} 
                                        type="number" 
                                        className="text-xs text-center"
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        data-testid={`input-roi-percent-${index}`}
                                      />
                                    )}
                                  />
                                </TableCell>

                                <TableCell>
                                  {fields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                      data-testid={`button-remove-item-${index}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Purchase Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Items:</span>
                        <span className="font-medium" data-testid="text-total-items">{totals.totalItems}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-medium" data-testid="text-total-quantity">{totals.totalQuantity}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium" data-testid="text-subtotal">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tax:</span>
                        <span className="font-medium" data-testid="text-total-tax">{formatCurrency(totals.totalTax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span className="text-green-600" data-testid="text-grand-total">{formatCurrency(totals.grandTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supplier Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {form.watch("supplierId") ? (
                        <div className="space-y-3">
                          {(() => {
                            const selectedSupplier = suppliers.find(s => s.id === form.watch("supplierId"));
                            return selectedSupplier ? (
                              <>
                                <div>
                                  <Label className="text-sm font-medium">Name:</Label>
                                  <p className="text-sm text-gray-900" data-testid="text-supplier-name">{selectedSupplier.name}</p>
                                </div>
                                {selectedSupplier.email && (
                                  <div>
                                    <Label className="text-sm font-medium">Email:</Label>
                                    <p className="text-sm text-gray-600" data-testid="text-supplier-email">{selectedSupplier.email}</p>
                                  </div>
                                )}
                                {selectedSupplier.phone && (
                                  <div>
                                    <Label className="text-sm font-medium">Phone:</Label>
                                    <p className="text-sm text-gray-600" data-testid="text-supplier-phone">{selectedSupplier.phone}</p>
                                  </div>
                                )}
                                {selectedSupplier.address && (
                                  <div>
                                    <Label className="text-sm font-medium">Address:</Label>
                                    <p className="text-sm text-gray-600" data-testid="text-supplier-address">{selectedSupplier.address}</p>
                                  </div>
                                )}
                              </>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-2">📋</div>
                          <p className="text-sm text-gray-600">No supplier selected</p>
                          <p className="text-xs text-gray-500">Select a supplier to view details</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button variant="outline" type="button" data-testid="button-reset">
                    Reset Form
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={savePurchaseMutation.isPending}
                    data-testid="button-submit"
                  >
                    {savePurchaseMutation.isPending ? "Saving..." : "Save Purchase Order"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}