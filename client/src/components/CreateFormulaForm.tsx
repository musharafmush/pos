import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, FlaskConical, Package, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formulaSchema = z.object({
  name: z.string().min(2, "Formula name must be at least 2 characters"),
  productId: z.string().min(1, "Please select a product"),
  description: z.string().optional(),
  version: z.string().default("1.0"),
  instructions: z.string().optional(),
  preparationTime: z.number().optional(),
  cookingTime: z.number().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  servings: z.number().default(1),
});

const ingredientSchema = z.object({
  rawMaterialId: z.string().min(1, "Please select a raw material"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.string().min(1, "Please specify unit"),
  wastagePercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  optional: z.boolean().default(false)
});

type FormulaData = z.infer<typeof formulaSchema>;
type IngredientData = z.infer<typeof ingredientSchema>;

interface CreateFormulaFormProps {
  onSuccess: () => void;
  products: any[];
  rawMaterials: any[];
}

export default function CreateFormulaForm({ onSuccess, products = [], rawMaterials = [] }: CreateFormulaFormProps) {
  const [ingredients, setIngredients] = useState<IngredientData[]>([
    {
      rawMaterialId: "",
      quantity: 0,
      unit: "",
      wastagePercentage: 0,
      notes: "",
      optional: false
    }
  ]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormulaData>({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      name: "",
      productId: "",
      description: "",
      version: "1.0",
      instructions: "",
      preparationTime: undefined,
      cookingTime: undefined,
      difficulty: "medium",
      servings: 1,
    },
  });

  const createFormulaMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the recipe
      const recipe = await apiRequest('/api/manufacturing/recipes', {
        method: 'POST',
        body: JSON.stringify({
          productId: parseInt(data.productId),
          name: data.name,
          description: data.description,
          version: data.version,
          instructions: data.instructions,
          preparationTime: data.preparationTime,
          cookingTime: data.cookingTime,
          difficulty: data.difficulty,
          servings: data.servings,
          active: true
        })
      });

      // Then create the ingredients
      for (const ingredient of data.ingredients) {
        if (ingredient.rawMaterialId && ingredient.quantity > 0) {
          await apiRequest('/api/manufacturing/recipe-ingredients', {
            method: 'POST',
            body: JSON.stringify({
              recipeId: recipe.id,
              rawMaterialId: parseInt(ingredient.rawMaterialId),
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              wastagePercentage: ingredient.wastagePercentage || 0,
              notes: ingredient.notes,
              optional: ingredient.optional
            })
          });
        }
      }

      return recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing/recipe-ingredients'] });
      toast({
        title: "Formula Created",
        description: "Product formula has been created successfully"
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create formula",
        variant: "destructive"
      });
    }
  });

  const addIngredient = () => {
    setIngredients([...ingredients, {
      rawMaterialId: "",
      quantity: 0,
      unit: "",
      wastagePercentage: 0,
      notes: "",
      optional: false
    }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof IngredientData, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const onSubmit = (data: FormulaData) => {
    // Validate ingredients
    const validIngredients = ingredients.filter(ing => 
      ing.rawMaterialId && ing.quantity > 0 && ing.unit
    );

    if (validIngredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid ingredient",
        variant: "destructive"
      });
      return;
    }

    createFormulaMutation.mutate({
      ...data,
      ingredients: validIngredients
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Formula Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" />
            Formula Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Formula Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter formula name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="productId">Product *</Label>
              <Select onValueChange={(value) => form.setValue("productId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {product.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.productId && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.productId.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Formula description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                {...form.register("version")}
                placeholder="1.0"
              />
            </div>
            <div>
              <Label htmlFor="preparationTime">Prep Time (min)</Label>
              <Input
                id="preparationTime"
                type="number"
                {...form.register("preparationTime", { valueAsNumber: true })}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="cookingTime">Process Time (min)</Label>
              <Input
                id="cookingTime"
                type="number"
                {...form.register("cookingTime", { valueAsNumber: true })}
                placeholder="45"
              />
            </div>
            <div>
              <Label htmlFor="servings">Batch Size</Label>
              <Input
                id="servings"
                type="number"
                {...form.register("servings", { valueAsNumber: true })}
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select onValueChange={(value) => form.setValue("difficulty", value as "easy" | "medium" | "hard")}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Easy</Badge>
                </SelectItem>
                <SelectItem value="medium">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Medium</Badge>
                </SelectItem>
                <SelectItem value="hard">
                  <Badge variant="secondary" className="bg-red-100 text-red-700">Hard</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="instructions">Manufacturing Instructions</Label>
            <Textarea
              id="instructions"
              {...form.register("instructions")}
              placeholder="Step-by-step manufacturing instructions..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Formula Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Formula Ingredients
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Ingredient {index + 1}</h4>
                {ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Raw Material *</Label>
                  <Select 
                    value={ingredient.rawMaterialId} 
                    onValueChange={(value) => updateIngredient(index, "rawMaterialId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select raw material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id.toString()}>
                          {material.name} ({material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unit *</Label>
                  <Input
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                    placeholder="kg, liters, pieces"
                  />
                </div>
                <div>
                  <Label>Wastage % (Optional)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ingredient.wastagePercentage}
                    onChange={(e) => updateIngredient(index, "wastagePercentage", parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ingredient.optional}
                      onChange={(e) => updateIngredient(index, "optional", e.target.checked)}
                    />
                    <span className="text-sm">Optional</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={ingredient.notes}
                  onChange={(e) => updateIngredient(index, "notes", e.target.value)}
                  placeholder="Additional notes for this ingredient..."
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createFormulaMutation.isPending}
          className="gap-2"
        >
          {createFormulaMutation.isPending ? (
            "Creating..."
          ) : (
            <>
              <FlaskConical className="h-4 w-4" />
              Create Formula
            </>
          )}
        </Button>
      </div>
    </form>
  );
}