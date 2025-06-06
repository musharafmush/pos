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
  BarChart3Icon
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
  const [includeDescription, setIncludeDescription] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [copies, setCopies] = useState(1);

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

    // Create print content
    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map((_, index) => `
        <div class="label ${labelSize}" style="
          border: 2px solid #333;
          padding: 12px;
          margin: 8px;
          width: ${labelSize === 'small' ? '200px' : labelSize === 'large' ? '300px' : '250px'};
          height: ${labelSize === 'small' ? '120px' : labelSize === 'large' ? '180px' : '150px'};
          display: inline-block;
          font-family: Arial, sans-serif;
          background: white;
          page-break-inside: avoid;
        ">
          <div style="font-weight: bold; font-size: ${labelSize === 'small' ? '14px' : '16px'}; margin-bottom: 8px;">
            ${product.name}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            SKU: ${product.sku}
          </div>
          ${includeDescription && product.description ? 
            `<div style="font-size: 10px; color: #888; margin-bottom: 8px;">
              ${product.description.substring(0, 50)}...
            </div>` : ''
          }
          ${includePrice ? 
            `<div style="font-size: ${labelSize === 'small' ? '16px' : '18px'}; font-weight: bold; color: #2563eb; margin-bottom: 8px;">
              ₹${Number(product.price).toFixed(2)}
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
                <div className={`border-2 border-dashed border-gray-300 p-3 rounded-lg text-center ${
                  labelSize === 'small' ? 'h-24' : labelSize === 'large' ? 'h-32' : 'h-28'
                }`}>
                  <div className="text-xs font-semibold">Sample Product</div>
                  <div className="text-xs text-gray-500">SKU: SP001</div>
                  {includePrice && <div className="text-sm font-bold text-blue-600">₹99.99</div>}
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
    </DashboardLayout>
  );
}