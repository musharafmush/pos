
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
import { PrinterIcon, TagIcon, SearchIcon, SettingsIcon, PackageIcon, ShipIcon, AnchorIcon, WavesIcon, CompassIcon, MapIcon } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  description?: string;
  category?: string | { id: number; name: string; description?: string; createdAt?: string };
  weight?: number;
  dimensions?: string;
  origin?: string;
  destination?: string;
  vessel?: string;
  container?: string;
  hazmat?: boolean;
  temperature?: string;
}

interface MaritimeLabel {
  id: string;
  type: 'shipping' | 'container' | 'hazmat' | 'temperature' | 'marine_equipment' | 'navigation';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  fields: string[];
}

const maritimeLabelTypes: MaritimeLabel[] = [
  {
    id: 'shipping',
    type: 'shipping',
    title: 'Shipping Labels',
    description: 'Ocean freight and cargo labels',
    icon: ShipIcon,
    fields: ['origin', 'destination', 'vessel', 'container', 'weight', 'dimensions']
  },
  {
    id: 'container',
    type: 'container',
    title: 'Container Labels',
    description: 'ISO container identification',
    icon: PackageIcon,
    fields: ['container', 'weight', 'dimensions', 'seal_number', 'cargo_type']
  },
  {
    id: 'hazmat',
    type: 'hazmat',
    title: 'Hazmat Labels',
    description: 'Dangerous goods maritime transport',
    icon: WavesIcon,
    fields: ['hazmat_class', 'un_number', 'proper_shipping_name', 'packing_group']
  },
  {
    id: 'temperature',
    type: 'temperature',
    title: 'Temperature Control',
    description: 'Reefer and temperature-sensitive cargo',
    icon: CompassIcon,
    fields: ['temperature', 'humidity', 'ventilation', 'monitoring']
  },
  {
    id: 'marine_equipment',
    type: 'marine_equipment',
    title: 'Marine Equipment',
    description: 'Ship equipment and parts',
    icon: AnchorIcon,
    fields: ['equipment_type', 'certification', 'inspection_date', 'serial_number']
  },
  {
    id: 'navigation',
    type: 'navigation',
    title: 'Navigation Labels',
    description: 'Chart and navigation equipment',
    icon: MapIcon,
    fields: ['chart_number', 'edition', 'correction_date', 'scale']
  }
];

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
  const [isMaritimeLabelDialogOpen, setIsMaritimeLabelDialogOpen] = useState(false);
  const [selectedMaritimeType, setSelectedMaritimeType] = useState<string>("");
  
  // Ocean/Maritime specific states
  const [includeOrigin, setIncludeOrigin] = useState(true);
  const [includeDestination, setIncludeDestination] = useState(true);
  const [includeVessel, setIncludeVessel] = useState(false);
  const [includeContainer, setIncludeContainer] = useState(false);
  const [includeWeight, setIncludeWeight] = useState(true);
  const [includeDimensions, setIncludeDimensions] = useState(false);
  const [includeTemperature, setIncludeTemperature] = useState(false);
  const [includeHazmat, setIncludeHazmat] = useState(false);
  const [maritimeFilter, setMaritimeFilter] = useState("all");
  
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

  // Maritime label form data
  const [maritimeFormData, setMaritimeFormData] = useState({
    origin: '',
    destination: '',
    vessel: '',
    container: '',
    weight: '',
    dimensions: '',
    temperature: '',
    hazmat_class: '',
    un_number: '',
    proper_shipping_name: '',
    packing_group: '',
    equipment_type: '',
    certification: '',
    inspection_date: '',
    serial_number: '',
    chart_number: '',
    edition: '',
    correction_date: '',
    scale: '',
    seal_number: '',
    cargo_type: '',
    humidity: '',
    ventilation: '',
    monitoring: ''
  });

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

  // Filter products with maritime criteria
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (maritimeFilter === "all") return matchesSearch;
    
    const categoryName = typeof product.category === 'object' ? 
      product.category?.name?.toLowerCase() : 
      product.category?.toLowerCase();
    
    switch (maritimeFilter) {
      case "marine":
        return matchesSearch && (categoryName?.includes('marine') || categoryName?.includes('ocean') || categoryName?.includes('ship'));
      case "shipping":
        return matchesSearch && (categoryName?.includes('shipping') || categoryName?.includes('freight') || categoryName?.includes('cargo'));
      case "navigation":
        return matchesSearch && (categoryName?.includes('navigation') || categoryName?.includes('chart') || categoryName?.includes('compass'));
      case "safety":
        return matchesSearch && (categoryName?.includes('safety') || categoryName?.includes('emergency') || categoryName?.includes('life'));
      default:
        return matchesSearch;
    }
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
    const barcodePattern = sku.padEnd(12, '0').substring(0, 12);
    return barcodePattern;
  };

  // Generate maritime container number
  const generateContainerNumber = () => {
    const prefix = "OCLU";
    const sequence = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const checkDigit = Math.floor(Math.random() * 10);
    return `${prefix}${sequence}${checkDigit}`;
  };

  // Generate IMO number
  const generateIMONumber = () => {
    const prefix = "IMO";
    const number = Math.floor(Math.random() * 1000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
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

  // Execute print with maritime enhancements
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

    const useCustomConfig = sheetWidth && sheetHeight && labelWidth && labelHeight;
    const finalLabelWidth = useCustomConfig ? `${labelWidth}mm` : (labelSize === 'small' ? '40mm' : labelSize === 'large' ? '60mm' : '50mm');
    const finalLabelHeight = useCustomConfig ? `${labelHeight}mm` : (labelSize === 'small' ? '25mm' : labelSize === 'large' ? '35mm' : '30mm');
    const finalFontSize = fontSize.replace('pt', 'px');
    const finalBarcodeWidth = useCustomConfig ? `${barcodeWidth}px` : '60px';
    const finalBarcodeHeight = useCustomConfig ? `${barcodeHeight}px` : '20px';
    
    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map((_, index) => `
        <div class="product-label ocean-label" style="
          width: ${finalLabelWidth};
          height: ${finalLabelHeight};
          border: 2px solid #1e40af;
          padding: 2mm;
          margin: 0;
          display: inline-block;
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          page-break-inside: avoid;
          box-sizing: border-box;
          vertical-align: top;
          border-radius: 3px;
          position: relative;
          box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
        ">
          <!-- Ocean Header -->
          <div style="
            background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 1mm;
            margin: -2mm -2mm 1mm -2mm;
            font-size: ${parseInt(finalFontSize) - 2}px;
            font-weight: bold;
            text-align: center;
            border-radius: 3px 3px 0 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
          ">
            🌊 MARITIME CARGO LABEL 🚢
          </div>
          
          <!-- Product Info -->
          <div style="font-weight: bold; font-size: ${finalFontSize}; margin-bottom: 1mm; line-height: 1.2; color: #1e40af;">
            ${(product.name || 'Unnamed Product').length > 25 ? (product.name || 'Unnamed Product').substring(0, 25) + '...' : (product.name || 'Unnamed Product')}
          </div>
          
          <div style="font-size: ${parseInt(finalFontSize) - 2}px; color: #374151; margin-bottom: 1mm;">
            SKU: ${product.sku || 'N/A'}
          </div>
          
          ${includeDescription && product.description ? 
            `<div style="font-size: ${parseInt(finalFontSize) - 3}px; color: #6b7280; margin-bottom: 1mm; line-height: 1.1;">
              ${product.description.substring(0, 30)}...
            </div>` : ''
          }
          
          ${includePrice ? 
            `<div style="font-size: ${parseInt(finalFontSize) + 1}px; font-weight: bold; color: #059669; margin-bottom: 1mm;">
              ₹${Number(product.price || 0).toFixed(2)}
            </div>` : ''
          }
          
          <!-- Maritime Information Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; font-size: ${parseInt(finalFontSize) - 3}px; margin-bottom: 1mm;">
            ${includeOrigin ? 
              `<div style="background: #fef3c7; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #f59e0b;">
                <strong>🏭 FROM:</strong><br>
                ${maritimeFormData.origin || 'Mumbai Port'}
              </div>` : ''
            }
            
            ${includeDestination ? 
              `<div style="background: #dcfce7; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #16a34a;">
                <strong>🎯 TO:</strong><br>
                ${maritimeFormData.destination || 'Singapore Port'}
              </div>` : ''
            }
            
            ${includeVessel ? 
              `<div style="background: #dbeafe; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #2563eb;">
                <strong>🚢 VESSEL:</strong><br>
                ${maritimeFormData.vessel || 'MV Ocean Explorer'}
              </div>` : ''
            }
            
            ${includeContainer ? 
              `<div style="background: #f3e8ff; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #9333ea;">
                <strong>📦 CONTAINER:</strong><br>
                ${maritimeFormData.container || generateContainerNumber()}
              </div>` : ''
            }
            
            ${includeWeight ? 
              `<div style="background: #fecaca; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #dc2626;">
                <strong>⚖️ WEIGHT:</strong><br>
                ${maritimeFormData.weight || (product.weight ? `${product.weight}kg` : '25.5kg')}
              </div>` : ''
            }
            
            ${includeDimensions ? 
              `<div style="background: #fed7aa; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #ea580c;">
                <strong>📏 DIM:</strong><br>
                ${maritimeFormData.dimensions || product.dimensions || '120x80x60cm'}
              </div>` : ''
            }
            
            ${includeTemperature ? 
              `<div style="background: #bfdbfe; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #3b82f6;">
                <strong>🌡️ TEMP:</strong><br>
                ${maritimeFormData.temperature || '-18°C'}
              </div>` : ''
            }
            
            ${includeHazmat && product.hazmat ? 
              `<div style="background: #fef2f2; padding: 0.5mm; border-radius: 2px; border-left: 2px solid #ef4444; color: #dc2626;">
                <strong>⚠️ HAZMAT:</strong><br>
                Class ${maritimeFormData.hazmat_class || '3'}
              </div>` : ''
            }
          </div>
          
          <!-- Maritime Codes Section -->
          <div style="background: #f8fafc; border: 1px dashed #64748b; padding: 1mm; margin-bottom: 1mm; border-radius: 2px;">
            <div style="font-size: ${parseInt(finalFontSize) - 4}px; color: #475569; display: grid; grid-template-columns: 1fr 1fr; gap: 1mm;">
              <div>
                <strong>IMO:</strong> ${generateIMONumber()}
              </div>
              <div>
                <strong>MMSI:</strong> ${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}
              </div>
              <div>
                <strong>B/L:</strong> ${product.sku}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}
              </div>
              <div style="color: #059669;">
                <strong>📅 ${new Date().toLocaleDateString()}</strong>
              </div>
            </div>
          </div>
          
          ${includeBarcode ? 
            `<div style="text-align: center; margin-top: 1mm;">
              <div style="
                font-family: 'Courier New', monospace; 
                font-size: ${parseInt(finalFontSize) - 4}px; 
                letter-spacing: 0.5px; 
                border: 1px solid #1e40af; 
                padding: 0.5mm; 
                background: #f8fafc;
                width: ${finalBarcodeWidth};
                height: ${finalBarcodeHeight};
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                color: #1e40af;
                font-weight: bold;
              ">
                ${generateBarcode(product.sku || '')}
              </div>
            </div>` : ''
          }
          
          <!-- Ocean Footer -->
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 0.5mm;
            font-size: ${parseInt(finalFontSize) - 5}px;
            text-align: center;
            border-radius: 0 0 3px 3px;
            margin: 0 -2mm -2mm -2mm;
          ">
            🌊 OCEANOGRAPHIC CARGO SYSTEM 🌊
          </div>
        </div>
      `).join('');
    }).join('');

    // Create print window with maritime styling
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const pageWidth = useCustomConfig ? `${sheetWidth}mm` : 'A4';
      const pageHeight = useCustomConfig ? `${sheetHeight}mm` : 'auto';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Maritime Cargo Labels</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { 
                margin: 0 !important; 
                padding: 0 !important; 
                box-sizing: border-box !important; 
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Arial', sans-serif !important;
                line-height: 1 !important;
                background: #f0f9ff !important;
                color: #1e40af !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                ${useCustomConfig ? `width: ${sheetWidth}mm !important; height: ${sheetHeight}mm !important;` : ''}
              }
              .ocean-label {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                border-radius: 3px !important;
                color: #1e40af !important;
                margin: 0 !important;
                padding: 2mm !important;
                position: relative !important;
                display: inline-block !important;
                vertical-align: top !important;
                border: 2px solid #1e40af !important;
                box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1) !important;
              }
              .labels-container {
                margin: 0 !important;
                padding: 5mm !important;
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%) !important;
                ${useCustomConfig ? 
                  `display: grid !important;
                   grid-template-columns: repeat(${totalCols}, 1fr) !important;
                   grid-template-rows: repeat(${totalRows}, 1fr) !important;
                   gap: 2mm !important;
                   width: ${sheetWidth}mm !important; 
                   height: ${sheetHeight}mm !important;` : 
                  'display: flex !important; flex-wrap: wrap !important; align-content: flex-start !important; gap: 2mm !important;'
                }
              }
              @page { 
                margin: 0 !important; 
                padding: 0 !important;
                size: ${useCustomConfig ? `${sheetWidth}mm ${sheetHeight}mm` : 'A4'} !important;
                background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%) !important;
                border: none !important;
              }
              @media print {
                * { 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body { 
                  width: 100% !important;
                  height: 100% !important;
                  margin: 0 !important; 
                  padding: 0 !important; 
                  font-size: 12px !important;
                  background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%) !important;
                  color: #1e40af !important;
                  overflow: hidden !important;
                  border: none !important;
                }
                .ocean-label { 
                  margin: 0 !important; 
                  padding: 2mm !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
                  color: #1e40af !important;
                  position: relative !important;
                  border-radius: 3px !important;
                  border: 2px solid #1e40af !important;
                  box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1) !important;
                }
                .labels-container {
                  margin: 0 !important;
                  padding: 5mm !important;
                  width: 100% !important;
                  height: 100% !important;
                  border: none !important;
                  background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%) !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="labels-container">
              ${printContent}
            </div>
            <script>
              document.title = 'Maritime Cargo Labels';
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
              window.onafterprint = function() {
                setTimeout(() => {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `;
      
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
    } else {
      toast({
        title: "Print window blocked",
        description: "Please allow popups for this site to print labels",
        variant: "destructive",
      });
    }

    setIsPrintDialogOpen(false);
    toast({
      title: "Maritime labels sent to printer",
      description: `${selectedProducts.length * copies} ocean cargo labels prepared for printing`,
    });
  };

  // Create maritime label
  const createMaritimeLabel = () => {
    if (!selectedMaritimeType) {
      toast({
        title: "No label type selected",
        description: "Please select a maritime label type",
        variant: "destructive",
      });
      return;
    }

    const labelType = maritimeLabelTypes.find(t => t.id === selectedMaritimeType);
    if (!labelType) return;

    // Here you would typically create the maritime label
    // For now, we'll just show a success message
    toast({
      title: "Maritime label created",
      description: `${labelType.title} has been created successfully`,
    });
    
    setIsMaritimeLabelDialogOpen(false);
    setSelectedMaritimeType("");
    setMaritimeFormData({
      origin: '',
      destination: '',
      vessel: '',
      container: '',
      weight: '',
      dimensions: '',
      temperature: '',
      hazmat_class: '',
      un_number: '',
      proper_shipping_name: '',
      packing_group: '',
      equipment_type: '',
      certification: '',
      inspection_date: '',
      serial_number: '',
      chart_number: '',
      edition: '',
      correction_date: '',
      scale: '',
      seal_number: '',
      cargo_type: '',
      humidity: '',
      ventilation: '',
      monitoring: ''
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Enhanced Header with Ocean Theme */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <div className="flex items-center gap-1">
                <WavesIcon className="h-8 w-8 text-blue-600" />
                <ShipIcon className="h-6 w-6 text-blue-500" />
              </div>
              Maritime Label & Cargo System
            </h1>
            <p className="text-muted-foreground">
              🌊 Professional oceanographic cargo labels with maritime compliance 🚢
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsMaritimeLabelDialogOpen(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <ShipIcon className="h-4 w-4 mr-2" />
              Maritime Labels
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsCustomLabelDialogOpen(true)}
              className="border-teal-600 text-teal-600 hover:bg-teal-50"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Custom Labels
            </Button>
            <Button 
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Ocean Labels ({selectedProducts.length})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enhanced Settings Panel with Maritime Options */}
          <Card className="lg:col-span-1 border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CompassIcon className="h-5 w-5 text-blue-600" />
                Maritime Settings
              </CardTitle>
              <CardDescription>
                Configure ocean cargo label settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Maritime Filter */}
              <div className="space-y-2">
                <Label htmlFor="maritime-filter" className="text-sm font-medium">Product Category</Label>
                <Select value={maritimeFilter} onValueChange={setMaritimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌊 All Products</SelectItem>
                    <SelectItem value="marine">🚢 Marine Equipment</SelectItem>
                    <SelectItem value="shipping">📦 Shipping & Cargo</SelectItem>
                    <SelectItem value="navigation">🧭 Navigation Equipment</SelectItem>
                    <SelectItem value="safety">🦺 Maritime Safety</SelectItem>
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
                    <SelectItem value="small">🏷️ Small (2" x 1.2")</SelectItem>
                    <SelectItem value="standard">🏷️ Standard (2.5" x 1.5")</SelectItem>
                    <SelectItem value="large">🏷️ Large (3" x 1.8")</SelectItem>
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

              {/* Standard Label Content Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">📋 Standard Information</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-barcode"
                    checked={includeBarcode}
                    onCheckedChange={setIncludeBarcode}
                  />
                  <Label htmlFor="include-barcode" className="text-sm">
                    📊 Barcode
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-price"
                    checked={includePrice}
                    onCheckedChange={setIncludePrice}
                  />
                  <Label htmlFor="include-price" className="text-sm">
                    💰 Price
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-description"
                    checked={includeDescription}
                    onCheckedChange={setIncludeDescription}
                  />
                  <Label htmlFor="include-description" className="text-sm">
                    📝 Description
                  </Label>
                </div>
              </div>

              <Separator className="bg-blue-200" />

              {/* Maritime-Specific Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-blue-700">🌊 Maritime Information</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-origin"
                    checked={includeOrigin}
                    onCheckedChange={setIncludeOrigin}
                  />
                  <Label htmlFor="include-origin" className="text-sm">
                    🏭 Origin Port
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-destination"
                    checked={includeDestination}
                    onCheckedChange={setIncludeDestination}
                  />
                  <Label htmlFor="include-destination" className="text-sm">
                    🎯 Destination Port
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-vessel"
                    checked={includeVessel}
                    onCheckedChange={setIncludeVessel}
                  />
                  <Label htmlFor="include-vessel" className="text-sm">
                    🚢 Vessel Information
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-container"
                    checked={includeContainer}
                    onCheckedChange={setIncludeContainer}
                  />
                  <Label htmlFor="include-container" className="text-sm">
                    📦 Container Number
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-weight"
                    checked={includeWeight}
                    onCheckedChange={setIncludeWeight}
                  />
                  <Label htmlFor="include-weight" className="text-sm">
                    ⚖️ Cargo Weight
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-dimensions"
                    checked={includeDimensions}
                    onCheckedChange={setIncludeDimensions}
                  />
                  <Label htmlFor="include-dimensions" className="text-sm">
                    📏 Dimensions
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-temperature"
                    checked={includeTemperature}
                    onCheckedChange={setIncludeTemperature}
                  />
                  <Label htmlFor="include-temperature" className="text-sm">
                    🌡️ Temperature Control
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-hazmat"
                    checked={includeHazmat}
                    onCheckedChange={setIncludeHazmat}
                  />
                  <Label htmlFor="include-hazmat" className="text-sm">
                    ⚠️ Hazmat Classification
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Products Selection */}
          <Card className="lg:col-span-3 border-teal-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AnchorIcon className="h-5 w-5 text-teal-600" />
                Marine Cargo Selection
              </CardTitle>
              <CardDescription>
                Choose products for maritime label printing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search marine products by name or SKU..."
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
                  🌊 Select All Maritime Cargo ({filteredProducts.length} products)
                </Label>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg border-blue-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-teal-50">
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>🚢 Product Name</TableHead>
                      <TableHead>📋 SKU</TableHead>
                      <TableHead>💰 Price</TableHead>
                      <TableHead>🏷️ Category</TableHead>
                      <TableHead>🌊 Maritime Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingProducts ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          🌊 Loading maritime cargo...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          🚢 No maritime products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => (
                        <TableRow key={product.id} className="hover:bg-blue-50">
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
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">{product.sku}</Badge>
                          </TableCell>
                          <TableCell>₹{Number(product.price).toFixed(2)}</TableCell>
                          <TableCell>{typeof product.category === 'object' ? product.category?.name || 'Uncategorized' : product.category || 'Uncategorized'}</TableCell>
                          <TableCell>
                            <Badge className="bg-gradient-to-r from-blue-500 to-teal-500 text-white">
                              🌊 Sea Worthy
                            </Badge>
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
      </div>

      {/* Enhanced Print Confirmation Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-blue-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <PrinterIcon className="h-5 w-5 text-blue-600" />
                <WavesIcon className="h-4 w-4 text-teal-500" />
              </div>
              Maritime Label Print Confirmation
            </DialogTitle>
            <DialogDescription>
              🌊 Review your ocean cargo label settings before printing 🚢
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg border border-blue-200">
              <div>
                <label className="text-sm font-medium text-blue-700">🚢 Products Selected</label>
                <p className="text-lg font-bold text-blue-900">{selectedProducts.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-700">🏷️ Total Labels</label>
                <p className="text-lg font-bold text-blue-900">{selectedProducts.length * copies}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-700">📏 Label Size</label>
                <p className="text-sm text-blue-800 capitalize">{labelSize}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-700">📋 Copies Each</label>
                <p className="text-sm text-blue-800">{copies}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-blue-700">🌊 Maritime Features Included:</label>
              <div className="flex gap-2 flex-wrap">
                {includeBarcode && <Badge className="bg-blue-100 text-blue-800 border-blue-300">📊 Barcode</Badge>}
                {includePrice && <Badge className="bg-green-100 text-green-800 border-green-300">💰 Price</Badge>}
                {includeDescription && <Badge className="bg-purple-100 text-purple-800 border-purple-300">📝 Description</Badge>}
                {includeOrigin && <Badge className="bg-orange-100 text-orange-800 border-orange-300">🏭 Origin Port</Badge>}
                {includeDestination && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">🎯 Destination Port</Badge>}
                {includeVessel && <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">🚢 Vessel Info</Badge>}
                {includeContainer && <Badge className="bg-violet-100 text-violet-800 border-violet-300">📦 Container</Badge>}
                {includeWeight && <Badge className="bg-red-100 text-red-800 border-red-300">⚖️ Weight</Badge>}
                {includeDimensions && <Badge className="bg-amber-100 text-amber-800 border-amber-300">📏 Dimensions</Badge>}
                {includeTemperature && <Badge className="bg-blue-100 text-blue-800 border-blue-300">🌡️ Temperature</Badge>}
                {includeHazmat && <Badge className="bg-red-100 text-red-800 border-red-300">⚠️ Hazmat</Badge>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executePrint} className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
              <PrinterIcon className="h-4 w-4 mr-2" />
              🌊 Print Maritime Labels 🚢
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maritime Label Creation Dialog */}
      <Dialog open={isMaritimeLabelDialogOpen} onOpenChange={setIsMaritimeLabelDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto border-blue-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShipIcon className="h-5 w-5 text-blue-600" />
              🌊 Maritime Label Creator 🚢
            </DialogTitle>
            <DialogDescription>
              Create specialized maritime and oceanographic labels
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Maritime Label Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-blue-700">Select Maritime Label Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {maritimeLabelTypes.map((labelType) => {
                  const IconComponent = labelType.icon;
                  return (
                    <div
                      key={labelType.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedMaritimeType === labelType.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                      }`}
                      onClick={() => setSelectedMaritimeType(labelType.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent className={`h-5 w-5 ${selectedMaritimeType === labelType.id ? 'text-blue-600' : 'text-gray-500'}`} />
                        <h4 className={`font-medium ${selectedMaritimeType === labelType.id ? 'text-blue-900' : 'text-gray-700'}`}>
                          {labelType.title}
                        </h4>
                      </div>
                      <p className={`text-sm ${selectedMaritimeType === labelType.id ? 'text-blue-700' : 'text-gray-600'}`}>
                        {labelType.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Form Fields */}
            {selectedMaritimeType && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">
                  Configure {maritimeLabelTypes.find(t => t.id === selectedMaritimeType)?.title}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {maritimeLabelTypes.find(t => t.id === selectedMaritimeType)?.fields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-sm font-medium capitalize">
                        {field.replace('_', ' ')}
                      </Label>
                      <Input
                        value={maritimeFormData[field as keyof typeof maritimeFormData] || ''}
                        onChange={(e) => setMaritimeFormData(prev => ({
                          ...prev,
                          [field]: e.target.value
                        }))}
                        placeholder={`Enter ${field.replace('_', ' ')}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaritimeLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createMaritimeLabel}
              disabled={!selectedMaritimeType}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
            >
              <ShipIcon className="h-4 w-4 mr-2" />
              🌊 Create Maritime Label 🚢
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Label Configuration Dialog (Enhanced) */}
      <Dialog open={isCustomLabelDialogOpen} onOpenChange={setIsCustomLabelDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto border-teal-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-teal-600" />
              🌊 Custom Maritime Label Configuration 🚢
            </DialogTitle>
            <DialogDescription>
              Configure custom dimensions and layout for oceanographic labels
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Sheet Dimensions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">📄 Sheet Width</Label>
                <div className="relative">
                  <Input
                    value={sheetWidth}
                    onChange={(e) => setSheetWidth(e.target.value)}
                    placeholder="160"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    mm
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">📄 Sheet Height</Label>
                <div className="relative">
                  <Input
                    value={sheetHeight}
                    onChange={(e) => setSheetHeight(e.target.value)}
                    placeholder="50"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    mm
                  </span>
                </div>
              </div>
            </div>

            {/* Label Dimensions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">🏷️ Label Width</Label>
                <div className="relative">
                  <Input
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(e.target.value)}
                    placeholder="80"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    mm
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">🏷️ Label Height</Label>
                <div className="relative">
                  <Input
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(e.target.value)}
                    placeholder="50"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                    mm
                  </span>
                </div>
              </div>
            </div>

            {/* Layout Configuration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">📊 Total Rows</Label>
                <Select value={totalRows} onValueChange={setTotalRows}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Row</SelectItem>
                    <SelectItem value="2">2 Rows</SelectItem>
                    <SelectItem value="3">3 Rows</SelectItem>
                    <SelectItem value="4">4 Rows</SelectItem>
                    <SelectItem value="5">5 Rows</SelectItem>
                    <SelectItem value="10">10 Rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">📊 Total Columns</Label>
                <Select value={totalCols} onValueChange={setTotalCols}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Column</SelectItem>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="4">4 Columns</SelectItem>
                    <SelectItem value="5">5 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barcode Configuration */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">📊 BarCode Width</Label>
                <Input
                  value={barcodeWidth}
                  onChange={(e) => setBarcodeWidth(e.target.value)}
                  placeholder="50"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">📊 BarCode Height</Label>
                <Input
                  value={barcodeHeight}
                  onChange={(e) => setBarcodeHeight(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">🔤 Font Size</Label>
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

            {/* Enhanced Preview Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-blue-700">🌊 Maritime Label Preview</h4>
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 mb-2">
                  🚢 Sheet: {sheetWidth}mm × {sheetHeight}mm | 
                  🏷️ Label: {labelWidth}mm × {labelHeight}mm | 
                  📊 Grid: {totalRows} × {totalCols}
                </div>
                <div 
                  className="border-2 border-dashed border-blue-300 bg-white relative shadow-sm"
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
                        className="absolute border border-blue-400 bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center text-xs text-blue-700"
                        style={{
                          left: `${(col * Number(labelWidth)) / 2}px`,
                          top: `${(row * Number(labelHeight)) / 2}px`,
                          width: `${Math.min(Number(labelWidth) / 2, 80)}px`,
                          height: `${Math.min(Number(labelHeight) / 2, 40)}px`,
                        }}
                      >
                        🌊
                      </div>
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
                  title: "🌊 Maritime configuration saved",
                  description: "Your custom ocean label settings have been applied and saved 🚢",
                });
              }} 
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
            >
              🌊 Apply & Save Maritime Config 🚢
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Label Creation Dialog (Enhanced) */}
      <Dialog open={isManualLabelDialogOpen} onOpenChange={setIsManualLabelDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-blue-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-blue-600" />
              🌊 Manual Maritime Label Creation 🚢
            </DialogTitle>
            <DialogDescription>
              Create custom oceanographic labels with manual input
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>🏷️ Labels Per Row</Label>
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
                <Label>📄 Rows Per Page</Label>
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
            <Button onClick={() => setIsManualLabelDialogOpen(false)} className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
              🌊 Create Maritime Labels 🚢
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
