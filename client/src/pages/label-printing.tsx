import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  PrinterIcon, 
  EyeIcon, 
  SettingsIcon, 
  TagIcon, 
  PlusIcon,
  DownloadIcon,
  UploadIcon,
  CopyIcon,
  TrashIcon,
  GridIcon,
  CheckIcon,
  SearchIcon,
  XIcon,
  QrCodeIcon
} from "lucide-react";
import JSBarcode from "jsbarcode";

// Label template types
interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'qr' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  dataField?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  barcodeType?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39';
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  backgroundColor: string;
  borderWidth: number;
  elements: LabelElement[];
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  mrp?: number;
  barcode?: string;
  category?: { name: string };
  hsnCode?: string;
  weight?: number;
  weightUnit?: string;
}

// Default templates
const defaultTemplates: LabelTemplate[] = [
  {
    id: 'standard-80x40',
    name: 'Standard 80x40mm',
    width: 80,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    elements: [
      {
        id: 'product-name',
        type: 'text',
        x: 5,
        y: 2,
        width: 70,
        height: 12,
        dataField: 'name',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#000000'
      },
      {
        id: 'price',
        type: 'text',
        x: 5,
        y: 15,
        width: 35,
        height: 10,
        dataField: 'price',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#e74c3c'
      },
      {
        id: 'mrp',
        type: 'text',
        x: 5,
        y: 27,
        width: 35,
        height: 8,
        dataField: 'mrp',
        fontSize: 8,
        textAlign: 'left',
        color: '#666666'
      },
      {
        id: 'barcode',
        type: 'barcode',
        x: 45,
        y: 15,
        width: 30,
        height: 20,
        dataField: 'barcode',
        barcodeType: 'CODE128'
      }
    ]
  },
  {
    id: 'price-only',
    name: 'Price Tag 60x30mm',
    width: 60,
    height: 30,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    elements: [
      {
        id: 'price-large',
        type: 'text',
        x: 5,
        y: 5,
        width: 50,
        height: 20,
        dataField: 'price',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#e74c3c'
      }
    ]
  },
  {
    id: 'detailed-label',
    name: 'Detailed 100x50mm',
    width: 100,
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    elements: [
      {
        id: 'product-name',
        type: 'text',
        x: 5,
        y: 2,
        width: 90,
        height: 12,
        dataField: 'name',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#000000'
      },
      {
        id: 'sku',
        type: 'text',
        x: 5,
        y: 15,
        width: 40,
        height: 8,
        dataField: 'sku',
        fontSize: 8,
        textAlign: 'left',
        color: '#666666'
      },
      {
        id: 'price',
        type: 'text',
        x: 5,
        y: 25,
        width: 30,
        height: 10,
        dataField: 'price',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#e74c3c'
      },
      {
        id: 'mrp',
        type: 'text',
        x: 5,
        y: 37,
        width: 30,
        height: 8,
        dataField: 'mrp',
        fontSize: 8,
        textAlign: 'left',
        color: '#666666'
      },
      {
        id: 'barcode',
        type: 'barcode',
        x: 50,
        y: 20,
        width: 45,
        height: 25,
        dataField: 'barcode',
        barcodeType: 'CODE128'
      }
    ]
  }
];

export default function LabelPrinting() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard-80x40');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [copiesPerProduct, setCopiesPerProduct] = useState<number>(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customTemplates, setCustomTemplates] = useState<LabelTemplate[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
    select: (data: any[]) => data?.map((product: any) => ({
      ...product,
      price: Number(product.price) || 0,
      mrp: Number(product.mrp) || Number(product.price) || 0
    })) || []
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           product.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get current template
  const getCurrentTemplate = (): LabelTemplate => {
    const allTemplates = [...defaultTemplates, ...customTemplates];
    return allTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  // Product selection handlers
  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedProducts([]);
  };

  // Canvas preview generation
  const generatePreview = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTemplate = getCurrentTemplate();
    const selectedProductsList = products.filter(p => selectedProducts.includes(p.id));
    
    // Clear canvas
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

    const mmToPx = 3.779528; // 96 DPI conversion
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
        
        // Draw label background
        ctx.fillStyle = currentTemplate.backgroundColor || '#ffffff';
        ctx.fillRect(x, y, labelWidth, labelHeight);
        
        // Draw border
        if (currentTemplate.borderWidth > 0) {
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = currentTemplate.borderWidth;
          ctx.strokeRect(x, y, labelWidth, labelHeight);
        }
        
        // Draw elements
        currentTemplate.elements.forEach((element) => {
          const elementX = x + (element.x * mmToPx);
          const elementY = y + (element.y * mmToPx);
          const elementWidth = element.width * mmToPx;
          const elementHeight = element.height * mmToPx;
          
          ctx.save();
          ctx.translate(elementX, elementY);
          
          if (element.type === 'text') {
            ctx.fillStyle = element.color || '#000000';
            const fontSize = Math.max(8, (element.fontSize || 12) * 0.75);
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
            
            // Text wrapping
            const words = content.toString().split(' ');
            const lines: string[] = [];
            let currentLine = '';
            const maxWidth = Math.max(50, elementWidth - 8);
            
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

  // Print function
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
      
      // Create high-resolution print canvas
      const printCanvas = document.createElement('canvas');
      const printCtx = printCanvas.getContext('2d');
      
      if (printCtx) {
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
            
            // Draw label
            printCtx.fillStyle = currentTemplate.backgroundColor || '#ffffff';
            printCtx.fillRect(x, y, labelWidth/scale, labelHeight/scale);
            
            if (currentTemplate.borderWidth > 0) {
              printCtx.strokeStyle = '#333333';
              printCtx.lineWidth = currentTemplate.borderWidth;
              printCtx.strokeRect(x, y, labelWidth/scale, labelHeight/scale);
            }
            
            // Draw elements
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
                
                lines.forEach((word) => {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="space-y-8">
        {/* Professional Header */}
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                  <TagIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                    Professional Label Printing
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">Create stunning product labels with advanced barcode support</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                      Real-time Preview
                    </span>
                    <span className="flex items-center">
                      <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                      Multiple Templates
                    </span>
                    <span className="flex items-center">
                      <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                      Barcode Generation
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSettingsOpen(true)}
                  className="shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={selectedProducts.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview ({selectedProducts.length * copiesPerProduct} labels)
                </Button>
                <Button 
                  onClick={printLabels}
                  disabled={selectedProducts.length === 0}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* Enhanced Configuration Panel */}
            <Card className="bg-white/90 backdrop-blur-md shadow-2xl border-0 ring-1 ring-gray-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-1">
                <div className="bg-white rounded-lg">
                  <CardHeader className="pb-6">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                        <SettingsIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                          Label Configuration
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Configure your label template and printing options for professional results
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="template" className="text-sm font-semibold text-gray-700 flex items-center">
                          <TagIcon className="h-4 w-4 mr-2 text-blue-500" />
                          Label Template
                        </Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                          <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
                            <SelectValue placeholder="Choose template" />
                          </SelectTrigger>
                          <SelectContent>
                            {defaultTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id} className="py-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded border"></div>
                                  <span>{template.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="copies" className="text-sm font-semibold text-gray-700 flex items-center">
                          <PrinterIcon className="h-4 w-4 mr-2 text-green-500" />
                          Copies per Product
                        </Label>
                        <Input
                          id="copies"
                          type="number"
                          min="1"
                          max="100"
                          value={copiesPerProduct}
                          onChange={(e) => setCopiesPerProduct(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-11 border-2 border-gray-200 hover:border-green-300 focus:border-green-500 transition-colors text-center font-semibold"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="search" className="text-sm font-semibold text-gray-700 flex items-center">
                          <SearchIcon className="h-4 w-4 mr-2 text-purple-500" />
                          Search Products
                        </Label>
                        <Input
                          id="search"
                          placeholder="Search by name or SKU..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-11 border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 transition-colors"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center">
                          <GridIcon className="h-4 w-4 mr-2 text-orange-500" />
                          Filter by Category
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-orange-300 focus:border-orange-500 transition-colors">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="py-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"></div>
                                <span>All Categories</span>
                              </div>
                            </SelectItem>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.name} className="py-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Stats Bar */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-blue-600">{getCurrentTemplate().name.split(' ')[0]}</div>
                          <div className="text-sm text-gray-600">Template</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-green-600">{copiesPerProduct}x</div>
                          <div className="text-sm text-gray-600">Copies Each</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-purple-600">{filteredProducts.length}</div>
                          <div className="text-sm text-gray-600">Products Found</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-orange-600">{selectedProducts.length * copiesPerProduct}</div>
                          <div className="text-sm text-gray-600">Total Labels</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>

            {/* Enhanced Product Selection */}
            <Card className="bg-white/90 backdrop-blur-md shadow-2xl border-0 ring-1 ring-gray-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 p-1">
                <div className="bg-white rounded-lg">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                          <GridIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent">
                            Product Selection
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            Choose products to print labels for • {filteredProducts.length} products available • {selectedProducts.length} selected
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={handleSelectAll}
                          className="shadow-md hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                        >
                          <CheckIcon className="h-4 w-4 mr-2" />
                          Select All ({filteredProducts.length})
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleDeselectAll}
                          disabled={selectedProducts.length === 0}
                          className="shadow-md hover:shadow-lg transition-all duration-200 border-2 hover:border-red-300"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto pr-2">
                      {filteredProducts.map((product: Product) => (
                        <div 
                          key={product.id} 
                          className={`group relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedProducts.includes(product.id) 
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-md transform scale-[1.02]' 
                              : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectProduct(product.id)}
                        >
                          {/* Selection Indicator */}
                          {selectedProducts.includes(product.id) && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full p-1 shadow-lg">
                              <CheckIcon className="h-4 w-4" />
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors">
                                  {product.name}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    SKU: {product.sku}
                                  </span>
                                  {product.barcode && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                      <QrCodeIcon className="h-3 w-3 inline mr-1" />
                                      Barcode
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-baseline space-x-2">
                                    <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
                                    {product.mrp && product.mrp > product.price && (
                                      <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>
                                    )}
                                  </div>
                                  {product.mrp && product.mrp > product.price && (
                                    <div className="text-xs text-green-600 font-semibold">
                                      Save ₹{(product.mrp - product.price).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {product.category && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                                  <span className="text-xs font-medium text-gray-600">
                                    {product.category.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleSelectProduct(product.id)}
                                className="scale-125"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-16">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <GridIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Found</h3>
                        <p className="text-gray-500 mb-4">No products match your current search and filter criteria</p>
                        <div className="space-y-2 text-sm text-gray-400">
                          <p>• Try adjusting your search terms</p>
                          <p>• Change or clear the category filter</p>
                          <p>• Check if products exist in your inventory</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </div>
            </Card>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Label Preview</DialogTitle>
              <DialogDescription>
                Preview of {selectedProducts.length * copiesPerProduct} labels using {getCurrentTemplate().name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={600}
                className="border border-gray-200 w-full"
                style={{ maxHeight: '500px' }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={printLabels} className="bg-green-600 hover:bg-green-700">
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Label Printing Settings</DialogTitle>
              <DialogDescription>
                Configure templates and printer settings
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="templates" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="printer">Printer</TabsTrigger>
                <TabsTrigger value="export">Export/Import</TabsTrigger>
              </TabsList>
              
              <TabsContent value="templates" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Available Templates</h4>
                  {defaultTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.width}mm × {template.height}mm</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={selectedTemplate === template.id ? "default" : "outline"}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          {selectedTemplate === template.id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="printer" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Printer Settings</h4>
                  <div className="p-4 border rounded bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Labels will be printed using your browser's print dialog. 
                      For best results, ensure your printer supports the label size you've selected.
                    </p>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm"><strong>Recommended Settings:</strong></p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Paper size: A4 or Letter</li>
                        <li>• Orientation: Portrait</li>
                        <li>• Margins: Minimum</li>
                        <li>• Scale: 100%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="export" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Template Management</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export Templates
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Import Templates
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Export your custom templates to share with other devices or as backup.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
              <Button onClick={() => setIsSettingsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}