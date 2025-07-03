import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import SizeAdjustmentForm from "@/components/product/size-adjustment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Package, Sparkles, ShoppingCart, RefreshCw } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  mrp: number;
  size: string;
  weight: string;
  stock_quantity: number;
  sku: string;
  description: string;
}

export default function SizeAdjustmentDemo() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentData, setAdjustmentData] = useState<any>(null);

  // Fetch products
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const sugarProducts = products?.filter((p: Product) => 
    p.name.toLowerCase().includes('sugar')
  ) || [];

  const handleSizeChange = (sizeData: any) => {
    setAdjustmentData(sizeData);
  };

  const handleAddToCart = () => {
    if (selectedProduct && adjustmentData) {
      // Here you would typically add to cart or process the order
      console.log('Adding to cart:', {
        product: selectedProduct,
        adjustment: adjustmentData
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="container mx-auto max-w-7xl">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg">
                  <Package className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Size Adjustment Demo</h1>
                  <p className="text-gray-600 mt-1">Test dynamic product sizing and quantity adjustment</p>
                </div>
              </div>
              <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Products
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Product Selection */}
            <div className="space-y-6">
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Sparkles className="h-5 w-5" />
                    Available Size-Adjustable Products
                  </CardTitle>
                  <CardDescription>
                    Select a product to customize size and quantity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading products...</div>
                  ) : sugarProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No size-adjustable products found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sugarProducts.map((product: Product) => (
                        <div
                          key={product.id}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedProduct?.id === product.id
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{product.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                            </div>
                            <Badge variant={selectedProduct?.id === product.id ? "default" : "secondary"}>
                              {product.sku}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Base Price:</span>
                              <div className="font-semibold text-green-600">{formatCurrency(product.price)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">MRP:</span>
                              <div className="font-semibold">{formatCurrency(product.mrp)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Size:</span>
                              <div className="font-semibold">{product.size}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Stock:</span>
                              <div className="font-semibold text-blue-600">{product.stock_quantity} units</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cart Summary */}
              {selectedProduct && adjustmentData && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <ShoppingCart className="h-5 w-5" />
                      Cart Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Product:</span>
                        <span className="font-semibold">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="font-semibold">
                          {adjustmentData.selectedSize.weight}{adjustmentData.selectedSize.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-semibold">{adjustmentData.quantity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Weight:</span>
                        <span className="font-semibold text-green-600">
                          {adjustmentData.totalWeight}{adjustmentData.selectedSize.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span>Total Price:</span>
                        <span className="font-bold text-purple-600">
                          {formatCurrency(adjustmentData.totalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>You Save:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(adjustmentData.adjustedMrp - adjustmentData.totalPrice)}
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddToCart}
                      className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Size Adjustment Form */}
            <div>
              {selectedProduct ? (
                <SizeAdjustmentForm 
                  product={selectedProduct} 
                  onSizeChange={handleSizeChange}
                />
              ) : (
                <Card className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 border-dashed border-2 border-gray-300">
                  <div className="text-center text-gray-500">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Select a Product</h3>
                    <p>Choose a product from the left to see the size adjustment form</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Instructions */}
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">How to Use Size Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Select a product from the available size-adjustable products</li>
                <li>Choose from predefined size options (Small Pack, Medium Pack, Bulk, etc.)</li>
                <li>Optionally enable custom weight for precise sizing</li>
                <li>Adjust quantity within the allowed range</li>
                <li>Review the calculated totals and savings</li>
                <li>Apply the size adjustment or add to cart</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}