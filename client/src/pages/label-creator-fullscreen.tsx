import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Maximize2, Minimize2, Save, Eye, Printer, ArrowLeft, Plus, Copy, Trash2, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import JsBarcode from 'jsbarcode';

interface LabelTemplate {
  id?: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  font_size: number;
  brand_title?: string;
  orientation?: 'portrait' | 'landscape';
  include_barcode: boolean;
  include_price: boolean;
  include_description: boolean;
  include_mrp: boolean;
  include_weight: boolean;
  include_hsn: boolean;
  include_manufacturing_date: boolean;
  include_expiry_date: boolean;
  barcode_position: string;
  border_style: string;
  border_width: number;
  background_color: string;
  text_color: string;
  custom_css?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export default function LabelCreatorFullscreen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMaximized, setIsMaximized] = useState(true);
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate>({
    name: 'New Label Template',
    description: '',
    width: 150,
    height: 100,
    font_size: 18,
    brand_title: '',
    orientation: 'landscape',
    include_barcode: true,
    include_price: true,
    include_description: false,
    include_mrp: true,
    include_weight: false,
    include_hsn: false,
    include_manufacturing_date: false,
    include_expiry_date: false,
    barcode_position: 'bottom',
    border_style: 'solid',
    border_width: 1,
    background_color: '#ffffff',
    text_color: '#000000',
    custom_css: '',
    is_default: false,
    is_active: true
  });

  const [barcodeWidth, setBarcodeWidth] = useState(90);
  const [barcodeHeight, setBarcodeHeight] = useState(70);
  const [previewProduct] = useState({
    name: 'SUGAR BULK',
    sku: '24',
    price: 45.00,
    mrp: 55.00,
    barcode: '1234567890123'
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/label-templates'],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: LabelTemplate) => {
      const response = await fetch('/api/label-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      toast({
        title: 'Template Created',
        description: 'Your label template has been saved successfully!',
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LabelTemplate }) => {
      const response = await fetch(`/api/label-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      toast({
        title: 'Template Updated',
        description: 'Your changes have been saved successfully!',
      });
    },
  });

  const generateLabelHTML = () => {
    const savings = currentTemplate.include_mrp && previewProduct.mrp > previewProduct.price 
      ? previewProduct.mrp - previewProduct.price 
      : 0;

    return `
      <div style="
        width: ${currentTemplate.width}mm;
        height: ${currentTemplate.height}mm;
        padding: 8px;
        font-family: Arial, sans-serif;
        font-size: ${currentTemplate.font_size}px;
        color: ${currentTemplate.text_color};
        background-color: ${currentTemplate.background_color};
        border: ${currentTemplate.border_width}px ${currentTemplate.border_style} #ccc;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        box-sizing: border-box;
      ">
        ${currentTemplate.brand_title ? `
          <div style="
            text-align: center;
            font-weight: bold;
            font-size: ${Math.max(currentTemplate.font_size + 4, 16)}px;
            color: #dc2626;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 1px;
          ">${currentTemplate.brand_title}</div>
        ` : ''}
        
        <div style="
          text-align: center;
          font-weight: bold;
          font-size: ${currentTemplate.font_size}px;
          line-height: 1.2;
          margin-bottom: 4px;
        ">${previewProduct.name}</div>
        
        ${currentTemplate.include_description ? `
          <div style="text-align: center; font-size: ${Math.max(currentTemplate.font_size - 2, 10)}px; margin-bottom: 4px;">
            SKU: ${previewProduct.sku}
          </div>
        ` : ''}
        
        ${currentTemplate.include_barcode ? `
          <div style="
            display: flex;
            justify-content: center;
            margin: 8px 0;
          ">
            <svg id="barcode-${Date.now()}"></svg>
          </div>
        ` : ''}
        
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
        ">
          ${currentTemplate.include_price ? `
            <span style="font-size: ${Math.max(currentTemplate.font_size + 2, 14)}px;">
              ₹${previewProduct.price.toFixed(2)}
            </span>
          ` : ''}
          
          ${currentTemplate.include_mrp ? `
            <div style="font-size: ${Math.max(currentTemplate.font_size - 2, 10)}px; text-align: right;">
              <div>MRP: ₹${previewProduct.mrp.toFixed(2)}</div>
              ${savings > 0 ? `<div style="color: #059669;">Save: ₹${savings.toFixed(2)}</div>` : ''}
            </div>
          ` : ''}
        </div>
        
        ${currentTemplate.include_manufacturing_date ? `
          <div style="font-size: ${Math.max(currentTemplate.font_size - 4, 8)}px; margin-top: 4px;">
            Mfg: ${new Date().toLocaleDateString('en-GB')}
          </div>
        ` : ''}
        
        ${currentTemplate.include_expiry_date ? `
          <div style="font-size: ${Math.max(currentTemplate.font_size - 4, 8)}px;">
            Exp: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
          </div>
        ` : ''}
      </div>
    `;
  };

  const generateBarcode = () => {
    setTimeout(() => {
      const svg = document.querySelector(`#barcode-${Date.now() - 1000}`) as SVGElement;
      if (svg && currentTemplate.include_barcode) {
        try {
          JsBarcode(svg, previewProduct.barcode, {
            format: 'CODE128',
            width: 2,
            height: Math.max(30, currentTemplate.height * 0.3),
            displayValue: false,
            margin: 0,
          });
        } catch (error) {
          console.error('Barcode generation error:', error);
        }
      }
    }, 100);
  };

  useEffect(() => {
    generateBarcode();
  }, [currentTemplate.include_barcode, currentTemplate.height]);

  const handleSaveTemplate = () => {
    if (currentTemplate.id) {
      updateTemplateMutation.mutate({ id: currentTemplate.id, data: currentTemplate });
    } else {
      createTemplateMutation.mutate(currentTemplate);
    }
  };

  const loadTemplate = (template: any) => {
    setCurrentTemplate({
      ...template,
      font_size: template.font_size || 18,
      brand_title: template.brand_title || '',
      orientation: template.orientation || 'landscape',
      include_manufacturing_date: template.include_manufacturing_date || false,
      include_expiry_date: template.include_expiry_date || false,
    });
  };

  const createNewTemplate = () => {
    setCurrentTemplate({
      name: 'New Label Template',
      description: '',
      width: 150,
      height: 100,
      font_size: 18,
      brand_title: '',
      orientation: 'landscape',
      include_barcode: true,
      include_price: true,
      include_description: false,
      include_mrp: true,
      include_weight: false,
      include_hsn: false,
      include_manufacturing_date: false,
      include_expiry_date: false,
      barcode_position: 'bottom',
      border_style: 'solid',
      border_width: 1,
      background_color: '#ffffff',
      text_color: '#000000',
      custom_css: '',
      is_default: false,
      is_active: true
    });
  };

  return (
    <div className={`${isMaximized ? 'fixed inset-0 z-50' : 'container mx-auto p-6'} bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href="/print-labels-enhanced">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Labels
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Full-Screen Label Creator
          </h1>
          <Badge variant="secondary">Professional Designer</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isMaximized ? 'Window' : 'Fullscreen'}
          </Button>
          <Button onClick={handleSaveTemplate} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="flex gap-6 h-full">
        {/* Left Sidebar - Template Library */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Template Library</h2>
            <Button onClick={createNewTemplate} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          
          <div className="space-y-2">
            {templates.map((template: any) => (
              <div
                key={template.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => loadTemplate(template)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <p className="text-xs text-gray-500">{template.width}×{template.height}mm</p>
                    {template.brand_title && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {template.brand_title}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400">{template.font_size}pt</span>
                    {template.is_default && (
                      <Badge variant="default" className="text-xs mt-1">Default</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Preview Area */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Live Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateBarcode}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-1" />
                Print Test
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center min-h-96 bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
            <div
              className="shadow-lg"
              dangerouslySetInnerHTML={{ __html: generateLabelHTML() }}
            />
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className="w-96 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Template Properties</h2>
          
          <div className="space-y-6">
            {/* Basic Properties */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm">Template Name</Label>
                  <Input
                    id="name"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={currentTemplate.description || ''}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="brand_title" className="text-sm">Brand Title (M MART)</Label>
                  <Input
                    id="brand_title"
                    value={currentTemplate.brand_title || ''}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, brand_title: e.target.value })}
                    placeholder="Enter brand name (e.g., M MART)"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dimensions & Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Width (mm)</Label>
                    <Input
                      type="number"
                      value={currentTemplate.width}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, width: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Height (mm)</Label>
                    <Input
                      type="number"
                      value={currentTemplate.height}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, height: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Orientation</Label>
                  <Select 
                    value={currentTemplate.orientation} 
                    onValueChange={(value: 'portrait' | 'landscape') => setCurrentTemplate({ ...currentTemplate, orientation: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Font Size</Label>
                    <Badge variant="outline">{currentTemplate.font_size}pt</Badge>
                  </div>
                  <Slider
                    value={[currentTemplate.font_size]}
                    onValueChange={(value) => setCurrentTemplate({ ...currentTemplate, font_size: value[0] })}
                    max={72}
                    min={6}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Text Color</Label>
                    <Input
                      type="color"
                      value={currentTemplate.text_color}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, text_color: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Background</Label>
                    <Input
                      type="color"
                      value={currentTemplate.background_color}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, background_color: e.target.value })}
                      className="mt-1 h-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Barcode Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Barcode Size Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Barcode Width (% of label)</Label>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {barcodeWidth}%
                    </Badge>
                  </div>
                  <Slider
                    value={[barcodeWidth]}
                    onValueChange={(value) => setBarcodeWidth(value[0])}
                    max={95}
                    min={30}
                    step={5}
                    className="mt-2 bg-gradient-to-r from-green-400 to-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Controls horizontal span across the label width</p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Barcode Height (% of label)</Label>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {barcodeHeight}%
                    </Badge>
                  </div>
                  <Slider
                    value={[barcodeHeight]}
                    onValueChange={(value) => setBarcodeHeight(value[0])}
                    max={80}
                    min={20}
                    step={5}
                    className="mt-2 bg-gradient-to-r from-purple-400 to-pink-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Controls vertical height on the label</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setBarcodeWidth(45); setBarcodeHeight(25); }}
                    className="text-xs"
                  >
                    Small
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setBarcodeWidth(65); setBarcodeHeight(45); }}
                    className="text-xs"
                  >
                    Medium
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setBarcodeWidth(90); setBarcodeHeight(70); }}
                    className="text-xs"
                  >
                    Full Size
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Element Inclusion */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Label Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_barcode"
                    checked={currentTemplate.include_barcode}
                    onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, include_barcode: !!checked })}
                  />
                  <Label htmlFor="include_barcode" className="text-sm">Include Barcode</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_price"
                    checked={currentTemplate.include_price}
                    onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, include_price: !!checked })}
                  />
                  <Label htmlFor="include_price" className="text-sm">Include Price</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_mrp"
                    checked={currentTemplate.include_mrp}
                    onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, include_mrp: !!checked })}
                  />
                  <Label htmlFor="include_mrp" className="text-sm">Include MRP</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_manufacturing_date"
                    checked={currentTemplate.include_manufacturing_date}
                    onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, include_manufacturing_date: !!checked })}
                  />
                  <Label htmlFor="include_manufacturing_date" className="text-sm">Manufacturing Date</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_expiry_date"
                    checked={currentTemplate.include_expiry_date}
                    onCheckedChange={(checked) => setCurrentTemplate({ ...currentTemplate, include_expiry_date: !!checked })}
                  />
                  <Label htmlFor="include_expiry_date" className="text-sm">Expiry Date</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}