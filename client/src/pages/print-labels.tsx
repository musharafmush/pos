import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PrinterIcon, 
  SearchIcon, 
  TagIcon,
  QrCodeIcon,
  DownloadIcon,
  SettingsIcon,
  CheckIcon,
  Package2Icon,
  BarChart3Icon,
  Eye,
  SaveIcon
} from "lucide-react";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  borderStyle: 'solid' | 'dashed' | 'none';
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("retail-standard");
  const [customTemplate, setCustomTemplate] = useState<LabelTemplate | null>(null);
  const [copies, setCopies] = useState(1);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Template settings
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeMRP, setIncludeMRP] = useState(true);
  const [includeWeight, setIncludeWeight] = useState(false);
  const [includeHSN, setIncludeHSN] = useState(false);

  // Print settings
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(10);
  const [labelsPerRow, setLabelsPerRow] = useState(3);
  const [watermark, setWatermark] = useState("");

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p: Product) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Generate barcode (simple implementation)
  const generateBarcode = (sku: string) => {
    const barcodePattern = sku.padEnd(12, '0').substring(0, 12);
    return barcodePattern;
  };

  // Generate QR Code placeholder
  const generateQRCode = (data: string) => {
    return `QR:${data}`;
  };

  // Generate label HTML
  const generateLabelHTML = (product: Product, template: LabelTemplate) => {
    const { 
      width, height, fontSize, includeBarcode, includePrice, 
      includeDescription, includeMRP, includeWeight, includeHSN,
      barcodePosition, borderStyle, borderWidth, backgroundColor, textColor 
    } = template;

    const barcodeHTML = includeBarcode ? 
      `<div style="font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 1px; border: 1px solid #ccc; padding: 2px; background: #f9f9f9; text-align: center;">
        ${generateBarcode(product.sku)}
      </div>` : '';

    const qrCodeHTML = includeBarcode && barcodePosition === 'left' ?
      `<div style="width: 20px; height: 20px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 6px;">
        QR
      </div>` : '';

    return `
      <div class="product-label" style="
        width: ${width}mm;
        height: ${height}mm;
        border: ${borderWidth}px ${borderStyle} #333;
        padding: 2mm;
        margin: 1mm;
        background: ${backgroundColor};
        color: ${textColor};
        font-family: Arial, sans-serif;
        font-size: ${fontSize}px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        box-sizing: border-box;
        page-break-inside: avoid;
      ">
        ${barcodePosition === 'top' && barcodeHTML ? 
          `<div style="text-align: center; margin-bottom: 2mm;">
            ${barcodeHTML}
          </div>` : ''
        }

        <div style="flex-grow: 1;">
          <div style="font-weight: bold; font-size: ${fontSize + 2}px; line-height: 1.2; margin-bottom: 1mm;">
            ${product.name}
          </div>

          <div style="font-size: ${fontSize - 2}px; color: #666; margin-bottom: 1mm;">
            SKU: ${product.sku}
          </div>

          ${includeDescription && product.description ? 
            `<div style="font-size: ${fontSize - 3}px; color: #888; margin-bottom: 1mm; line-height: 1.1;">
              ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}
            </div>` : ''
          }

          ${includePrice ? 
            `<div style="font-size: ${fontSize + 3}px; font-weight: bold; color: #2563eb; margin-bottom: 1mm;">
              ₹${Number(product.price).toFixed(2)}
            </div>` : ''
          }

          ${includeMRP && product.mrp ? 
            `<div style="font-size: ${fontSize - 1}px; color: #666;">
              MRP: ₹${Number(product.mrp).toFixed(2)}
            </div>` : ''
          }

          ${includeWeight && product.weight ? 
            `<div style="font-size: ${fontSize - 1}px; color: #666;">
              Weight: ${product.weight}
            </div>` : ''
          }

          ${includeHSN && product.hsnCode ? 
            `<div style="font-size: ${fontSize - 2}px; color: #888;">
              HSN: ${product.hsnCode}
            </div>` : ''
          }
        </div>

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
                  }, 100);
                }, 500);
              }
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
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={handlePreview}
              disabled={selectedProducts.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline"
              onClick={exportLabelsData}
              disabled={selectedProducts.length === 0}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export CSV
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Label Settings
              </CardTitle>
              <CardDescription>
                Customize your label appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template-select" className="text-sm font-medium">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                    {customTemplate && (
                      <SelectItem value={customTemplate.id}>
                        {customTemplate.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Include Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Include on Label</h4>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-barcode"
                    checked={includeBarcode}
                    onCheckedChange={setIncludeBarcode}
                  />
                  <Label htmlFor="include-barcode" className="text-sm">Barcode</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-price"
                    checked={includePrice}
                    onCheckedChange={setIncludePrice}
                  />
                  <Label htmlFor="include-price" className="text-sm">Price</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-description"
                    checked={includeDescription}
                    onCheckedChange={setIncludeDescription}
                  />
                  <Label htmlFor="include-description" className="text-sm">Description</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-mrp"
                    checked={includeMRP}
                    onCheckedChange={setIncludeMRP}
                  />
                  <Label htmlFor="include-mrp" className="text-sm">MRP</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-weight"
                    checked={includeWeight}
                    onCheckedChange={setIncludeWeight}
                  />
                  <Label htmlFor="include-weight" className="text-sm">Weight</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-hsn"
                    checked={includeHSN}
                    onCheckedChange={setIncludeHSN}
                  />
                  <Label htmlFor="include-hsn" className="text-sm">HSN Code</Label>
                </div>
              </div>

              {/* Copies */}
              <div className="space-y-2">
                <Label htmlFor="copies" className="text-sm font-medium">Copies per Product</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="10"
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>

              {/* Save Template */}
              <Button 
                variant="outline" 
                onClick={saveTemplate}
                className="w-full"
              >
                <SaveIcon className="h-4 w-4 mr-2" />
                Save as Template
              </Button>

              {/* Preview */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Label Preview</h4>
                <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg text-center h-32">
                  <div className="text-xs font-semibold">Sample Product</div>
                  <div className="text-xs text-gray-500">SKU: SP001</div>
                  {includePrice && <div className="text-sm font-bold text-blue-600">₹99.99</div>}
                  {includeMRP && <div className="text-xs text-gray-500">MRP: ₹120.00</div>}
                  {includeBarcode && (
                    <div className="text-xs font-mono mt-1 bg-gray-100 px-1 rounded">
                      ||||||||||||
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package2Icon className="h-5 w-5" />
                    Select Products
                  </CardTitle>
                  <CardDescription>
                    Choose products to print labels for
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Barcode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingProducts ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Package2Icon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No products found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.description?.substring(0, 40)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>
                            {categories.find((cat: any) => cat.id === product.categoryId)?.name || 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold">₹{Number(product.price).toFixed(2)}</TableCell>
                          <TableCell>{product.stockQuantity}</TableCell>
                          <TableCell>
                            <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {generateBarcode(product.sku)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
                  <Label>Paper Size</Label>
                  <Select value={paperSize} onValueChange={setPaperSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Labels per Row</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={labelsPerRow}
                    onChange={(e) => setLabelsPerRow(parseInt(e.target.value) || 3)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Margin (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value) || 10)}
                  />
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
              <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto border p-4 rounded">
                {products
                  .filter((p: Product) => selectedProducts.includes(p.id))
                  .slice(0, 6)
                  .map((product: Product) => (
                    <div key={product.id} dangerouslySetInnerHTML={{
                      __html: generateLabelHTML(product, getCurrentTemplate())
                    }} />
                  ))}
              </div>
              {selectedProducts.length > 6 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {selectedProducts.length - 6} more products
                </p>
              )}
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
      </div>
    </DashboardLayout>
  );
}