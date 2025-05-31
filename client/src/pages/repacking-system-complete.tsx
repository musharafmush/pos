
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Package, Plus, Minus, Calculator, History, BarChart3, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  cost: string;
  stockQuantity: number;
  weight: string;
  weightUnit: string;
  categoryId: number;
  active: boolean;
}

interface RepackOperation {
  id: string;
  sourceProductId: number;
  sourceProduct: Product;
  targetProducts: {
    name: string;
    sku: string;
    weight: number;
    price: number;
    cost: number;
    quantity: number;
  }[];
  sourceQuantityUsed: number;
  totalValue: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export default function RepackingSystemComplete() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [repackQuantity, setRepackQuantity] = useState<number>(1);
  const [targetProducts, setTargetProducts] = useState<{
    name: string;
    sku: string;
    weight: number;
    price: number;
    cost: number;
    quantity: number;
  }[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  // Get bulk items (products that can be repacked)
  const bulkItems = products.filter(product => 
    product.active && 
    product.stockQuantity > 0 && 
    parseFloat(product.weight || '0') >= 100 // Items with 100g or more
  );

  // Mock repack operations (in real app, this would come from API)
  const [repackOperations, setRepackOperations] = useState<RepackOperation[]>([
    {
      id: 'RP001',
      sourceProductId: 1,
      sourceProduct: { id: 1, name: 'Rice 25kg Bag', sku: 'RICE25KG', price: '2500', cost: '2000', stockQuantity: 10, weight: '25000', weightUnit: 'g', categoryId: 1, active: true },
      targetProducts: [
        { name: 'Rice 1kg Pack', sku: 'RICE1KG-RP001', weight: 1000, price: 120, cost: 90, quantity: 20 },
        { name: 'Rice 500g Pack', sku: 'RICE500G-RP001', weight: 500, price: 65, cost: 50, quantity: 10 }
      ],
      sourceQuantityUsed: 1,
      totalValue: 3050,
      status: 'completed',
      createdAt: '2024-05-26T10:00:00Z',
      completedAt: '2024-05-26T10:30:00Z'
    }
  ]);

  const addTargetProduct = () => {
    if (!selectedProduct) return;
    
    const sourceWeight = parseFloat(selectedProduct.weight || '0');
    const defaultWeight = Math.min(1000, sourceWeight / 10); // Default to 1kg or 1/10th of source
    
    setTargetProducts([...targetProducts, {
      name: `${selectedProduct.name} Repack`,
      sku: `${selectedProduct.sku}-REPACK-${Date.now()}`,
      weight: defaultWeight,
      price: 0,
      cost: 0,
      quantity: 1
    }]);
  };

  const removeTargetProduct = (index: number) => {
    setTargetProducts(targetProducts.filter((_, i) => i !== index));
  };

  const updateTargetProduct = (index: number, field: string, value: any) => {
    const updated = [...targetProducts];
    updated[index] = { ...updated[index], [field]: value };
    setTargetProducts(updated);
  };

  const calculateTotalWeight = () => {
    return targetProducts.reduce((total, product) => 
      total + (product.weight * product.quantity), 0
    );
  };

  const calculateTotalValue = () => {
    return targetProducts.reduce((total, product) => 
      total + (product.price * product.quantity), 0
    );
  };

  const validateRepackOperation = () => {
    if (!selectedProduct) return { valid: false, error: 'No source product selected' };
    if (targetProducts.length === 0) return { valid: false, error: 'No target products defined' };
    if (repackQuantity <= 0) return { valid: false, error: 'Invalid repack quantity' };
    if (repackQuantity > selectedProduct.stockQuantity) return { valid: false, error: 'Insufficient stock' };
    
    const sourceWeight = parseFloat(selectedProduct.weight || '0') * repackQuantity;
    const targetWeight = calculateTotalWeight();
    
    if (targetWeight > sourceWeight) {
      return { valid: false, error: 'Target weight exceeds source weight' };
    }
    
    const invalidProducts = targetProducts.filter(p => 
      !p.name || !p.sku || p.weight <= 0 || p.price <= 0 || p.quantity <= 0
    );
    
    if (invalidProducts.length > 0) {
      return { valid: false, error: 'Some target products have invalid data' };
    }
    
    return { valid: true, error: null };
  };

  const createRepackOperation = async () => {
    const validation = validateRepackOperation();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    try {
      // Create new products for each target
      for (const targetProduct of targetProducts) {
        const productData = {
          name: targetProduct.name,
          sku: targetProduct.sku,
          price: targetProduct.price.toString(),
          cost: targetProduct.cost.toString(),
          stockQuantity: targetProduct.quantity,
          weight: targetProduct.weight.toString(),
          weightUnit: 'g',
          categoryId: selectedProduct!.categoryId,
          description: `Repacked from ${selectedProduct!.name}`,
          active: true,
          alertThreshold: 5,
          mrp: targetProduct.price.toString(),
          barcode: '',
          hsnCode: '',
          gstCode: '',
          cgstRate: '0',
          sgstRate: '0',
          igstRate: '0',
          cessRate: '0',
          taxCalculationMethod: 'exclusive'
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create product');
        }
      }

      // Update source product stock
      const updatedStock = selectedProduct!.stockQuantity - repackQuantity;
      await fetch(`/api/products/${selectedProduct!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: updatedStock })
      });

      // Create repack operation record
      const newOperation: RepackOperation = {
        id: `RP${Date.now()}`,
        sourceProductId: selectedProduct!.id,
        sourceProduct: selectedProduct!,
        targetProducts: [...targetProducts],
        sourceQuantityUsed: repackQuantity,
        totalValue: calculateTotalValue(),
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      setRepackOperations([newOperation, ...repackOperations]);

      // Reset form
      setSelectedProduct(null);
      setTargetProducts([]);
      setRepackQuantity(1);
      setShowCreateDialog(false);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });

      toast({
        title: "Success!",
        description: `Repack operation completed. Created ${targetProducts.length} new products.`,
      });

    } catch (error) {
      console.error('Error creating repack operation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create repack operation',
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (productsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repacking System</h1>
          <p className="text-muted-foreground">Create smaller packages from bulk items</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Repack Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Repack Operation</DialogTitle>
              <DialogDescription>
                Break down bulk items into smaller packages
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Source Product Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Source Product</Label>
                <Select 
                  value={selectedProduct?.id.toString() || ''} 
                  onValueChange={(value) => {
                    const product = bulkItems.find(p => p.id.toString() === value);
                    setSelectedProduct(product || null);
                    setTargetProducts([]); // Reset target products when source changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bulk item to repack" />
                  </SelectTrigger>
                  <SelectContent>
                    {bulkItems.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.weight}g) - Stock: {product.stockQuantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedProduct && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{selectedProduct.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">SKU:</span>
                        <p className="font-medium">{selectedProduct.sku}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <p className="font-medium">{selectedProduct.weight}g</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <p className="font-medium">{selectedProduct.stockQuantity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <p className="font-medium">₹{selectedProduct.cost}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Repack Quantity */}
              {selectedProduct && (
                <div className="space-y-2">
                  <Label htmlFor="repackQuantity">Quantity to Repack</Label>
                  <Input
                    id="repackQuantity"
                    type="number"
                    min="1"
                    max={selectedProduct.stockQuantity}
                    value={repackQuantity}
                    onChange={(e) => setRepackQuantity(parseInt(e.target.value) || 1)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Total weight to repack: {parseFloat(selectedProduct.weight || '0') * repackQuantity}g
                  </p>
                </div>
              )}

              {/* Target Products */}
              {selectedProduct && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Target Products</Label>
                    <Button onClick={addTargetProduct} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Product
                    </Button>
                  </div>
                  
                  {targetProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No target products added. Click "Add Product" to start.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {targetProducts.map((product, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                              <Label className="text-xs">Product Name</Label>
                              <Input
                                value={product.name}
                                onChange={(e) => updateTargetProduct(index, 'name', e.target.value)}
                                placeholder="Product name"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">SKU</Label>
                              <Input
                                value={product.sku}
                                onChange={(e) => updateTargetProduct(index, 'sku', e.target.value)}
                                placeholder="SKU"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Weight (g)</Label>
                              <Input
                                type="number"
                                value={product.weight}
                                onChange={(e) => updateTargetProduct(index, 'weight', parseFloat(e.target.value) || 0)}
                                placeholder="Weight"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Price (₹)</Label>
                              <Input
                                type="number"
                                value={product.price}
                                onChange={(e) => updateTargetProduct(index, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="Price"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => updateTargetProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                placeholder="Qty"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                onClick={() => removeTargetProduct(index)}
                                size="sm"
                                variant="destructive"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Summary */}
                      <Card className="p-4 bg-blue-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Products:</span>
                            <p className="font-medium">{targetProducts.length}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Weight:</span>
                            <p className="font-medium">{calculateTotalWeight()}g</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Value:</span>
                            <p className="font-medium">₹{calculateTotalValue().toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Weight Utilization:</span>
                            <p className="font-medium">
                              {((calculateTotalWeight() / (parseFloat(selectedProduct.weight || '0') * repackQuantity)) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createRepackOperation}
                  disabled={!selectedProduct || targetProducts.length === 0}
                >
                  Create Repack Operation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Repack Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Bulk Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Repack Operations</CardTitle>
              <CardDescription>
                Track your repacking activities and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repackOperations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No repack operations yet. Create your first one!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation ID</TableHead>
                      <TableHead>Source Product</TableHead>
                      <TableHead>Target Products</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repackOperations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-medium">{operation.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{operation.sourceProduct.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {operation.sourceQuantityUsed}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {operation.targetProducts.map((target, index) => (
                              <div key={index} className="text-sm">
                                {target.name} (×{target.quantity})
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>₹{operation.totalValue.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(operation.status)}</TableCell>
                        <TableCell>
                          {new Date(operation.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{repackOperations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Repack operations completed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value Created</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{repackOperations.reduce((sum, op) => sum + op.totalValue, 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From repacking operations
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products Created</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {repackOperations.reduce((sum, op) => sum + op.targetProducts.reduce((tsum, tp) => tsum + tp.quantity, 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Individual units created
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Bulk Items</CardTitle>
              <CardDescription>
                Products available for repacking (100g or more)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bulkItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No bulk items available for repacking
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkItems.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.weight}g</TableCell>
                        <TableCell>{product.stockQuantity}</TableCell>
                        <TableCell>₹{product.cost}</TableCell>
                        <TableCell>₹{product.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
