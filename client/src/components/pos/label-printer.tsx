
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Printer, 
  Settings, 
  TestTube, 
  Eye, 
  Download,
  Upload,
  Grid,
  List,
  Search,
  Check,
  X,
  Package,
  Tag,
  BarChart3
} from "lucide-react";
import JSBarcode from 'jsbarcode';

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
  description?: string;
}

interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  fontSize: number;
  includeBarcode: boolean;
  includePrice: boolean;
  includeDescription: boolean;
  includeMrp: boolean;
  includeWeight: boolean;
  includeLogo: boolean;
  barcodeType: string;
  barcodePosition: string;
  textAlignment: string;
  borderStyle: string;
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
  logoPosition: string;
  customFields: string;
  customCss: string;
  isDefault: boolean;
  isActive: boolean;
}

interface PrintSettings {
  printerType: 'endura' | 'zebra' | 'thermal' | 'laser';
  connection: 'usb' | 'network' | 'bluetooth';
  paperWidth: number;
  paperHeight: number;
  printDensity: 'light' | 'medium' | 'dark';
  printSpeed: 'slow' | 'medium' | 'fast';
}

const defaultTemplates: LabelTemplate[] = [
  {
    id: 'standard-80x40',
    name: 'Standard 80x40mm',
    description: 'Standard product label with barcode and price',
    width: 80,
    height: 40,
    fontSize: 12,
    includeBarcode: true,
    includePrice: true,
    includeDescription: false,
    includeMrp: true,
    includeWeight: false,
    includeLogo: false,
    barcodeType: 'CODE128',
    barcodePosition: 'bottom',
    textAlignment: 'center',
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    logoPosition: 'top-left',
    customFields: '',
    customCss: '',
    isDefault: true,
    isActive: true
  },
  {
    id: 'compact-50x30',
    name: 'Compact 50x30mm',
    description: 'Compact label for small products',
    width: 50,
    height: 30,
    fontSize: 10,
    includeBarcode: true,
    includePrice: true,
    includeDescription: true,
    includeMrp: false,
    includeWeight: false,
    includeLogo: true,
    barcodeType: 'QR',
    barcodePosition: 'right',
    textAlignment: 'left',
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: '#f8f9fa',
    textColor: '#212529',
    logoPosition: 'top-right',
    customFields: '',
    customCss: '',
    isDefault: false,
    isActive: true
  },
  {
    id: 'premium-100x50',
    name: 'Premium 100x50mm',
    description: 'Large premium label with full details',
    width: 100,
    height: 50,
    fontSize: 14,
    includeBarcode: true,
    includePrice: true,
    includeDescription: true,
    includeMrp: true,
    includeWeight: true,
    includeLogo: true,
    barcodeType: 'CODE128',
    barcodePosition: 'bottom',
    textAlignment: 'center',
    borderStyle: 'solid',
    borderWidth: 2,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    logoPosition: 'top-center',
    customFields: 'HSN Code',
    customCss: '',
    isDefault: false,
    isActive: true
  }
];

export const LabelPrinter: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State management
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard-80x40');
  const [copies, setCopies] = useState(1);
  const [customText, setCustomText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  
  // Dialog states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  
  // Printer settings
  const [printerSettings, setPrinterSettings] = useState<PrintSettings>({
    printerType: 'endura',
    connection: 'usb',
    paperWidth: 80,
    paperHeight: 40,
    printDensity: 'medium',
    printSpeed: 'medium'
  });

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);

  // Fetch products and categories
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const getCurrentTemplate = (): LabelTemplate => {
    return defaultTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  const filteredProducts = (products as Product[]).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSelection = !showOnlySelected || selectedProducts.includes(product.id);

    return matchesSearch && matchesSelection;
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
    const selectedProductsList = (products as Product[]).filter(p => selectedProducts.includes(p.id));
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (selectedProductsList.length === 0) {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6c757d';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Select products to preview labels', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mmToPx = 3.779528;
    const labelWidth = currentTemplate.width * mmToPx;
    const labelHeight = currentTemplate.height * mmToPx;
    const padding = 15;

    const labelsPerRow = Math.floor((canvas.width - padding) / (labelWidth + padding));
    const totalLabels = selectedProductsList.length * copies;
    const rowsNeeded = Math.ceil(totalLabels / labelsPerRow);
    
    const totalHeight = Math.max(500, rowsNeeded * (labelHeight + padding) + padding);
    canvas.height = totalHeight;

    // Redraw background after height change
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let labelIndex = 0;
    
    selectedProductsList.forEach((product) => {
      for (let copy = 0; copy < copies; copy++) {
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;
        
        const x = col * (labelWidth + padding) + padding;
        const y = row * (labelHeight + padding) + padding;
        
        // Draw label background
        ctx.fillStyle = currentTemplate.backgroundColor;
        ctx.fillRect(x, y, labelWidth, labelHeight);
        
        // Draw border
        if (currentTemplate.borderWidth > 0) {
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = currentTemplate.borderWidth;
          ctx.strokeRect(x, y, labelWidth, labelHeight);
        }
        
        // Draw label content
        drawLabelContent(ctx, product, currentTemplate, x, y, labelWidth, labelHeight);
        
        labelIndex++;
      }
    });
  };

  const drawLabelContent = (
    ctx: CanvasRenderingContext2D,
    product: Product,
    template: LabelTemplate,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const padding = 4;
    let currentY = y + padding;
    
    ctx.fillStyle = template.textColor;
    ctx.textAlign = template.textAlignment as CanvasTextAlign;
    
    // Product name
    ctx.font = `bold ${template.fontSize}px Arial`;
    const nameText = product.name || 'Unknown Product';
    ctx.fillText(nameText, x + width/2, currentY + template.fontSize);
    currentY += template.fontSize + 4;
    
    // Price
    if (template.includePrice) {
      ctx.font = `${template.fontSize}px Arial`;
      const priceText = `₹${Number(product.price || 0).toFixed(2)}`;
      ctx.fillText(priceText, x + width/2, currentY + template.fontSize);
      currentY += template.fontSize + 2;
    }
    
    // MRP
    if (template.includeMrp && product.mrp) {
      ctx.font = `${template.fontSize - 2}px Arial`;
      const mrpText = `MRP: ₹${Number(product.mrp).toFixed(2)}`;
      ctx.fillText(mrpText, x + width/2, currentY + template.fontSize);
      currentY += template.fontSize + 2;
    }
    
    // Weight
    if (template.includeWeight && product.weight) {
      ctx.font = `${template.fontSize - 2}px Arial`;
      const weightText = `${product.weight}${product.weightUnit || 'kg'}`;
      ctx.fillText(weightText, x + width/2, currentY + template.fontSize);
      currentY += template.fontSize + 2;
    }
    
    // Custom text
    if (customText) {
      ctx.font = `${template.fontSize - 2}px Arial`;
      ctx.fillText(customText, x + width/2, currentY + template.fontSize);
      currentY += template.fontSize + 2;
    }
    
    // Barcode
    if (template.includeBarcode) {
      try {
        const barcodeData = product.barcode || product.sku || `BC${product.id}`;
        const barcodeCanvas = document.createElement('canvas');
        
        barcodeCanvas.width = Math.max(200, width * 2);
        barcodeCanvas.height = 60;
        
        JSBarcode(barcodeCanvas, barcodeData, {
          format: template.barcodeType,
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000'
        });
        
        const barcodeY = y + height - 50;
        ctx.drawImage(barcodeCanvas, x + 2, barcodeY, width - 4, 40);
        
      } catch (error) {
        // Fallback text
        ctx.font = '8px monospace';
        ctx.fillText(product.barcode || product.sku || `ID:${product.id}`, x + width/2, y + height - 10);
      }
    }
  };

  const handlePrint = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to print labels.",
        variant: "destructive"
      });
      return;
    }

    try {
      const selectedProductsList = (products as Product[]).filter(p => selectedProducts.includes(p.id));
      const currentTemplate = getCurrentTemplate();
      
      // Create print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Generate high-resolution canvas for printing
        const printCanvas = document.createElement('canvas');
        const printCtx = printCanvas.getContext('2d');
        
        if (printCtx) {
          const scale = 2; // Higher DPI for print
          const mmToPx = 3.779528 * scale;
          const labelWidth = currentTemplate.width * mmToPx;
          const labelHeight = currentTemplate.height * mmToPx;
          const padding = 20 * scale;

          const labelsPerRow = Math.floor((800 * scale - padding) / (labelWidth + padding));
          const totalLabels = selectedProductsList.length * copies;
          const rowsNeeded = Math.ceil(totalLabels / labelsPerRow);
          
          printCanvas.width = 800 * scale;
          printCanvas.height = Math.max(600 * scale, rowsNeeded * (labelHeight + padding) + padding);
          
          printCtx.scale(scale, scale);
          
          // White background
          printCtx.fillStyle = '#ffffff';
          printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);

          let labelIndex = 0;
          
          selectedProductsList.forEach((product) => {
            for (let copy = 0; copy < copies; copy++) {
              const row = Math.floor(labelIndex / labelsPerRow);
              const col = labelIndex % labelsPerRow;
              
              const x = col * (labelWidth/scale + padding/scale) + padding/scale;
              const y = row * (labelHeight/scale + padding/scale) + padding/scale;
              
              // Draw label
              printCtx.fillStyle = currentTemplate.backgroundColor;
              printCtx.fillRect(x, y, labelWidth/scale, labelHeight/scale);
              
              if (currentTemplate.borderWidth > 0) {
                printCtx.strokeStyle = '#333333';
                printCtx.lineWidth = currentTemplate.borderWidth;
                printCtx.strokeRect(x, y, labelWidth/scale, labelHeight/scale);
              }
              
              drawLabelContent(printCtx, product, currentTemplate, x, y, labelWidth/scale, labelHeight/scale);
              
              labelIndex++;
            }
          });

          printWindow.document.write(`
            <html>
              <head>
                <title>Print Labels - Awesome Shop POS</title>
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
        description: `${selectedProducts.length * copies} labels prepared for printing`
      });
      
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print failed",
        description: "Unable to generate labels for printing",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isPreviewOpen && canvasRef.current) {
      generatePreview();
    }
  }, [isPreviewOpen, selectedProducts, copies, selectedTemplate, customText]);

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Label Printer</h1>
          <p className="text-gray-600">Professional label printing system with Endura printer support</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            onClick={() => setIsPreviewOpen(true)}
            disabled={selectedProducts.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview ({selectedProducts.length * copies} labels)
          </Button>
        </div>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Label Configuration</CardTitle>
          <CardDescription>Configure your label template and printing options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="template">Label Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.width}x{template.height}mm)
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
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="customText">Custom Text (Optional)</Label>
              <Input
                id="customText"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Special offer, etc."
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
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

      {/* Product Selection Card */}
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
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                        <Package className="h-4 w-4 text-gray-400" />
                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Tag className="h-3 w-3" />
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
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No products found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handlePrint}
          disabled={selectedProducts.length === 0}
          size="lg"
          className="px-8"
        >
          <Printer className="h-5 w-5 mr-2" />
          Print {selectedProducts.length * copies} Labels
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Preview</DialogTitle>
            <DialogDescription>
              Preview of {selectedProducts.length * copies} labels using {getCurrentTemplate().name}
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
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Printer Settings</DialogTitle>
            <DialogDescription>
              Configure your label printer and print settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Printer Type</Label>
                <Select 
                  value={printerSettings.printerType} 
                  onValueChange={(value: any) => setPrinterSettings({...printerSettings, printerType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="endura">Endura Label Printer</SelectItem>
                    <SelectItem value="zebra">Zebra Thermal Printer</SelectItem>
                    <SelectItem value="thermal">Generic Thermal Printer</SelectItem>
                    <SelectItem value="laser">Laser Printer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Connection Type</Label>
                <Select 
                  value={printerSettings.connection} 
                  onValueChange={(value: any) => setPrinterSettings({...printerSettings, connection: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usb">USB Connection</SelectItem>
                    <SelectItem value="network">Network (IP)</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paper Width (mm)</Label>
                <Input 
                  type="number"
                  value={printerSettings.paperWidth}
                  onChange={(e) => setPrinterSettings({...printerSettings, paperWidth: parseInt(e.target.value) || 80})}
                />
              </div>
              <div>
                <Label>Paper Height (mm)</Label>
                <Input 
                  type="number"
                  value={printerSettings.paperHeight}
                  onChange={(e) => setPrinterSettings({...printerSettings, paperHeight: parseInt(e.target.value) || 40})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Print Density</Label>
                <Select 
                  value={printerSettings.printDensity} 
                  onValueChange={(value: any) => setPrinterSettings({...printerSettings, printDensity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Print Speed</Label>
                <Select 
                  value={printerSettings.printSpeed} 
                  onValueChange={(value: any) => setPrinterSettings({...printerSettings, printSpeed: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsSettingsOpen(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabelPrinter;
