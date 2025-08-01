import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Beaker, Save, BookOpen, Factory } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  sku: string;
  category_id?: number;
}

interface RawMaterial {
  id: number;
  name: string;
  description?: string;
  unit: string;
  current_stock: number;
  unit_cost: number;
}

interface FormulaIngredient {
  rawMaterialId: number;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  percentage: number;
  notes?: string;
}

interface FormulaData {
  name: string;
  description: string;
  productId: number;
  outputQuantity: number;
  outputUnit: string;
  batchSize: number;
  preparationTime: number;
  difficultyLevel: string;
  instructions: string;
  ingredients: FormulaIngredient[];
}

export default function CreateProductFormula() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formulaData, setFormulaData] = useState<FormulaData>({
    name: "",
    description: "",
    productId: 0,
    outputQuantity: 1,
    outputUnit: "liters",
    batchSize: 100,
    preparationTime: 60,
    difficultyLevel: "medium",
    instructions: "",
    ingredients: []
  });

  // Fetch products for selection
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch raw materials for ingredients
  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/manufacturing/raw-materials'],
  });

  // Create formula mutation
  const createFormulaMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/manufacturing/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Formula Created Successfully",
        description: "Product formula has been saved and can now be used for manufacturing."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/recipes'] });
      // Reset form
      setFormulaData({
        name: "",
        description: "",
        productId: 0,
        outputQuantity: 1,
        outputUnit: "liters",
        batchSize: 100,
        preparationTime: 60,
        difficultyLevel: "medium",
        instructions: "",
        ingredients: []
      });
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Formula",
        description: error.message || "Failed to create product formula",
        variant: "destructive"
      });
    }
  });

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setSelectedProduct(product);
      setFormulaData(prev => ({
        ...prev,
        productId: product.id,
        name: `${product.name} Formula`,
        description: `Manufacturing formula for ${product.name}`
      }));
    }
  };

  const addIngredient = () => {
    setFormulaData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          rawMaterialId: 0,
          rawMaterialName: "",
          quantity: 0,
          unit: "kg",
          percentage: 0,
          notes: ""
        }
      ]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormulaData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: keyof FormulaIngredient, value: any) => {
    setFormulaData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          const updated = { ...ingredient, [field]: value };
          
          // Auto-update material name when material ID changes
          if (field === 'rawMaterialId') {
            const material = rawMaterials.find(m => m.id === parseInt(value));
            if (material) {
              updated.rawMaterialName = material.name;
              updated.unit = material.unit;
            }
          }
          
          return updated;
        }
        return ingredient;
      })
    }));
  };

  const calculateTotalPercentage = () => {
    return formulaData.ingredients.reduce((total, ingredient) => total + (ingredient.percentage || 0), 0);
  };

  const handleSubmit = () => {
    // Validation
    if (!formulaData.productId) {
      toast({
        title: "Product Required",
        description: "Please select a product for this formula",
        variant: "destructive"
      });
      return;
    }

    if (formulaData.ingredients.length === 0) {
      toast({
        title: "Ingredients Required",
        description: "Please add at least one ingredient to the formula",
        variant: "destructive"
      });
      return;
    }

    const totalPercentage = calculateTotalPercentage();
    if (totalPercentage !== 100) {
      toast({
        title: "Invalid Formula",
        description: `Total ingredient percentage must equal 100%. Current total: ${totalPercentage.toFixed(1)}%`,
        variant: "destructive"
      });
      return;
    }

    // Create recipe ingredients data
    const recipeIngredientsData = formulaData.ingredients.map(ingredient => ({
      rawMaterialId: ingredient.rawMaterialId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      percentage: ingredient.percentage,
      notes: ingredient.notes || ""
    }));

    const submitData = {
      productId: formulaData.productId,
      name: formulaData.name,
      description: formulaData.description,
      outputQuantity: formulaData.outputQuantity,
      estimatedTime: formulaData.preparationTime,
      instructions: formulaData.instructions,
      active: true,
      ingredients: recipeIngredientsData
    };

    createFormulaMutation.mutate(submitData);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Beaker className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Product Formula</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Design manufacturing formulas for cleaning products with precise ingredient specifications
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Product Selection
            </CardTitle>
            <CardDescription>Choose the product for which you want to create a manufacturing formula</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product">Select Product</Label>
                <Select onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProduct && (
                <div className="flex items-center">
                  <Badge variant="secondary" className="px-4 py-2">
                    Selected: {selectedProduct.name}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formula Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Formula Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formulaName">Formula Name</Label>
                <Input
                  id="formulaName"
                  value={formulaData.name}
                  onChange={(e) => setFormulaData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., GLORY Glass Cleaner Formula"
                />
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size (Liters)</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={formulaData.batchSize}
                  onChange={(e) => setFormulaData(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formulaData.description}
                onChange={(e) => setFormulaData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the formula..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="outputQuantity">Output Quantity</Label>
                <Input
                  id="outputQuantity"
                  type="number"
                  value={formulaData.outputQuantity}
                  onChange={(e) => setFormulaData(prev => ({ ...prev, outputQuantity: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="preparationTime">Prep Time (minutes)</Label>
                <Input
                  id="preparationTime"
                  type="number"
                  value={formulaData.preparationTime}
                  onChange={(e) => setFormulaData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={formulaData.difficultyLevel} onValueChange={(value) => setFormulaData(prev => ({ ...prev, difficultyLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Manufacturing Instructions</Label>
              <Textarea
                id="instructions"
                value={formulaData.instructions}
                onChange={(e) => setFormulaData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Step-by-step manufacturing instructions..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Formula Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Formula Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Ingredients:</span>
                <Badge variant="secondary">{formulaData.ingredients.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Percentage:</span>
                <Badge variant={calculateTotalPercentage() === 100 ? "default" : "destructive"}>
                  {calculateTotalPercentage().toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Batch Size:</span>
                <span className="text-sm font-medium">{formulaData.batchSize}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Prep Time:</span>
                <span className="text-sm font-medium">{formulaData.preparationTime}min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Section */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Formula Ingredients</CardTitle>
                <CardDescription>Add raw materials with precise quantities and percentages</CardDescription>
              </div>
              <Button onClick={addIngredient} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Ingredient
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formulaData.ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No ingredients added yet. Click "Add Ingredient" to start building your formula.
              </div>
            ) : (
              <div className="space-y-6">
                {formulaData.ingredients.map((ingredient, index) => {
                  const selectedMaterial = rawMaterials.find(m => m.id === ingredient.rawMaterialId);
                  
                  return (
                    <div key={index} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800/40 shadow-sm hover:shadow-md transition-shadow">
                      {/* Material Selection Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <Beaker className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Ingredient #{index + 1}
                            </h4>
                            <p className="text-sm text-gray-500">Select raw material and specify quantities</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          <Minus className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      {/* Material Selection */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Raw Material
                        </Label>
                        <Select
                          value={ingredient.rawMaterialId.toString()}
                          onValueChange={(value) => updateIngredient(index, 'rawMaterialId', parseInt(value))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a raw material..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map(material => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{material.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {material.unit}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Material Information Card (when selected) */}
                      {selectedMaterial && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Material Name
                              </label>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                                {selectedMaterial.name}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Current Stock
                              </label>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={selectedMaterial.current_stock > 10 ? "default" : "destructive"} className="text-xs">
                                  {selectedMaterial.current_stock} {selectedMaterial.unit}
                                </Badge>
                                {selectedMaterial.current_stock <= 10 && (
                                  <span className="text-xs text-orange-600">Low Stock</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Unit Cost
                              </label>
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                ₹{selectedMaterial.unit_cost.toFixed(2)}/{selectedMaterial.unit}
                              </p>
                            </div>
                          </div>
                          {selectedMaterial.description && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Description
                              </label>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {selectedMaterial.description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quantity and Percentage Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantity Required
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={ingredient.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                              placeholder="0.0"
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              {ingredient.unit}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Unit
                          </Label>
                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">Kilograms (kg)</SelectItem>
                              <SelectItem value="liters">Liters (L)</SelectItem>
                              <SelectItem value="grams">Grams (g)</SelectItem>
                              <SelectItem value="ml">Milliliters (ml)</SelectItem>
                              <SelectItem value="units">Units</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Percentage (%)
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              max="100"
                              value={ingredient.percentage}
                              onChange={(e) => updateIngredient(index, 'percentage', parseFloat(e.target.value))}
                              placeholder="0.0"
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cost Calculation */}
                      {selectedMaterial && ingredient.quantity > 0 && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800 dark:text-green-400">
                              Estimated Cost:
                            </span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-300">
                              ₹{(selectedMaterial.unit_cost * ingredient.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Notes Section */}
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notes (Optional)
                        </Label>
                        <Textarea
                          value={ingredient.notes || ''}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          placeholder="Add any special instructions or notes for this ingredient..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFormulaData({
                    name: "",
                    description: "",
                    productId: 0,
                    outputQuantity: 1,
                    outputUnit: "liters",
                    batchSize: 100,
                    preparationTime: 60,
                    difficultyLevel: "medium",
                    instructions: "",
                    ingredients: []
                  });
                  setSelectedProduct(null);
                }}
              >
                Reset Form
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createFormulaMutation.isPending || !formulaData.productId || formulaData.ingredients.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {createFormulaMutation.isPending ? "Creating..." : "Create Formula"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}