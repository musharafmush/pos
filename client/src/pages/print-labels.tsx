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
  Plus
} from "lucide-react";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function PrintLabels() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [labelSize, setLabelSize] = useState("standard");
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeMrp, setIncludeMrp] = useState(false);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeExpiryDate, setIncludeExpiryDate] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isManualLabelDialogOpen, setIsManualLabelDialogOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [customLabelSize, setCustomLabelSize] = useState({ width: "250", height: "150" });

  // Manual label creation state
  const [manualLabel, setManualLabel] = useState({
    productName: "",
    sku: "",
    price: "",
    mrp: "",
    expiryDate: "",
    description: "",
    barcode: ""
  });

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

  // Create manual label
  const createManualLabel = () => {
    setIsManualLabelDialogOpen(true);
  };

  // Execute manual label print
  const executeManualPrint = () => {
    if (!manualLabel.productName) {
      toast({
        title: "Product name required",
        description: "Please enter a product name for the label",
        variant: "destructive",
      });
      return;
    }

    const manualLabelContent = Array(copies).fill(null).map((_, index) => `
      <div class="label ${labelSize}" style="
        border: 2px solid #333;
        padding: 12px;
        margin: 8px;
        width: ${
          labelSize === 'mini' ? '150px' :
          labelSize === 'small' ? '200px' :
          labelSize === 'medium' ? '280px' :
          labelSize === 'large' ? '300px' :
          labelSize === 'xlarge' ? '350px' :
          labelSize === 'custom' ? `${customLabelSize.width}px` :
          '250px'
        };
        height: ${
          labelSize === 'mini' ? '100px' :
          labelSize === 'small' ? '120px' :
          labelSize === 'medium' ? '160px' :
          labelSize === 'large' ? '180px' :
          labelSize === 'xlarge' ? '200px' :
          labelSize === 'custom' ? `${customLabelSize.height}px` :
          '150px'
        };
        display: inline-block;
        font-family: Arial, sans-serif;
        background: white;
        page-break-inside: avoid;
      ">
        <div style="font-weight: bold; 
        font-size: ${
          labelSize === 'mini' ? '12px' :
          labelSize === 'small' ? '14px' :
          labelSize === 'medium' ? '18px' :
          labelSize === 'large' ? '20px' :
          labelSize === 'xlarge' ? '22px' :
          labelSize === '40mm' ? '12px' :
          labelSize === 'custom' ? `${Math.max(12, Math.min(24, parseInt(customLabelSize.width) / 15))}px` :
          '16px'
        }; margin-bottom: 8px;">
          ${manualLabel.productName}
        </div>
        ${manualLabel.sku ? 
          `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            SKU: ${manualLabel.sku}
          </div>` : ''
        }
        ${includeDescription && manualLabel.description ? 
          `<div style="font-size: 10px; color: #888; margin-bottom: 4px;">
            ${manualLabel.description.substring(0, 50)}...
          </div>` : ''
        }
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          ${includePrice && manualLabel.price ? 
            `<div style="
            font-size: ${
          labelSize === 'mini' ? '12px' :
          labelSize === 'small' ? '14px' :
          labelSize === 'medium' ? '18px' :
          labelSize === 'large' ? '20px' :
          labelSize === 'xlarge' ? '22px' :
          labelSize === '40mm' ? '12px' :
          labelSize === 'custom' ? `${Math.max(12, Math.min(24, parseInt(customLabelSize.width) / 15))}px` :
          '16px'
        }; font-weight: bold; color: #2563eb;">
              Price: ₹${Number(manualLabel.price).toFixed(2)}
            </div>` : ''
          }
          ${includeMrp && manualLabel.mrp ? 
            `<div style="font-size: 12px; color: #666;">
              MRP: ₹${Number(manualLabel.mrp).toFixed(2)}
            </div>` : ''
          }
        </div>
        ${includeExpiryDate && manualLabel.expiryDate ? 
          `<div style="font-size: 10px; color: #d97706; margin-bottom: 4px;">
            Exp: ${manualLabel.expiryDate}
          </div>` : ''
        }
        ${includeBarcode && manualLabel.barcode ? 
          `<div style="text-align: center; margin-top: 8px;">
            <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px; border: 1px solid #ccc; padding: 4px; background: #f9f9f9;">
              ${manualLabel.barcode}
            </div>
          </div>` : ''
        }
      </div>
    `).join('');

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Manual Label</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                .label { margin: 4px !important; }
              }
            </style>
          </head>
          <body>
            ${manualLabelContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    setIsManualLabelDialogOpen(false);
    toast({
      title: "Manual label sent to printer",
      description: `${copies} label(s) prepared for printing`,
    });
  };

  // Execute print
  const executePrint = () => {
    const selectedProductsData = products.filter((p: Product) => 
      selectedProducts.includes(p.id)
    );

    // Create print content
    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map((_, index) => `
        <div class="label ${labelSize}" style="
          border: 2px solid #333;
          padding: 12px;
          margin: 8px;
          width: ${
            labelSize === 'mini' ? '150px' :
            labelSize === 'small' ? '200px' :
            labelSize === 'medium' ? '280px' :
            labelSize === 'large' ? '300px' :
            labelSize === 'xlarge' ? '350px' :
            labelSize === 'custom' ? `${customLabelSize.width}px` :
            '250px'
          };
          height: ${
            labelSize === 'mini' ? '100px' :
            labelSize === 'small' ? '120px' :
            labelSize === 'medium' ? '160px' :
            labelSize === 'large' ? '180px' :
            labelSize === 'xlarge' ? '200px' :
            labelSize === 'custom' ? `${customLabelSize.height}px` :
            '150px'
          };
          display: inline-block;
          font-family: Arial, sans-serif;
          background: white;
          page-break-inside: avoid;
        ">
          <div style="font-weight: bold; 
          font-size: ${
          labelSize === 'mini' ? '12px' :
          labelSize === 'small' ? '14px' :
          labelSize === 'medium' ? '18px' :
          labelSize === 'large' ? '20px' :
          labelSize === 'xlarge' ? '22px' :
          labelSize === '40mm' ? '12px' :
          labelSize === 'custom' ? `${Math.max(12, Math.min(24, parseInt(customLabelSize.width) / 15))}px` :
          '16px'
        }; margin-bottom: 8px;">
            ${product.name}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            SKU: ${product.sku}
          </div>
          ${includeDescription && product.description ? 
            `<div style="font-size: 10px; color: #888; margin-bottom: 4px;">
              ${product.description.substring(0, 50)}...
            </div>` : ''
          }
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            ${includePrice ? 
              `<div style="
              font-size: ${
          labelSize === 'mini' ? '12px' :
          labelSize === 'small' ? '14px' :
          labelSize === 'medium' ? '18px' :
          labelSize === 'large' ? '20px' :
          labelSize === 'xlarge' ? '22px' :
          labelSize === '40mm' ? '12px' :
          labelSize === 'custom' ? `${Math.max(12, Math.min(24, parseInt(customLabelSize.width) / 15))}px` :
          '16px'
        }; font-weight: bold; color: #2563eb;">
                Price: ₹${Number(product.price).toFixed(2)}
              </div>` : ''
            }
            ${includeMrp && product.mrp ? 
              `<div style="font-size: 12px; color: #666;">
                MRP: ₹${Number(product.mrp).toFixed(2)}
              </div>` : ''
            }
          </div>
          ${includeExpiryDate ? 
            `<div style="font-size: 10px; color: #d97706; margin-bottom: 4px;">
              Exp: Best Before Date
            </div>` : ''
          }
          ${includeBarcode ? 
            `<div style="text-align: center; margin-top: 8px;">
              <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px; border: 1px solid #ccc; padding: 4px; background: #f9f9f9;">
                ${generateBarcode(product.sku)}
              </div>
            </div>` : ''
          }
        </div>
      `).join('');
    }).join('');

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Product Labels</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                .label { margin: 4px !important; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
              onClick={createManualLabel}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Manual Label
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
                    <SelectItem value="mini">Mini (1.5" x 1")</SelectItem>
                    <SelectItem value="small">Small (2" x 1.2")</SelectItem>
                    <SelectItem value="standard">Standard (2.5" x 1.5")</SelectItem>
                    <SelectItem value="medium">Medium (2.8" x 1.6")</SelectItem>
                    <SelectItem value="large">Large (3" x 1.8")</SelectItem>
                    <SelectItem value="xlarge">Extra Large (3.5" x 2")</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Label Size Input */}
              {labelSize === "custom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom Size (px)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={customLabelSize.width}
                      onChange={(e) =>
                        setCustomLabelSize({ ...customLabelSize, width: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Height"
                      value={customLabelSize.height}
                      onChange={(e) =>
                        setCustomLabelSize({ ...customLabelSize, height: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

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
                    id="include-mrp"
                    checked={includeMrp}
                    onCheckedChange={setIncludeMrp}
                  />
                  <Label htmlFor="include-mrp" className="text-sm">MRP</Label>
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
                    id="include-expiry"
                    checked={includeExpiryDate}
                    onCheckedChange={setIncludeExpiryDate}
                  />
                  <Label htmlFor="include-expiry" className="text-sm">Expiry Date</Label>
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

              {/* Preview */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Label Preview</h4>
                <div 
                  className="border-2 border-dashed border-gray-300 p-2 rounded-lg text-center"
                  style={{
                    height: labelSize === 'mini' ? '80px' :
                            labelSize === 'small' ? '96px' :
                            labelSize === 'medium' ? '112px' :
                            labelSize === 'large' ? '128px' :
                            labelSize === 'xlarge' ? '144px' :
                            labelSize === 'custom' ? `${Math.max(60, parseInt(customLabelSize.height) / 2)}px` :
                            '112px',
                    width: labelSize === 'custom' ? `${Math.max(100, parseInt(customLabelSize.width) / 2)}px` : 'auto'
                  }}
                >
                  <div className="text-xs font-semibold">Sample Product</div>
                  <div className="text-xs text-gray-500">SKU: SP001</div>
                  <div className="flex justify-between text-xs mt-1">
                    {includePrice && <span className="font-bold text-blue-600">₹99.99</span>}
                    {includeMrp && <span className="text-gray-600">MRP: ₹120</span>}
                  </div>
                  {includeExpiryDate && <div className="text-xs text-orange-600 mt-1">Exp: 12/2025</div>}
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
                      <TableHead>MRP</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Barcode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: Product) => (
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
                        <TableCell className="text-gray-600">₹{Number(product.mrp || product.price).toFixed(2)}</TableCell>
                        <TableCell>{product.stockQuantity}</TableCell>
                        <TableCell>
                          <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {generateBarcode(product.sku)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
              <h4 className="text-sm font-medium">Label Elements</h4>
              <div className="flex flex-wrap gap-2">
                {includeBarcode && (
                  <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs">
                    <QrCodeIcon className="h-3 w-3" />
                    Barcode
                  </div>
                )}
                {includePrice && (
                  <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-xs">
                    <BarChart3Icon className="h-3 w-3" />
                    Price
                  </div>
                )}
                {includeDescription && (
                  <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md text-xs">
                    <Package2Icon className="h-3 w-3" />
                    Description
                  </div>
                )}
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

      {/* Manual Label Creation Dialog */}
      <Dialog open={isManualLabelDialogOpen} onOpenChange={setIsManualLabelDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Create Manual Label
            </DialogTitle>
            <DialogDescription>
              Create a custom label with your own product information
            </DialogDescription>
          </DialogHeader>

          {/* Label Size Selection - Prominent */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Label Size & Format
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="manual-copies-top" className="text-sm">Copies:</Label>
                  <Input
                    id="manual-copies-top"
                    type="number"
                    min="1"
                    max="10"
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className="w-16 h-8"
                  />
                </div>
              </div>
            </div>
            <Select value={labelSize} onValueChange={setLabelSize}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mini">
                  <div className="flex items-center justify-between w-full">
                    <span>Mini Label</span>
                    <span className="text-xs text-gray-500 ml-4">(1.5" x 1")</span>
                  </div>
                </SelectItem>
                <SelectItem value="small">
                  <div className="flex items-center justify-between w-full">
                    <span>Small Label</span>
                    <span className="text-xs text-gray-500 ml-4">(2" x 1.2")</span>
                  </div>
                </SelectItem>
                <SelectItem value="standard">
                  <div className="flex items-center justify-between w-full">
                    <span>Standard Label</span>
                    <span className="text-xs text-gray-500 ml-4">(2.5" x 1.5")</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center justify-between w-full">
                    <span>Medium Label</span>
                    <span className="text-xs text-gray-500 ml-4">(2.8" x 1.6")</span>
                  </div>
                </SelectItem>
                <SelectItem value="large">
                  <div className="flex items-center justify-between w-full">
                    <span>Large Label</span>
                    <span className="text-xs text-gray-500 ml-4">(3" x 1.8")</span>
                  </div>
                </SelectItem>
                <SelectItem value="xlarge">
                  <div className="flex items-center justify-between w-full">
                    <span>Extra Large Label</span>
                    <span className="text-xs text-gray-500 ml-4">(3.5" x 2")</span>
                  </div>
                </SelectItem>
                <SelectItem value="40mm">
                  <div className="flex items-center justify-between w-full">
                    <span>40mm x 40mm Label</span>
                    <span className="text-xs text-gray-500 ml-4">(40mm x 40mm)</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
              {/* Custom Label Size Input */}
              {labelSize === "custom" && (
                <div className="space-y-2 mt-2">
                  <Label className="text-sm font-medium">Custom Size (px)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={customLabelSize.width}
                      onChange={(e) =>
                        setCustomLabelSize({ ...customLabelSize, width: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Height"
                      value={customLabelSize.height}
                      onChange={(e) =>
                        setCustomLabelSize({ ...customLabelSize, height: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

            {/* Label Elements Checkboxes */}
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manual-include-barcode"
                  checked={includeBarcode}
                  onCheckedChange={setIncludeBarcode}
                />
                <Label htmlFor="manual-include-barcode" className="text-sm">Barcode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manual-include-price"
                  checked={includePrice}
                  onCheckedChange={setIncludePrice}
                />
                <Label htmlFor="manual-include-price" className="text-sm">Price</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manual-include-mrp"
                  checked={includeMrp}
                  onCheckedChange={setIncludeMrp}
                />
                <Label htmlFor="manual-include-mrp" className="text-sm">MRP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manual-include-description"
                  checked={includeDescription}
                  onCheckedChange={setIncludeDescription}
                />
                <Label htmlFor="manual-include-description" className="text-sm">Description</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="manual-include-expiry"
                  checked={includeExpiryDate}
                  onCheckedChange={setIncludeExpiryDate}
                />
                <Label htmlFor="manual-include-expiry" className="text-sm">Expiry Date</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="manual-name">Product Name *</Label>
                <Input
                  id="manual-name"
                  value={manualLabel.productName}
                  onChange={(e) => setManualLabel({...manualLabel, productName: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <Label htmlFor="manual-sku">SKU/Item Code</Label>
                <Input
                  id="manual-sku"
                  value={manualLabel.sku}
                  onChange={(e) => setManualLabel({...manualLabel, sku: e.target.value})}
                  placeholder="Enter SKU"
                />
              </div>

              <div>
                <Label htmlFor="manual-price">Price (₹)</Label>
                <Input
                  id="manual-price"
                  type="number"
                  step="0.01"
                  value={manualLabel.price}
                  onChange={(e) => setManualLabel({...manualLabel, price: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="manual-mrp">MRP (₹)</Label>
                <Input
                  id="manual-mrp"
                  type="number"
                  step="0.01"
                  value={manualLabel.mrp}
                  onChange={(e) => setManualLabel({...manualLabel, mrp: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="manual-expiry">Expiry Date</Label>
                <Input
                  id="manual-expiry"
                  value={manualLabel.expiryDate}
                  onChange={(e) => setManualLabel({...manualLabel, expiryDate: e.target.value})}
                  placeholder="DD/MM/YYYY or Best Before Date"
                />
              </div>

              <div>
                <Label htmlFor="manual-description">Description</Label>
                <Input
                  id="manual-description"
                  value={manualLabel.description}
                  onChange={(e) => setManualLabel({...manualLabel, description: e.target.value})}
                  placeholder="Product description"
                />
              </div>

              <div>
                <Label htmlFor="manual-barcode">Barcode</Label>
                <Input
                  id="manual-barcode"
                  value={manualLabel.barcode}
                  onChange={(e) => setManualLabel({...manualLabel, barcode: e.target.value})}
                  placeholder="Enter barcode or leave empty for auto-generate"
                />
              </div>

              {/* Live Preview */}
              <div className="pt-2">
                <Label className="text-sm font-medium mb-2 block">Live Preview</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 p-2 rounded-lg text-center bg-white"
                  style={{
                    height: labelSize === 'mini' ? '64px' :
                            labelSize === 'small' ? '80px' :
                            labelSize === 'medium' ? '96px' :
                            labelSize === 'large' ? '112px' :
                            labelSize === 'xlarge' ? '128px' :
                            labelSize === 'custom' ? `${Math.max(60, parseInt(customLabelSize.height) / 2)}px` :
                            '96px',
                    width: labelSize === 'custom' ? `${Math.max(100, parseInt(customLabelSize.width) / 2)}px` : 'auto',
                    fontSize: labelSize === 'mini' || labelSize === 'small' ? '12px' :
                             labelSize === 'medium' || labelSize === 'large' ? '14px' :
                             labelSize === 'xlarge' ? '16px' :
                             labelSize === 'custom' ? `${Math.max(10, Math.min(16, parseInt(customLabelSize.width) / 20))}px` :
                             '12px'
                  }}
                >
                  <div className="font-semibold">{manualLabel.productName || 'Product Name'}</div>
                  {manualLabel.sku && <div className="text-gray-500">SKU: {manualLabel.sku}</div>}
                  <div className="flex justify-between text-xs mt-1">
                    {includePrice && manualLabel.price && <span className="font-bold text-blue-600">₹{manualLabel.price}</span>}
                    {includeMrp && manualLabel.mrp && <span className="text-gray-600">MRP: ₹{manualLabel.mrp}</span>}
                  </div>
                  {includeExpiryDate && manualLabel.expiryDate && <div className="text-orange-600 text-xs">Exp: {manualLabel.expiryDate}</div>}
                  {includeBarcode && <div className="text-xs font-mono mt-1 bg-gray-100 px-1">||||||||||||</div>}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeManualPrint} className="bg-green-600 hover:bg-green-700">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Manual Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}