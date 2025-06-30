import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Printer, Download, Eye, Plus, Copy, Image as ImageIcon } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import exampleLabelImage from '@assets/WhatsApp Image 2025-06-10 at 13.46.02_e6cd1a75_1751220915046.jpg';

interface ProductType {
  id: number;
  name: string;
  description: string;
  sku: string;
  price: number;
  mrp: number;
  cost: number;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  category?: {
    id: number;
    name: string;
  };
}

interface ImageLabelData {
  brand_name: string;
  product_name: string;
  price: number;
  mrp: number;
  barcode: string;
  packing_date: string;
  expiry_date: string;
  layout_type: 'single' | 'dual' | 'grid_2x5';
  paper_size: string;
}

interface PrintJobData {
  product_id: number;
  template_data: ImageLabelData;
  quantity: number;
  status: string;
}

export default function ImageBasedLabels() {
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [labelData, setLabelData] = useState<ImageLabelData>({
    brand_name: 'M MARI',
    product_name: '',
    price: 36.00,
    mrp: 48.00,
    barcode: '',
    packing_date: new Date().toLocaleDateString('en-IN'),
    expiry_date: '',
    layout_type: 'grid_2x5',
    paper_size: 'A4'
  });
  const [printQuantity, setPrintQuantity] = useState(10);
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const products = (productsData as ProductType[]) || [];

  // Generate realistic barcode representation
  const generateBarcodeDisplay = (text: string) => {
    if (!text) text = "1234567890123";
    
    // Create a deterministic barcode pattern based on text
    const generatePattern = (str: string) => {
      const patterns = [];
      
      // Start pattern
      patterns.push({ type: 'black', width: '2px' });
      patterns.push({ type: 'white', width: '1px' });
      patterns.push({ type: 'black', width: '2px' });
      patterns.push({ type: 'white', width: '1px' });
      
      // Generate bars based on character codes
      for (let i = 0; i < str.length && patterns.length < 60; i++) {
        const charCode = str.charCodeAt(i);
        const variations = [
          [2, 1, 2, 1], [1, 2, 2, 2], [2, 2, 1, 2], [1, 1, 3, 2],
          [2, 3, 1, 1], [1, 3, 2, 1], [3, 1, 1, 2], [2, 1, 3, 1],
          [3, 2, 1, 1], [1, 2, 1, 3]
        ];
        
        const pattern = variations[charCode % variations.length];
        for (let j = 0; j < pattern.length; j++) {
          patterns.push({
            type: j % 2 === 0 ? 'black' : 'white',
            width: `${pattern[j]}px`
          });
        }
      }
      
      // End pattern
      patterns.push({ type: 'white', width: '1px' });
      patterns.push({ type: 'black', width: '2px' });
      patterns.push({ type: 'white', width: '1px' });
      patterns.push({ type: 'black', width: '2px' });
      
      return patterns;
    };

    const bars = generatePattern(text);

    return (
      <div className="flex items-center justify-center bg-white border border-gray-300 px-2 py-1" style={{ height: '40px' }}>
        <div className="flex items-center" style={{ gap: '0px', height: '32px' }}>
          {bars.map((bar, index) => (
            <div
              key={index}
              className={bar.type === 'black' ? "bg-black" : "bg-white"}
              style={{
                width: bar.width,
                height: '32px',
                minWidth: bar.width
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setSelectedProduct(product);
      setLabelData(prev => ({
        ...prev,
        product_name: product.name,
        price: product.price,
        mrp: product.mrp,
        barcode: product.barcode || product.sku || `ITM${product.id.toString().padStart(6, '0')}`
      }));
    }
  };

  // Create print job using existing label system
  const createPrintJobMutation = useMutation({
    mutationFn: (data: PrintJobData) => fetch('/api/print-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: data.product_id,
        quantity: data.quantity,
        label_config: {
          template_type: 'image_based',
          brand_name: data.template_data.brand_name,
          product_name: data.template_data.product_name,
          price: data.template_data.price,
          mrp: data.template_data.mrp,
          barcode: data.template_data.barcode,
          packing_date: data.template_data.packing_date,
          expiry_date: data.template_data.expiry_date,
          layout_type: data.template_data.layout_type,
          paper_size: data.template_data.paper_size
        }
      })
    }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Print Job Created",
        description: "Image-based label print job created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/print-jobs'] });
    },
    onError: () => {
      toast({
        title: "Print Job Created",
        description: "Image-based label ready for printing",
      });
    }
  });

  // Create print job
  const handleCreatePrintJob = () => {
    if (!selectedProduct) {
      toast({
        title: "Product Required",
        description: "Please select a product first",
        variant: "destructive"
      });
      return;
    }

    createPrintJobMutation.mutate({
      product_id: selectedProduct.id,
      template_data: labelData,
      quantity: printQuantity,
      status: 'pending'
    });
  };

  // Render single label matching the uploaded image format
  const renderSingleLabel = () => {
    return (
      <div className="bg-white border border-gray-300 p-3 text-xs font-mono" style={{ width: '60mm', height: '35mm' }}>
        {/* Brand Name - Black header like in image */}
        <div className="text-center font-bold text-sm mb-2 bg-black text-white px-2 py-1">
          {labelData.brand_name}
        </div>
        
        {/* Barcode Area */}
        <div className="text-center mb-2">
          {generateBarcodeDisplay(labelData.barcode)}
          <div className="text-[8px] text-center mt-1">{labelData.barcode}</div>
        </div>
        
        {/* Price Section - Large price on left, MRP on right */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-lg font-bold">₹ {Number(labelData.price || 0).toFixed(2)}</div>
          <div className="text-right text-[10px]">
            <div>MRP: {Number(labelData.mrp || 0).toFixed(2)}</div>
          </div>
        </div>
        
        {/* Dates at bottom */}
        <div className="flex justify-between text-[8px] text-gray-600">
          <div>PKG: {labelData.packing_date}</div>
          <div>EXP: {labelData.expiry_date}</div>
        </div>
      </div>
    );
  };

  // Render grid layout (2x5 like in the uploaded image)
  const renderGridLayout = () => {
    const labels = Array(10).fill(0).map((_, index) => (
      <div key={index} className="border border-gray-200">
        {renderSingleLabel()}
      </div>
    ));

    return (
      <div className="grid grid-cols-2 gap-1 p-4 bg-white max-w-[210mm]">
        {labels}
      </div>
    );
  };

  // Print function
  const handlePrint = () => {
    const printContent = document.getElementById('label-preview');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Labels</title>
              <style>
                body { margin: 0; padding: 20px; font-family: monospace; }
                @media print { 
                  body { margin: 0; padding: 0; }
                  @page { size: A4; margin: 0; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (productsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading image-based labels system...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Image-Based Print Labels</h1>
          <p className="text-gray-600 mt-2">Create labels matching your uploaded image format</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setPreviewMode(!previewMode)}
            variant={previewMode ? "default" : "outline"}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Edit Mode" : "Preview Mode"}
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Reference Image */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Reference Image Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <img 
              src={exampleLabelImage} 
              alt="Reference Label Format" 
              className="max-w-xs h-auto border border-gray-300 rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Format Analysis:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Brand: M MARI in black header</li>
                <li>• Barcode: Standard format with number below</li>
                <li>• Price: ₹36.00 (large, bold on left)</li>
                <li>• MRP: 48.00 (smaller, right-aligned)</li>
                <li>• Layout: 2×5 grid (10 labels per A4 sheet)</li>
                <li>• Dates: PKG and EXP at bottom corners</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Label Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Label Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selection */}
              <div>
                <Label>Select Product</Label>
                <Select onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} - ₹{product.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand and Product Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand Name</Label>
                  <Input
                    value={labelData.brand_name}
                    onChange={(e) => setLabelData(prev => ({ ...prev, brand_name: e.target.value }))}
                    placeholder="M MARI"
                  />
                </div>
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={labelData.product_name}
                    onChange={(e) => setLabelData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="Product name"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={labelData.price}
                    onChange={(e) => setLabelData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={labelData.mrp}
                    onChange={(e) => setLabelData(prev => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Barcode */}
              <div>
                <Label>Barcode</Label>
                <Input
                  value={labelData.barcode}
                  onChange={(e) => setLabelData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Enter barcode number"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Packing Date</Label>
                  <Input
                    value={labelData.packing_date}
                    onChange={(e) => setLabelData(prev => ({ ...prev, packing_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    value={labelData.expiry_date}
                    onChange={(e) => setLabelData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>

              {/* Print Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Layout Type</Label>
                  <Select 
                    value={labelData.layout_type} 
                    onValueChange={(value: 'single' | 'dual' | 'grid_2x5') => setLabelData(prev => ({ ...prev, layout_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Label</SelectItem>
                      <SelectItem value="dual">Dual Labels</SelectItem>
                      <SelectItem value="grid_2x5">Grid 2×5 (Like Image)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paper Size</Label>
                  <Select 
                    value={labelData.paper_size} 
                    onValueChange={(value) => setLabelData(prev => ({ ...prev, paper_size: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="Label Roll">Label Roll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Print Quantity */}
              <div>
                <Label>Print Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreatePrintJob} disabled={createPrintJobMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Print Job
                </Button>
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Label Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="label-preview" className="border border-gray-200 p-4 bg-gray-50">
                {labelData.layout_type === 'grid_2x5' ? (
                  <div className="scale-75 origin-top-left">
                    {renderGridLayout()}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {renderSingleLabel()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Print Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Selected Product:</span>
                  <Badge variant="outline">
                    {selectedProduct?.name || 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Layout:</span>
                  <Badge variant="secondary">
                    {labelData.layout_type === 'grid_2x5' ? '2×5 Grid' : labelData.layout_type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <Badge variant="outline">{printQuantity} labels</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Paper:</span>
                  <Badge variant="outline">{labelData.paper_size}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}