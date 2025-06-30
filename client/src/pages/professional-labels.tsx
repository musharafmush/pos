import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  Printer, 
  Tags, 
  Download, 
  Upload, 
  Settings, 
  Play, 
  Eye,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RotateCcw,
  Copy,
  Palette,
  Grid3X3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Type,
  Barcode,
  Image,
  Package
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  mrp: number;
  category: string;
  stock: number;
}

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
  template: string;
}

interface PrintJob {
  id: number;
  templateId: number;
  productIds: string;
  copies: number;
  status: string;
  createdAt: string;
}

export default function ProfessionalLabels() {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [copiesPerProduct, setCopiesPerProduct] = useState<number>(1);
  const [labelsPerRow, setLabelsPerRow] = useState<number>(2);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<LabelTemplate>>({
    name: "",
    description: "",
    width: 80,
    height: 40,
    fontSize: 12,
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
    template: "retail-standard"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch label templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/label-templates"],
  });

  // Fetch print jobs
  const { data: printJobs = [], isLoading: printJobsLoading } = useQuery({
    queryKey: ["/api/print-jobs"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<LabelTemplate>) => {
      const response = await fetch("/api/label-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/label-templates"] });
      setIsTemplateDialogOpen(false);
      toast({
        title: "Template Created",
        description: "Label template has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Print labels mutation
  const printLabelsMutation = useMutation({
    mutationFn: async (printData: any) => {
      const response = await fetch("/api/print-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(printData),
      });
      if (!response.ok) throw new Error("Failed to create print job");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/print-jobs"] });
      toast({
        title: "Print Job Created",
        description: `Successfully created print job for ${selectedProducts.length} products.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Print Error",
        description: "Failed to create print job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter products based on search and category
  const filteredProducts = (products as Product[]).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSelection = !showOnlySelected || selectedProducts.includes(product.id);
    
    return matchesSearch && matchesCategory && matchesSelection;
  });

  const handleProductSelect = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  const handlePrintLabels = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to print labels.",
        variant: "destructive",
      });
      return;
    }

    const printData = {
      templateId: selectedTemplate,
      productIds: selectedProducts,
      copies: copiesPerProduct,
      labelsPerRow,
    };

    printLabelsMutation.mutate(printData);
  };

  // Get current template
  const currentTemplate = (templates as LabelTemplate[]).find(t => t.id === selectedTemplate) || (templates as LabelTemplate[])[0];

  // Print preview generation
  const generatePreview = () => {
    if (!canvasRef.current || selectedProducts.length === 0 || !currentTemplate) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const selectedProductsList = (products as Product[]).filter(p => selectedProducts.includes(p.id));
    const labelWidth = 160;
    const labelHeight = 100;
    const margin = 10;
    const cols = Math.floor((canvas.width - margin * 2) / (labelWidth + margin));
    
    selectedProductsList.slice(0, 12).forEach((product, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = margin + col * (labelWidth + margin);
      const y = margin + row * (labelHeight + margin);

      // Draw label background
      ctx.fillStyle = currentTemplate.backgroundColor || '#ffffff';
      ctx.fillRect(x, y, labelWidth, labelHeight);
      
      // Draw border
      ctx.strokeStyle = currentTemplate.textColor || '#000000';
      ctx.lineWidth = currentTemplate.borderWidth || 1;
      ctx.strokeRect(x, y, labelWidth, labelHeight);

      // Draw product name
      ctx.fillStyle = currentTemplate.textColor || '#000000';
      ctx.font = `bold ${currentTemplate.fontSize || 12}px Arial`;
      ctx.textAlign = 'center';
      const nameY = y + 20;
      ctx.fillText(product.name.substring(0, 20), x + labelWidth/2, nameY);

      // Draw price
      if (currentTemplate.includePrice) {
        ctx.font = `${(currentTemplate.fontSize || 12) - 2}px Arial`;
        ctx.fillText(`₹${product.price}`, x + labelWidth/2, nameY + 20);
      }

      // Draw MRP
      if (currentTemplate.includeMrp && product.mrp) {
        ctx.font = `${(currentTemplate.fontSize || 12) - 3}px Arial`;
        ctx.fillText(`MRP: ₹${product.mrp}`, x + labelWidth/2, nameY + 35);
      }

      // Draw SKU
      ctx.font = `${(currentTemplate.fontSize || 12) - 4}px Arial`;
      ctx.fillText(`SKU: ${product.sku}`, x + labelWidth/2, nameY + 50);

      // Draw barcode placeholder
      if (currentTemplate.includeBarcode) {
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 30; i++) {
          const barX = x + 20 + i * 4;
          const barHeight = Math.random() > 0.5 ? 15 : 10;
          ctx.fillRect(barX, y + labelHeight - 25, 2, barHeight);
        }
      }
    });
  };

  // Handle preview
  const handlePreview = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to preview labels.",
        variant: "destructive"
      });
      return;
    }
    setIsPreviewOpen(true);
  };

  // Effect to generate preview when dialog opens
  useEffect(() => {
    if (isPreviewOpen && canvasRef.current) {
      setTimeout(() => generatePreview(), 100);
    }
  }, [isPreviewOpen, selectedProducts, currentTemplate]);

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.description) {
      toast({
        title: "Missing Information",
        description: "Please provide template name and description.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Tags className="h-8 w-8 text-blue-600" />
              Professional Label Printing
            </h1>
            <p className="text-muted-foreground">
              Advanced label printing with customizable templates and professional features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handlePrintLabels} disabled={selectedProducts.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print Labels ({selectedProducts.length})
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(products as Product[]).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedProducts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Labels to Print</CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedProducts.length * copiesPerProduct}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Template</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentTemplate?.name || "Retail Standard"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Label Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Label Configuration
              </CardTitle>
              <CardDescription>Customize your label settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select value={selectedTemplate.toString()} onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Retail Standard</SelectItem>
                        <SelectItem value="2">Product Info</SelectItem>
                        <SelectItem value="3">Price Tag</SelectItem>
                        <SelectItem value="4">Barcode Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="copies">Copies per Product</Label>
                    <Select value={copiesPerProduct.toString()} onValueChange={(value) => setCopiesPerProduct(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,10,15,20,25,50].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="labelsPerRow">Labels per Row</Label>
                    <Select value={labelsPerRow.toString()} onValueChange={(value) => setLabelsPerRow(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-3">
                    <Label>Include Elements</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="includeBarcode" defaultChecked />
                        <Label htmlFor="includeBarcode">Barcode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="includePrice" defaultChecked />
                        <Label htmlFor="includePrice">Price</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="includeMrp" defaultChecked />
                        <Label htmlFor="includeMrp">MRP</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="includeDescription" />
                        <Label htmlFor="includeDescription">Description</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="includeLogo" />
                        <Label htmlFor="includeLogo">Company Logo</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="design" className="space-y-4">
                  <div>
                    <Label htmlFor="textAlign">Text Alignment</Label>
                    <div className="flex gap-1 mt-2">
                      <Button variant="outline" size="sm">
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Input type="number" defaultValue="12" min="8" max="24" />
                  </div>

                  <div>
                    <Label htmlFor="barcodeType">Barcode Type</Label>
                    <Select defaultValue="CODE128">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CODE128">CODE128</SelectItem>
                        <SelectItem value="EAN13">EAN-13</SelectItem>
                        <SelectItem value="QR">QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Templates
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Template</DialogTitle>
                      <DialogDescription>
                        Design a custom label template for your products.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                          id="name"
                          value={newTemplate.name || ""}
                          onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Input
                          id="description"
                          value={newTemplate.description || ""}
                          onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateTemplate}>Create Template</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="flex-1" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Selection
              </CardTitle>
              <CardDescription>Choose products for label printing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(categories as any[]).map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showSelected" 
                    checked={showOnlySelected}
                    onCheckedChange={(checked) => setShowOnlySelected(checked === true)}
                  />
                  <Label htmlFor="showSelected">Show Selected Only</Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedProducts.length} products selected
                  {filteredProducts.length > 0 && ` • ${labelsPerRow} labels to print`}
                  {currentTemplate && ` • ${currentTemplate.name} template`}
                </div>
              </div>

              {/* Product List */}
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products found matching your criteria</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer ${
                          selectedProducts.includes(product.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleProductSelect(product.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => {}}
                          />
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>SKU: {product.sku}</span>
                              <span>₹{product.price}</span>
                              {product.stock !== undefined && (
                                <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}>
                                  Stock: {product.stock}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedProducts.includes(product.id) && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Print Jobs History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Jobs History
            </CardTitle>
            <CardDescription>Recent label printing jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4">Job ID</th>
                    <th className="text-left p-4">Template</th>
                    <th className="text-left p-4">Products</th>
                    <th className="text-left p-4">Labels</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(printJobs as PrintJob[]).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-muted-foreground">
                        No print jobs found
                      </td>
                    </tr>
                  ) : (
                    (printJobs as PrintJob[]).slice(0, 5).map((job) => (
                      <tr key={job.id} className="border-b">
                        <td className="p-4">#{job.id}</td>
                        <td className="p-4">
                          {(templates as LabelTemplate[]).find(t => t.id === job.templateId)?.name || "Unknown"}
                        </td>
                        <td className="p-4">
                          {JSON.parse(job.productIds || "[]").length} products
                        </td>
                        <td className="p-4">{job.copies || 1} copies</td>
                        <td className="p-4">
                          <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Print Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Print Preview</DialogTitle>
              <DialogDescription>
                Preview of {selectedProducts.length * copiesPerProduct} labels using {currentTemplate?.name || 'Standard'} template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={600}
                className="border border-gray-200 w-full mx-auto"
                style={{ maxHeight: '500px' }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={handlePrintLabels} className="bg-green-600 hover:bg-green-700">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}