import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import JsBarcode from 'jsbarcode';
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
  ClockIcon,
  SaveIcon,
  UploadIcon,
  Trash2Icon,
  MoveIcon,
  TypeIcon,
  ImageIcon,
  BoxIcon,
  Code2Icon,
  FileTextIcon,
  Maximize2Icon,
  XIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  MinusIcon,
  RotateCwIcon,
  Layers,
  Database,
  Wifi,
  WifiOff,
  QrCode,
  Barcode
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
  brand?: string;
  model?: string;
  size?: string;
}

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'qrcode' | 'image' | 'line' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  dataField?: string; // Link to product data field
  barcodeType?: 'CODE128' | 'EAN13' | 'CODE39' | 'UPC';
  showValue?: boolean;
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  elements: LabelElement[];
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PrinterSettings {
  id: string;
  name: string;
  type: 'endura' | 'thermal' | 'laser';
  connection: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  paperWidth: number;
  paperHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  printDensity: number;
  printSpeed: number;
  isDefault?: boolean;
}

const defaultPrinters: PrinterSettings[] = [
  {
    id: 'endura-80x40',
    name: 'Endura 80mm x 40mm',
    type: 'endura',
    connection: 'usb',
    paperWidth: 80,
    paperHeight: 40,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 3,
    marginRight: 3,
    printDensity: 8,
    printSpeed: 4,
    isDefault: true
  },
  {
    id: 'endura-50x30',
    name: 'Endura 50mm x 30mm',
    type: 'endura',
    connection: 'usb',
    paperWidth: 50,
    paperHeight: 30,
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 2,
    marginRight: 2,
    printDensity: 8,
    printSpeed: 4
  },
  {
    id: 'endura-network',
    name: 'Endura Network Printer',
    type: 'endura',
    connection: 'network',
    ipAddress: '192.168.1.100',
    port: 9100,
    paperWidth: 80,
    paperHeight: 40,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 3,
    marginRight: 3,
    printDensity: 8,
    printSpeed: 4
  }
];

const defaultTemplates: LabelTemplate[] = [
  {
    id: 'mart-standard',
    name: 'M MART Standard',
    width: 80,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderColor: '#000000',
    elements: [
      {
        id: 'store-name',
        type: 'text',
        x: 40,
        y: 5,
        width: 75,
        height: 8,
        content: 'M MART',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        dataField: 'storeName'
      },
      {
        id: 'barcode',
        type: 'barcode',
        x: 40,
        y: 15,
        width: 70,
        height: 15,
        content: '',
        dataField: 'barcode',
        barcodeType: 'CODE128',
        showValue: true
      },
      {
        id: 'price-label',
        type: 'text',
        x: 10,
        y: 32,
        width: 20,
        height: 6,
        content: '₹.',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'left'
      },
      {
        id: 'price',
        type: 'text',
        x: 25,
        y: 32,
        width: 30,
        height: 6,
        content: '36.00',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'left',
        dataField: 'price'
      },
      {
        id: 'mrp-label',
        type: 'text',
        x: 50,
        y: 33,
        width: 20,
        height: 5,
        content: 'MRP',
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'right'
      },
      {
        id: 'mrp-value',
        type: 'text',
        x: 65,
        y: 33,
        width: 15,
        height: 5,
        content: '48.00',
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'right',
        dataField: 'mrp'
      }
    ],
    isDefault: true
  },
  {
    id: 'product-detailed',
    name: 'Product Detailed',
    width: 80,
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    elements: [
      {
        id: 'product-name',
        type: 'text',
        x: 40,
        y: 5,
        width: 75,
        height: 8,
        content: 'Product Name',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        dataField: 'name'
      },
      {
        id: 'barcode',
        type: 'barcode',
        x: 40,
        y: 15,
        width: 70,
        height: 18,
        content: '',
        dataField: 'barcode',
        barcodeType: 'CODE128',
        showValue: true
      },
      {
        id: 'price',
        type: 'text',
        x: 20,
        y: 35,
        width: 30,
        height: 7,
        content: '₹0.00',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        dataField: 'price'
      },
      {
        id: 'mrp',
        type: 'text',
        x: 60,
        y: 36,
        width: 20,
        height: 5,
        content: 'MRP ₹0.00',
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'right',
        dataField: 'mrp'
      },
      {
        id: 'sku',
        type: 'text',
        x: 5,
        y: 44,
        width: 40,
        height: 4,
        content: 'SKU: ',
        fontSize: 8,
        fontWeight: 'normal',
        textAlign: 'left',
        dataField: 'sku'
      },
      {
        id: 'weight',
        type: 'text',
        x: 45,
        y: 44,
        width: 30,
        height: 4,
        content: 'Weight: ',
        fontSize: 8,
        fontWeight: 'normal',
        textAlign: 'right',
        dataField: 'weight'
      }
    ]
  },
  {
    id: 'qr-label',
    name: 'QR Code Label',
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
    elements: [
      {
        id: 'product-name',
        type: 'text',
        x: 25,
        y: 5,
        width: 45,
        height: 8,
        content: 'Product Name',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        dataField: 'name'
      },
      {
        id: 'qrcode',
        type: 'qrcode',
        x: 25,
        y: 25,
        width: 25,
        height: 25,
        content: '',
        dataField: 'barcode'
      },
      {
        id: 'price',
        type: 'text',
        x: 25,
        y: 42,
        width: 45,
        height: 6,
        content: '₹0.00',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        dataField: 'price'
      }
    ]
  }
];

const dataFields = [
  { value: 'name', label: 'Product Name' },
  { value: 'sku', label: 'SKU' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'price', label: 'Price' },
  { value: 'mrp', label: 'MRP' },
  { value: 'cost', label: 'Cost' },
  { value: 'weight', label: 'Weight' },
  { value: 'hsnCode', label: 'HSN Code' },
  { value: 'gstCode', label: 'GST Code' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'model', label: 'Model' },
  { value: 'size', label: 'Size' },
  { value: 'stockQuantity', label: 'Stock Quantity' },
  { value: 'storeName', label: 'Store Name' },
  { value: 'storeAddress', label: 'Store Address' },
  { value: 'date', label: 'Current Date' },
  { value: 'time', label: 'Current Time' }
];

export default function PrintLabelsEndura() {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(defaultTemplates[0]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterSettings>(defaultPrinters[0]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isElementDialogOpen, setIsElementDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<LabelElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [templates, setTemplates] = useState<LabelTemplate[]>(defaultTemplates);
  const [printers, setPrinters] = useState<PrinterSettings[]>(defaultPrinters);
  const [customCSS, setCustomCSS] = useState("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchQuery));
      
    const matchesCategory = selectedCategory === "all" || 
      (product.category && product.category.name === selectedCategory);
      
    const matchesSelection = !showOnlySelected || 
      selectedProducts.some(p => p.id === product.id);
      
    return matchesSearch && matchesCategory && matchesSelection;
  });

  // Convert mm to pixels (assuming 96 DPI)
  const mmToPixels = (mm: number) => (mm * 96) / 25.4;

  // Generate barcode
  const generateBarcode = (canvas: HTMLCanvasElement, value: string, type: string, width: number, height: number, showValue: boolean) => {
    try {
      JsBarcode(canvas, value || '123456789', {
        format: type,
        width: 2,
        height: height,
        displayValue: showValue,
        fontSize: 10,
        margin: 0
      });
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  };

  // Generate QR code (simplified)
  const generateQRCode = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number) => {
    // Simple QR code representation
    ctx.fillStyle = '#000000';
    const moduleSize = size / 25;
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        if (Math.random() > 0.5) {
          ctx.fillRect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  };

  // Get product field value
  const getFieldValue = (product: Product, field: string): string => {
    switch (field) {
      case 'name': return product.name || '';
      case 'sku': return `SKU: ${product.sku || ''}`;
      case 'barcode': return product.barcode || product.sku || '123456789';
      case 'price': return product.price || '0.00';
      case 'mrp': return product.mrp || product.price || '0.00';
      case 'cost': return product.cost || '0.00';
      case 'weight': return product.weight ? `${product.weight} ${product.weightUnit || 'g'}` : '';
      case 'hsnCode': return product.hsnCode || '';
      case 'gstCode': return product.gstCode || '';
      case 'category': return product.category?.name || '';
      case 'brand': return product.brand || '';
      case 'model': return product.model || '';
      case 'size': return product.size || '';
      case 'stockQuantity': return `Stock: ${product.stockQuantity || 0}`;
      case 'storeName': return 'M MART';
      case 'storeAddress': return 'Your Store Address';
      case 'date': return new Date().toLocaleDateString('en-IN');
      case 'time': return new Date().toLocaleTimeString('en-IN');
      default: return '';
    }
  };

  // Draw label on canvas
  const drawLabel = (ctx: CanvasRenderingContext2D, template: LabelTemplate, product: Product, x: number, y: number) => {
    const width = mmToPixels(template.width);
    const height = mmToPixels(template.height);

    // Background
    ctx.fillStyle = template.backgroundColor;
    ctx.fillRect(x, y, width, height);

    // Border
    if (template.borderWidth > 0) {
      ctx.strokeStyle = template.borderColor;
      ctx.lineWidth = template.borderWidth;
      ctx.strokeRect(x, y, width, height);
    }

    // Draw elements
    template.elements.forEach(element => {
      const elementX = x + mmToPixels(element.x - template.width / 2);
      const elementY = y + mmToPixels(element.y);
      const elementWidth = mmToPixels(element.width);
      const elementHeight = mmToPixels(element.height);

      ctx.save();
      
      if (element.rotation) {
        ctx.translate(elementX + elementWidth / 2, elementY + elementHeight / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-(elementX + elementWidth / 2), -(elementY + elementHeight / 2));
      }

      switch (element.type) {
        case 'text':
          const text = element.dataField ? getFieldValue(product, element.dataField) : element.content;
          ctx.fillStyle = '#000000';
          ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 12}px Arial`;
          ctx.textAlign = element.textAlign || 'left';
          ctx.textBaseline = 'top';
          
          let textX = elementX;
          if (element.textAlign === 'center') textX += elementWidth / 2;
          else if (element.textAlign === 'right') textX += elementWidth;
          
          ctx.fillText(text, textX, elementY);
          break;

        case 'barcode':
          const barcodeCanvas = document.createElement('canvas');
          const barcodeValue = element.dataField ? getFieldValue(product, element.dataField) : element.content;
          generateBarcode(barcodeCanvas, barcodeValue, element.barcodeType || 'CODE128', elementWidth, elementHeight, element.showValue || false);
          ctx.drawImage(barcodeCanvas, elementX, elementY, elementWidth, elementHeight);
          break;

        case 'qrcode':
          const qrValue = element.dataField ? getFieldValue(product, element.dataField) : element.content;
          generateQRCode(ctx, qrValue, elementX, elementY, Math.min(elementWidth, elementHeight));
          break;

        case 'line':
          ctx.strokeStyle = element.borderColor || '#000000';
          ctx.lineWidth = element.borderWidth || 1;
          ctx.beginPath();
          ctx.moveTo(elementX, elementY);
          ctx.lineTo(elementX + elementWidth, elementY);
          ctx.stroke();
          break;

        case 'rectangle':
          if (element.backgroundColor) {
            ctx.fillStyle = element.backgroundColor;
            ctx.fillRect(elementX, elementY, elementWidth, elementHeight);
          }
          if (element.borderWidth && element.borderWidth > 0) {
            ctx.strokeStyle = element.borderColor || '#000000';
            ctx.lineWidth = element.borderWidth;
            ctx.strokeRect(elementX, elementY, elementWidth, elementHeight);
          }
          break;
      }

      ctx.restore();
    });
  };

  // Render preview
  const renderPreview = () => {
    if (!canvasRef.current || selectedProducts.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labelWidth = mmToPixels(selectedTemplate.width);
    const labelHeight = mmToPixels(selectedTemplate.height);
    const margin = 10;
    
    const labelsPerRow = Math.floor((canvas.width - margin) / (labelWidth + margin));
    const totalLabels = selectedProducts.length * copiesPerProduct;
    const rows = Math.ceil(totalLabels / labelsPerRow);
    
    canvas.height = rows * (labelHeight + margin) + margin;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let labelIndex = 0;
    selectedProducts.forEach(product => {
      for (let copy = 0; copy < copiesPerProduct; copy++) {
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;
        const x = margin + col * (labelWidth + margin);
        const y = margin + row * (labelHeight + margin);
        
        drawLabel(ctx, selectedTemplate, product, x, y);
        labelIndex++;
      }
    });
  };

  // Handle element drag
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    setSelectedElement(elementId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setSelectedTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === selectedElement 
          ? { ...el, x: el.x + deltaX / 3.78, y: el.y + deltaY / 3.78 } // Convert pixels to mm
          : el
      )
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add new element
  const addElement = (type: LabelElement['type']) => {
    const newElement: LabelElement = {
      id: `element-${Date.now()}`,
      type,
      x: selectedTemplate.width / 2,
      y: selectedTemplate.height / 2,
      width: type === 'text' ? 30 : 20,
      height: type === 'text' ? 8 : 20,
      content: type === 'text' ? 'New Text' : '',
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'center'
    };

    setSelectedTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));

    setEditingElement(newElement);
    setIsElementDialogOpen(true);
  };

  // Delete element
  const deleteElement = (elementId: string) => {
    setSelectedTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId)
    }));
    setSelectedElement(null);
  };

  // Save element changes
  const saveElementChanges = () => {
    if (!editingElement) return;

    setSelectedTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === editingElement.id ? editingElement : el
      )
    }));

    setIsElementDialogOpen(false);
    setEditingElement(null);
  };

  // Save template
  const saveTemplate = () => {
    const templateToSave = { ...selectedTemplate };
    if (!templateToSave.id || templateToSave.id.startsWith('temp-')) {
      templateToSave.id = `template-${Date.now()}`;
    }
    templateToSave.updatedAt = new Date().toISOString();

    setTemplates(prev => {
      const existing = prev.find(t => t.id === templateToSave.id);
      if (existing) {
        return prev.map(t => t.id === templateToSave.id ? templateToSave : t);
      }
      return [...prev, templateToSave];
    });

    // Save to localStorage
    localStorage.setItem('labelTemplates', JSON.stringify(templates));
    
    toast({ title: "Template saved successfully!" });
  };

  // Export template
  const exportTemplate = () => {
    const dataStr = JSON.stringify(selectedTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `label-template-${selectedTemplate.name.replace(/\s+/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({ title: "Template exported successfully!" });
  };

  // Import template
  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string);
        template.id = `imported-${Date.now()}`;
        setTemplates(prev => [...prev, template]);
        setSelectedTemplate(template);
        toast({ title: "Template imported successfully!" });
      } catch (error) {
        toast({ 
          title: "Error importing template", 
          description: "Invalid template file",
          variant: "destructive" 
        });
      }
    };
    reader.readAsText(file);
  };

  // Print labels
  const printLabels = () => {
    if (selectedProducts.length === 0) {
      toast({ 
        title: "No products selected", 
        description: "Please select products to print labels",
        variant: "destructive" 
      });
      return;
    }

    // In a real implementation, this would send to the printer
    // For now, we'll open the print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelWidth = selectedTemplate.width;
    const labelHeight = selectedTemplate.height;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels</title>
        <style>
          @page {
            size: ${selectedPrinter.paperWidth}mm ${selectedPrinter.paperHeight}mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            position: relative;
            overflow: hidden;
            page-break-inside: avoid;
            display: inline-block;
            margin: 2mm;
            background: ${selectedTemplate.backgroundColor};
            ${selectedTemplate.borderWidth > 0 ? `border: ${selectedTemplate.borderWidth}px solid ${selectedTemplate.borderColor};` : ''}
          }
          .element {
            position: absolute;
          }
          ${customCSS}
        </style>
      </head>
      <body onload="window.print(); window.close();">
    `;

    selectedProducts.forEach(product => {
      for (let copy = 0; copy < copiesPerProduct; copy++) {
        html += '<div class="label">';
        
        selectedTemplate.elements.forEach(element => {
          const value = element.dataField ? getFieldValue(product, element.dataField) : element.content;
          const style = `
            left: ${element.x - selectedTemplate.width / 2}mm;
            top: ${element.y}mm;
            width: ${element.width}mm;
            height: ${element.height}mm;
            ${element.rotation ? `transform: rotate(${element.rotation}deg);` : ''}
          `;

          switch (element.type) {
            case 'text':
              html += `
                <div class="element" style="${style}; 
                  font-size: ${element.fontSize}px; 
                  font-weight: ${element.fontWeight}; 
                  text-align: ${element.textAlign};">
                  ${value}
                </div>
              `;
              break;
            case 'barcode':
              // In real implementation, generate barcode image
              html += `
                <div class="element" style="${style}; text-align: center;">
                  <div style="background: repeating-linear-gradient(90deg, black 0px, black 2px, white 2px, white 4px); height: 70%; margin-bottom: 2px;"></div>
                  ${element.showValue ? `<div style="font-size: 10px;">${value}</div>` : ''}
                </div>
              `;
              break;
            case 'qrcode':
              html += `
                <div class="element" style="${style}; background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') repeat; background-size: 3px 3px;"></div>
              `;
              break;
            case 'line':
              html += `
                <div class="element" style="${style}; border-top: ${element.borderWidth}px solid ${element.borderColor};"></div>
              `;
              break;
            case 'rectangle':
              html += `
                <div class="element" style="${style}; 
                  ${element.backgroundColor ? `background: ${element.backgroundColor};` : ''}
                  ${element.borderWidth ? `border: ${element.borderWidth}px solid ${element.borderColor};` : ''}">
                </div>
              `;
              break;
          }
        });
        
        html += '</div>';
      }
    });

    html += '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    toast({ 
      title: "Printing labels...", 
      description: `Sending ${selectedProducts.length * copiesPerProduct} labels to ${selectedPrinter.name}`
    });
  };

  // Load templates from localStorage on mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('labelTemplates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates(parsed);
      } catch (error) {
        console.error('Error loading saved templates:', error);
      }
    }
  }, []);

  // Update preview when selection changes
  useEffect(() => {
    renderPreview();
  }, [selectedProducts, selectedTemplate, copiesPerProduct]);

  return (
    <DashboardLayout title="Label Printing System" icon={<PrinterIcon />}>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package2Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <CheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedProducts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Labels to Print</CardTitle>
              <TagIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedProducts.length * copiesPerProduct}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel - Label Designer */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Label Designer</CardTitle>
                    <CardDescription>Design and customize your label templates</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTemplateDialogOpen(true)}
                    >
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Template Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveTemplate}
                    >
                      <SaveIcon className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportTemplate}
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <label>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <span>
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Import
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={importTemplate}
                      />
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Template Selection */}
                <div className="mb-4">
                  <Label>Template</Label>
                  <Select
                    value={selectedTemplate.id}
                    onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      if (template) setSelectedTemplate(template);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {template.width}×{template.height}mm
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Design Canvas */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addElement('text')}
                      >
                        <TypeIcon className="h-4 w-4 mr-1" />
                        Text
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addElement('barcode')}
                      >
                        <Barcode className="h-4 w-4 mr-1" />
                        Barcode
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addElement('qrcode')}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addElement('line')}
                      >
                        <MinusIcon className="h-4 w-4 mr-1" />
                        Line
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addElement('rectangle')}
                      >
                        <BoxIcon className="h-4 w-4 mr-1" />
                        Rectangle
                      </Button>
                    </div>
                    {selectedElement && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const element = selectedTemplate.elements.find(el => el.id === selectedElement);
                            if (element) {
                              setEditingElement(element);
                              setIsElementDialogOpen(true);
                            }
                          }}
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteElement(selectedElement)}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Label Preview */}
                  <div 
                    className="relative bg-white mx-auto cursor-pointer overflow-hidden"
                    style={{
                      width: `${mmToPixels(selectedTemplate.width)}px`,
                      height: `${mmToPixels(selectedTemplate.height)}px`,
                      backgroundColor: selectedTemplate.backgroundColor,
                      border: selectedTemplate.borderWidth > 0 
                        ? `${selectedTemplate.borderWidth}px solid ${selectedTemplate.borderColor}`
                        : undefined
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {selectedTemplate.elements.map(element => {
                      const isSelected = selectedElement === element.id;
                      const elementStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${mmToPixels(element.x - selectedTemplate.width / 2)}px`,
                        top: `${mmToPixels(element.y)}px`,
                        width: `${mmToPixels(element.width)}px`,
                        height: `${mmToPixels(element.height)}px`,
                        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                        cursor: 'move',
                        border: isSelected ? '2px dashed #0066cc' : '1px dashed transparent',
                        padding: '2px'
                      };

                      return (
                        <div
                          key={element.id}
                          style={elementStyle}
                          onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                          onClick={() => setSelectedElement(element.id)}
                        >
                          {element.type === 'text' && (
                            <div
                              style={{
                                fontSize: `${element.fontSize}px`,
                                fontWeight: element.fontWeight,
                                textAlign: element.textAlign,
                                width: '100%',
                                height: '100%',
                                overflow: 'hidden'
                              }}
                            >
                              {element.dataField ? `{${element.dataField}}` : element.content}
                            </div>
                          )}
                          {element.type === 'barcode' && (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                              <Barcode className="h-8 w-20" />
                              {element.showValue && (
                                <span className="text-xs">{element.dataField ? `{${element.dataField}}` : '123456789'}</span>
                              )}
                            </div>
                          )}
                          {element.type === 'qrcode' && (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <QrCode className="h-10 w-10" />
                            </div>
                          )}
                          {element.type === 'line' && (
                            <div
                              style={{
                                borderTop: `${element.borderWidth || 1}px solid ${element.borderColor || '#000'}`,
                                width: '100%'
                              }}
                            />
                          )}
                          {element.type === 'rectangle' && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: element.backgroundColor,
                                border: element.borderWidth 
                                  ? `${element.borderWidth}px solid ${element.borderColor || '#000'}` 
                                  : undefined
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center text-xs text-muted-foreground mt-2">
                    {selectedTemplate.width} × {selectedTemplate.height} mm
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Printer Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Printer Settings</CardTitle>
                <CardDescription>Configure your label printer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Printer</Label>
                    <Select
                      value={selectedPrinter.id}
                      onValueChange={(value) => {
                        const printer = printers.find(p => p.id === value);
                        if (printer) setSelectedPrinter(printer);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map(printer => (
                          <SelectItem key={printer.id} value={printer.id}>
                            <div className="flex items-center gap-2">
                              {printer.connection === 'network' ? (
                                <Wifi className="h-4 w-4" />
                              ) : (
                                <WifiOff className="h-4 w-4" />
                              )}
                              <span>{printer.name}</span>
                              {printer.isDefault && (
                                <Badge variant="secondary" className="ml-2">Default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Paper Size</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {selectedPrinter.paperWidth} × {selectedPrinter.paperHeight} mm
                      </Badge>
                    </div>
                  </div>

                  {selectedPrinter.connection === 'network' && (
                    <>
                      <div>
                        <Label>IP Address</Label>
                        <Input value={selectedPrinter.ipAddress} readOnly />
                      </div>
                      <div>
                        <Label>Port</Label>
                        <Input value={selectedPrinter.port} readOnly />
                      </div>
                    </>
                  )}

                  <div>
                    <Label>Print Density</Label>
                    <Slider
                      value={[selectedPrinter.printDensity]}
                      min={1}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Print Speed</Label>
                    <Slider
                      value={[selectedPrinter.printSpeed]}
                      min={1}
                      max={14}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Copies per Product</Label>
                    <Input
                      type="number"
                      min="1"
                      value={copiesPerProduct}
                      onChange={(e) => setCopiesPerProduct(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={printLabels}
                    disabled={selectedProducts.length === 0}
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print Labels ({selectedProducts.length * copiesPerProduct})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Product Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Selection</CardTitle>
                <CardDescription>Select products to print labels for</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name, SKU, or barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="All Categories" />
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

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-selected"
                        checked={showOnlySelected}
                        onCheckedChange={setShowOnlySelected}
                      />
                      <Label htmlFor="show-selected">Show only selected</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProducts([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* Product List */}
                <ScrollArea className="h-[600px]">
                  {productsLoading ? (
                    <div className="text-center py-8">Loading products...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No products found
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' ? 'grid gap-2 grid-cols-1' : 'space-y-2'}>
                      {filteredProducts.map((product: Product) => {
                        const isSelected = selectedProducts.some(p => p.id === product.id);
                        
                        return (
                          <div
                            key={product.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                              } else {
                                setSelectedProducts(prev => [...prev, product]);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {product.sku}
                                  {product.barcode && ` • ${product.barcode}`}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-sm font-medium">₹{product.price}</span>
                                  {product.mrp && product.mrp !== product.price && (
                                    <span className="text-sm text-muted-foreground line-through">
                                      ₹{product.mrp}
                                    </span>
                                  )}
                                  {product.stockQuantity !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                      Stock: {product.stockQuantity}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {}}
                                className="pointer-events-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Template Settings Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Template Settings</DialogTitle>
              <DialogDescription>
                Configure the basic settings for your label template
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Width (mm)</Label>
                    <Input
                      type="number"
                      value={selectedTemplate.width}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, width: parseInt(e.target.value) || 80 }))}
                    />
                  </div>
                  <div>
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      value={selectedTemplate.height}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, height: parseInt(e.target.value) || 40 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedTemplate.backgroundColor}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-16 h-9 p-1"
                    />
                    <Input
                      value={selectedTemplate.backgroundColor}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Border</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={selectedTemplate.borderWidth}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, borderWidth: parseInt(e.target.value) || 0 }))}
                      className="w-20"
                    />
                    <Input
                      type="color"
                      value={selectedTemplate.borderColor}
                      onChange={(e) => setSelectedTemplate(prev => ({ ...prev, borderColor: e.target.value }))}
                      className="w-16 h-9 p-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Custom CSS</Label>
                <Textarea
                  placeholder="Add custom CSS styles..."
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                saveTemplate();
                setIsTemplateDialogOpen(false);
              }}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Element Settings Dialog */}
        <Dialog open={isElementDialogOpen} onOpenChange={setIsElementDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Element Settings</DialogTitle>
              <DialogDescription>
                Configure the properties of the selected element
              </DialogDescription>
            </DialogHeader>
            {editingElement && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Position X (mm)</Label>
                    <Input
                      type="number"
                      value={editingElement.x}
                      onChange={(e) => setEditingElement(prev => ({ ...prev!, x: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Position Y (mm)</Label>
                    <Input
                      type="number"
                      value={editingElement.y}
                      onChange={(e) => setEditingElement(prev => ({ ...prev!, y: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Width (mm)</Label>
                    <Input
                      type="number"
                      value={editingElement.width}
                      onChange={(e) => setEditingElement(prev => ({ ...prev!, width: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                  <div>
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      value={editingElement.height}
                      onChange={(e) => setEditingElement(prev => ({ ...prev!, height: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                </div>

                {editingElement.type === 'text' && (
                  <>
                    <div>
                      <Label>Text Content</Label>
                      <Input
                        value={editingElement.content}
                        onChange={(e) => setEditingElement(prev => ({ ...prev!, content: e.target.value }))}
                        placeholder="Enter text or select data field"
                      />
                    </div>
                    <div>
                      <Label>Data Field</Label>
                      <Select
                        value={editingElement.dataField || ''}
                        onValueChange={(value) => setEditingElement(prev => ({ ...prev!, dataField: value || undefined }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select data field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None (Use text content)</SelectItem>
                          {dataFields.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Font Size</Label>
                        <Input
                          type="number"
                          value={editingElement.fontSize}
                          onChange={(e) => setEditingElement(prev => ({ ...prev!, fontSize: parseInt(e.target.value) || 12 }))}
                        />
                      </div>
                      <div>
                        <Label>Font Weight</Label>
                        <Select
                          value={editingElement.fontWeight}
                          onValueChange={(value: 'normal' | 'bold') => setEditingElement(prev => ({ ...prev!, fontWeight: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Alignment</Label>
                        <Select
                          value={editingElement.textAlign}
                          onValueChange={(value: 'left' | 'center' | 'right') => setEditingElement(prev => ({ ...prev!, textAlign: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {editingElement.type === 'barcode' && (
                  <>
                    <div>
                      <Label>Data Field</Label>
                      <Select
                        value={editingElement.dataField || 'barcode'}
                        onValueChange={(value) => setEditingElement(prev => ({ ...prev!, dataField: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="barcode">Barcode</SelectItem>
                          <SelectItem value="sku">SKU</SelectItem>
                          <SelectItem value="custom">Custom Value</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Barcode Type</Label>
                        <Select
                          value={editingElement.barcodeType}
                          onValueChange={(value: 'CODE128' | 'EAN13' | 'CODE39' | 'UPC') => setEditingElement(prev => ({ ...prev!, barcodeType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CODE128">CODE128</SelectItem>
                            <SelectItem value="EAN13">EAN-13</SelectItem>
                            <SelectItem value="CODE39">CODE39</SelectItem>
                            <SelectItem value="UPC">UPC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox
                          id="show-value"
                          checked={editingElement.showValue}
                          onCheckedChange={(checked) => setEditingElement(prev => ({ ...prev!, showValue: !!checked }))}
                        />
                        <Label htmlFor="show-value">Show Value</Label>
                      </div>
                    </div>
                  </>
                )}

                {editingElement.type === 'qrcode' && (
                  <div>
                    <Label>Data Field</Label>
                    <Select
                      value={editingElement.dataField || 'barcode'}
                      onValueChange={(value) => setEditingElement(prev => ({ ...prev!, dataField: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barcode">Barcode</SelectItem>
                        <SelectItem value="sku">SKU</SelectItem>
                        <SelectItem value="url">Product URL</SelectItem>
                        <SelectItem value="custom">Custom Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(editingElement.type === 'line' || editingElement.type === 'rectangle') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Border Width</Label>
                      <Input
                        type="number"
                        value={editingElement.borderWidth || 1}
                        onChange={(e) => setEditingElement(prev => ({ ...prev!, borderWidth: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <Label>Border Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editingElement.borderColor || '#000000'}
                          onChange={(e) => setEditingElement(prev => ({ ...prev!, borderColor: e.target.value }))}
                          className="w-16 h-9 p-1"
                        />
                        <Input
                          value={editingElement.borderColor || '#000000'}
                          onChange={(e) => setEditingElement(prev => ({ ...prev!, borderColor: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingElement.type === 'rectangle' && (
                  <div>
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editingElement.backgroundColor || '#ffffff'}
                        onChange={(e) => setEditingElement(prev => ({ ...prev!, backgroundColor: e.target.value }))}
                        className="w-16 h-9 p-1"
                      />
                      <Input
                        value={editingElement.backgroundColor || '#ffffff'}
                        onChange={(e) => setEditingElement(prev => ({ ...prev!, backgroundColor: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Rotation (degrees)</Label>
                  <Slider
                    value={[editingElement.rotation || 0]}
                    min={-180}
                    max={180}
                    step={15}
                    onValueChange={([value]) => setEditingElement(prev => ({ ...prev!, rotation: value }))}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsElementDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveElementChanges}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Print Preview</DialogTitle>
              <DialogDescription>
                Preview of {selectedProducts.length * copiesPerProduct} labels
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <div className="p-4" ref={previewRef}>
                <canvas
                  ref={canvasRef}
                  width={800}
                  className="mx-auto border"
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={printLabels}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}