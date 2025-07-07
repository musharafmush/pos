import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scan, Search, Package, Tag, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  price: number;
  mrp?: number;
  barcode?: string;
  stockQuantity: number;
  description?: string;
  category?: string;
  gstCode?: string;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

interface BarcodeOfferTrigger {
  productId: number;
  offerIds: number[];
  triggerType: 'scan' | 'add_to_cart' | 'quantity_threshold';
  minQuantity?: number;
}

interface BarcodeScannerProps {
  onProductScanned: (product: Product, triggeredOffers?: any[]) => void;
  onOfferTriggered: (offers: any[]) => void;
}

export function BarcodeScanner({ onProductScanned, onOfferTriggered }: BarcodeScannerProps) {
  const [scanInput, setScanInput] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-focus on the input for continuous scanning
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Fetch product by barcode
  const { data: scannedProduct, isLoading, refetch } = useQuery({
    queryKey: ['/api/products/barcode', scanInput],
    queryFn: async () => {
      if (!scanInput || scanInput.length < 3) return null;
      
      const response = await fetch(`/api/products/barcode/${encodeURIComponent(scanInput)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error('Failed to fetch product');
      }
      return response.json();
    },
    enabled: false
  });

  // Fetch offers triggered by barcode
  const { data: triggeredOffers = [] } = useQuery({
    queryKey: ['/api/offers/barcode-triggers', scanInput],
    queryFn: async () => {
      if (!scanInput) return [];
      
      const response = await fetch(`/api/offers/barcode-triggers?barcode=${encodeURIComponent(scanInput)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!scanInput && scanInput.length >= 3
  });

  const handleScan = async () => {
    if (!scanInput.trim()) return;

    try {
      const result = await refetch();
      
      if (result.data) {
        // Add to scan history
        setScanHistory(prev => [scanInput, ...prev.slice(0, 4)]);
        setLastScannedBarcode(scanInput);
        
        // Trigger product scanning callback
        onProductScanned(result.data, triggeredOffers);
        
        // Check for offer triggers
        if (triggeredOffers.length > 0) {
          onOfferTriggered(triggeredOffers);
          toast({
            title: "Special Offer Activated!",
            description: `${triggeredOffers.length} offer(s) triggered by scanning ${result.data.name}`,
          });
        }

        toast({
          title: "Product Scanned",
          description: `${result.data.name} added to cart`,
        });
        
      } else {
        toast({
          title: "Product Not Found",
          description: `No product found with barcode: ${scanInput}`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Scan Error",
        description: error.message,
        variant: "destructive"
      });
    }

    setScanInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const handleQuickScan = (barcode: string) => {
    setScanInput(barcode);
    setTimeout(() => handleScan(), 100);
  };

  return (
    <div className="space-y-4">
      {/* Main Scanner Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scan barcode or enter manually..."
              className="font-mono text-lg"
              autoFocus
            />
            <Button 
              onClick={handleScan} 
              disabled={!scanInput.trim() || isLoading}
              className="px-6"
            >
              {isLoading ? (
                <Search className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Quick Scan Buttons for Demo */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickScan("8901030877643")}
            >
              <Package className="h-3 w-3 mr-1" />
              Demo Wheat Flour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickScan("1234567890123")}
            >
              <Package className="h-3 w-3 mr-1" />
              Demo Rice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickScan("9876543210987")}
            >
              <Package className="h-3 w-3 mr-1" />
              Demo Oil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanHistory.map((barcode, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-gray-600">{barcode}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickScan(barcode)}
                    className="h-6 px-2 text-xs"
                  >
                    Scan Again
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanning Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Scanning Tips:</p>
              <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                <li>Hold barcode 6-8 inches from scanner</li>
                <li>Ensure good lighting and clean barcode</li>
                <li>Use manual entry if scanning fails</li>
                <li>Press Enter after typing barcode manually</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}