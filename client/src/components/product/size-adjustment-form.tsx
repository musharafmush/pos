import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { Ruler, Package, Scale, Calculator, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SizeOption {
  id: string;
  name: string;
  weight: number;
  unit: string;
  priceMultiplier: number;
  minQuantity: number;
  maxQuantity: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  mrp: number;
  size: string;
  weight: string;
  stock_quantity: number;
}

interface SizeAdjustmentFormProps {
  product: Product;
  onSizeChange?: (sizeData: {
    selectedSize: SizeOption;
    quantity: number;
    totalWeight: number;
    totalPrice: number;
    adjustedMrp: number;
  }) => void;
}

const SIZE_PRESETS: SizeOption[] = [
  { id: "small", name: "Small Pack", weight: 500, unit: "g", priceMultiplier: 0.5, minQuantity: 1, maxQuantity: 20 },
  { id: "medium", name: "Medium Pack", weight: 1, unit: "kg", priceMultiplier: 1, minQuantity: 1, maxQuantity: 15 },
  { id: "large", name: "Large Pack", weight: 2, unit: "kg", priceMultiplier: 1.8, minQuantity: 1, maxQuantity: 10 },
  { id: "bulk", name: "Bulk Pack", weight: 5, unit: "kg", priceMultiplier: 4.2, minQuantity: 1, maxQuantity: 8 },
  { id: "wholesale", name: "Wholesale", weight: 10, unit: "kg", priceMultiplier: 8, minQuantity: 1, maxQuantity: 5 },
  { id: "industrial", name: "Industrial", weight: 25, unit: "kg", priceMultiplier: 18, minQuantity: 1, maxQuantity: 3 },
  { id: "mega", name: "Mega Pack", weight: 50, unit: "kg", priceMultiplier: 35, minQuantity: 1, maxQuantity: 2 }
];

export default function SizeAdjustmentForm({ product, onSizeChange }: SizeAdjustmentFormProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string>("medium");
  const [quantity, setQuantity] = useState<number>(1);
  const [customWeight, setCustomWeight] = useState<number>(1);
  const [useCustomWeight, setUseCustomWeight] = useState<boolean>(false);
  const { toast } = useToast();

  const selectedSize = SIZE_PRESETS.find(s => s.id === selectedSizeId) || SIZE_PRESETS[1];
  
  const effectiveWeight = useCustomWeight ? customWeight : selectedSize.weight;
  const effectiveMultiplier = useCustomWeight ? (customWeight / 1) : selectedSize.priceMultiplier;
  
  const totalWeight = effectiveWeight * quantity;
  const unitPrice = product.price * effectiveMultiplier;
  const totalPrice = unitPrice * quantity;
  const unitMrp = product.mrp * effectiveMultiplier;
  const totalMrp = unitMrp * quantity;
  const savings = totalMrp - totalPrice;

  useEffect(() => {
    if (onSizeChange) {
      onSizeChange({
        selectedSize: {
          ...selectedSize,
          weight: effectiveWeight,
          priceMultiplier: effectiveMultiplier
        },
        quantity,
        totalWeight,
        totalPrice,
        adjustedMrp: totalMrp
      });
    }
  }, [selectedSizeId, quantity, customWeight, useCustomWeight, onSizeChange]);

  const handleApplyChanges = () => {
    toast({
      title: "Size Adjustment Applied",
      description: `${product.name} - ${quantity} × ${effectiveWeight}${selectedSize.unit} = ${totalWeight}${selectedSize.unit}`
    });
  };

  return (
    <Card className="w-full max-w-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-white/20 rounded-lg">
            <Ruler className="h-6 w-6" />
          </div>
          Size Adjustment Form
        </CardTitle>
        <CardDescription className="text-blue-100">
          Customize product size and quantity for: <strong>{product.name}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Size Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Size Options
          </Label>
          <Select value={selectedSizeId} onValueChange={setSelectedSizeId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map((size) => (
                <SelectItem key={size.id} value={size.id}>
                  <div className="flex justify-between items-center w-full">
                    <span>{size.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {size.weight}{size.unit}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Weight Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="custom-weight"
            checked={useCustomWeight}
            onChange={(e) => setUseCustomWeight(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="custom-weight" className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-green-600" />
            Use Custom Weight
          </Label>
        </div>

        {/* Custom Weight Input */}
        {useCustomWeight && (
          <div className="space-y-2">
            <Label>Custom Weight ({selectedSize.unit})</Label>
            <Input
              type="number"
              value={customWeight}
              onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 1)}
              min="0.1"
              max="100"
              step="0.1"
              className="w-full"
            />
          </div>
        )}

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-purple-600" />
            Quantity
          </Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            min={selectedSize.minQuantity}
            max={selectedSize.maxQuantity}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            Range: {selectedSize.minQuantity} - {selectedSize.maxQuantity} units
          </div>
        </div>

        <Separator />

        {/* Calculation Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Order Summary
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Unit Weight:</div>
              <div className="font-semibold">{effectiveWeight}{selectedSize.unit}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Weight:</div>
              <div className="font-semibold text-green-700">{totalWeight}{selectedSize.unit}</div>
            </div>
            <div>
              <div className="text-gray-600">Unit Price:</div>
              <div className="font-semibold">{formatCurrency(unitPrice)}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Price:</div>
              <div className="font-semibold text-blue-700 text-lg">{formatCurrency(totalPrice)}</div>
            </div>
            <div>
              <div className="text-gray-600">MRP Total:</div>
              <div className="font-semibold text-gray-500">{formatCurrency(totalMrp)}</div>
            </div>
            <div>
              <div className="text-gray-600">You Save:</div>
              <div className="font-semibold text-green-600">{formatCurrency(savings)}</div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApplyChanges}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
          size="lg"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Apply Size Adjustment
        </Button>

        {/* Stock Information */}
        <div className="text-center text-sm text-gray-600 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <strong>Available Stock:</strong> {product.stock_quantity} units in {product.size} size
        </div>
      </CardContent>
    </Card>
  );
}