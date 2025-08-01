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
  
  // Typography properties
  fontSize: number;
  fontFamily?: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  
  // Color properties
  color: string;
  backgroundColor: string;
  
  // Border properties
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  
  // Shadow properties
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  
  // Transform properties
  rotation: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  
  // Display properties
  opacity: number;
  zIndex: number;
  visible?: boolean;
  
  // Padding and margin
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
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

  // Initialize with saved elements or default elements based on template settings
  useEffect(() => {
    console.log('Visual designer initializing with template data:', templateData);
    if (templateData) {
      // Check if template has saved elements
      if (Array.isArray(templateData.elements) && templateData.elements.length > 0) {
        console.log('Loading saved elements:', templateData.elements);
        setElements(templateData.elements);
        return;
      } else {
        console.log('No saved elements found, creating default elements. Elements value:', templateData.elements);
      }
      
      // Otherwise, create default elements
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
          y: 55,
          width: 120,
          height: 35,
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
          x: templateWidth - 130,
          y: 55,
          width: 120,
          height: 35,
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
        y: templateHeight - 35,
        width: 160,
        height: 25,
        content: '{{product.sku}}',
        fontSize: Math.max((templateData.font_size || 18) - 6, 10),
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
        const barcodeY = templateData.barcode_position === 'top' ? 100 : templateHeight - 80;
        defaultElements.push({
          id: 'barcode',
          type: 'barcode',
          x: (templateWidth - 140) / 2,
          y: barcodeY,
          width: 140,
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
          transform: `
            rotate(${element.rotation || 0}deg) 
            scale(${element.scaleX || 1}, ${element.scaleY || 1})
            ${element.skewX ? `skewX(${element.skewX}deg)` : ''} 
            ${element.skewY ? `skewY(${element.skewY}deg)` : ''}
          `,
          opacity: element.opacity,
          zIndex: element.zIndex,
          cursor: tool === 'select' ? (isSelected ? 'move' : 'pointer') : 'default',
          backgroundColor: element.backgroundColor,
          borderColor: isSelected ? '#3b82f6' : element.borderColor,
          borderWidth: isSelected ? 2 : element.borderWidth,
          borderStyle: element.borderStyle,
          borderRadius: element.borderRadius || 0,
          boxShadow: element.shadowBlur ? 
            `${element.shadowOffsetX || 0}px ${element.shadowOffsetY || 0}px ${element.shadowBlur}px ${element.shadowColor || 'rgba(0,0,0,0.3)'}` 
            : 'none',
          padding: `${element.paddingTop || 0}px ${element.paddingRight || 0}px ${element.paddingBottom || 0}px ${element.paddingLeft || 0}px`,
          margin: `${element.marginTop || 0}px ${element.marginRight || 0}px ${element.marginBottom || 0}px ${element.marginLeft || 0}px`,
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
            className="w-full h-full flex items-center px-1"
            style={{
              fontSize: `${element.fontSize}px`,
              fontFamily: element.fontFamily || 'Arial',
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              textAlign: element.textAlign,
              color: element.color,
              lineHeight: element.lineHeight || 1.2,
              letterSpacing: element.letterSpacing || 0,
              overflow: 'hidden',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
              wordWrap: 'break-word',
              whiteSpace: element.textAlign === 'justify' ? 'pre-wrap' : 'pre-wrap',
              boxSizing: 'border-box',
              textJustify: element.textAlign === 'justify' ? 'inter-word' : 'auto'
            }}
          >
            <span style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>
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
            </span>
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
      <div className="w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
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
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center justify-between">
              Properties ({selectedEl.type})
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => {
                  setElements(elements.filter(el => el.id !== selectedElement));
                  setSelectedElement(null);
                }}
              >
                Delete
              </Button>
            </h3>
            
            {/* Content Section */}
            <div className="space-y-2 p-2 bg-gray-50 rounded text-sm">
              <h4 className="font-medium text-sm">Content</h4>
              
              {selectedEl.type === 'text' && (
                <div>
                  <Label htmlFor="content">Text Content</Label>
                  <Input
                    id="content"
                    value={selectedEl.content || ''}
                    onChange={(e) => updateSelectedElement({ content: e.target.value })}
                    placeholder="Enter text content"
                  />
                </div>
              )}

              {selectedEl.type === 'barcode' && (
                <div>
                  <Label htmlFor="content">Barcode Value</Label>
                  <Input
                    id="content"
                    value={selectedEl.content || ''}
                    onChange={(e) => updateSelectedElement({ content: e.target.value })}
                    placeholder="Enter barcode value"
                  />
                </div>
              )}
            </div>

            {/* Font & Typography Section */}
            {selectedEl.type === 'text' && (
              <div className="space-y-2 p-2 bg-blue-50 rounded text-sm">
                <h4 className="font-medium text-xs">Typography</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      value={selectedEl.fontSize || 16}
                      onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 16 })}
                      min="6"
                      max="200"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select 
                      value={selectedEl.fontFamily || 'Arial'} 
                      onValueChange={(value) => updateSelectedElement({ fontFamily: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Impact">Impact</SelectItem>
                        <SelectItem value="Tahoma">Tahoma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="textAlign">Text Alignment</Label>
                  <Select 
                    value={selectedEl.textAlign || 'left'} 
                    onValueChange={(value) => updateSelectedElement({ textAlign: value as 'left' | 'center' | 'right' | 'justify' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="justify">Justify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Color Section */}
            <div className="space-y-2 p-2 bg-green-50 rounded text-sm">
              <h4 className="font-medium text-xs">Colors</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="color">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={selectedEl.color || '#000000'}
                      onChange={(e) => updateSelectedElement({ color: e.target.value })}
                      className="w-12 h-8"
                    />
                    <Input
                      value={selectedEl.color || '#000000'}
                      onChange={(e) => updateSelectedElement({ color: e.target.value })}
                      placeholder="#000000"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="backgroundColor">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={selectedEl.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSelectedElement({ backgroundColor: e.target.value })}
                      className="w-12 h-8"
                    />
                    <Input
                      value={selectedEl.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSelectedElement({ backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Style Buttons */}
            {selectedEl.type === 'text' && (
              <div className="space-y-2 p-2 bg-purple-50 rounded text-sm">
                <h4 className="font-medium text-xs">Text Style</h4>
                
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

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedEl.textAlign === 'left' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSelectedElement({ textAlign: 'left' })}
                    className="flex items-center gap-1"
                  >
                    <AlignLeftIcon className="h-4 w-4" />
                    <span className="text-xs">Left</span>
                  </Button>
                  <Button
                    variant={selectedEl.textAlign === 'center' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSelectedElement({ textAlign: 'center' })}
                    className="flex items-center gap-1"
                  >
                    <AlignCenterIcon className="h-4 w-4" />
                    <span className="text-xs">Center</span>
                  </Button>
                  <Button
                    variant={selectedEl.textAlign === 'right' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSelectedElement({ textAlign: 'right' })}
                    className="flex items-center gap-1"
                  >
                    <AlignRightIcon className="h-4 w-4" />
                    <span className="text-xs">Right</span>
                  </Button>
                  <Button
                    variant={selectedEl.textAlign === 'justify' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSelectedElement({ textAlign: 'justify' })}
                    className="flex items-center gap-1"
                  >
                    <AlignLeftIcon className="h-4 w-4" />
                    <span className="text-xs">Justify</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Position & Size Section */}
            <div className="space-y-2 p-2 bg-orange-50 rounded text-sm">
              <h4 className="font-medium text-xs">Position & Size</h4>
              
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
            </div>

            {/* Border & Effects Section */}
            <div className="space-y-2 p-2 bg-red-50 rounded text-sm">
              <h4 className="font-medium text-xs">Border & Effects</h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="borderWidth">Border Width</Label>
                  <Input
                    id="borderWidth"
                    type="number"
                    value={selectedEl.borderWidth || 0}
                    onChange={(e) => updateSelectedElement({ borderWidth: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <Input
                    id="borderRadius"
                    type="number"
                    value={selectedEl.borderRadius || 0}
                    onChange={(e) => updateSelectedElement({ borderRadius: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="opacity">Opacity</Label>
                  <Input
                    id="opacity"
                    type="number"
                    value={Math.round((selectedEl.opacity || 1) * 100)}
                    onChange={(e) => updateSelectedElement({ opacity: (parseInt(e.target.value) || 100) / 100 })}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="borderColor">Border Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="borderColor"
                    type="color"
                    value={selectedEl.borderColor || '#000000'}
                    onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                    className="w-12 h-8"
                  />
                  <Input
                    value={selectedEl.borderColor || '#000000'}
                    onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="borderStyle">Border Style</Label>
                <Select 
                  value={selectedEl.borderStyle || 'solid'} 
                  onValueChange={(value) => updateSelectedElement({ borderStyle: value as 'solid' | 'dashed' | 'dotted' | 'none' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transform Section */}
            <div className="space-y-2 p-2 bg-yellow-50 rounded text-sm">
              <h4 className="font-medium text-xs">Transform</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="rotation">Rotation (deg)</Label>
                  <Input
                    id="rotation"
                    type="number"
                    value={selectedEl.rotation || 0}
                    onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) || 0 })}
                    min="-360"
                    max="360"
                  />
                </div>
                <div>
                  <Label htmlFor="zIndex">Layer (Z-Index)</Label>
                  <Input
                    id="zIndex"
                    type="number"
                    value={selectedEl.zIndex || 1}
                    onChange={(e) => updateSelectedElement({ zIndex: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="scaleX">Scale X</Label>
                  <Input
                    id="scaleX"
                    type="number"
                    step="0.1"
                    value={selectedEl.scaleX || 1}
                    onChange={(e) => updateSelectedElement({ scaleX: parseFloat(e.target.value) || 1 })}
                    min="0.1"
                    max="5"
                  />
                </div>
                <div>
                  <Label htmlFor="scaleY">Scale Y</Label>
                  <Input
                    id="scaleY"
                    type="number"
                    step="0.1"
                    value={selectedEl.scaleY || 1}
                    onChange={(e) => updateSelectedElement({ scaleY: parseFloat(e.target.value) || 1 })}
                    min="0.1"
                    max="5"
                  />
                </div>
              </div>
            </div>

            {/* Shadow & Effects Section */}
            <div className="space-y-2 p-2 bg-indigo-50 rounded text-sm">
              <h4 className="font-medium text-xs">Shadow & Effects</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="shadowBlur">Shadow Blur</Label>
                  <Input
                    id="shadowBlur"
                    type="number"
                    value={selectedEl.shadowBlur || 0}
                    onChange={(e) => updateSelectedElement({ shadowBlur: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="shadowColor">Shadow Color</Label>
                  <Input
                    id="shadowColor"
                    type="color"
                    value={selectedEl.shadowColor || '#000000'}
                    onChange={(e) => updateSelectedElement({ shadowColor: e.target.value })}
                    className="w-full h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="shadowOffsetX">Shadow X</Label>
                  <Input
                    id="shadowOffsetX"
                    type="number"
                    value={selectedEl.shadowOffsetX || 0}
                    onChange={(e) => updateSelectedElement({ shadowOffsetX: parseInt(e.target.value) || 0 })}
                    min="-20"
                    max="20"
                  />
                </div>
                <div>
                  <Label htmlFor="shadowOffsetY">Shadow Y</Label>
                  <Input
                    id="shadowOffsetY"
                    type="number"
                    value={selectedEl.shadowOffsetY || 0}
                    onChange={(e) => updateSelectedElement({ shadowOffsetY: parseInt(e.target.value) || 0 })}
                    min="-20"
                    max="20"
                  />
                </div>
              </div>
            </div>

            {/* Typography Advanced Section */}
            {selectedEl.type === 'text' && (
              <div className="space-y-3 p-3 bg-pink-50 rounded-lg">
                <h4 className="font-medium text-sm">Advanced Typography</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="lineHeight">Line Height</Label>
                    <Input
                      id="lineHeight"
                      type="number"
                      step="0.1"
                      value={selectedEl.lineHeight || 1.2}
                      onChange={(e) => updateSelectedElement({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                      min="0.5"
                      max="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="letterSpacing">Letter Spacing</Label>
                    <Input
                      id="letterSpacing"
                      type="number"
                      step="0.1"
                      value={selectedEl.letterSpacing || 0}
                      onChange={(e) => updateSelectedElement({ letterSpacing: parseFloat(e.target.value) || 0 })}
                      min="-5"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Layer Controls */}
            <div className="space-y-3 p-3 bg-cyan-50 rounded-lg">
              <h4 className="font-medium text-sm">Layer Controls</h4>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => updateSelectedElement({ zIndex: (selectedEl.zIndex || 1) + 1 })}
                  className="flex-1"
                >
                  Bring Forward
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => updateSelectedElement({ zIndex: Math.max(1, (selectedEl.zIndex || 1) - 1) })}
                  className="flex-1"
                >
                  Send Back
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="visible"
                  checked={selectedEl.visible !== false}
                  onCheckedChange={(checked) => updateSelectedElement({ visible: checked })}
                />
                <Label htmlFor="visible">Visible</Label>
              </div>
            </div>

            {/* Quick Preset Styles */}
            <div className="space-y-3 p-3 bg-emerald-50 rounded-lg">
              <h4 className="font-medium text-sm">Quick Presets</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => updateSelectedElement({
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#000000',
                    backgroundColor: '#ffff00',
                    borderWidth: 2,
                    borderColor: '#000000'
                  })}
                >
                  Bold Header
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => updateSelectedElement({
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: '#666666',
                    backgroundColor: 'transparent'
                  })}
                >
                  Subtitle
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => updateSelectedElement({
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#ff0000',
                    shadowBlur: 2,
                    shadowColor: '#000000'
                  })}
                >
                  Price Tag
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => updateSelectedElement({
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#000000',
                    backgroundColor: '#f0f0f0'
                  })}
                >
                  Box Style
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 p-3 bg-gray-100 rounded-lg">
              <h4 className="font-medium text-sm">Actions</h4>
              <div className="flex gap-2">
                <Button size="sm" onClick={duplicateSelectedElement} className="flex-1">
                  <CopyIcon className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
                <Button size="sm" variant="destructive" onClick={deleteSelectedElement} className="flex-1">
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
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
            
            <Button 
              onClick={async () => {
                try {
                  console.log('Saving template with elements:', elements);
                  
                  // Prepare template data for saving
                  const templateUpdateData = {
                    name: templateData?.name,
                    description: templateData?.description, 
                    width: templateData?.width,
                    height: templateData?.height,
                    font_size: templateData?.font_size,
                    include_barcode: templateData?.include_barcode,
                    include_price: templateData?.include_price,
                    include_mrp: templateData?.include_mrp,
                    orientation: templateData?.orientation,
                    elements: elements // Save the visual designer elements
                  };

                  const response = await fetch(`/api/label-templates/${templateData?.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(templateUpdateData)
                  });

                  if (response.ok) {
                    const result = await response.json();
                    console.log('Template saved successfully:', result);
                    
                    // Show success notification
                    const successMessage = document.createElement('div');
                    successMessage.style.cssText = `
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #4ade80;
                      color: white;
                      padding: 12px 20px;
                      border-radius: 8px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                      z-index: 9999;
                      font-weight: 500;
                    `;
                    successMessage.textContent = '✓ Template saved successfully!';
                    document.body.appendChild(successMessage);
                    
                    setTimeout(() => {
                      document.body.removeChild(successMessage);
                    }, 3000);
                    
                    onSave(elements); // Call original callback
                  } else {
                    const error = await response.text();
                    console.error('Failed to save template:', error);
                    alert('Failed to save template. Please try again.');
                  }
                } catch (error) {
                  console.error('Error saving template:', error);
                  alert('Error saving template. Please check your connection.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Template
            </Button>
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