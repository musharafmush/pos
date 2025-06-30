import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  PrinterIcon, 
  EyeIcon, 
  SettingsIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  PackageIcon,
  TagIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSBarcode from 'jsbarcode';

// Types
interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  mrp?: number;
  barcode?: string;
  category?: { name: string };
  weight?: number;
  weightUnit?: string;
  hsnCode?: string;
}

interface Category {
  id: number;
  name: string;
}

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'line' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  dataField?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  barcodeType?: string;
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  borderWidth: number;
  elements: LabelElement[];
}

const defaultTemplates: LabelTemplate[] = [
  {
    id: 'm-mart-standard',
    name: 'M MART Standard (₹36.00 Format)',
    width: 80,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    elements: [
      {
        id: 'store-name',
        type: 'text',
        x: 2,
        y: 2,
        width: 76,
        height: 8,
        content: 'M MART',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000000'
      },
      {
        id: 'product-name',
        type: 'text',
        x: 2,
        y: 12,
        width: 76,
        height: 8,
        dataField: 'name',
        fontSize: 11,
        textAlign: 'center',
        color: '#000000'
      },
      {
        id: 'price-label',
        type: 'text',
        x: 2,
        y: 22,
        width: 76,
        height: 8,
        dataField: 'price',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000000'
      },
      {
        id: 'mrp-label',
        type: 'text',
        x: 2,
        y: 32,
        width: 76,
        height: 6,
        dataField: 'mrp',
        fontSize: 9,
        textAlign: 'center',
        color: '#666666'
      }
    ]
  },
  {
    id: 'retail-standard',
    name: 'Retail Standard (80x40mm)',
    width: 80,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    elements: [
      {
        id: 'title',
        type: 'text',
        x: 2,
        y: 2,
        width: 76,
        height: 8,
        content: 'M MART',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000000'
      },
      {
        id: 'product-name',
        type: 'text',
        x: 2,
        y: 12,
        width: 76,
        height: 6,
        dataField: 'name',
        fontSize: 10,
        textAlign: 'left',
        color: '#000000'
      },
      {
        id: 'price',
        type: 'text',
        x: 2,
        y: 20,
        width: 35,
        height: 6,
        dataField: 'price',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#000000'
      },
      {
        id: 'mrp',
        type: 'text',
        x: 40,
        y: 20,
        width: 36,
        height: 6,
        dataField: 'mrp',
        fontSize: 10,
        textAlign: 'right',
        color: '#666666'
      },
      {
        id: 'barcode',
        type: 'barcode',
        x: 2,
        y: 28,
        width: 76,
        height: 10,
        dataField: 'barcode',
        barcodeType: 'CODE128'
      }
    ]
  }
];

export default function PrintLabelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('m-mart-standard');
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const { data: productsData = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const products = productsData as Product[];
  const categories = categoriesData as Category[];

  const getCurrentTemplate = (): LabelTemplate => {
    return defaultTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || 
                           (product.category && product.category.name === selectedCategory);

    const matchesSelection = !showOnlySelected || selectedProducts.includes(product.id);

    return matchesSearch && matchesCategory && matchesSelection;
  });

  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    const visibleProductIds = filteredProducts.map(p => p.id);
    setSelectedProducts(visibleProductIds);
  };

  const handleDeselectAll = () => {
    setSelectedProducts([]);
  };

  const generatePreview = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTemplate = getCurrentTemplate();
    const selectedProductsList = products.filter(p => selectedProducts.includes(p.id));
    
    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (selectedProductsList.length === 0) {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6c757d';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Select products to preview labels', canvas.width / 2, canvas.height / 2);
      ctx.font = '14px Arial';
      ctx.fillText('Choose products from the list below', canvas.width / 2, canvas.height / 2 + 30);
      return;
    }

    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mmToPx = 3.779528; // More accurate conversion: 96 DPI / 25.4 mm
    const labelWidth = currentTemplate.width * mmToPx;
    const labelHeight = currentTemplate.height * mmToPx;
    const padding = 15;

    const labelsPerRow = Math.floor((canvas.width - padding) / (labelWidth + padding));
    const totalLabels = selectedProductsList.length * copiesPerProduct;
    const rowsNeeded = Math.ceil(totalLabels / labelsPerRow);
    
    const totalHeight = Math.max(500, rowsNeeded * (labelHeight + padding) + padding);
    canvas.height = totalHeight;

    // Redraw background after height change
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let labelIndex = 0;
    
    selectedProductsList.forEach((product) => {
      for (let copy = 0; copy < copiesPerProduct; copy++) {
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;
        
        const x = col * (labelWidth + padding) + padding;
        const y = row * (labelHeight + padding) + padding;
        
        ctx.fillStyle = currentTemplate.backgroundColor || '#ffffff';
        ctx.fillRect(x, y, labelWidth, labelHeight);
        
        if (currentTemplate.borderWidth > 0) {
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = currentTemplate.borderWidth;
          ctx.strokeRect(x, y, labelWidth, labelHeight);
        }
        
        currentTemplate.elements.forEach((element) => {
          const elementX = x + (element.x * mmToPx);
          const elementY = y + (element.y * mmToPx);
          const elementWidth = element.width * mmToPx;
          const elementHeight = element.height * mmToPx;
          
          ctx.save();
          ctx.translate(elementX, elementY);
          
          if (element.type === 'text') {
            ctx.fillStyle = element.color || '#000000';
            const fontSize = Math.max(8, (element.fontSize || 12) * 0.75); // Scale down for better fit
            ctx.font = `${element.fontWeight || 'normal'} ${fontSize}px Arial`;
            ctx.textAlign = element.textAlign || 'left';
            ctx.textBaseline = 'top';
            
            let content = element.content || '';
            if (element.dataField) {
              switch (element.dataField) {
                case 'name': 
                  content = product.name || 'Unknown Product'; 
                  break;
                case 'price': 
                  const price = Number(product.price) || 0;
                  content = `₹${price.toFixed(2)}`; 
                  break;
                case 'mrp': 
                  const mrp = Number(product.mrp) || Number(product.price) || 0;
                  content = `MRP: ₹${mrp.toFixed(2)}`; 
                  break;
                case 'sku': 
                  content = product.sku || 'NO-SKU'; 
                  break;
                case 'barcode': 
                  content = product.barcode || product.sku || 'NO-BARCODE'; 
                  break;
                case 'category': 
                  content = product.category?.name || 'General'; 
                  break;
                case 'weight': 
                  content = product.weight ? `${product.weight}${product.weightUnit || 'kg'}` : ''; 
                  break;
                case 'hsn': 
                  content = product.hsnCode || ''; 
                  break;
                default: 
                  content = element.content || '';
              }
            }
            
            // Improved text wrapping with better word handling
            const words = content.toString().split(' ');
            const lines: string[] = [];
            let currentLine = '';
            const maxWidth = Math.max(50, elementWidth - 8); // Ensure minimum width
            
            for (const word of words) {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              const metrics = ctx.measureText(testLine);
              
              if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);
            
            // Limit to maximum 3 lines for label space
            const maxLines = Math.min(3, Math.floor(elementHeight / (fontSize * 1.2)));
            const displayLines = lines.slice(0, maxLines);
            
            const lineHeight = fontSize * 1.2;
            displayLines.forEach((line, index) => {
              const yPos = 4 + (index * lineHeight);
              if (yPos < elementHeight - 4) {
                ctx.fillText(line, 4, yPos);
              }
            });
            
          } else if (element.type === 'barcode') {
            try {
              const barcodeData = (product.barcode || product.sku || `BC${product.id}`).toString();
              const barcodeCanvas = document.createElement('canvas');
              
              // Set canvas size for barcode
              barcodeCanvas.width = Math.max(200, elementWidth * 2);
              barcodeCanvas.height = Math.max(60, elementHeight * 2);
              
              JSBarcode(barcodeCanvas, barcodeData, {
                format: element.barcodeType || 'CODE128',
                width: 1.5,
                height: Math.max(40, (elementHeight * 2) - 30),
                displayValue: true,
                fontSize: 12,
                margin: 5,
                background: '#ffffff',
                lineColor: '#000000'
              });
              
              // Draw barcode scaled to fit element
              ctx.drawImage(barcodeCanvas, 0, 0, elementWidth, elementHeight);
              
            } catch (error) {
              // Fallback if barcode generation fails
              ctx.fillStyle = '#f0f0f0';
              ctx.fillRect(0, 0, elementWidth, elementHeight);
              ctx.fillStyle = '#000000';
              ctx.font = '8px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const fallbackText = product.barcode || product.sku || `ID:${product.id}`;
              ctx.fillText(fallbackText, elementWidth/2, elementHeight/2);
            }
          }
          
          ctx.restore();
        });
        
        labelIndex++;
      }
    });
  };

  useEffect(() => {
    if (isPreviewOpen && canvasRef.current) {
      generatePreview();
    }
  }, [isPreviewOpen, selectedProducts, copiesPerProduct, selectedTemplate]);

  const printLabels = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to print labels.",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedProductsList = products.filter(p => selectedProducts.includes(p.id));
      const currentTemplate = getCurrentTemplate();
      
      // Create print data
      const printData = {
        template: currentTemplate,
        products: selectedProductsList,
        copies: copiesPerProduct,
        totalLabels: selectedProducts.length * copiesPerProduct
      };

      // For now, create a print-ready canvas and trigger browser print
      const printCanvas = document.createElement('canvas');
      const printCtx = printCanvas.getContext('2d');
      
      if (printCtx) {
        // Set up canvas for printing (higher resolution)
        const scale = 2; // Higher DPI for print
        const mmToPx = 3.779528 * scale;
        const labelWidth = currentTemplate.width * mmToPx;
        const labelHeight = currentTemplate.height * mmToPx;
        const padding = 20 * scale;

        const labelsPerRow = Math.floor((800 * scale - padding) / (labelWidth + padding));
        const totalLabels = selectedProductsList.length * copiesPerProduct;
        const rowsNeeded = Math.ceil(totalLabels / labelsPerRow);
        
        printCanvas.width = 800 * scale;
        printCanvas.height = Math.max(600 * scale, rowsNeeded * (labelHeight + padding) + padding);
        
        // Scale context for high DPI
        printCtx.scale(scale, scale);
        
        // White background
        printCtx.fillStyle = '#ffffff';
        printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);

        let labelIndex = 0;
        
        selectedProductsList.forEach((product) => {
          for (let copy = 0; copy < copiesPerProduct; copy++) {
            const row = Math.floor(labelIndex / labelsPerRow);
            const col = labelIndex % labelsPerRow;
            
            const x = col * (labelWidth/scale + padding/scale) + padding/scale;
            const y = row * (labelHeight/scale + padding/scale) + padding/scale;
            
            // Draw label background
            printCtx.fillStyle = currentTemplate.backgroundColor || '#ffffff';
            printCtx.fillRect(x, y, labelWidth/scale, labelHeight/scale);
            
            // Draw border
            if (currentTemplate.borderWidth > 0) {
              printCtx.strokeStyle = '#333333';
              printCtx.lineWidth = currentTemplate.borderWidth;
              printCtx.strokeRect(x, y, labelWidth/scale, labelHeight/scale);
            }
            
            // Draw elements (simplified for print)
            currentTemplate.elements.forEach((element) => {
              const elementX = x + (element.x * mmToPx/scale);
              const elementY = y + (element.y * mmToPx/scale);
              const elementWidth = element.width * mmToPx/scale;
              const elementHeight = element.height * mmToPx/scale;
              
              printCtx.save();
              printCtx.translate(elementX, elementY);
              
              if (element.type === 'text') {
                printCtx.fillStyle = element.color || '#000000';
                const fontSize = (element.fontSize || 12);
                printCtx.font = `${element.fontWeight || 'normal'} ${fontSize}px Arial`;
                printCtx.textAlign = element.textAlign || 'left';
                printCtx.textBaseline = 'top';
                
                let content = element.content || '';
                if (element.dataField) {
                  switch (element.dataField) {
                    case 'name': content = product.name || 'Unknown Product'; break;
                    case 'price': content = `₹${Number(product.price || 0).toFixed(2)}`; break;
                    case 'mrp': content = `MRP: ₹${Number(product.mrp || product.price || 0).toFixed(2)}`; break;
                    case 'sku': content = product.sku || 'NO-SKU'; break;
                    case 'barcode': content = product.barcode || product.sku || 'NO-BARCODE'; break;
                    case 'category': content = product.category?.name || 'General'; break;
                    default: content = element.content || '';
                  }
                }
                
                // Simple text rendering for print
                const lines = content.toString().split(' ');
                let currentLine = '';
                let yOffset = 4;
                const lineHeight = fontSize * 1.2;
                
                lines.forEach((word, index) => {
                  const testLine = currentLine + (currentLine ? ' ' : '') + word;
                  const metrics = printCtx.measureText(testLine);
                  
                  if (metrics.width > elementWidth - 8 && currentLine) {
                    printCtx.fillText(currentLine, 4, yOffset);
                    currentLine = word;
                    yOffset += lineHeight;
                  } else {
                    currentLine = testLine;
                  }
                });
                
                if (currentLine) {
                  printCtx.fillText(currentLine, 4, yOffset);
                }
              }
              
              printCtx.restore();
            });
            
            labelIndex++;
          }
        });

        // Create print window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Print Labels - M MART</title>
                <style>
                  @page { margin: 0; size: A4; }
                  body { margin: 0; padding: 20px; }
                  canvas { max-width: 100%; height: auto; }
                  @media print {
                    body { padding: 0; }
                    canvas { width: 100% !important; height: auto !important; }
                  }
                </style>
              </head>
              <body>
                <canvas width="${printCanvas.width}" height="${printCanvas.height}"></canvas>
                <script>
                  const canvas = document.querySelector('canvas');
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  img.onload = function() {
                    ctx.drawImage(img, 0, 0);
                    setTimeout(() => window.print(), 100);
                  };
                  img.src = "${printCanvas.toDataURL()}";
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }

      toast({
        title: "Labels sent to printer",
        description: `${selectedProducts.length * copiesPerProduct} labels prepared for printing`
      });
      
      setIsPreviewOpen(false);
      
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: "Unable to generate labels for printing",
        variant: "destructive"
      });
    }
  };

  if (isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Label Printing</h1>
            <p className="text-gray-600">Create and print product labels with Endura printer support</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={() => setIsPreviewOpen(true)}
              disabled={selectedProducts.length === 0}
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Preview ({selectedProducts.length * copiesPerProduct} labels)
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Label Configuration</CardTitle>
            <CardDescription>Configure your label template and printing options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="template">Label Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="copies">Copies per Product</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="10"
                  value={copiesPerProduct}
                  onChange={(e) => setCopiesPerProduct(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-selected"
                  checked={showOnlySelected}
                  onCheckedChange={setShowOnlySelected}
                />
                <Label htmlFor="show-selected">Show only selected</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Selection</CardTitle>
                <CardDescription>
                  Select products to print labels for ({selectedProducts.length} selected)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  <XIcon className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredProducts.map((product) => (
                <Card key={product.id} className={`cursor-pointer transition-colors ${selectedProducts.includes(product.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PackageIcon className="h-4 w-4 text-gray-400" />
                          <h3 className="font-medium text-sm truncate">{product.name}</h3>
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <TagIcon className="h-3 w-3" />
                            <span>SKU: {product.sku}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-green-600">₹{Number(product.price).toFixed(2)}</span>
                            {product.mrp && Number(product.mrp) !== Number(product.price) && (
                              <span className="text-gray-500 line-through">₹{Number(product.mrp).toFixed(2)}</span>
                            )}
                          </div>
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">
                              {product.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <PackageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No products found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Print Preview</DialogTitle>
              <DialogDescription>
                Preview of {selectedProducts.length * copiesPerProduct} labels
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <div className="p-4">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="mx-auto border border-gray-300 rounded"
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={printLabels}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Label Printing Settings</DialogTitle>
              <DialogDescription>
                Configure your Endura printer and label templates
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="printer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="printer">Printer Settings</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="printer" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Printer Model</Label>
                    <Select defaultValue="endura-80mm">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="endura-80mm">Endura 80mm Label Printer</SelectItem>
                        <SelectItem value="endura-40mm">Endura 40mm Label Printer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Connection Type</Label>
                    <Select defaultValue="usb">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usb">USB Connection</SelectItem>
                        <SelectItem value="network">Network (IP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Label Size</Label>
                    <Select defaultValue="80x40">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80x40">80mm x 40mm</SelectItem>
                        <SelectItem value="80x30">80mm x 30mm</SelectItem>
                        <SelectItem value="60x40">60mm x 40mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="templates" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {defaultTemplates.map(template => (
                      <Card key={template.id} className={`cursor-pointer ${selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''}`}>
                        <CardContent className="p-4">
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-gray-600">{template.width}mm x {template.height}mm</p>
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant={selectedTemplate === template.id ? "default" : "outline"}
                              onClick={() => setSelectedTemplate(template.id)}
                            >
                              {selectedTemplate === template.id ? "Selected" : "Select"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}