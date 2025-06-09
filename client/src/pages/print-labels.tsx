
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PrinterIcon, TagIcon, SearchIcon, SettingsIcon, PackageIcon } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  description?: string;
  category?: string | { id: number; name: string; description?: string; createdAt?: string };
}

export default function PrintLabels() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [labelSize, setLabelSize] = useState("standard");
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [isManualLabelDialogOpen, setIsManualLabelDialogOpen] = useState(false);
  const [labelsPerRow, setLabelsPerRow] = useState("2");
  const [labelsPerColumn, setLabelsPerColumn] = useState("5");
  const [isCustomLabelDialogOpen, setIsCustomLabelDialogOpen] = useState(false);
  
  // Custom label configuration state
  const [sheetWidth, setSheetWidth] = useState("160");
  const [sheetHeight, setSheetHeight] = useState("50");
  const [labelWidth, setLabelWidth] = useState("80");
  const [labelHeight, setLabelHeight] = useState("50");
  const [totalRows, setTotalRows] = useState("1");
  const [totalCols, setTotalCols] = useState("2");
  const [barcodeWidth, setBarcodeWidth] = useState("50");
  const [barcodeHeight, setBarcodeHeight] = useState("30");
  const [fontSize, setFontSize] = useState("11pt");

  // Load saved custom configuration on mount
  React.useEffect(() => {
    const savedConfig = localStorage.getItem('customLabelConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setSheetWidth(config.sheetWidth || "160");
        setSheetHeight(config.sheetHeight || "50");
        setLabelWidth(config.labelWidth || "80");
        setLabelHeight(config.labelHeight || "50");
        setTotalRows(config.totalRows || "1");
        setTotalCols(config.totalCols || "2");
        setBarcodeWidth(config.barcodeWidth || "50");
        setBarcodeHeight(config.barcodeHeight || "30");
        setFontSize(config.fontSize || "11pt");
      } catch (error) {
        console.error('Failed to load saved label configuration:', error);
      }
    }
  }, []);

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
    // For demo purposes, using a simple pattern
    // In production, you'd use a proper barcode library
    const barcodePattern = sku.padEnd(12, '0').substring(0, 12);
    return barcodePattern;
  };

  // Handle print
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to print labels",
        variant: "destructive",
      });
      return;
    }
    setIsPrintDialogOpen(true);
  };

  // Execute print
  const executePrint = () => {
    const selectedProductsData = products.filter((p: Product) => 
      selectedProducts.includes(p.id)
    );

    if (selectedProductsData.length === 0) {
      toast({
        title: "No products found",
        description: "Selected products could not be found",
        variant: "destructive",
      });
      return;
    }

    // Use custom dimensions if configured, otherwise use preset sizes
    const useCustomConfig = sheetWidth && sheetHeight && labelWidth && labelHeight;
    const finalLabelWidth = useCustomConfig ? `${labelWidth}mm` : (labelSize === 'small' ? '40mm' : labelSize === 'large' ? '60mm' : '50mm');
    const finalLabelHeight = useCustomConfig ? `${labelHeight}mm` : (labelSize === 'small' ? '25mm' : labelSize === 'large' ? '35mm' : '30mm');
    const finalFontSize = fontSize.replace('pt', 'px');
    const finalBarcodeWidth = useCustomConfig ? `${barcodeWidth}px` : '60px';
    const finalBarcodeHeight = useCustomConfig ? `${barcodeHeight}px` : '20px';
    
    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map((_, index) => `
        <div class="product-label" style="
          width: ${finalLabelWidth};
          height: ${finalLabelHeight};
          border: 1px solid #333;
          padding: 2mm;
          margin: 0;
          display: inline-block;
          font-family: Arial, sans-serif;
          background: white;
          page-break-inside: avoid;
          box-sizing: border-box;
          vertical-align: top;
          border-radius: 0;
        ">
          <div style="font-weight: bold; font-size: ${finalFontSize}; margin-bottom: 1mm; line-height: 1.2; color: #000;">
            ${(product.name || 'Unnamed Product').length > 25 ? (product.name || 'Unnamed Product').substring(0, 25) + '...' : (product.name || 'Unnamed Product')}
          </div>
          <div style="font-size: ${parseInt(finalFontSize) - 2}px; color: #666; margin-bottom: 1mm;">
            SKU: ${product.sku || 'N/A'}
          </div>
          ${includeDescription && product.description ? 
            `<div style="font-size: ${parseInt(finalFontSize) - 3}px; color: #888; margin-bottom: 1mm; line-height: 1.1;">
              ${product.description.substring(0, 30)}...
            </div>` : ''
          }
          ${includePrice ? 
            `<div style="font-size: ${parseInt(finalFontSize) + 1}px; font-weight: bold; color: #2563eb; margin-bottom: 1mm;">
              ₹${Number(product.price || 0).toFixed(2)}
            </div>` : ''
          }
          ${includeBarcode ? 
            `<div style="text-align: center; margin-top: 1mm;">
              <div style="
                font-family: 'Courier New', monospace; 
                font-size: ${parseInt(finalFontSize) - 4}px; 
                letter-spacing: 0.5px; 
                border: 0.5px solid #ccc; 
                padding: 0.5mm; 
                background: #f9f9f9;
                width: ${finalBarcodeWidth};
                height: ${finalBarcodeHeight};
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                color: #000;
              ">
                ${generateBarcode(product.sku || '')}
              </div>
            </div>` : ''
          }
        </div>
      `).join('');
    }).join('');

    // Create a temporary div to validate content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = printContent;
    
    console.log('Products to print:', selectedProductsData);
    console.log('Generated print content length:', printContent.length);

    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const pageWidth = useCustomConfig ? `${sheetWidth}mm` : 'A4';
      const pageHeight = useCustomConfig ? `${sheetHeight}mm` : 'auto';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Product Labels - ${new Date().toLocaleDateString()}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                line-height: 1;
                background: white;
                color: #000;
                ${useCustomConfig ? `width: ${sheetWidth}mm; height: ${sheetHeight}mm;` : ''}
              }
              .product-label {
                background: white !important;
                break-inside: avoid;
                page-break-inside: avoid;
                border-radius: 0;
                color: #000;
                margin: 0 !important;
                padding: 2mm;
              }
              .labels-container {
                margin: 0;
                padding: 0;
                ${useCustomConfig ? 
                  `display: grid;
                   grid-template-columns: repeat(${totalCols}, 1fr);
                   grid-template-rows: repeat(${totalRows}, 1fr);
                   gap: 0;
                   width: ${sheetWidth}mm; 
                   height: ${sheetHeight}mm;` : 
                  'display: flex; flex-wrap: wrap; align-content: flex-start; gap: 0;'
                }
              }
              @media print {
                * { margin: 0 !important; padding: 0 !important; }
                body { 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  font-size: 12px;
                  background: white;
                  color: #000;
                }
                .product-label { 
                  margin: 0 !important; 
                  padding: 2mm !important;
                  break-inside: avoid;
                  page-break-inside: avoid;
                  background: white !important;
                  color: #000 !important;
                }
                .labels-container {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                @page { 
                  margin: 0; 
                  size: ${useCustomConfig ? `${sheetWidth}mm ${sheetHeight}mm` : 'A4'};
                  background: white;
                }
              }
              @media screen {
                body {
                  background: #f0f0f0;
                  padding: 5px;
                }
                .labels-container {
                  background: white;
                  padding: 2px;
                  border: 1px solid #ccc;
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
                // Auto-print after a short delay to ensure content is loaded
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Focus the print window
      printWindow.focus();
    } else {
      toast({
        title: "Print window blocked",
        description: "Please allow popups for this site to print labels",
        variant: "destructive",
      });
    }

    setIsPrintDialogOpen(false);
    toast({
      title: "Labels sent to printer",
      description: `${selectedProducts.length * copies} labels prepared for printing`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TagIcon className="h-8 w-8 text-blue-600" />
              Print Labels & Barcodes
            </h1>
            <p className="text-muted-foreground">
              Generate and print professional product labels with barcodes
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsCustomLabelDialogOpen(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Custom Labels
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
              {/* Label Size */}
              <div className="space-y-2">
                <Label htmlFor="label-size" className="text-sm font-medium">Label Size</Label>
                <Select value={labelSize} onValueChange={setLabelSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (2" x 1.2")</SelectItem>
                    <SelectItem value="standard">Standard (2.5" x 1.5")</SelectItem>
                    <SelectItem value="large">Large (3" x 1.8")</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Copies */}
              <div className="space-y-2">
                <Label htmlFor="copies" className="text-sm font-medium">Copies per Product</Label>
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

              <Separator />

              {/* Label Content Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Include on Label</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-barcode"
                    checked={includeBarcode}
                    onCheckedChange={setIncludeBarcode}
                  />
                  <Label htmlFor="include-barcode" className="text-sm">
                    Barcode
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-price"
                    checked={includePrice}
                    onCheckedChange={setIncludePrice}
                  />
                  <Label htmlFor="include-price" className="text-sm">
                    Price
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-description"
                    checked={includeDescription}
                    onCheckedChange={setIncludeDescription}
                  />
                  <Label htmlFor="include-description" className="text-sm">
                    Description
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Selection */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Select Products
              </CardTitle>
              <CardDescription>
                Choose products to print labels for
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="select-all"
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredProducts.length} products)
                </Label>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingProducts ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => 
                                handleProductSelect(product.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.sku}</Badge>
                          </TableCell>
                          <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                          <TableCell>{typeof product.category === 'object' ? product.category?.name || 'Uncategorized' : product.category || 'Uncategorized'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Confirmation Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PrinterIcon className="h-5 w-5 text-blue-600" />
              Confirm Print Job
            </DialogTitle>
            <DialogDescription>
              Review your print settings before printing
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Products Selected</label>
                <p className="text-lg font-bold">{selectedProducts.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Labels</label>
                <p className="text-lg font-bold">{selectedProducts.length * copies}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Label Size</label>
                <p className="text-sm capitalize">{labelSize}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Copies Each</label>
                <p className="text-sm">{copies}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Include:</label>
              <div className="flex gap-2 flex-wrap">
                {includeBarcode && <Badge variant="secondary">Barcode</Badge>}
                {includePrice && <Badge variant="secondary">Price</Badge>}
                {includeDescription && <Badge variant="secondary">Description</Badge>}
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

      {/* Custom Label Configuration Dialog */}
      <Dialog open={isCustomLabelDialogOpen} onOpenChange={setIsCustomLabelDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-blue-600" />
              Custom Label Configuration
            </DialogTitle>
            <DialogDescription>
              Configure custom label dimensions and layout
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Sheet Dimensions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sheet Width</Label>
                <div className="relative">
                  <Input
                    value={sheetWidth}
                    onChange={(e) => setSheetWidth(e.target.value)}
                    placeholder="160"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    in MM
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sheet Height</Label>
                <div className="relative">
                  <Input
                    value={sheetHeight}
                    onChange={(e) => setSheetHeight(e.target.value)}
                    placeholder="50"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    in MM
                  </span>
                </div>
              </div>
            </div>

            {/* Label Dimensions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Label Width</Label>
                <div className="relative">
                  <Input
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(e.target.value)}
                    placeholder="80"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    in MM
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Label Height</Label>
                <div className="relative">
                  <Input
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(e.target.value)}
                    placeholder="50"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    in MM
                  </span>
                </div>
              </div>
            </div>

            {/* Layout Configuration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Rows</Label>
                <Select value={totalRows} onValueChange={setTotalRows}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Cols</Label>
                <Select value={totalCols} onValueChange={setTotalCols}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barcode Configuration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">BarCode Width</Label>
                <Input
                  value={barcodeWidth}
                  onChange={(e) => setBarcodeWidth(e.target.value)}
                  placeholder="50"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">BarCode Height</Label>
                <Input
                  value={barcodeHeight}
                  onChange={(e) => setBarcodeHeight(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Size</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8pt">8pt</SelectItem>
                  <SelectItem value="9pt">9pt</SelectItem>
                  <SelectItem value="10pt">10pt</SelectItem>
                  <SelectItem value="11pt">11pt</SelectItem>
                  <SelectItem value="12pt">12pt</SelectItem>
                  <SelectItem value="14pt">14pt</SelectItem>
                  <SelectItem value="16pt">16pt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Preview</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">
                  Sheet: {sheetWidth}mm × {sheetHeight}mm | 
                  Label: {labelWidth}mm × {labelHeight}mm | 
                  Grid: {totalRows} × {totalCols}
                </div>
                <div 
                  className="border border-dashed border-gray-300 bg-white dark:bg-gray-900 relative"
                  style={{
                    width: `${Math.min(Number(sheetWidth) / 2, 200)}px`,
                    height: `${Math.min(Number(sheetHeight) / 2, 100)}px`,
                  }}
                >
                  {Array.from({ length: Number(totalRows) * Number(totalCols) }).map((_, index) => {
                    const row = Math.floor(index / Number(totalCols));
                    const col = index % Number(totalCols);
                    return (
                      <div
                        key={index}
                        className="absolute border border-blue-300 bg-blue-50"
                        style={{
                          left: `${(col * Number(labelWidth)) / 2}px`,
                          top: `${(row * Number(labelHeight)) / 2}px`,
                          width: `${Math.min(Number(labelWidth) / 2, 80)}px`,
                          height: `${Math.min(Number(labelHeight) / 2, 40)}px`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Save custom configuration to localStorage
                const customConfig = {
                  sheetWidth,
                  sheetHeight,
                  labelWidth,
                  labelHeight,
                  totalRows,
                  totalCols,
                  barcodeWidth,
                  barcodeHeight,
                  fontSize
                };
                localStorage.setItem('customLabelConfig', JSON.stringify(customConfig));
                
                setIsCustomLabelDialogOpen(false);
                toast({
                  title: "Custom configuration saved",
                  description: "Your custom label settings have been applied and saved",
                });
              }} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply & Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Label Creation Dialog */}
      <Dialog open={isManualLabelDialogOpen} onOpenChange={setIsManualLabelDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-blue-600" />
              Manual Label Creation
            </DialogTitle>
            <DialogDescription>
              Create custom labels with manual input
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Labels Per Row</Label>
                <Select value={labelsPerRow} onValueChange={setLabelsPerRow}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 label per row</SelectItem>
                    <SelectItem value="2">2 labels per row</SelectItem>
                    <SelectItem value="3">3 labels per row</SelectItem>
                    <SelectItem value="4">4 labels per row</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rows Per Page</Label>
                <Select value={labelsPerColumn} onValueChange={setLabelsPerColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 rows per page</SelectItem>
                    <SelectItem value="5">5 rows per page</SelectItem>
                    <SelectItem value="10">10 rows per page</SelectItem>
                    <SelectItem value="15">15 rows per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsManualLabelDialogOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              Create Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
