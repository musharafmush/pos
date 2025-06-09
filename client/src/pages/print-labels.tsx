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
  const [includeCategory, setIncludeCategory] = useState(false);
  const [includeBrand, setIncludeBrand] = useState(false);
  const [includeSupplier, setIncludeSupplier] = useState(false);
  const [includeManufactureDate, setIncludeManufactureDate] = useState(false);
  const [includeBatchNumber, setIncludeBatchNumber] = useState(false);
  const [includeStockQuantity, setIncludeStockQuantity] = useState(false);
  const [includeQrCode, setIncludeQrCode] = useState(false);
  const [includeCompanyLogo, setIncludeCompanyLogo] = useState(false);
  const [includeCustomText, setIncludeCustomText] = useState(false);
  const [customText, setCustomText] = useState("");
  const [labelTemplate, setLabelTemplate] = useState("standard");
  const [printOrientation, setPrintOrientation] = useState("portrait");
  const [paperSize, setPaperSize] = useState("A4");
  const [labelsPerRow, setLabelsPerRow] = useState(2);
  const [labelsPerColumn, setLabelsPerColumn] = useState(3);
  const [marginTop, setMarginTop] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [labelBorder, setLabelBorder] = useState(true);
  const [borderStyle, setBorderStyle] = useState("solid");
  const [borderWidth, setBorderWidth] = useState("1");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isManualLabelDialogOpen, setIsManualLabelDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isBulkPrintDialogOpen, setIsBulkPrintDialogOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [customLabelSize, setCustomLabelSize] = useState({ width: "250", height: "150" });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [stockFilter, setStockFilter] = useState("all");

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
  const filteredProducts = products.filter((product: Product) => {
    // Search filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = selectedCategory === "all" || 
                           product.categoryId === parseInt(selectedCategory);
    
    // Stock filter
    let matchesStock = true;
    if (stockFilter === "in-stock") {
      matchesStock = product.stockQuantity > 0;
    } else if (stockFilter === "low-stock") {
      matchesStock = product.stockQuantity < 10 && product.stockQuantity > 0;
    } else if (stockFilter === "out-of-stock") {
      matchesStock = product.stockQuantity === 0;
    }
    
    // Price filter
    const matchesPrice = (!priceRange.min || product.price >= parseFloat(priceRange.min)) &&
                        (!priceRange.max || product.price <= parseFloat(priceRange.max));
    
    return matchesSearch && matchesCategory && matchesStock && matchesPrice;
  });

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

    const currentDateTime = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const getThermalLabelStyle = () => {
      if (labelSize === 'thermal-strip') {
        return {
          width: '180px',
          height: '60px',
          fontSize: '8px',
          padding: '4px',
          margin: '2px',
          display: 'inline-block',
          verticalAlign: 'top'
        };
      } else if (labelSize === 'thermal-roll') {
        return {
          width: '200px',
          height: '80px',
          fontSize: '9px',
          padding: '6px',
          margin: '3px',
          display: 'block'
        };
      } else {
        return {
          width: '250px',
          height: '150px',
          fontSize: '12px',
          padding: '8px',
          margin: '4px',
          display: 'inline-block'
        };
      }
    };

    const labelStyle = getThermalLabelStyle();

    const manualLabelContent = Array(copies).fill(null).map((_, index) => `
      <div class="thermal-label" style="
        width: ${labelStyle.width};
        min-height: ${labelStyle.height};
        padding: ${labelStyle.padding};
        margin: ${labelStyle.margin};
        border: 1px solid #333;
        background: white;
        font-family: 'Courier New', monospace;
        font-size: ${labelStyle.fontSize};
        line-height: 1.1;
        display: ${labelStyle.display};
        page-break-inside: avoid;
        box-sizing: border-box;
        ${labelSize === 'thermal-strip' ? 'vertical-align: top;' : ''}
      ">
        <!-- Header with timestamp -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
          <div style="font-size: 10px; color: #666;">${currentDateTime}</div>
          <div style="font-size: 11px; font-weight: bold;">Manual Label</div>
        </div>

        <!-- Product Name -->
        <div style="font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 6px; border: 1px solid #333; padding: 4px;">
          ${manualLabel.productName}
        </div>

        <!-- SKU -->
        ${manualLabel.sku ? 
          `<div style="font-size: 10px; text-align: center; margin-bottom: 4px;">
            SKU: ${manualLabel.sku}
          </div>` : ''
        }

        <!-- Description -->
        ${includeDescription && manualLabel.description ? 
          `<div style="font-size: 9px; text-align: center; margin-bottom: 4px; color: #555;">
            ${manualLabel.description.substring(0, 40)}${manualLabel.description.length > 40 ? '...' : ''}
          </div>` : ''
        }

        <!-- Price Section -->
        <div style="margin: 6px 0; text-align: center;">
          ${includePrice && manualLabel.price ? 
            `<div style="font-size: 16px; font-weight: bold; border: 2px solid #000; padding: 4px; margin: 2px 0;">
              PRICE: ₹${Number(manualLabel.price).toFixed(2)}
            </div>` : ''
          }
          ${includeMrp && manualLabel.mrp ? 
            `<div style="font-size: 12px; margin: 2px 0;">
              MRP: ₹${Number(manualLabel.mrp).toFixed(2)}
            </div>` : ''
          }
        </div>

        <!-- Expiry Date -->
        ${includeExpiryDate && manualLabel.expiryDate ? 
          `<div style="font-size: 10px; text-align: center; margin: 4px 0; color: #d97706;">
            Exp: ${manualLabel.expiryDate}
          </div>` : ''
        }

        <!-- Barcode -->
        ${includeBarcode && (manualLabel.barcode || manualLabel.sku) ? 
          `<div style="text-align: center; margin-top: 6px; border-top: 1px solid #ddd; padding-top: 4px;">
            <div style="font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 1px; background: #f8f8f8; padding: 2px; border: 1px solid #ccc;">
              ${manualLabel.barcode || manualLabel.sku?.padEnd(12, '0').substring(0, 12) || '000000000000'}
            </div>
            <div style="font-size: 8px; margin-top: 2px;">||||||||||||||||||||||||</div>
          </div>` : ''
        }

        <!-- Footer -->
        <div style="text-align: center; font-size: 8px; color: #999; margin-top: 6px; border-top: 1px dashed #ccc; padding-top: 2px;">
          ${index + 1}/${copies}
        </div>
      </div>
    `).join('');

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Manual Thermal Label</title>
            <style>
              body {
                margin: 0;
                padding: ${labelSize === 'thermal-strip' ? '4px' : '8px'};
                font-family: 'Courier New', monospace;
                background: #f0f0f0;
                ${labelSize === 'thermal-strip' ? 'line-height: 1.1;' : ''}
              }
              .thermal-label {
                background: white !important;
                break-inside: avoid;
                ${labelSize === 'thermal-strip' ? 'display: inline-block; vertical-align: top; width: 180px !important;' : ''}
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: ${labelSize === 'thermal-strip' ? '1px' : '2px'}; 
                  background: white;
                }
                .thermal-label { 
                  margin: ${labelSize === 'thermal-strip' ? '1px' : '2px'} !important; 
                  page-break-inside: avoid;
                  break-inside: avoid;
                  ${labelSize === 'thermal-strip' ? 'display: inline-block !important; vertical-align: top !important;' : ''}
                }
                @page {
                  margin: ${labelSize === 'thermal-strip' ? '0.1in' : '0.25in'};
                  size: ${labelSize === 'thermal-strip' ? '4in 6in' : 'auto'};
                }
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

    const currentDateTime = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Create print content
    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map((_, index) => `
        <div class="thermal-label" style="
          width: 250px;
          min-height: 150px;
          padding: 8px;
          margin: 4px;
          border: 1px dashed #999;
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          display: inline-block;
          page-break-inside: avoid;
          box-sizing: border-box;
        ">
          <!-- Header with timestamp -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
            <div style="font-size: 10px; color: #666;">${currentDateTime}</div>
            <div style="font-size: 11px; font-weight: bold;">Product Label</div>
          </div>

          <!-- Product Name -->
          <div style="font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 6px; border: 1px solid #333; padding: 4px;">
            ${product.name}
          </div>

          <!-- SKU -->
          <div style="font-size: 10px; text-align: center; margin-bottom: 4px;">
            SKU: ${product.sku}
          </div>

          <!-- Description -->
          ${includeDescription && product.description ? 
            `<div style="font-size: 9px; text-align: center; margin-bottom: 4px; color: #555;">
              ${product.description.substring(0, 40)}${product.description.length > 40 ? '...' : ''}
            </div>` : ''
          }

          <!-- Price Section -->
          <div style="margin: 6px 0; text-align: center;">
            ${includePrice ? 
              `<div style="font-size: 16px; font-weight: bold; border: 2px solid #000; padding: 4px; margin: 2px 0;">
                PRICE: ₹${Number(product.price).toFixed(2)}
              </div>` : ''
            }
            ${includeMrp && product.mrp ? 
              `<div style="font-size: 12px; margin: 2px 0;">
                MRP: ₹${Number(product.mrp).toFixed(2)}
              </div>` : ''
            }
          </div>

          <!-- Expiry Date -->
          ${includeExpiryDate ? 
            `<div style="font-size: 10px; text-align: center; margin: 4px 0; color: #d97706;">
              Exp: Best Before Date
            </div>` : ''
          }

          <!-- Barcode -->
          ${includeBarcode ? 
            `<div style="text-align: center; margin-top: 6px; border-top: 1px solid #ddd; padding-top: 4px;">
              <div style="font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 1px; background: #f8f8f8; padding: 2px; border: 1px solid #ccc;">
                ${generateBarcode(product.sku)}
              </div>
              <div style="font-size: 8px; margin-top: 2px;">||||||||||||||||||||||||</div>
            </div>` : ''
          }

          <!-- Footer -->
          <div style="text-align: center; font-size: 8px; color: #999; margin-top: 6px; border-top: 1px dashed #ccc; padding-top: 2px;">
            ${index + 1}/${copies}
          </div>
        </div>
      `).join('');
    }).join('');

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Thermal Labels</title>
            <style>
              body {
                margin: 0;
                padding: 8px;
                font-family: 'Courier New', monospace;
                background: #f0f0f0;
              }
              .thermal-label {
                background: white !important;
                break-inside: avoid;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 2px; 
                  background: white;
                }
                .thermal-label { 
                  margin: 2px !important; 
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                @page {
                  margin: 0.25in;
                  size: auto;
                }
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
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={createManualLabel}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Manual Label
            </Button>
            <Button 
              onClick={() => setIsTemplateDialogOpen(true)}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button 
              onClick={() => setIsBulkPrintDialogOpen(true)}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <Package2Icon className="h-4 w-4 mr-2" />
              Bulk Print
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
              {/* Label Template */}
              <div className="space-y-2">
                <Label htmlFor="label-template" className="text-sm font-medium">Label Template</Label>
                <Select value={labelTemplate} onValueChange={setLabelTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Layout</SelectItem>
                    <SelectItem value="minimal">Minimal Design</SelectItem>
                    <SelectItem value="detailed">Detailed Information</SelectItem>
                    <SelectItem value="price-focus">Price Focused</SelectItem>
                    <SelectItem value="barcode-focus">Barcode Focused</SelectItem>
                    <SelectItem value="retail-modern">Modern Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale Format</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy Style</SelectItem>
                    <SelectItem value="grocery">Grocery Store</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                    <SelectItem value="thermal-58mm">Thermal 58mm</SelectItem>
                    <SelectItem value="thermal-80mm">Thermal 80mm</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paper Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Paper & Layout</h4>
                
                <div className="space-y-2">
                  <Label className="text-sm">Paper Size</Label>
                  <Select value={paperSize} onValueChange={setPaperSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                      <SelectItem value="A5">A5 (148 x 210 mm)</SelectItem>
                      <SelectItem value="Letter">Letter (8.5 x 11 in)</SelectItem>
                      <SelectItem value="Legal">Legal (8.5 x 14 in)</SelectItem>
                      <SelectItem value="thermal">Thermal Roll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Orientation</Label>
                  <Select value={printOrientation} onValueChange={setPrintOrientation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Per Row</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={labelsPerRow}
                      onChange={(e) => setLabelsPerRow(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Per Column</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={labelsPerColumn}
                      onChange={(e) => setLabelsPerColumn(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
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
                <h4 className="text-sm font-medium border-b pb-2">Include on Label</h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* Essential Information */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-blue-600">Essential Info</Label>
                    <div className="grid grid-cols-1 gap-2">
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
                          id="include-qr"
                          checked={includeQrCode}
                          onCheckedChange={setIncludeQrCode}
                        />
                        <Label htmlFor="include-qr" className="text-sm">QR Code</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-price"
                          checked={includePrice}
                          onCheckedChange={setIncludePrice}
                        />
                        <Label htmlFor="include-price" className="text-sm">Selling Price</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-mrp"
                          checked={includeMrp}
                          onCheckedChange={setIncludeMrp}
                        />
                        <Label htmlFor="include-mrp" className="text-sm">MRP</Label>
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-green-600">Product Details</Label>
                    <div className="grid grid-cols-1 gap-2">
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
                          id="include-category"
                          checked={includeCategory}
                          onCheckedChange={setIncludeCategory}
                        />
                        <Label htmlFor="include-category" className="text-sm">Category</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-brand"
                          checked={includeBrand}
                          onCheckedChange={setIncludeBrand}
                        />
                        <Label htmlFor="include-brand" className="text-sm">Brand</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-supplier"
                          checked={includeSupplier}
                          onCheckedChange={setIncludeSupplier}
                        />
                        <Label htmlFor="include-supplier" className="text-sm">Supplier</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-stock"
                          checked={includeStockQuantity}
                          onCheckedChange={setIncludeStockQuantity}
                        />
                        <Label htmlFor="include-stock" className="text-sm">Stock Qty</Label>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Batch */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-orange-600">Dates & Batch</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-expiry"
                          checked={includeExpiryDate}
                          onCheckedChange={setIncludeExpiryDate}
                        />
                        <Label htmlFor="include-expiry" className="text-sm">Expiry Date</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-manufacture"
                          checked={includeManufactureDate}
                          onCheckedChange={setIncludeManufactureDate}
                        />
                        <Label htmlFor="include-manufacture" className="text-sm">Mfg. Date</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-batch"
                          checked={includeBatchNumber}
                          onCheckedChange={setIncludeBatchNumber}
                        />
                        <Label htmlFor="include-batch" className="text-sm">Batch No.</Label>
                      </div>
                    </div>
                  </div>

                  {/* Branding & Custom */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-purple-600">Branding</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-logo"
                          checked={includeCompanyLogo}
                          onCheckedChange={setIncludeCompanyLogo}
                        />
                        <Label htmlFor="include-logo" className="text-sm">Company Logo</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="include-custom"
                          checked={includeCustomText}
                          onCheckedChange={setIncludeCustomText}
                        />
                        <Label htmlFor="include-custom" className="text-sm">Custom Text</Label>
                      </div>
                    </div>
                    
                    {includeCustomText && (
                      <Input
                        placeholder="Enter custom text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Styling Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Styling & Format</h4>
                
                <div className="space-y-2">
                  <Label className="text-sm">Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Font Size</Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8px</SelectItem>
                        <SelectItem value="10">10px</SelectItem>
                        <SelectItem value="12">12px</SelectItem>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Border Width</Label>
                    <Select value={borderWidth} onValueChange={setBorderWidth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">1px</SelectItem>
                        <SelectItem value="2">2px</SelectItem>
                        <SelectItem value="3">3px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="label-border"
                    checked={labelBorder}
                    onCheckedChange={setLabelBorder}
                  />
                  <Label htmlFor="label-border" className="text-sm">Show Border</Label>
                </div>
              </div>

              {/* Copies */}
              <div className="space-y-2">
                <Label htmlFor="copies" className="text-sm font-medium">Copies per Product</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="100"
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
              <div className="flex justify-between items-center mb-4">
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

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Category Filter</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Stock Filter</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="in-stock">In Stock (>0)</SelectItem>
                      <SelectItem value="low-stock">Low Stock (<10)</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock (0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Price Range (₹)</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all");
                      setStockFilter("all");
                      setPriceRange({min: "", max: ""});
                      setSearchTerm("");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const filteredIds = filteredProducts.map((p: Product) => p.id);
                      setSelectedProducts(filteredIds);
                    }}
                  >
                    Select Filtered
                  </Button>
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
                <SelectItem value="thermal-strip">
                  <div className="flex items-center justify-between w-full">
                    <span>Thermal Strip Label</span>
                    <span className="text-xs text-gray-500 ml-4">(1 Row, 2 Column)</span>
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

      {/* Template Manager Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-purple-600" />
              Label Templates
            </DialogTitle>
            <DialogDescription>
              Manage and customize your label templates
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4">
            {/* Template previews */}
            {[
              { id: 'standard', name: 'Standard Layout', desc: 'Basic product info with barcode' },
              { id: 'minimal', name: 'Minimal Design', desc: 'Clean and simple' },
              { id: 'detailed', name: 'Detailed Information', desc: 'All product details' },
              { id: 'price-focus', name: 'Price Focused', desc: 'Emphasizes pricing' },
              { id: 'retail-modern', name: 'Modern Retail', desc: 'Contemporary design' },
              { id: 'pharmacy', name: 'Pharmacy Style', desc: 'Medical/pharmacy format' }
            ].map((template) => (
              <div 
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  labelTemplate === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setLabelTemplate(template.id)}
              >
                <div className="text-sm font-semibold">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.desc}</div>
                <div className="mt-3 bg-white border border-gray-300 rounded p-2 text-xs">
                  <div className="font-bold">Sample Product</div>
                  <div>SKU: SP001</div>
                  {template.id.includes('price') && <div className="text-blue-600 font-bold">₹99.99</div>}
                  {template.id.includes('detailed') && <div className="text-gray-500">Category: Electronics</div>}
                  <div className="text-center mt-1">||||||||||||</div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Print Dialog */}
      <Dialog open={isBulkPrintDialogOpen} onOpenChange={setIsBulkPrintDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2Icon className="h-5 w-5 text-orange-600" />
              Bulk Print Options
            </DialogTitle>
            <DialogDescription>
              Print labels for multiple categories or all products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={() => {
                  setSelectedProducts(products.map((p: Product) => p.id));
                  setIsBulkPrintDialogOpen(false);
                }}
              >
                <Package2Icon className="h-6 w-6 mb-2" />
                <span>All Products</span>
                <span className="text-xs text-gray-500">{products.length} items</span>
              </Button>

              <Button 
                variant="outline" 
                className="h-20 flex flex-col"
                onClick={() => {
                  const lowStockProducts = products.filter((p: Product) => p.stockQuantity < 10);
                  setSelectedProducts(lowStockProducts.map((p: Product) => p.id));
                  setIsBulkPrintDialogOpen(false);
                }}
              >
                <BarChart3Icon className="h-6 w-6 mb-2" />
                <span>Low Stock Items</span>
                <span className="text-xs text-gray-500">
                  {products.filter((p: Product) => p.stockQuantity < 10).length} items
                </span>
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Select by Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category: any) => (
                  <Button
                    key={category.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const categoryProducts = products.filter((p: Product) => p.categoryId === category.id);
                      setSelectedProducts(categoryProducts.map((p: Product) => p.id));
                      setIsBulkPrintDialogOpen(false);
                    }}
                  >
                    {category.name} ({products.filter((p: Product) => p.categoryId === category.id).length})
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkPrintDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}