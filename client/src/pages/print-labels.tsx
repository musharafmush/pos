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
  BarChart3Icon,
  QrCodeIcon,
  FilterIcon,
  DownloadIcon,
  RefreshCwIcon,
  CopyIcon,
  ScanIcon,
  GridIcon,
  ListIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  SaveIcon,
  UploadIcon,
  Eye,
  FileTextIcon,
  ImageIcon,
  StarIcon,
  ClockIcon,
  TrendingUpIcon
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
    fontSize: 12,
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
    fontSize: 10,
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
    fontSize: 14,
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

  // Basic state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Label configuration
  const [selectedTemplate, setSelectedTemplate] = useState<string>('retail-standard');
  const [customTemplate, setCustomTemplate] = useState<LabelTemplate | null>(null);
  const [copies, setCopies] = useState(1);
  const [labelsPerRow, setLabelsPerRow] = useState(2);
  const [labelsPerPage, setLabelsPerPage] = useState(10);

  // Advanced options
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeMRP, setIncludeMRP] = useState(true);
  const [includeWeight, setIncludeWeight] = useState(false);
  const [includeHSN, setIncludeHSN] = useState(false);
  const [includeDateCode, setIncludeDateCode] = useState(false);
  const [includeBatch, setIncludeBatch] = useState(false);
  const [includeExpiry, setIncludeExpiry] = useState(false);

  // Custom fields
  const [customText, setCustomText] = useState("");
  const [customLogo, setCustomLogo] = useState("");
  const [watermark, setWatermark] = useState("");

  // Print settings
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(5);
  const [quality, setQuality] = useState("high");

  // Dialog states
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

  // Preview state
  const [previewZoom, setPreviewZoom] = useState(100);

  // Fetch data
  const { data: products = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Filter and sort products
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
    if (customTemplate) return customTemplate;
    return defaultTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  // Handle product selection
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

  // Generate barcode
  const generateBarcode = (text: string, width: number = 100, height: number = 30) => {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <g>
          ${Array.from({ length: 50 }, (_, i) => 
            `<rect x="${i * 2}" y="5" width="1" height="${height - 10}" fill="${i % 2 === 0 ? '#000' : '#fff'}"/>`
          ).join('')}
        </g>
        <text x="${width/2}" y="${height - 2}" font-family="Arial" font-size="8" text-anchor="middle" fill="#000">${text}</text>
      </svg>
    `;
  };

  // Generate QR code
  const generateQRCode = (text: string, size: number = 50) => {
    return `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#fff"/>
        ${Array.from({ length: 10 }, (_, row) =>
          Array.from({ length: 10 }, (_, col) => {
            const shouldFill = (row + col) % 2 === 0;
            return shouldFill ? 
              `<rect x="${col * (size/10)}" y="${row * (size/10)}" width="${size/10}" height="${size/10}" fill="#000"/>` : 
              '';
          }).join('')
        ).join('')}
        <text x="${size/2}" y="${size + 12}" font-family="Arial" font-size="6" text-anchor="middle" fill="#000">${text}</text>
      </svg>
    `;
  };

  // Generate label HTML
  const generateLabelHTML = (product: Product, template: LabelTemplate) => {
    const {
      width, height, fontSize, includeBarcode, includePrice, includeDescription,
      includeMRP, includeWeight, includeHSN, barcodePosition, borderStyle,
      borderWidth, backgroundColor, textColor
    } = template;

    const borderCSS = borderStyle !== 'none' ? 
      `border: ${borderWidth}px ${borderStyle} #333;` : '';

    const barcodeHTML = includeBarcode ? 
      generateBarcode(product.barcode || product.sku, width * 0.8, 20) : '';

    const qrCodeHTML = includeBarcode && barcodePosition === 'left' ? 
      generateQRCode(product.sku, 30) : '';

    return `
      <div class="product-label" style="
        width: ${width}mm;
        height: ${height}mm;
        ${borderCSS}
        padding: 2mm;
        margin: 1mm;
        display: inline-block;
        font-family: Arial, sans-serif;
        background: ${backgroundColor};
        color: ${textColor};
        page-break-inside: avoid;
        box-sizing: border-box;
        vertical-align: top;
        position: relative;
        font-size: ${fontSize}px;
        line-height: 1.2;
      ">
        ${customLogo ? `<img src="${customLogo}" style="width: 20mm; height: auto; margin-bottom: 1mm;" />` : ''}

        <div style="font-weight: bold; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis;">
          ${product.name}
        </div>

        <div style="font-size: ${fontSize * 0.8}px; color: #666; margin-bottom: 1mm;">
          SKU: ${product.sku}
        </div>

        ${includeDescription && product.description ? 
          `<div style="font-size: ${fontSize * 0.7}px; color: #888; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis;">
            ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}
          </div>` : ''
        }

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1mm;">
          ${includePrice ? 
            `<div style="font-size: ${fontSize * 1.1}px; font-weight: bold; color: #2563eb;">
              ₹${Number(product.price).toFixed(2)}
            </div>` : ''
          }
          ${includeMRP && product.mrp && product.mrp !== product.price ? 
            `<div style="font-size: ${fontSize * 0.8}px; color: #666; text-decoration: line-through;">
              MRP: ₹${Number(product.mrp).toFixed(2)}
            </div>` : ''
          }
        </div>

        ${includeWeight && product.weight ? 
          `<div style="font-size: ${fontSize * 0.8}px; color: #666; margin-bottom: 1mm;">
            Weight: ${product.weight} ${product.weightUnit || 'kg'}
          </div>` : ''
        }

        ${includeHSN && product.hsnCode ? 
          `<div style="font-size: ${fontSize * 0.7}px; color: #666; margin-bottom: 1mm;">
            HSN: ${product.hsnCode}
          </div>` : ''
        }

        ${includeDateCode ? 
          `<div style="font-size: ${fontSize * 0.7}px; color: #666; margin-bottom: 1mm;">
            Date: ${new Date().toLocaleDateString('en-IN')}
          </div>` : ''
        }

        ${customText ? 
          `<div style="font-size: ${fontSize * 0.8}px; color: #666; margin-bottom: 1mm;">
            ${customText}
          </div>` : ''
        }

        ${barcodePosition === 'bottom' && barcodeHTML ? 
          `<div style="text-align: center; margin-top: auto;">
            ${barcodeHTML}
          </div>` : ''
        }

        ${barcodePosition === 'left' && qrCodeHTML ? 
          `<div style="position: absolute; top: 2mm; right: 2mm;">
            ${qrCodeHTML}
          </div>` : ''
        }

        ${watermark ? 
          `<div style="position: absolute; bottom: 1mm; right: 1mm; font-size: 6px; color: #ccc; transform: rotate(-45deg);">
            ${watermark}
          </div>` : ''
        }
      </div>
    `;
  };

  // Handle print
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
              }
              .product-label {
                break-inside: avoid;
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
                  }, 1000);
                }, 500);
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

  // Handle preview
  const handlePreview = () => {
    setIsPreviewDialogOpen(true);
  };

  // Save template
  const saveTemplate = () => {
    const template: LabelTemplate = {
      id: `custom-${Date.now()}`,
      name: `Custom Template ${Date.now()}`,
      width: 80,
      height: 50,
      fontSize: 12,
      includeBarcode,
      includePrice,
      includeDescription,
      includeMRP,
      includeWeight,
      includeHSN,
      barcodePosition: 'bottom',
      borderStyle: 'solid',
      borderWidth: 1,
      backgroundColor: '#ffffff',
      textColor: '#000000'
    };

    setCustomTemplate(template);
    toast({
      title: "Template saved",
      description: "Your custom template has been saved.",
    });
  };

  // Export labels data
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TagIcon className="h-8 w-8 text-blue-600" />
              Professional Label Printing
            </h1>
            <p className="text-muted-foreground mt-1">
              Advanced label printing with customizable templates and professional features
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(true)}
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Templates
            </Button>
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
                  <p className="text-xl font-bold text-sm">
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
                Label Configuration
              </CardTitle>
              <CardDescription>
                Customize your label settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
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
                        {customTemplate && (
                          <SelectItem value="custom">Custom Template</SelectItem>
                        )}
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
                        {[1, 2, 3, 4, 5, 10, 20, 50, 100].map(num => (
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

                  {/* Basic Elements */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Include Elements</h4>

                    {[
                      { key: 'barcode', label: 'Barcode/QR', state: includeBarcode, setState: setIncludeBarcode, icon: QrCodeIcon },
                      { key: 'price', label: 'Price', state: includePrice, setState: setIncludePrice, icon: BarChart3Icon },
                      { key: 'description', label: 'Description', state: includeDescription, setState: setIncludeDescription, icon: FileTextIcon },
                      { key: 'mrp', label: 'MRP', state: includeMRP, setState: setIncludeMRP, icon: TrendingUpIcon },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Switch
                            id={item.key}
                            checked={item.state}
                            onCheckedChange={item.setState}
                          />
                          <Label htmlFor={item.key} className="text-sm flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {item.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Advanced Elements</h4>

                    {[
                      { key: 'weight', label: 'Weight/Unit', state: includeWeight, setState: setIncludeWeight },
                      { key: 'hsn', label: 'HSN Code', state: includeHSN, setState: setIncludeHSN },
                      { key: 'date', label: 'Date Code', state: includeDateCode, setState: setIncludeDateCode },
                      { key: 'batch', label: 'Batch Number', state: includeBatch, setState: setIncludeBatch },
                      { key: 'expiry', label: 'Expiry Date', state: includeExpiry, setState: setIncludeExpiry },
                    ].map(item => (
                      <div key={item.key} className="flex items-center space-x-2">
                        <Switch
                          id={item.key}
                          checked={item.state}
                          onCheckedChange={item.setState}
                        />
                        <Label htmlFor={item.key} className="text-sm">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Custom Text */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Custom Text</Label>
                    <Textarea
                      placeholder="Add custom text to labels..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Watermark */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Watermark</Label>
                    <Input
                      placeholder="Watermark text..."
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="design" className="space-y-4">
                  {/* Paper Settings */}
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
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Orientation</Label>
                    <Select value={orientation} onValueChange={setOrientation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Page Margin (mm)</Label>
                    <Input
                      type="number"
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      min="0"
                      max="50"
                    />
                  </div>

                  {/* Quality */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Print Quality</Label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High Quality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button onClick={saveTemplate} className="w-full" variant="outline">
                      <SaveIcon className="h-4 w-4 mr-2" />
                      Save as Template
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Products Panel */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package2Icon className="h-5 w-5" />
                    Product Selection
                  </CardTitle>
                  <CardDescription>
                    Choose products for label printing
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-selected"
                    checked={showOnlySelected}
                    onCheckedChange={setShowOnlySelected}
                  />
                  <Label htmlFor="show-selected" className="text-sm whitespace-nowrap">
                    Show Selected Only
                  </Label>
                </div>
              </div>

              {/* Selected Products Summary */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedProducts.length} products selected
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {selectedProducts.length * copies} labels to print
                  </Badge>
                  {selectedTemplate && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {getCurrentTemplate().name} template
                    </Badge>
                  )}
                </div>
              )}

              {/* Products Grid/List */}
              {isLoadingProducts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                    : "space-y-2"
                }>
                  {filteredProducts.map((product: Product) => {
                    const isSelected = selectedProducts.includes(product.id);

                    if (viewMode === 'list') {
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleProductSelect(product.id, !isSelected)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {product.sku} • ₹{Number(product.price).toFixed(2)}
                              {product.stockQuantity !== undefined && (
                                <span className="ml-2">Stock: {product.stockQuantity}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Card
                        key={product.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleProductSelect(product.id, !isSelected)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => {}}
                                />
                                <h3 className="font-medium text-sm line-clamp-2">
                                  {product.name}
                                </h3>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>SKU: {product.sku}</p>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-blue-600">
                                    ₹{Number(product.price).toFixed(2)}
                                  </span>
                                  {product.stockQuantity !== undefined && (
                                    <Badge variant={product.stockQuantity > 10 ? "secondary" : "destructive"}>
                                      Stock: {product.stockQuantity}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {product.category && (
                                <Badge variant="outline" className="mt-2">
                                  {product.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {!isLoadingProducts && filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package2Icon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print Dialog */}
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PrinterIcon className="h-5 w-5" />
                Print Labels Configuration
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Products Selected</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {selectedProducts.length} products
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Labels</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {selectedProducts.length * copies} labels
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {getCurrentTemplate().name}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {paperSize} ({orientation})
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Label Elements</Label>
                <div className="flex flex-wrap gap-2">
                  {includeBarcode && <Badge>Barcode</Badge>}
                  {includePrice && <Badge>Price</Badge>}
                  {includeDescription && <Badge>Description</Badge>}
                  {includeMRP && <Badge>MRP</Badge>}
                  {includeWeight && <Badge>Weight</Badge>}
                  {includeHSN && <Badge>HSN Code</Badge>}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={executePrint} className="bg-blue-600 hover:bg-blue-700">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Label Preview
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                  >
                    <ZoomOutIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{previewZoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                  >
                    <ZoomInIcon className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewZoom(100)}
                >
                  <RotateCcwIcon className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              <div 
                className="border rounded-lg p-4 bg-white overflow-auto"
                style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top left' }}
              >
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${labelsPerRow}, 1fr)` }}>
                  {products
                    .filter((p: Product) => selectedProducts.includes(p.id))
                    .slice(0, 6)
                    .map((product: Product) => (
                      <div 
                        key={product.id}
                        dangerouslySetInnerHTML={{ 
                          __html: generateLabelHTML(product, getCurrentTemplate()) 
                        }}
                      />
                    ))}
                </div>

                {selectedProducts.length > 6 && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    ... and {selectedProducts.length - 6} more products
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsPreviewDialogOpen(false);
                handlePrint();
              }}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print These Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Label Templates
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultTemplates.map(template => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{template.name}</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{template.width}mm × {template.height}mm</p>
                      <div className="flex flex-wrap gap-1">
                        {template.includeBarcode && <Badge variant="outline" className="text-xs">Barcode</Badge>}
                        {template.includePrice && <Badge variant="outline" className="text-xs">Price</Badge>}
                        {template.includeMRP && <Badge variant="outline" className="text-xs">MRP</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setIsTemplateDialogOpen(false)}>
                Apply Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}