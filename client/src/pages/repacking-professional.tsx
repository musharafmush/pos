import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  PackageIcon,
  SaveIcon,
  XIcon,
  PlusIcon,
  TrashIcon,
  Calculator,
  SearchIcon,
  EditIcon,
  PrinterIcon,
  HelpCircleIcon,
  Settings2Icon,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const repackingFormSchema = z.object({
  issueDate: z.string().min(1, "Issue date is required"),
  issueNo: z.string().optional(),
  repackNo: z.string().optional(),
  bulkProductId: z.number().min(1, "Please select a bulk product"),
});

type RepackingFormValues = z.infer<typeof repackingFormSchema>;

interface RepackItem {
  id: string;
  code: string;
  itemName: string;
  qty: number;
  cost: number;
  selling: number;
  mrp: number;
}

interface BulkItemDetails {
  bulkCode: string;
  bulkItem: string;
  weight: number;
  cost: number;
  latestSel: number;
  currentStock: number;
  packed: number;
  availForPack: number;
}

interface RepackEntry {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

export default function RepackingProfessional() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [repackItems, setRepackItems] = useState<RepackItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bulkDetails, setBulkDetails] = useState<BulkItemDetails | null>(null);
  const [repackEntries, setRepackEntries] = useState<RepackEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Generate today's date in DD/MM/YYYY format
  const today = new Date().toLocaleDateString('en-GB');

  // Fetch products for bulk selection
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter bulk products
  const bulkProducts = products.filter((product: Product) => 
    product.stockQuantity > 0 && product.active && !product.sku.includes("REPACK")
  ).sort((a, b) => {
    const aIsBulk = a.name.toLowerCase().includes('bulk') || 
                   a.name.toLowerCase().includes('bag') ||
                   (parseFloat(a.weight || "0") >= 1 && a.weightUnit === 'kg');
    const bIsBulk = b.name.toLowerCase().includes('bulk') || 
                   b.name.toLowerCase().includes('bag') ||
                   (parseFloat(b.weight || "0") >= 1 && b.weightUnit === 'kg');

    if (aIsBulk && !bIsBulk) return -1;
    if (!aIsBulk && bIsBulk) return 1;
    return a.name.localeCompare(b.name);
  });

  const form = useForm<RepackingFormValues>({
    resolver: zodResolver(repackingFormSchema),
    defaultValues: {
      issueDate: today,
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
    },
  });

  const bulkProductId = form.watch("bulkProductId");

  useEffect(() => {
    if (bulkProductId && products.length > 0) {
      const product = products.find((p: Product) => p.id === bulkProductId);
      if (product) {
        setSelectedProduct(product);

        // Set bulk item details
        const weightInGrams = product.weightUnit === 'kg' 
          ? parseFloat(product.weight || "0") * 1000 
          : parseFloat(product.weight || "0");

        setBulkDetails({
          bulkCode: product.sku,
          bulkItem: product.name,
          weight: weightInGrams,
          cost: parseFloat(product.cost) || 0,
          latestSel: parseFloat(product.price) || 0,
          currentStock: product.stockQuantity,
          packed: 0, // This would come from repack history
          availForPack: product.stockQuantity,
        });

        // Add a sample repack item
        if (repackItems.length === 0) {
          const newItem: RepackItem = {
            id: "1",
            code: `${product.sku}-REPACK`,
            itemName: `250G ${product.name.replace('BULK', '').trim()}`,
            qty: 8,
            cost: 26.78,
            selling: 32.50,
            mrp: 32.50,
          };
          setRepackItems([newItem]);
        }
      }
    }
  }, [bulkProductId, products]);

  const addRepackItem = () => {
    const newItem: RepackItem = {
      id: Date.now().toString(),
      code: `${selectedProduct?.sku || 'ITEM'}-${repackItems.length + 1}`,
      itemName: `New Repack Item ${repackItems.length + 1}`,
      qty: 1,
      cost: 0,
      selling: 0,
      mrp: 0,
    };
    setRepackItems([...repackItems, newItem]);
  };

  const updateRepackItem = (id: string, field: keyof RepackItem, value: string | number) => {
    setRepackItems(items => items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeRepackItem = (id: string) => {
    setRepackItems(items => items.filter(item => item.id !== id));
  };

  const addRepackEntry = () => {
    const newEntry: RepackEntry = {
      id: Date.now().toString(),
      name: `Entry ${repackEntries.length + 1}`,
      percentage: 0,
      amount: 0,
    };
    setRepackEntries([...repackEntries, newEntry]);
  };

  const updateRepackEntry = (id: string, field: keyof RepackEntry, value: string | number) => {
    setRepackEntries(entries => entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeRepackEntry = (id: string) => {
    setRepackEntries(entries => entries.filter(entry => entry.id !== id));
  };

  // Repackaging mutation
  const repackingMutation = useMutation({
    mutationFn: async (data: RepackingFormValues) => {
      // Process repack items and create new products
      const repackPromises = repackItems.map(async (item) => {
        const repackedProduct = {
          name: item.itemName,
          description: `Repacked from bulk item: ${selectedProduct?.name}`,
          sku: item.code,
          price: item.selling.toString(),
          mrp: item.mrp.toString(),
          cost: item.cost.toString(),
          weight: "250", // Default to 250g
          weightUnit: "g",
          categoryId: selectedProduct?.categoryId || 1,
          stockQuantity: item.qty,
          alertThreshold: Math.max(5, Math.floor(item.qty * 0.1)),
          barcode: "",
          active: true,
        };

        return apiRequest("POST", "/api/products", repackedProduct);
      });

      await Promise.all(repackPromises);

      // Update bulk product stock if needed
      if (selectedProduct && bulkDetails) {
        const totalUsed = repackItems.reduce((sum, item) => sum + item.qty, 0);
        const newStock = Math.max(0, selectedProduct.stockQuantity - Math.ceil(totalUsed / 4)); // Assuming 4 units per bulk

        await apiRequest("PATCH", `/api/products/${selectedProduct.id}`, {
          stockQuantity: newStock,
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Repack entry saved successfully",
      });

      // Reset form
      form.reset();
      setRepackItems([]);
      setSelectedProduct(null);
      setBulkDetails(null);
      setRepackEntries([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepackingFormValues) => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a bulk product",
        variant: "destructive",
      });
      return;
    }

    if (repackItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one repack item",
        variant: "destructive",
      });
      return;
    }

    repackingMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-100">
        {/* Header with classic styling */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <PackageIcon className="w-6 h-6" />
              <h1 className="text-xl font-bold">Repack Entry</h1>
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setLocation("/")}>
              <XIcon className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
            {/* Header Fields Row */}
            <Card className="shadow-sm border border-gray-300">
              <CardContent className="p-4">
                <div className="grid grid-cols-6 gap-4 items-end">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Issue Date</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={today}>{today}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="issueNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Issue No</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-sm" placeholder="Auto-generated" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="repackNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Repack No</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-sm" placeholder="Auto-generated" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-12 gap-4">
              {/* Main Table Section */}
              <div className="col-span-8">
                <Card className="shadow-sm border border-gray-300">
                  <CardContent className="p-0">
                    {/* Table Header */}
                    <div className="bg-blue-600 text-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-blue-500">
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-16">Code</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3">Item Name</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-16">Qty</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-20">Cost</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-20">Selling</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-20">MRP</TableHead>
                            <TableHead className="text-white font-semibold text-center py-2 px-3 w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                      </Table>
                    </div>

                    {/* Table Body */}
                    <div className="bg-white max-h-64 overflow-y-auto">
                      <Table>
                        <TableBody>
                          {repackItems.map((item) => (
                            <TableRow key={item.id} className="border-b hover:bg-gray-50">
                              <TableCell className="py-2 px-3 text-center">
                                <Input
                                  value={item.code}
                                  onChange={(e) => updateRepackItem(item.id, 'code', e.target.value)}
                                  className="h-7 text-xs text-center border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3">
                                <Input
                                  value={item.itemName}
                                  onChange={(e) => updateRepackItem(item.id, 'itemName', e.target.value)}
                                  className="h-7 text-xs border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-center">
                                <Input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateRepackItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                                  className="h-7 text-xs text-center border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.cost}
                                  onChange={(e) => updateRepackItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs text-right border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.selling}
                                  onChange={(e) => updateRepackItem(item.id, 'selling', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs text-right border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.mrp}
                                  onChange={(e) => updateRepackItem(item.id, 'mrp', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs text-right border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRepackItem(item.id)}
                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Add Item Button */}
                    <div className="p-2 border-t bg-gray-50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRepackItem}
                        className="h-8 text-xs"
                      >
                        <PlusIcon className="w-3 h-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bulk Item Details Panel */}
              <div className="col-span-4">
                <Card className="shadow-sm border border-gray-300 h-full">
                  <CardHeader className="bg-blue-600 text-white py-2">
                    <CardTitle className="text-sm font-semibold">Bulk Item Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Bulk Product Selection */}
                    <FormField
                      control={form.control}
                      name="bulkProductId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Select Bulk Product</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Choose bulk item..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bulkProducts.map((product: Product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="text-xs">
                                    {product.sku} - {product.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {bulkDetails && (
                      <div className="space-y-2">
                        <Separator />

                        {/* Bulk Code */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <span className="text-xs font-semibold">Bulk Code</span>
                          <Input 
                            value={bulkDetails.bulkCode} 
                            readOnly 
                            className="col-span-2 h-7 text-xs bg-gray-50" 
                          />
                        </div>

                        {/* Bulk Item */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <span className="text-xs font-semibold">Bulk Item</span>
                          <Input 
                            value={bulkDetails.bulkItem} 
                            readOnly 
                            className="col-span-2 h-7 text-xs bg-gray-50" 
                          />
                        </div>

                        {/* Weight */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <span className="text-xs font-semibold">Weight</span>
                          <Input 
                            value={bulkDetails.weight} 
                            readOnly 
                            className="col-span-2 h-7 text-xs bg-gray-50 text-right" 
                          />
                        </div>

                        {/* Cost */}
                        <div className="grid grid-cols-5 gap-1 items-center">
                          <span className="text-xs font-semibold">Cost</span>
                          <Input 
                            value={bulkDetails.cost.toFixed(2)} 
                            readOnly 
                            className="col-span-2 h-7 text-xs bg-gray-50 text-right" 
                          />
                          <span className="text-xs text-gray-600">Latest sel</span>
                          <Input 
                            value={bulkDetails.latestSel.toFixed(2)} 
                            readOnly 
                            className="h-7 text-xs bg-gray-50 text-right" 
                          />
                        </div>

                        {/* Stock Information */}
                        <div className="grid grid-cols-5 gap-1 items-center">
                          <span className="text-xs font-semibold">Current Stock</span>
                          <Input 
                            value={bulkDetails.currentStock.toFixed(2)} 
                            readOnly 
                            className="h-7 text-xs bg-gray-50 text-right" 
                          />
                          <span className="text-xs text-center">Packed</span>
                          <Input 
                            value={bulkDetails.packed.toFixed(2)} 
                            readOnly 
                            className="h-7 text-xs bg-gray-50 text-right" 
                          />
                          <div className="text-center">
                            <div className="text-xs text-gray-600">Avail for pack</div>
                            <Input 
                              value={bulkDetails.availForPack.toFixed(2)} 
                              readOnly 
                              className="h-7 text-xs bg-gray-50 text-right mt-1" 
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Additional Entries Section */}
                        <div className="bg-blue-600 text-white text-center py-1">
                          <div className="grid grid-cols-3 gap-1 text-xs font-semibold">
                            <span>Name</span>
                            <span>Perc %</span>
                            <span>Amount</span>
                          </div>
                        </div>

                        <div className="max-h-32 overflow-y-auto">
                          {repackEntries.map((entry) => (
                            <div key={entry.id} className="grid grid-cols-4 gap-1 items-center py-1">
                              <Input
                                value={entry.name}
                                onChange={(e) => updateRepackEntry(entry.id, 'name', e.target.value)}
                                className="h-6 text-xs"
                                placeholder="Name"
                              />
                              <Input
                                type="number"
                                value={entry.percentage}
                                onChange={(e) => updateRepackEntry(entry.id, 'percentage', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs text-right"
                                placeholder="%"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) => updateRepackEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs text-right"
                                placeholder="Amount"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRepackEntry(entry.id)}
                                className="h-5 w-5 p-0 text-red-600 hover:bg-red-50"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRepackEntry}
                          className="w-full h-6 text-xs"
                        >
                          <PlusIcon className="w-3 h-3 mr-1" />
                          Add Entry
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Function Buttons Bar */}
            <Card className="shadow-sm border border-gray-300">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <HelpCircleIcon className="w-3 h-3 mr-1" />
                      F1 Help
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <SearchIcon className="w-3 h-3 mr-1" />
                      F2 ItemCode
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <EditIcon className="w-3 h-3 mr-1" />
                      F3 ItemName
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <Calculator className="w-3 h-3 mr-1" />
                      F4 AliasName
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <PackageIcon className="w-3 h-3 mr-1" />
                      F5 Pur Rst
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      type="submit" 
                      disabled={repackingMutation.isPending || !selectedProduct}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      <SaveIcon className="w-3 h-3 mr-1" />
                      {repackingMutation.isPending ? "Saving..." : "F6 Save"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <XIcon className="w-3 h-3 mr-1" />
                      F7 Clear
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <Settings2Icon className="w-3 h-3 mr-1" />
                      F8 KeySettings
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <EditIcon className="w-3 h-3 mr-1" />
                      F9 Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <PrinterIcon className="w-3 h-3 mr-1" />
                      F10 Print
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      F12 Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}