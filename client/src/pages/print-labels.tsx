import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  TagIcon, 
  PrinterIcon, 
  SettingsIcon, 
  SearchIcon, 
  Package2Icon,
  FilterIcon,
  DownloadIcon,
  RefreshCwIcon,
  GridIcon,
  ListIcon,
  Eye,
  StarIcon,
  ClockIcon
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  cost?: string;
  description?: string;
  barcode?: string;
  category?: { name: string };
  stockQuantity?: number;
  mrp?: string;
  weight?: string;
  weightUnit?: string;
  hsnCode?: string;
  gstCode?: string;
  active?: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  fontSize: number;
  includeBarcode: boolean;
  includePrice: boolean;
  includeDescription: boolean;
  includeMRP: boolean;
  includeWeight: boolean;
  includeHSN: boolean;
  barcodePosition: 'top' | 'bottom' | 'left' | 'right';
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
  customCSS?: string;
}

const defaultTemplates: LabelTemplate[] = [
  {
    id: 'retail-standard',
    name: 'Retail Standard',
    width: 80,
    height: 50,
    fontSize: 18,
    includeBarcode: true,
    includePrice: true,
    includeDescription: false,
    includeMRP: true,
    includeWeight: false,
    includeHSN: false,
    barcodePosition: 'bottom',
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    textColor: '#000000'
  },
  {
    id: 'grocery-compact',
    name: 'Grocery Compact',
    width: 60,
    height: 40,
    fontSize: 16,
    includeBarcode: true,
    includePrice: true,
    includeDescription: false,
    includeMRP: true,
    includeWeight: true,
    includeHSN: false,
    barcodePosition: 'bottom',
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    textColor: '#000000'
  },
  {
    id: 'wholesale-detailed',
    name: 'Wholesale Detailed',
    width: 100,
    height: 70,
    fontSize: 20,
    includeBarcode: true,
    includePrice: true,
    includeDescription: true,
    includeMRP: true,
    includeWeight: true,
    includeHSN: true,
    barcodePosition: 'bottom',
    borderStyle: 'solid',
    borderWidth: 2,
    backgroundColor: '#ffffff',
    textColor: '#000000'
  }
];

export default function PrintLabels() {
  const { toast } = useToast();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('retail-standard');
  const [copies, setCopies] = useState(1);
  const [labelsPerRow, setLabelsPerRow] = useState(2);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // Advanced label options
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeMRP, setIncludeMRP] = useState(true);
  const [includeWeight, setIncludeWeight] = useState(false);
  const [includeHSN, setIncludeHSN] = useState(false);
  const [customText, setCustomText] = useState("");
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(5);

  const [printerSettings, setPrinterSettings] = useState({
    selectedPrinter: 'thermal',
    paperSize: '80x40',
    density: 'medium',
    connectionType: 'usb',
    orientation: 'portrait'
  });

  // Fetch data with proper typing
  const { data: productsData = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const products = productsData as Product[];
  const categories = categoriesData as Category[];

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || 
                           (product.category && product.category.name === selectedCategory);

    const matchesSelection = !showOnlySelected || selectedProducts.includes(product.id);

    return matchesSearch && matchesCategory && matchesSelection;
  });

  // Get current template
  const getCurrentTemplate = (): LabelTemplate => {
    return defaultTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  // Product selection handlers
  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    const visibleProductIds = filteredProducts.map((p: Product) => p.id);
    setSelectedProducts(visibleProductIds);
  };

  const handleDeselectAll = () => {
    setSelectedProducts([]);
  };

  // Generate professional barcode
  const generateBarcode = (text: string, width: number = 100, height: number = 35) => {
    const barcodeData = text.padEnd(12, '0').substring(0, 12);
    const bars = barcodeData.split('').map((digit, index) => {
      const digitValue = parseInt(digit);
      const barWidth = digitValue % 4 + 2;
      const barHeight = height - 18;
      return `<rect x="${index * 10}" y="5" width="${barWidth}" height="${barHeight}" fill="#000"/>`;
    }).join('');

    return `
      <div style="text-align: center; margin: 3px 0;">
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid #ddd;">
          <rect width="${width}" height="${height}" fill="#fff"/>
          ${bars}
          <text x="${width/2}" y="${height - 3}" font-family="monospace" font-size="12" text-anchor="middle" fill="#000" font-weight="bold">${barcodeData}</text>
        </svg>
      </div>
    `;
  };

  // Generate label HTML
  const generateLabelHTML = (product: Product, template: LabelTemplate) => {
    const currentTemplate = {
      ...template,
      includeBarcode,
      includePrice,
      includeDescription,
      includeMRP,
      includeWeight,
      includeHSN
    };

    const {
      width, height, fontSize, borderStyle, borderWidth, backgroundColor, textColor
    } = currentTemplate;

    const borderCSS = borderStyle !== 'none' ? 
      `border: ${borderWidth}px ${borderStyle} #333;` : '';

    const barcodeHTML = currentTemplate.includeBarcode ? 
      generateBarcode(product.barcode || product.sku, Math.min(width * 2.8, 200), 35) : '';

    return `
      <div class="product-label" style="
        width: ${width}mm;
        height: ${height}mm;
        ${borderCSS}
        padding: 4mm;
        margin: 2mm;
        display: inline-block;
        font-family: Arial, sans-serif;
        background: ${backgroundColor};
        color: ${textColor};
        page-break-inside: avoid;
        box-sizing: border-box;
        vertical-align: top;
        position: relative;
        font-size: ${fontSize}px;
        line-height: 1.4;
        overflow: hidden;
      ">
        <div style="font-weight: bold; margin-bottom: 3mm; font-size: ${fontSize + 3}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${product.name}
        </div>

        <div style="font-size: ${fontSize}px; color: #444; margin-bottom: 2mm; font-weight: 600;">
          SKU: ${product.sku}
        </div>

        ${currentTemplate.includeDescription && product.description ? 
          `<div style="font-size: ${fontSize - 2}px; color: #666; margin-bottom: 2mm; overflow: hidden; height: 20px;">
            ${product.description.substring(0, 35)}${product.description.length > 35 ? '...' : ''}
          </div>` : ''
        }

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3mm;">
          ${currentTemplate.includePrice ? 
            `<div style="font-size: ${fontSize + 6}px; font-weight: bold; color: #1e40af;">
              ₹${parseFloat(product.price).toFixed(2)}
            </div>` : ''
          }
          ${currentTemplate.includeMRP && product.mrp && parseFloat(product.mrp) !== parseFloat(product.price) ? 
            `<div style="font-size: ${fontSize + 1}px; color: #666; text-decoration: line-through;">
              MRP: ₹${parseFloat(product.mrp).toFixed(2)}
            </div>` : ''
          }
        </div>

        ${currentTemplate.includeWeight && product.weight ? 
          `<div style="font-size: ${fontSize}px; color: #555; margin-bottom: 2mm; font-weight: 500;">
            Weight: ${product.weight} ${product.weightUnit || 'kg'}
          </div>` : ''
        }

        ${currentTemplate.includeHSN && product.hsnCode ? 
          `<div style="font-size: ${fontSize - 1}px; color: #666; margin-bottom: 2mm;">
            HSN: ${product.hsnCode}
          </div>` : ''
        }

        ${customText ? 
          `<div style="font-size: ${fontSize}px; color: #555; margin-bottom: 2mm; font-weight: 500;">
            ${customText}
          </div>` : ''
        }

        ${currentTemplate.includeBarcode ? 
          `<div style="margin-top: auto; text-align: center;">
            ${barcodeHTML}
          </div>` : ''
        }

        <div style="position: absolute; bottom: 1mm; right: 2mm; font-size: 8px; color: #999;">
          ${new Date().toLocaleDateString('en-IN')}
        </div>
      </div>
    `;
  };

  // Print functionality
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to print labels.",
        variant: "destructive",
      });
      return;
    }
    setIsPrintDialogOpen(true);
  };

  const executePrint = () => {
    const selectedProductsData = products.filter((p: Product) => 
      selectedProducts.includes(p.id)
    );

    const template = getCurrentTemplate();

    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map(() => 
        generateLabelHTML(product, template)
      ).join('');
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Product Labels - ${new Date().toLocaleDateString()}</title>
            <meta charset="UTF-8">
            <style>
              @page { 
                size: ${paperSize} ${orientation};
                margin: ${margin}mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
              }
              .labels-container {
                display: grid;
                grid-template-columns: repeat(${labelsPerRow}, 1fr);
                gap: 2mm;
                width: 100%;
                align-items: start;
              }
              .product-label {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .labels-container {
                  margin: 0;
                  padding: 0;
                }
                .product-label {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="labels-container">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 2000);
                }, 1000);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }

    setIsPrintDialogOpen(false);
    toast({
      title: "Labels sent to printer",
      description: `${selectedProducts.length * copies} labels prepared for printing`,
    });
  };

  // Preview functionality
  const handlePreview = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to preview labels.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewDialogOpen(true);
  };

  // Export functionality
  const exportLabelsData = () => {
    const selectedProductsData = products.filter((p: Product) => 
      selectedProducts.includes(p.id)
    );

    const csvContent = selectedProductsData.map((product: Product) => 
      `"${product.name}","${product.sku}","${product.price}","${product.barcode || ''}"`
    ).join('\n');

    const blob = new Blob([`Name,SKU,Price,Barcode\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labels-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TagIcon className="h-8 w-8 text-blue-600" />
              Print Labels
            </h1>
            <p className="text-muted-foreground mt-1">
              Professional label printing with customizable templates
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={handlePreview}
              disabled={selectedProducts.length === 0}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline"
              onClick={exportLabelsData}
              disabled={selectedProducts.length === 0}
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Labels ({selectedProducts.length})
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package2Icon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-xl font-bold">{filteredProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Selected</p>
                  <p className="text-xl font-bold">{selectedProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <PrinterIcon className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Labels to Print</p>
                  <p className="text-xl font-bold">{selectedProducts.length * copies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="text-sm font-bold">
                    {getCurrentTemplate().name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Label Settings
              </CardTitle>
              <CardDescription>
                Configure your label options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
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

                  {/* Copies */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Copies per Product</Label>
                    <Select value={copies.toString()} onValueChange={(value) => setCopies(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 10, 20, 50].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Layout */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Labels per Row</Label>
                    <Select value={labelsPerRow.toString()} onValueChange={(value) => setLabelsPerRow(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Paper Size</Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="3.15inch">Thermal 3.15"</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  {/* Label Content Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Include in Labels</Label>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-barcode" 
                        checked={includeBarcode}
                        onCheckedChange={(checked) => setIncludeBarcode(checked as boolean)}
                      />
                      <Label htmlFor="include-barcode" className="text-sm">Barcode</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-price" 
                        checked={includePrice}
                        onCheckedChange={(checked) => setIncludePrice(checked as boolean)}
                      />
                      <Label htmlFor="include-price" className="text-sm">Price</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-mrp" 
                        checked={includeMRP}
                        onCheckedChange={(checked) => setIncludeMRP(checked as boolean)}
                      />
                      <Label htmlFor="include-mrp" className="text-sm">MRP</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-weight" 
                        checked={includeWeight}
                        onCheckedChange={(checked) => setIncludeWeight(checked as boolean)}
                      />
                      <Label htmlFor="include-weight" className="text-sm">Weight</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-description" 
                        checked={includeDescription}
                        onCheckedChange={(checked) => setIncludeDescription(checked as boolean)}
                      />
                      <Label htmlFor="include-description" className="text-sm">Description</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-hsn" 
                        checked={includeHSN}
                        onCheckedChange={(checked) => setIncludeHSN(checked as boolean)}
                      />
                      <Label htmlFor="include-hsn" className="text-sm">HSN Code</Label>
                    </div>
                  </div>

                  {/* Custom Text */}
                  <div className="space-y-2">
                    <Label htmlFor="custom-text" className="text-sm font-medium">Custom Text</Label>
                    <Textarea
                      id="custom-text"
                      placeholder="Add custom text to labels..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Products Panel */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2Icon className="h-5 w-5" />
                Product Selection
              </CardTitle>
              <CardDescription>
                Select products to print labels for
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All ({filteredProducts.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-only-selected" 
                      checked={showOnlySelected}
                      onCheckedChange={(checked) => setShowOnlySelected(checked as boolean)}
                    />
                    <Label htmlFor="show-only-selected" className="text-sm">Show only selected</Label>
                  </div>
                </div>
                <Badge variant="secondary">{selectedProducts.length} selected</Badge>
              </div>

              {/* Products Grid/List */}
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredProducts.map((product) => (
                  <Card key={product.id} className={`cursor-pointer transition-all ${
                    selectedProducts.includes(product.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{product.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-lg font-bold text-blue-600">₹{parseFloat(product.price).toFixed(2)}</span>
                            {product.stockQuantity !== undefined && (
                              <Badge variant={product.stockQuantity > 0 ? "secondary" : "destructive"}>
                                Stock: {product.stockQuantity}
                              </Badge>
                            )}
                          </div>
                          {product.barcode && (
                            <p className="text-xs text-muted-foreground mt-1">Barcode: {product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <Package2Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No products found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print Dialog */}
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Print Labels</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Ready to print {selectedProducts.length * copies} labels?</p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Products:</span>
                  <span>{selectedProducts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Copies each:</span>
                  <span>{copies}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total labels:</span>
                  <span>{selectedProducts.length * copies}</span>
                </div>
                <div className="flex justify-between">
                  <span>Template:</span>
                  <span>{getCurrentTemplate().name}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={executePrint} className="bg-blue-600 hover:bg-blue-700">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Label Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-white p-4 border rounded-lg" style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${labelsPerRow}, 1fr)`, 
                gap: '8px',
                maxHeight: '60vh',
                overflowY: 'auto'
              }}>
                {products.filter(p => selectedProducts.includes(p.id)).slice(0, 6).map((product) => (
                  <div 
                    key={product.id} 
                    dangerouslySetInnerHTML={{ 
                      __html: generateLabelHTML(product, getCurrentTemplate()) 
                    }} 
                  />
                ))}
              </div>
              {selectedProducts.length > 6 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 6 labels. {selectedProducts.length - 6} more will be printed.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close Preview
              </Button>
              <Button onClick={() => {
                setIsPreviewDialogOpen(false);
                handlePrint();
              }} className="bg-blue-600 hover:bg-blue-700">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print These Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}