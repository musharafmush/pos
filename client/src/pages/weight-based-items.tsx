import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package,
  Plus,
  Minus,
  Edit3,
  Save,
  Search,
  Scale,
  Calculator,
  ShoppingCart,
  Trash2
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  mrp: number;
  cost?: string;
  stockQuantity: number;
  weight?: number;
  weightUnit?: string;
  category?: {
    name: string;
  };
}

interface WeightBasedItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  weight: number;
  weightUnit: string;
  unitPrice: number;
  totalPrice: number;
  stockQuantity: number;
}

export default function WeightBasedItems() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<WeightBasedItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [enteredWeight, setEnteredWeight] = useState("");
  const [editingItem, setEditingItem] = useState<WeightBasedItem | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Filter products that are weight-based
  const weightBasedProducts = products.filter((product: Product) => {
    const isWeightBased = product.name.toLowerCase().includes('loose') ||
                         product.name.toLowerCase().includes('bulk') ||
                         product.name.toLowerCase().includes('per kg') ||
                         (product.weightUnit === 'kg' && parseFloat(product.weight?.toString() || "0") >= 1);
    
    return isWeightBased && product.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAddWeightItem = (product: Product) => {
    setSelectedProduct(product);
    setShowAddDialog(true);
  };

  const addWeightBasedItem = () => {
    if (!selectedProduct || !enteredWeight) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    const weight = parseFloat(enteredWeight);
    if (weight <= 0 || weight > 50) {
      toast({
        title: "Invalid Weight",
        description: "Weight must be between 0.1kg and 50kg",
        variant: "destructive",
      });
      return;
    }

    const unitPrice = parseFloat(selectedProduct.price);
    const totalPrice = weight * unitPrice;

    const newItem: WeightBasedItem = {
      id: Date.now(),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      weight: weight,
      weightUnit: selectedProduct.weightUnit || 'kg',
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      stockQuantity: selectedProduct.stockQuantity
    };

    setSelectedItems(prev => [...prev, newItem]);
    setShowAddDialog(false);
    setEnteredWeight("");
    setSelectedProduct(null);

    toast({
      title: "Item Added",
      description: `${weight}kg of ${selectedProduct.name} added for ${formatCurrency(totalPrice)}`,
    });
  };

  const updateItemWeight = (itemId: number, newWeight: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, weight: newWeight, totalPrice: newWeight * item.unitPrice }
        : item
    ));
  };

  const updateItemPrice = (itemId: number, newPrice: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, unitPrice: newPrice, totalPrice: item.weight * newPrice }
        : item
    ));
  };

  const removeItem = (itemId: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const startEditing = (item: WeightBasedItem) => {
    setEditingItem(item);
    setEditWeight(item.weight.toString());
    setEditPrice(item.unitPrice.toString());
  };

  const saveEdit = () => {
    if (!editingItem || !editWeight || !editPrice) return;

    const newWeight = parseFloat(editWeight);
    const newPrice = parseFloat(editPrice);

    if (newWeight <= 0 || newWeight > 50) {
      toast({
        title: "Invalid Weight",
        description: "Weight must be between 0.1kg and 50kg",
        variant: "destructive",
      });
      return;
    }

    updateItemWeight(editingItem.id, newWeight);
    updateItemPrice(editingItem.id, newPrice);
    setEditingItem(null);
    setEditWeight("");
    setEditPrice("");

    toast({
      title: "Item Updated",
      description: `${editingItem.name} updated successfully`,
    });
  };

  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getTotalWeight = () => {
    return selectedItems.reduce((sum, item) => sum + item.weight, 0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Scale className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Weight-Based Items Management</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Total Items: {selectedItems.length}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Total Weight: {getTotalWeight().toFixed(2)}kg
          </Badge>
          <Badge variant="outline" className="text-sm">
            Total Amount: {formatCurrency(getTotalAmount())}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Available Weight-Based Products
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search weight-based products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoadingProducts ? (
                <div className="text-center py-8">Loading products...</div>
              ) : weightBasedProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No weight-based products found
                </div>
              ) : (
                weightBasedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAddWeightItem(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            Weight-based
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        {product.weight && (
                          <p className="text-sm font-medium text-green-600">
                            {product.weight} {product.weightUnit || 'kg'}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Stock: {product.stockQuantity} {product.weightUnit || 'kg'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-600">
                          {formatCurrency(parseFloat(product.price))}/kg
                        </div>
                        {product.cost && (
                          <div className="text-sm text-blue-600">
                            Cost: {formatCurrency(parseFloat(product.cost))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Items Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selected Weight-Based Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items selected</p>
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            {item.weight}kg @ {formatCurrency(item.unitPrice)}/kg
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingItem?.id === item.id ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Weight (kg)</Label>
                          <Input
                            type="number"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="h-8 text-sm"
                            step="0.1"
                            min="0.1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="h-8 text-sm"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2 flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingItem(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemWeight(item.id, Math.max(0.1, item.weight - 0.25))}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium min-w-16 text-center">
                            {item.weight}kg
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemWeight(item.id, item.weight + 0.25)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span>Total Weight: {getTotalWeight().toFixed(2)}kg</span>
                  <span>Total Items: {selectedItems.length}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Grand Total:</span>
                  <span className="font-bold text-xl text-green-600">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight Input Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Package className="h-6 w-6 mr-3 text-green-600" />
              Add Weight-Based Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {selectedProduct && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">{selectedProduct.name}</h3>
                <div className="text-sm text-green-700">
                  <div>Price per kg: {formatCurrency(parseFloat(selectedProduct.price))}</div>
                  <div>Available stock: {selectedProduct.stockQuantity} kg</div>
                </div>
              </div>
            )}

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</Label>
              <Input
                type="number"
                placeholder="Enter weight in kilograms"
                value={enteredWeight}
                onChange={(e) => setEnteredWeight(e.target.value)}
                step="0.1"
                min="0.1"
                max="50"
                className="text-lg p-3"
                autoFocus
              />
            </div>

            {enteredWeight && selectedProduct && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700">
                  <div>Weight: {enteredWeight} kg</div>
                  <div>Rate: {formatCurrency(parseFloat(selectedProduct.price))}/kg</div>
                  <div className="font-semibold text-lg text-blue-800 mt-2">
                    Total: {formatCurrency(parseFloat(enteredWeight) * parseFloat(selectedProduct.price))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Quick Weight Selection:</div>
              <div className="grid grid-cols-3 gap-2">
                {['0.25', '0.5', '1', '1.5', '2', '5'].map((weight) => (
                  <Button
                    key={weight}
                    variant="outline"
                    onClick={() => setEnteredWeight(weight)}
                    className={`text-sm ${weight === '1' ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                  >
                    {weight} kg
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEnteredWeight("");
                setSelectedProduct(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={addWeightBasedItem}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}