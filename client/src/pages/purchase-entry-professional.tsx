
import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Edit2, Trash2, Calculator, Package, Calendar as CalendarIcon } from "lucide-react";

// Schema definitions
const purchaseEntrySchema = z.object({
  supplierId: z.coerce.number().min(1, "Please select a supplier"),
  orderNumber: z.string().min(1, "Order number is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDate: z.string().optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  status: z.string().default("pending"),
  remarks: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.coerce.number().min(1, "Please select a product"),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
      unitCost: z.coerce.number().min(0.01, "Unit cost must be greater than 0"),
      taxPercentage: z.coerce.number().min(0).max(100),
      discountAmount: z.coerce.number().min(0),
      netAmount: z.coerce.number().min(0)
    })
  ).min(1, "At least one item is required")
});

type PurchaseEntryFormValues = z.infer<typeof purchaseEntrySchema>;

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  stock: number;
  category?: string;
}

export default function PurchaseEntryProfessional() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [modalData, setModalData] = useState({
    productId: 0,
    quantity: 1,
    unitCost: 0,
    taxPercentage: 0,
    discountAmount: 0,
    netAmount: 0
  });

  const today = new Date();

  // Form setup
  const form = useForm<PurchaseEntryFormValues>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: {
      orderNumber: `PO-${Date.now()}`,
      orderDate: format(today, "yyyy-MM-dd"),
      expectedDate: format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      paymentMethod: "Credit",
      status: "pending",
      remarks: "",
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
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

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  }) as { data: Product[] };

  // Filtered data
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.code?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Calculate net amount
  const calculateNetAmount = () => {
    const { quantity, unitCost, taxPercentage, discountAmount } = modalData;
    const subtotal = quantity * unitCost;
    const afterDiscount = subtotal - discountAmount;
    const tax = (afterDiscount * taxPercentage) / 100;
    const net = afterDiscount + tax;
    setModalData(prev => ({ ...prev, netAmount: net }));
  };

  useEffect(() => {
    calculateNetAmount();
  }, [modalData.quantity, modalData.unitCost, modalData.taxPercentage, modalData.discountAmount]);

  // Handle adding/editing items
  const handleAddItem = () => {
    if (modalData.productId === 0) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    const itemData = {
      productId: modalData.productId,
      quantity: modalData.quantity,
      unitCost: modalData.unitCost,
      taxPercentage: modalData.taxPercentage,
      discountAmount: modalData.discountAmount,
      netAmount: modalData.netAmount
    };

    if (editingItemIndex !== null) {
      form.setValue(`items.${editingItemIndex}`, itemData);
    } else {
      append(itemData);
    }

    setIsModalOpen(false);
    setEditingItemIndex(null);
    setModalData({
      productId: 0,
      quantity: 1,
      unitCost: 0,
      taxPercentage: 0,
      discountAmount: 0,
      netAmount: 0
    });
  };

  const handleEditItem = (index: number) => {
    const item = fields[index];
    setModalData(item);
    setEditingItemIndex(index);
    setIsModalOpen(true);
  };

  // Submit handler
  const onSubmit = async (data: PurchaseEntryFormValues) => {
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase order");
      }

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive"
      });
    }
  };

  const getProductById = (id: number) => products.find(p => p.id === id);
  const getSupplierById = (id: number) => suppliers.find(s => s.id === id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Purchase Order</h1>
          <p className="text-muted-foreground">Professional purchase entry system</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Draft
        </Badge>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Purchase Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    {...form.register("orderNumber")}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    {...form.register("orderDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDate">Expected Delivery</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    {...form.register("expectedDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={form.watch("paymentMethod")}
                    onValueChange={(value) => form.setValue("paymentMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                    <Select
                      value={form.watch("supplierId")?.toString() || ""}
                      onValueChange={(value) => form.setValue("supplierId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSuppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name} {supplier.contactPerson && `(${supplier.contactPerson})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    {...form.register("remarks")}
                    placeholder="Additional notes or instructions..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Purchase Items</CardTitle>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingItemIndex(null);
                        setModalData({
                          productId: 0,
                          quantity: 1,
                          unitCost: 0,
                          taxPercentage: 0,
                          discountAmount: 0,
                          netAmount: 0
                        });
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingItemIndex !== null ? "Edit Item" : "Add New Item"}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Product</Label>
                          <Input
                            placeholder="Search products..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="mb-2"
                          />
                          <Select
                            value={modalData.productId.toString()}
                            onValueChange={(value) => {
                              const product = getProductById(parseInt(value));
                              setModalData(prev => ({
                                ...prev,
                                productId: parseInt(value),
                                unitCost: product?.price || 0
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{product.name}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      Stock: {product.stock}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={modalData.quantity}
                              onChange={(e) => setModalData(prev => ({
                                ...prev,
                                quantity: parseFloat(e.target.value) || 0
                              }))}
                              min="1"
                              step="1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Unit Cost (₹)</Label>
                            <Input
                              type="number"
                              value={modalData.unitCost}
                              onChange={(e) => setModalData(prev => ({
                                ...prev,
                                unitCost: parseFloat(e.target.value) || 0
                              }))}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Tax (%)</Label>
                            <Input
                              type="number"
                              value={modalData.taxPercentage}
                              onChange={(e) => setModalData(prev => ({
                                ...prev,
                                taxPercentage: parseFloat(e.target.value) || 0
                              }))}
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Discount (₹)</Label>
                            <Input
                              type="number"
                              value={modalData.discountAmount}
                              onChange={(e) => setModalData(prev => ({
                                ...prev,
                                discountAmount: parseFloat(e.target.value) || 0
                              }))}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Net Amount:</span>
                            <span>₹{modalData.netAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="button" onClick={handleAddItem}>
                            {editingItemIndex !== null ? "Update Item" : "Add Item"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Item" to start.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Tax</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Net Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const product = getProductById(field.productId);
                          return (
                            <TableRow key={field.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{product?.name}</div>
                                  <div className="text-sm text-muted-foreground">{product?.code}</div>
                                </div>
                              </TableCell>
                              <TableCell>{field.quantity}</TableCell>
                              <TableCell>₹{field.unitCost.toFixed(2)}</TableCell>
                              <TableCell>{field.taxPercentage}%</TableCell>
                              <TableCell>₹{field.discountAmount.toFixed(2)}</TableCell>
                              <TableCell className="font-semibold">₹{field.netAmount.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(index)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold mb-2">Order Information</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Order Number:</span>
                          <span className="font-mono">{form.watch("orderNumber")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Order Date:</span>
                          <span>{form.watch("orderDate")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Date:</span>
                          <span>{form.watch("expectedDate")}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Supplier Information</h3>
                      <div className="space-y-1 text-sm">
                        {form.watch("supplierId") && (
                          <>
                            <div className="flex justify-between">
                              <span>Name:</span>
                              <span>{getSupplierById(form.watch("supplierId"))?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Contact:</span>
                              <span>{getSupplierById(form.watch("supplierId"))?.phone}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Financial Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-lg">
                        <span>Total Items:</span>
                        <span>{fields.length}</span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span>Total Quantity:</span>
                        <span>{fields.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold">
                        <span>Grand Total:</span>
                        <span>₹{fields.reduce((sum, item) => sum + item.netAmount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Save as Draft
          </Button>
          <Button type="submit">
            Create Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
}
