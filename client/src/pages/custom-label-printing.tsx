import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Printer, 
  Tags, 
  Download, 
  Upload, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  QrCode,
  Barcode,
  RectangleHorizontalIcon,
  RectangleVerticalIcon
} from "lucide-react";

interface LabelTemplate {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  fontSize: number;
  includeBarcode: boolean;
  includePrice: boolean;
  includeDescription: boolean;
  includeMrp: boolean;
  includeWeight: boolean;
  includeLogo: boolean;
  barcodeType: string;
  barcodePosition: string;
  textAlignment: string;
  borderStyle: string;
  borderWidth: number;
  backgroundColor: string;
  textColor: string;
  logoPosition: string;
  customFields: string;
  customCss: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Printer {
  id: number;
  name: string;
  type: string;
  connection: string;
  ipAddress?: string;
  port?: number;
  paperWidth: number;
  paperHeight: number;
  isDefault: boolean;
  isActive: boolean;
}

interface PrintJob {
  id: number;
  templateId: number;
  userId: number;
  printerName: string;
  productIds: string;
  copies: number;
  labelsPerRow: number;
  paperSize: string;
  orientation: string;
  status: string;
  totalLabels: number;
  customText: string;
  printSettings: string;
  errorMessage?: string;
  printedAt: string;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  mrp: number;
  barcode?: string;
  description?: string;
  weight?: number;
  stockQuantity: number;
}

export default function CustomLabelPrinting() {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [customText, setCustomText] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    width: 80,
    height: 40,
    fontSize: 18,
    includeBarcode: true,
    includePrice: true,
    includeDescription: false,
    includeMrp: true,
    includeWeight: false,
    includeLogo: false,
    barcodeType: "CODE128",
    barcodePosition: "bottom",
    textAlignment: "center",
    borderStyle: "solid",
    borderWidth: 1,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    logoPosition: "top-left",
    customFields: "",
    customCss: "",
    isDefault: false,
    isActive: true
  });

  // Fetch data
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/label-templates"],
  });

  const { data: printers = [], isLoading: printersLoading } = useQuery({
    queryKey: ["/api/printers"],
  });

  const { data: printJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/print-jobs"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (template: any) => apiRequest("/api/label-templates", {
      method: "POST",
      body: JSON.stringify(template),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/label-templates"] });
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast({ title: "Template created successfully!" });
    },
    onError: () => {
      toast({ title: "Error creating template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, template }: { id: number; template: any }) => 
      apiRequest(`/api/label-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(template),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/label-templates"] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast({ title: "Template updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error updating template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/label-templates/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/label-templates"] });
      toast({ title: "Template deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error deleting template", variant: "destructive" });
    },
  });

  const printLabelsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/print-labels", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/print-jobs"] });
      setSelectedProducts([]);
      setPrintQuantity(1);
      setCustomText("");
      toast({ title: "Labels sent to printer successfully!" });
    },
    onError: () => {
      toast({ title: "Error printing labels", variant: "destructive" });
    },
  });

  const testPrinterMutation = useMutation({
    mutationFn: (printerId: number) => apiRequest(`/api/printers/${printerId}/test`, {
      method: "POST",
    }),
    onSuccess: (data: any) => {
      toast({ 
        title: "Printer test successful!", 
        description: data.message 
      });
    },
    onError: () => {
      toast({ title: "Printer test failed", variant: "destructive" });
    },
  });

  // Set default template and printer
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find((t: LabelTemplate) => t.isDefault) || templates[0];
      setSelectedTemplate(defaultTemplate);
    }
  }, [templates, selectedTemplate]);

  useEffect(() => {
    if (printers.length > 0 && !selectedPrinter) {
      const defaultPrinter = printers.find((p: Printer) => p.isDefault) || printers[0];
      setSelectedPrinter(defaultPrinter);
    }
  }, [printers, selectedPrinter]);

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      width: 80,
      height: 40,
      fontSize: 18,
      includeBarcode: true,
      includePrice: true,
      includeDescription: false,
      includeMrp: true,
      includeWeight: false,
      includeLogo: false,
      barcodeType: "CODE128",
      barcodePosition: "bottom",
      textAlignment: "center",
      borderStyle: "solid",
      borderWidth: 1,
      backgroundColor: "#ffffff",
      textColor: "#000000",
      logoPosition: "top-left",
      customFields: "",
      customCss: "",
      isDefault: false,
      isActive: true
    });
  };

  const handleEditTemplate = (template: LabelTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      width: template.width,
      height: template.height,
      fontSize: template.fontSize,
      includeBarcode: template.includeBarcode,
      includePrice: template.includePrice,
      includeDescription: template.includeDescription,
      includeMrp: template.includeMrp,
      includeWeight: template.includeWeight,
      includeLogo: template.includeLogo,
      barcodeType: template.barcodeType,
      barcodePosition: template.barcodePosition,
      textAlignment: template.textAlignment,
      borderStyle: template.borderStyle,
      borderWidth: template.borderWidth,
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
      logoPosition: template.logoPosition,
      customFields: template.customFields,
      customCss: template.customCss,
      isDefault: template.isDefault,
      isActive: template.isActive
    });
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, template: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handlePrintLabels = () => {
    if (!selectedTemplate || !selectedPrinter || selectedProducts.length === 0) {
      toast({ 
        title: "Missing required fields", 
        description: "Please select template, printer, and products",
        variant: "destructive" 
      });
      return;
    }

    printLabelsMutation.mutate({
      templateId: selectedTemplate.id,
      printerId: selectedPrinter.id,
      productIds: selectedProducts,
      quantity: printQuantity,
      customText
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionIcon = (connection: string) => {
    switch (connection) {
      case "network": return <Wifi className="w-4 h-4 text-green-500" />;
      case "usb": return <WifiOff className="w-4 h-4 text-blue-500" />;
      default: return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBarcodeIcon = (type: string) => {
    return type === "QR" ? <QrCode className="w-4 h-4" /> : <Barcode className="w-4 h-4" />;
  };

  if (templatesLoading || printersLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading label printing system...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Label Printing</h1>
          <p className="text-muted-foreground">Professional label design & printing with Endura printer support</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsTemplateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Label Templates
            </CardTitle>
            <CardDescription>Choose or create label templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {templates.map((template: LabelTemplate) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {template.width}×{template.height}mm
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplateMutation.mutate(template.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {template.includeBarcode && getBarcodeIcon(template.barcodeType)}
                    {template.includePrice && <span className="text-xs">₹</span>}
                    {template.includeMrp && <span className="text-xs">MRP</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Printer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Printer Settings
            </CardTitle>
            <CardDescription>Select and configure printers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {printers.map((printer: Printer) => (
                <div
                  key={printer.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPrinter?.id === printer.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPrinter(printer)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {getConnectionIcon(printer.connection)}
                        {printer.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {printer.type} • {printer.paperWidth}×{printer.paperHeight}mm
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {printer.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          testPrinterMutation.mutate(printer.id);
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {printer.connection === "network" && printer.ipAddress && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {printer.ipAddress}:{printer.port}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Print Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Print Configuration</CardTitle>
            <CardDescription>Configure your label printing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Product Selection</Label>
              <Select onValueChange={(value) => {
                const productId = parseInt(value);
                setSelectedProducts(prev => 
                  prev.includes(productId) 
                    ? prev.filter(id => id !== productId)
                    : [...prev, productId]
                );
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select products to print" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - ₹{product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProducts.length > 0 && (
              <div>
                <Label>Selected Products ({selectedProducts.length})</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedProducts.map(productId => {
                    const product = products.find((p: Product) => p.id === productId);
                    return product ? (
                      <Badge key={productId} variant="secondary" className="text-xs">
                        {product.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-auto p-0"
                          onClick={() => setSelectedProducts(prev => 
                            prev.filter(id => id !== productId)
                          )}
                        >
                          ×
                        </Button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div>
              <Label>Print Quantity</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label>Custom Text (Optional)</Label>
              <Textarea
                placeholder="Add custom text to labels..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={2}
              />
            </div>

            <Button 
              onClick={handlePrintLabels}
              disabled={!selectedTemplate || !selectedPrinter || selectedProducts.length === 0}
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print {selectedProducts.length} Labels
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Print Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle>Print Jobs History</CardTitle>
          <CardDescription>Recent label printing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {printJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No print jobs yet. Start printing some labels!
              </div>
            ) : (
              printJobs.map((job: PrintJob) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium">
                        {job.totalLabels} labels on {job.printerName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.printedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.paperSize}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Creation/Edit Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Design your custom label template with drag-and-drop elements
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="design">Design Options</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Product Label 80x40"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={templateForm.width}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, width: parseInt(e.target.value) || 80 }))}
                  />
                </div>
                <div>
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={templateForm.height}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, height: parseInt(e.target.value) || 40 }))}
                  />
                </div>
                <div>
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={templateForm.fontSize}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 12 }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Include Elements</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "includeBarcode", label: "Barcode" },
                    { key: "includePrice", label: "Price" },
                    { key: "includeDescription", label: "Description" },
                    { key: "includeMrp", label: "MRP" },
                    { key: "includeWeight", label: "Weight" },
                    { key: "includeLogo", label: "Logo" }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        checked={templateForm[key as keyof typeof templateForm] as boolean}
                        onCheckedChange={(checked) => 
                          setTemplateForm(prev => ({ ...prev, [key]: checked }))
                        }
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barcode Type</Label>
                  <Select
                    value={templateForm.barcodeType}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, barcodeType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">CODE128</SelectItem>
                      <SelectItem value="EAN13">EAN13</SelectItem>
                      <SelectItem value="CODE39">CODE39</SelectItem>
                      <SelectItem value="QR">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Text Alignment</Label>
                  <Select
                    value={templateForm.textAlignment}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, textAlignment: value }))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={templateForm.backgroundColor}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={templateForm.textColor}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, textColor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Border Style</Label>
                  <Select
                    value={templateForm.borderStyle}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, borderStyle: value }))}
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
                <div>
                  <Label>Border Width</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={templateForm.borderWidth}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, borderWidth: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label>Custom Fields (JSON)</Label>
                <Textarea
                  value={templateForm.customFields}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, customFields: e.target.value }))}
                  placeholder='{"field1": "value1", "field2": "value2"}'
                  rows={3}
                />
              </div>

              <div>
                <Label>Custom CSS</Label>
                <Textarea
                  value={templateForm.customCss}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, customCss: e.target.value }))}
                  placeholder=".label-element { margin: 2px; }"
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={templateForm.isDefault}
                  onCheckedChange={(checked) => 
                    setTemplateForm(prev => ({ ...prev, isDefault: !!checked }))
                  }
                />
                <Label>Set as default template</Label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsTemplateDialogOpen(false);
                setEditingTemplate(null);
                resetTemplateForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}