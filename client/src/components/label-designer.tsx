import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  MousePointerIcon, 
  TypeIcon, 
  ImageIcon, 
  BarChart3Icon,
  MoveIcon,
  RotateCcwIcon,
  TrashIcon,
  CopyIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon
} from "lucide-react";

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'image' | 'price' | 'mrp' | 'sku';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  rotation: number;
  opacity: number;
  zIndex: number;
}

interface LabelDesignerProps {
  templateData: any;
  onSave: (elements: LabelElement[]) => void;
  onCancel: () => void;
}

export function LabelDesigner({ templateData, onSave, onCancel }: LabelDesignerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'barcode' | 'image'>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Template dimensions in mm converted to pixels (assuming 96 DPI)
  const templateWidth = templateData?.width ? (templateData.width * 3.78) : 400;
  const templateHeight = templateData?.height ? (templateData.height * 3.78) : 300;

  // Initialize with default elements based on template settings
  useEffect(() => {
    if (templateData) {
      const defaultElements: LabelElement[] = [];
      
      // Add product name
      defaultElements.push({
        id: 'product-name',
        type: 'text',
        x: 10,
        y: 10,
        width: templateWidth - 20,
        height: 40,
        content: '{{product.name}}',
        fontSize: templateData.font_size || 18,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: templateData.text_color || '#000000',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'none',
        rotation: 0,
        opacity: 1,
        zIndex: 1
      });

      // Add price if enabled
      if (templateData.include_price) {
        defaultElements.push({
          id: 'price',
          type: 'price',
          x: 10,
          y: 60,
          width: 100,
          height: 30,
          content: '{{product.price}}',
          fontSize: (templateData.font_size || 18) + 2,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          color: templateData.text_color || '#000000',
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: '#000000',
          borderStyle: 'none',
          rotation: 0,
          opacity: 1,
          zIndex: 2
        });
      }

      // Add MRP if enabled
      if (templateData.include_mrp) {
        defaultElements.push({
          id: 'mrp',
          type: 'mrp',
          x: templateWidth - 110,
          y: 60,
          width: 100,
          height: 30,
          content: '{{product.mrp}}',
          fontSize: (templateData.font_size || 18) - 2,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'right',
          color: '#666666',
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: '#000000',
          borderStyle: 'none',
          rotation: 0,
          opacity: 1,
          zIndex: 2
        });
      }

      // Add SKU
      defaultElements.push({
        id: 'sku',
        type: 'sku',
        x: 10,
        y: templateHeight - 40,
        width: 150,
        height: 25,
        content: '{{product.sku}}',
        fontSize: (templateData.font_size || 18) - 6,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#666666',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'none',
        rotation: 0,
        opacity: 1,
        zIndex: 2
      });

      // Add barcode if enabled
      if (templateData.include_barcode) {
        const barcodeY = templateData.barcode_position === 'top' ? 10 : templateHeight - 80;
        defaultElements.push({
          id: 'barcode',
          type: 'barcode',
          x: (templateWidth - 120) / 2,
          y: barcodeY,
          width: 120,
          height: 60,
          content: '{{product.barcode}}',
          fontSize: 12,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          color: '#000000',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#cccccc',
          borderStyle: 'solid',
          rotation: 0,
          opacity: 1,
          zIndex: 3
        });
      }

      setElements(defaultElements);
    }
  }, [templateData, templateWidth, templateHeight]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    console.log('Canvas clicked, current tool:', tool);
    if (tool === 'select') {
      setSelectedElement(null);
      console.log('Deselected all elements');
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = templateWidth / (templateWidth * (zoom / 100));
    const scaleY = templateHeight / (templateHeight * (zoom / 100));
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newElement: LabelElement = {
      id: `element-${Date.now()}`,
      type: tool as 'text' | 'barcode' | 'image',
      x,
      y,
      width: tool === 'text' ? 150 : tool === 'barcode' ? 120 : 100,
      height: tool === 'text' ? 30 : tool === 'barcode' ? 60 : 100,
      content: tool === 'text' ? 'New Text' : tool === 'barcode' ? '{{product.barcode}}' : '',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#000000',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#cccccc',
      borderStyle: 'solid',
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1
    };

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
    setTool('select');
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setElements(elements.map(el => 
      el.id === selectedElement 
        ? { 
            ...el, 
            x: Math.max(0, Math.min(templateWidth - el.width, el.x + deltaX)), 
            y: Math.max(0, Math.min(templateHeight - el.height, el.y + deltaY))
          }
        : el
    ));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const updateSelectedElement = (updates: Partial<LabelElement>) => {
    if (!selectedElement) return;
    
    setElements(elements.map(el => 
      el.id === selectedElement ? { ...el, ...updates } : el
    ));
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    setElements(elements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;

    const newElement = {
      ...element,
      id: `element-${Date.now()}`,
      x: element.x + 10,
      y: element.y + 10,
      zIndex: elements.length + 1
    };

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const getSelectedElement = () => {
    return elements.find(el => el.id === selectedElement);
  };

  const renderElement = (element: LabelElement) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`absolute select-none pointer-events-auto ${
          isSelected ? 'border-2 border-blue-500 bg-blue-50/30' : 'border border-transparent hover:border-gray-300 hover:bg-gray-50/20'
        }`}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          transform: `rotate(${element.rotation}deg)`,
          opacity: element.opacity,
          zIndex: element.zIndex,
          cursor: tool === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
          backgroundColor: element.backgroundColor,
          borderColor: isSelected ? '#3b82f6' : element.borderColor,
          borderWidth: isSelected ? 2 : element.borderWidth,
          borderStyle: element.borderStyle,
        }}
        onMouseDown={(e) => {
          if (tool === 'select') {
            handleElementMouseDown(e, element.id);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Element clicked:', element.id, 'Current tool:', tool);
          if (tool === 'select') {
            setSelectedElement(element.id);
            console.log('Element selected:', element.id);
          }
        }}
      >
        {element.type === 'text' || element.type === 'price' || element.type === 'mrp' || element.type === 'sku' ? (
          <div
            className="w-full h-full flex items-center px-2"
            style={{
              fontSize: element.fontSize,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              textAlign: element.textAlign,
              color: element.color,
              overflow: 'hidden'
            }}
          >
            {element.content.replace(/\{\{product\.(\w+)\}\}/g, (match, field) => {
              switch (field) {
                case 'name': return 'SAMPLE PRODUCT';
                case 'price': return '₹45.00';
                case 'mrp': return '₹50.00';
                case 'sku': return 'SKU123';
                case 'barcode': return '1234567890';
                default: return match;
              }
            })}
          </div>
        ) : element.type === 'barcode' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white">
            <div className="bg-black h-2/3 w-full flex items-center justify-center">
              <div className="text-white text-xs">||||| ||||| |||||</div>
            </div>
            <div className="text-xs mt-1">1234567890</div>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
        )}
        
        {isSelected && (
          <>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize shadow-sm"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize shadow-sm"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize shadow-sm"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize shadow-sm"></div>
            <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {element.type}: {element.width}×{element.height}
            </div>
          </>
        )}
      </div>
    );
  };

  const selectedEl = getSelectedElement();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="w-64 bg-white border-r p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('select')}
              title="Select Tool (Click elements to select and drag)"
            >
              <MousePointerIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('text')}
            >
              <TypeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'barcode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('barcode')}
            >
              <BarChart3Icon className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('image')}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg text-sm">
          <h4 className="font-medium text-blue-800 mb-2">How to Use:</h4>
          <ul className="text-blue-700 space-y-1 text-xs">
            <li>• Use Select tool to click and drag elements</li>
            <li>• Use Text/Barcode tools to add new elements</li>
            <li>• Selected elements show blue border and handles</li>
            <li>• Modify properties in the panel below</li>
          </ul>
        </div>

        <Separator />

        {/* Status Display */}
        <div className="bg-gray-50 p-2 rounded text-xs">
          <div>Tool: <span className="font-mono">{tool}</span></div>
          <div>Selected: <span className="font-mono">{selectedElement || 'none'}</span></div>
          <div>Elements: <span className="font-mono">{elements.length}</span></div>
        </div>

        {/* Element Properties */}
        {selectedEl && (
          <div className="space-y-4">
            <h3 className="font-semibold">Properties ({selectedEl.type})</h3>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Input
                id="content"
                value={selectedEl.content}
                onChange={(e) => updateSelectedElement({ content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={selectedEl.fontSize}
                  onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 12 })}
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={selectedEl.color}
                  onChange={(e) => updateSelectedElement({ color: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={selectedEl.fontWeight === 'bold' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ 
                  fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' 
                })}
              >
                <BoldIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedEl.fontStyle === 'italic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ 
                  fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' 
                })}
              >
                <ItalicIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedEl.textDecoration === 'underline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ 
                  textDecoration: selectedEl.textDecoration === 'underline' ? 'none' : 'underline' 
                })}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={selectedEl.textAlign === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ textAlign: 'left' })}
              >
                <AlignLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedEl.textAlign === 'center' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ textAlign: 'center' })}
              >
                <AlignCenterIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedEl.textAlign === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedElement({ textAlign: 'right' })}
              >
                <AlignRightIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="x">X Position</Label>
                <Input
                  id="x"
                  type="number"
                  value={selectedEl.x}
                  onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="y">Y Position</Label>
                <Input
                  id="y"
                  type="number"
                  value={selectedEl.y}
                  onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={selectedEl.width}
                  onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 50 })}
                />
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={selectedEl.height}
                  onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button size="sm" onClick={duplicateSelectedElement}>
                <CopyIcon className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={deleteSelectedElement}>
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Label Designer - {templateData?.name}</h2>
            <Badge variant="outline">{templateWidth}mm × {templateHeight}mm</Badge>
            <Badge variant={tool === 'select' ? 'default' : 'secondary'}>
              Current Tool: {tool === 'select' ? 'Select' : tool === 'text' ? 'Text' : tool === 'barcode' ? 'Barcode' : 'Image'}
            </Badge>
            {selectedElement && (
              <Badge variant="outline" className="bg-blue-50">
                Selected: {elements.find(el => el.id === selectedElement)?.type || 'Unknown'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="zoom">Zoom:</Label>
            <Select value={zoom.toString()} onValueChange={(value) => setZoom(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
                <SelectItem value="150">150%</SelectItem>
                <SelectItem value="200">200%</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => onSave(elements)}>Save Template</Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-8 overflow-auto bg-gray-100">
          <div className="flex justify-center">
            <div
              ref={canvasRef}
              className="relative bg-white shadow-lg border border-gray-300"
              style={{
                width: templateWidth,
                height: templateHeight,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                cursor: tool === 'select' ? 'default' : 'crosshair'
              }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {elements.map(renderElement)}
              
                    {/* Grid overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #ccc 1px, transparent 1px),
                    linear-gradient(to bottom, #ccc 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
              
              {/* Tool indicator */}
              {tool !== 'select' && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                  Click to add {tool}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}