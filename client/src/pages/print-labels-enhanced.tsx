import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LabelDesigner } from "@/components/label-designer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
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
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  PaletteIcon
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
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface LabelTemplate {
  id: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  font_size: number;
  orientation?: 'portrait' | 'landscape';
  include_barcode: boolean;
  include_price: boolean;
  include_description: boolean;
  include_mrp: boolean;
  include_weight: boolean;
  include_hsn: boolean;
  barcode_position: 'top' | 'bottom' | 'left' | 'right';
  border_style: 'solid' | 'dashed' | 'dotted' | 'none';
  border_width: number;
  background_color: string;
  text_color: string;
  custom_css?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PrintJob {
  id: number;
  template_id: number;
  template_name?: string;
  user_id: number;
  user_name?: string;
  product_ids: string;
  copies: number;
  labels_per_row: number;
  paper_size: string;
  orientation: string;
  status: string;
  total_labels: number;
  custom_text?: string;
  print_settings?: string;
  created_at: string;
}

const templateFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  width: z.number().min(10, "Width must be at least 10mm"),
  height: z.number().min(10, "Height must be at least 10mm"),
  font_size: z.number().min(6, "Font size must be at least 6pt").max(200, "Font size cannot exceed 200pt"),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  include_barcode: z.boolean(),
  include_price: z.boolean(),
  include_description: z.boolean(),
  include_mrp: z.boolean(),
  include_weight: z.boolean(),
  include_hsn: z.boolean(),
  barcode_position: z.enum(['top', 'bottom', 'left', 'right']),
  border_style: z.enum(['solid', 'dashed', 'dotted', 'none']),
  border_width: z.number().min(0).max(10),
  background_color: z.string(),
  text_color: z.string(),
  custom_css: z.string().optional(),
  is_default: z.boolean()
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function PrintLabelsEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [copies, setCopies] = useState(1);
  const [labelsPerRow, setLabelsPerRow] = useState(2);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [designerTemplate, setDesignerTemplate] = useState<LabelTemplate | null>(null);
  const [customText, setCustomText] = useState("");
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [bulkAction, setBulkAction] = useState<'none' | 'selectAll' | 'deselectAll' | 'invertSelection'>('none');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form for template creation/editing
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      width: 150,
      height: 100,
      font_size: 18,
      orientation: 'landscape',
      include_barcode: true,
      include_price: true,
      include_description: false,
      include_mrp: true,
      include_weight: false,
      include_hsn: false,
      barcode_position: 'bottom',
      border_style: 'solid',
      border_width: 1,
      background_color: '#ffffff',
      text_color: '#000000',
      custom_css: "",
      is_default: false
    },
    mode: 'onChange'
  });

  // Fetch data
  const { data: productsData = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: templatesData = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/label-templates'],
    select: (data: any) => {
      console.log('Templates from server:', data);
      if (Array.isArray(data) && data.length > 0) {
        console.log('First template font_size:', data[0].font_size);
      }
      return data || [];
    }
  });

  const { data: printJobsData = [] } = useQuery({
    queryKey: ['/api/print-jobs'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const products = productsData as Product[];
  const categories = categoriesData as Category[];
  const templates = templatesData as LabelTemplate[];
  const printJobs = printJobsData as PrintJob[];

  // Watch font size changes for real-time preview
  const watchedFontSize = useWatch({
    control: templateForm.control,
    name: "font_size"
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormData) => fetch('/api/label-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Template created successfully",
        description: "Your label template has been saved"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      handleTemplateDialogClose();
    },
    onError: (error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormData }) => {
      console.log('Updating template with data:', data);
      console.log('Font size being sent:', data.font_size);

      const response = await fetch(`/api/label-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update template`);
      }

      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Template updated successfully:', data);
      console.log('Updated font_size:', data.font_size);
      toast({
        title: "Template updated successfully",
        description: `Template "${data.name}" has been saved with your changes (Font: ${data.font_size}pt)`
      });
      
      // Force immediate refetch of templates
      await queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      await refetchTemplates();
      
      handleTemplateDialogClose();
    },
    onError: (error: Error) => {
      console.error('Template update error:', error);
      toast({
        title: "Error updating template",
        description: error.message || "Failed to update template. Please check your input and try again.",
        variant: "destructive"
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/label-templates/${id}`, {
      method: 'DELETE'
    }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Template deleted successfully",
        description: "The template has been removed"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createPrintJobMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/print-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Print job created successfully",
        description: "Your labels are being prepared for printing"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/print-jobs'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating print job",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplate(defaultTemplate.id);
    }
  }, [templates, selectedTemplate]);



  // Filter and sort products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || 
                           (product.category && product.category.name === selectedCategory);

    const matchesSelection = !showOnlySelected || selectedProducts.includes(product.id);

    return matchesSearch && matchesCategory && matchesSelection;
  }).sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'sku':
        compareValue = a.sku.localeCompare(b.sku);
        break;
      case 'price':
        compareValue = parseFloat(a.price) - parseFloat(b.price);
        break;
      case 'stock':
        compareValue = (a.stockQuantity || 0) - (b.stockQuantity || 0);
        break;
    }
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  // Get current template
  const getCurrentTemplate = (): LabelTemplate | null => {
    return templates.find(t => t.id === selectedTemplate) || null;
  };

  // Product selection handlers
  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  // Bulk selection handlers
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'selectAll':
        setSelectedProducts(filteredProducts.map(p => p.id));
        toast({
          title: "All products selected",
          description: `Selected ${filteredProducts.length} products`
        });
        break;
      case 'deselectAll':
        setSelectedProducts([]);
        toast({
          title: "All products deselected"
        });
        break;
      case 'invertSelection':
        const inverted = filteredProducts
          .filter(p => !selectedProducts.includes(p.id))
          .map(p => p.id);
        setSelectedProducts(inverted);
        toast({
          title: "Selection inverted",
          description: `Selected ${inverted.length} products`
        });
        break;
    }
  };

  const handleSelectAll = () => {
    const visibleProductIds = filteredProducts.map((p: Product) => p.id);
    setSelectedProducts(visibleProductIds);
  };

  const handleDeselectAll = () => {
    setSelectedProducts([]);
  };

  // Template handlers
  const handleCreateTemplate = () => {
    templateForm.reset();
    setEditingTemplate(null);
    setIsTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: LabelTemplate) => {
    console.log('Editing template:', template);
    console.log('Template font_size value:', template.font_size, typeof template.font_size);
    setEditingTemplate(template);

    // Prepare form data with proper type conversions and validation
    const formData: TemplateFormData = {
      name: template.name || "",
      description: template.description || "",
      width: Math.max(10, Number(template.width) || 150),
      height: Math.max(10, Number(template.height) || 100),
      font_size: Math.max(6, Math.min(200, Number(template.font_size) || 18)),
      orientation: (template.orientation === 'portrait' || template.orientation === 'landscape') 
        ? template.orientation 
        : 'landscape',
      include_barcode: Boolean(template.include_barcode),
      include_price: Boolean(template.include_price),
      include_description: Boolean(template.include_description),
      include_mrp: Boolean(template.include_mrp),
      include_weight: Boolean(template.include_weight),
      include_hsn: Boolean(template.include_hsn),
      barcode_position: (['top', 'bottom', 'left', 'right'].includes(template.barcode_position)) 
        ? template.barcode_position as 'top' | 'bottom' | 'left' | 'right'
        : 'bottom',
      border_style: (['solid', 'dashed', 'dotted', 'none'].includes(template.border_style))
        ? template.border_style as 'solid' | 'dashed' | 'dotted' | 'none'
        : 'solid',
      border_width: Math.max(0, Math.min(10, Number(template.border_width) || 1)),
      background_color: template.background_color || '#ffffff',
      text_color: template.text_color || '#000000',
      custom_css: template.custom_css || "",
      is_default: Boolean(template.is_default)
    };

    console.log('Form data prepared:', formData);
    console.log('Prepared font_size value:', formData.font_size, typeof formData.font_size);

    // Clear any existing form errors and reset with the template data
    templateForm.clearErrors();
    templateForm.reset(formData);

    // Add a small delay to ensure form state is properly updated
    setTimeout(() => {
      setIsTemplateDialogOpen(true);
      // Log form state after dialog opens
      setTimeout(() => {
        const formValues = templateForm.getValues();
        console.log('Form state after dialog open:', formValues);
        console.log('Form font_size after dialog open:', formValues.font_size, typeof formValues.font_size);
        console.log('Form errors after dialog open:', templateForm.formState.errors);
      }, 100);
    }, 50);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleOpenDesigner = (template: LabelTemplate) => {
    setDesignerTemplate(template);
    setIsDesignerOpen(true);
  };

  const handleCreatePredefinedTemplates = async () => {
    const predefinedTemplates = [
      {
        name: "Retail Price Tag",
        description: "Standard retail pricing label with barcode",
        width: 80,
        height: 50,
        font_size: 14,
        orientation: 'landscape' as const,
        include_barcode: true,
        include_price: true,
        include_description: false,
        include_mrp: true,
        include_weight: false,
        include_hsn: false,
        barcode_position: 'bottom' as const,
        border_style: 'solid' as const,
        border_width: 1,
        background_color: '#ffffff',
        text_color: '#000000',
        custom_css: '',
        is_default: false
      },
      {
        name: "Product Information Label",
        description: "Detailed product info with all elements",
        width: 120,
        height: 80,
        font_size: 16,
        orientation: 'portrait' as const,
        include_barcode: true,
        include_price: true,
        include_description: true,
        include_mrp: true,
        include_weight: true,
        include_hsn: true,
        barcode_position: 'bottom' as const,
        border_style: 'solid' as const,
        border_width: 2,
        background_color: '#f8f9fa',
        text_color: '#212529',
        custom_css: '',
        is_default: false
      },
      {
        name: "Shelf Label",
        description: "Wide shelf labeling for inventory management",
        width: 200,
        height: 60,
        font_size: 18,
        orientation: 'landscape' as const,
        include_barcode: true,
        include_price: true,
        include_description: true,
        include_mrp: false,
        include_weight: false,
        include_hsn: false,
        barcode_position: 'right' as const,
        border_style: 'dashed' as const,
        border_width: 1,
        background_color: '#e3f2fd',
        text_color: '#1565c0',
        custom_css: '',
        is_default: false
      },
      {
        name: "Small Barcode Label",
        description: "Compact barcode-only label for small items",
        width: 60,
        height: 40,
        font_size: 10,
        orientation: 'landscape' as const,
        include_barcode: true,
        include_price: false,
        include_description: false,
        include_mrp: false,
        include_weight: false,
        include_hsn: false,
        barcode_position: 'bottom' as const,
        border_style: 'none' as const,
        border_width: 0,
        background_color: '#ffffff',
        text_color: '#000000',
        custom_css: '',
        is_default: false
      },
      {
        name: "Premium Product Tag",
        description: "Elegant label for premium products with styling",
        width: 100,
        height: 70,
        font_size: 20,
        orientation: 'portrait' as const,
        include_barcode: true,
        include_price: true,
        include_description: true,
        include_mrp: true,
        include_weight: false,
        include_hsn: false,
        barcode_position: 'bottom' as const,
        border_style: 'solid' as const,
        border_width: 3,
        background_color: '#fff3e0',
        text_color: '#e65100',
        custom_css: 'font-family: serif; font-weight: bold;',
        is_default: false
      }
    ];

    try {
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const template of predefinedTemplates) {
        // Check if template with same name already exists
        const existingTemplate = templates.find(t => t.name === template.name);
        if (existingTemplate) {
          skippedCount++;
          continue;
        }

        const response = await fetch('/api/label-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(template)
        });

        if (response.ok) {
          createdCount++;
        }
      }

      // Refresh templates list
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });

      const messages = [];
      if (createdCount > 0) {
        messages.push(`Created ${createdCount} new templates`);
      }
      if (skippedCount > 0) {
        messages.push(`${skippedCount} templates already exist`);
      }

      toast({
        title: createdCount > 0 ? "Success" : "Info",
        description: messages.join(', ') + (createdCount === 0 ? '. All templates are already available!' : ' ready for use!'),
      });
    } catch (error) {
      console.error('Error creating predefined templates:', error);
      toast({
        title: "Error",
        description: "Failed to create predefined templates. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDesignerSave = (elements: any[]) => {
    if (!designerTemplate) return;
    
    // Convert designer elements back to template format
    const updatedTemplate = {
      ...designerTemplate,
      elements: elements,
      updated_at: new Date().toISOString()
    };

    // Save the template with new elements
    updateTemplateMutation.mutate({ 
      id: designerTemplate.id, 
      data: updatedTemplate 
    });

    setIsDesignerOpen(false);
    setDesignerTemplate(null);
  };

  const handleDesignerCancel = () => {
    setIsDesignerOpen(false);
    setDesignerTemplate(null);
  };

  const onTemplateSubmit = (data: TemplateFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', templateForm.formState.errors);

    // Validate the data before submission
    const validatedData: TemplateFormData = {
      ...data,
      width: Math.max(10, data.width),
      height: Math.max(10, data.height),
      font_size: data.font_size, // Remove max constraint to allow larger font sizes
      border_width: Math.max(0, Math.min(10, data.border_width))
    };
    
    console.log('Font size being sent to server:', validatedData.font_size);

    if (editingTemplate) {
      console.log('Updating existing template:', editingTemplate.id);
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: validatedData });
    } else {
      console.log('Creating new template');
      createTemplateMutation.mutate(validatedData);
    }
  };

  const handleTemplateDialogClose = () => {
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);

    // Clear form errors and reset to default values
    templateForm.clearErrors();
    templateForm.reset({
      name: "",
      description: "",
      width: 150,
      height: 100,
      font_size: 18,
      orientation: 'landscape',
      include_barcode: true,
      include_price: true,
      include_description: false,
      include_mrp: true,
      include_weight: false,
      include_hsn: false,
      barcode_position: 'bottom',
      border_style: 'solid',
      border_width: 1,
      background_color: '#ffffff',
      text_color: '#000000',
      custom_css: "",
      is_default: false
    });
  };

  // Generate professional barcode
  const generateBarcode = (text: string, width: number = 100, height: number = 30) => {
    const barcodeData = text.padEnd(12, '0').substring(0, 12);
    const bars = barcodeData.split('').map((digit, index) => {
      const digitValue = parseInt(digit);
      const barWidth = digitValue % 4 + 1;
      const barHeight = height - 15;
      return `<rect x="${index * 8}" y="5" width="${barWidth}" height="${barHeight}" fill="#000"/>`;
    }).join('');

    return `
      <div style="text-align: center; margin: 2px 0;">
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid #ddd;">
          <rect width="${width}" height="${height}" fill="#fff"/>
          ${bars}
          <text x="${width/2}" y="${height - 2}" font-family="monospace" font-size="8" text-anchor="middle" fill="#000">${barcodeData}</text>
        </svg>
      </div>
    `;
  };

  // Generate label HTML
  const generateLabelHTML = (product: Product, template: LabelTemplate) => {
    const {
      width, height, font_size, border_style, border_width, background_color, text_color,
      include_barcode, include_price, include_description, include_mrp, include_weight, include_hsn
    } = template;

    const borderCSS = border_style !== 'none' ? 
      `border: ${border_width}px ${border_style} #333;` : '';

    // Scale barcode size based on label dimensions
    const barcodeWidth = Math.min(width * 3.5, 320);
    const barcodeHeight = Math.max(35, Math.min(height * 0.15, 60));

    const barcodeHTML = include_barcode ? 
      generateBarcode(product.barcode || product.sku, barcodeWidth, barcodeHeight) : '';

    // Calculate responsive font sizes based on label dimensions
    const baseFontSize = Math.max(font_size, Math.min(width * 0.08, height * 0.06));
    const titleFontSize = Math.max(baseFontSize + 4, 18);
    const priceFontSize = Math.max(baseFontSize + 6, 20);
    const detailsFontSize = Math.max(baseFontSize - 2, 12);

    return `
      <div class="product-label" style="
        width: ${width}mm;
        height: ${height}mm;
        ${borderCSS}
        padding: ${Math.max(3, width * 0.015)}mm;
        margin: 2mm;
        display: inline-block;
        font-family: Arial, sans-serif;
        background: ${background_color};
        color: ${text_color};
        page-break-inside: avoid;
        box-sizing: border-box;
        vertical-align: top;
        position: relative;
        font-size: ${baseFontSize}px;
        line-height: 1.4;
        overflow: hidden;
      ">
        <div style="font-weight: bold; margin-bottom: ${Math.max(2, height * 0.02)}mm; font-size: ${titleFontSize}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${product.name}
        </div>

        <div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
          SKU: ${product.sku}
        </div>

        ${include_description && product.description ? 
          `<div style="font-size: ${detailsFontSize}px; color: #888; margin-bottom: ${Math.max(1, height * 0.015)}mm; overflow: hidden; max-height: ${Math.max(20, height * 0.1)}px; line-height: 1.3;">
            ${product.description.substring(0, Math.min(60, width * 0.3))}${product.description.length > Math.min(60, width * 0.3) ? '...' : ''}
          </div>` : ''
        }

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${Math.max(2, height * 0.02)}mm; flex-wrap: wrap;">
          ${include_price ? 
            `<div style="font-size: ${priceFontSize}px; font-weight: bold; color: #2563eb; margin-right: 5mm;">
              ₹${parseFloat(product.price).toFixed(2)}
            </div>` : ''
          }
          ${include_mrp && product.mrp && parseFloat(product.mrp) !== parseFloat(product.price) ? 
            `<div style="font-size: ${detailsFontSize}px; color: #666; text-decoration: line-through;">
              MRP: ₹${parseFloat(product.mrp).toFixed(2)}
            </div>` : ''
          }
        </div>

        ${include_weight && product.weight ? 
          `<div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
            Weight: ${product.weight} ${product.weightUnit || 'kg'}
          </div>` : ''
        }

        ${include_hsn && product.hsnCode ? 
          `<div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
            HSN: ${product.hsnCode}
          </div>` : ''
        }

        ${customText ? 
          `<div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
            ${customText}
          </div>` : ''
        }

        ${include_barcode ? 
          `<div style="margin-top: auto; text-align: center; padding: ${Math.max(2, height * 0.02)}mm 0;">
            ${barcodeHTML}
          </div>` : ''
        }

        <div style="position: absolute; bottom: ${Math.max(1, height * 0.01)}mm; right: ${Math.max(2, width * 0.01)}mm; font-size: ${Math.max(8, baseFontSize * 0.6)}px; color: #ccc;">
          ${new Date().toLocaleDateString('en-IN')}
        </div>
      </div>
    `;
  };

  // Print functionality
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to print labels.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a label template.",
        variant: "destructive",
      });
      return;
    }

    setIsPrintDialogOpen(true);
  };

  const executePrint = () => {
    const selectedProductsData = products.filter((p: Product) => 
      selectedProducts.includes(p.id)
    );

    const template = getCurrentTemplate();
    if (!template) return;

    // Create print job record
    const printJobData = {
      templateId: template.id,
      productIds: selectedProducts,
      copies,
      labelsPerRow,
      paperSize,
      orientation,
      totalLabels: selectedProducts.length * copies,
      customText: customText || null,
      printSettings: JSON.stringify({
        paperSize,
        orientation,
        labelsPerRow,
        margin: 5
      })
    };

    createPrintJobMutation.mutate(printJobData);

    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map(() => 
        generateLabelHTML(product, template)
      ).join('');
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Product Labels - ${new Date().toLocaleDateString()}</title>
            <meta charset="UTF-8">
            <style>
              @page { 
                size: ${paperSize} ${orientation};
                margin: 5mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
              }
              .labels-container {
                display: grid;
                grid-template-columns: repeat(${labelsPerRow}, 1fr);
                gap: 2mm;
                width: 100%;
                align-items: start;
              }
              .product-label {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .labels-container {
                  margin: 0;
                  padding: 0;
                }
                .product-label {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="labels-container">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 2000);
                }, 1000);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }

    setIsPrintDialogOpen(false);
    toast({
      title: "Labels sent to printer",
      description: `${selectedProducts.length * copies} labels prepared for printing`,
    });
  };

  // Preview functionality
  const handlePreview = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to preview labels.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewDialogOpen(true);
  };

  if (isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-muted-foreground">Loading print labels system...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div>
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <TagIcon className="h-10 w-10 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Print Labels Pro
                </span>
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Professional label printing with database-integrated templates
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                </div>
                <div className="text-sm text-gray-500">
                  {templates.length} Templates Available
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline"
                onClick={handlePreview}
                disabled={selectedProducts.length === 0}
                className="border-green-600 text-green-600 hover:bg-green-50 transition-all duration-200"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Labels
              </Button>
              <Button 
                onClick={handlePrint}
                disabled={selectedProducts.length === 0 || !selectedTemplate}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels ({selectedProducts.length})
              </Button>
            </div>
          </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Products & Selection</TabsTrigger>
            <TabsTrigger value="templates">Label Templates</TabsTrigger>
            <TabsTrigger value="settings">Print Settings</TabsTrigger>
            <TabsTrigger value="history">Print History</TabsTrigger>
          </TabsList>

          {/* Products & Selection Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Search and Filter Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SearchIcon className="h-5 w-5" />
                  Search & Filter Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="search">Search Products</Label>
                    <Input
                      id="search"
                      placeholder="Search by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category Filter</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-selected"
                        checked={showOnlySelected}
                        onCheckedChange={setShowOnlySelected}
                      />
                      <Label htmlFor="show-selected">Show only selected</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="sku">SKU</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                    <Separator orientation="vertical" className="h-8 mx-2" />
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('selectAll')}>
                      Select All ({filteredProducts.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('deselectAll')}>
                      Deselect All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('invertSelection')}>
                      Invert
                    </Button>
                  </div>
                  <Badge variant="secondary">
                    {selectedProducts.length} of {products.length} products selected
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Products ({filteredProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                    : 'grid-cols-1'
                }`}>
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className={`border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow ${
                        selectedProducts.includes(product.id) ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => 
                                handleProductSelect(product.id, checked as boolean)
                              }
                            />
                            <h3 className="font-medium text-sm">{product.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          {product.barcode && (
                            <p className="text-xs text-muted-foreground">Barcode: {product.barcode}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">₹{product.price}</p>
                          {product.mrp && parseFloat(product.mrp) !== parseFloat(product.price) && (
                            <p className="text-xs text-muted-foreground line-through">₹{product.mrp}</p>
                          )}
                        </div>
                      </div>
                      {viewMode === 'list' && product.description && (
                        <p className="text-xs text-muted-foreground">{product.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <Badge variant={product.stockQuantity && product.stockQuantity > 0 ? "default" : "destructive"}>
                          Stock: {product.stockQuantity || 0}
                        </Badge>
                        {product.category && (
                          <Badge variant="outline">{product.category.name}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Package2Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria or filters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Label Templates</CardTitle>
                    <CardDescription>
                      Manage your label templates and create custom designs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleCreateTemplate}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Generate unique template name
                          const timestamp = Date.now();
                          const templateName = `Visual Template ${timestamp}`;
                          
                          // Create a basic template in database first
                          const basicTemplateData: TemplateFormData = {
                            name: templateName,
                            description: "Created with Visual Designer",
                            width: 150,
                            height: 100,
                            font_size: 18,
                            orientation: 'landscape',
                            include_barcode: true,
                            include_price: true,
                            include_description: false,
                            include_mrp: true,
                            include_weight: false,
                            include_hsn: false,
                            barcode_position: 'bottom',
                            border_style: 'solid',
                            border_width: 1,
                            background_color: '#ffffff',
                            text_color: '#000000',
                            custom_css: '',
                            is_default: false
                          };

                          const response = await fetch('/api/label-templates', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(basicTemplateData)
                          });

                          if (response.ok) {
                            const newTemplate = await response.json();
                            console.log('Created new template for visual designer:', newTemplate);
                            
                            // Now open visual designer with the actual template from database
                            handleOpenDesigner(newTemplate);
                            
                            // Refresh templates list
                            queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
                          } else {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Failed to create template');
                          }
                        } catch (error) {
                          console.error('Error creating template for visual designer:', error);
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to create template. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <PaletteIcon className="h-4 w-4 mr-2" />
                      Visual Designer
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCreatePredefinedTemplates()}
                    >
                      <TagIcon className="h-4 w-4 mr-2" />
                      Quick Templates
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Template Management Controls */}
                <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">
                      {templates.length} templates available
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      CRUD Operations Enabled
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const confirmed = window.confirm(
                          "This will create a backup of all templates. Continue?"
                        );
                        if (confirmed) {
                          // Export templates as JSON
                          const templateData = templates.map(t => ({
                            ...t,
                            backup_date: new Date().toISOString()
                          }));
                          const blob = new Blob([JSON.stringify(templateData, null, 2)], {
                            type: 'application/json'
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `label-templates-backup-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Backup Created",
                            description: "Template backup downloaded successfully",
                          });
                        }
                      }}
                    >
                      <Package2Icon className="h-4 w-4 mr-1" />
                      Backup
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const text = await file.text();
                            try {
                              const templateData = JSON.parse(text);
                              // Import templates logic would go here
                              toast({
                                title: "Import Ready",
                                description: "Template import functionality prepared",
                              });
                            } catch (error) {
                              toast({
                                title: "Import Error",
                                description: "Invalid template file format",
                                variant: "destructive"
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Package2Icon className="h-4 w-4 mr-1" />
                      Import
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className={`border rounded-lg p-6 space-y-4 cursor-pointer transition-all ${
                        selectedTemplate === template.id ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'hover:shadow-md hover:border-blue-200'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {template.name}
                            {template.is_default && <StarIcon className="h-5 w-5 text-yellow-500" />}
                            {template.orientation === 'landscape' ? (
                              <RectangleHorizontalIcon className="h-4 w-4 text-blue-600" />
                            ) : (
                              <RectangleVerticalIcon className="h-4 w-4 text-green-600" />
                            )}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            title="Edit template"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDesigner(template);
                            }}
                            title="Visual Designer"
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <PaletteIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const duplicatedData = {
                                name: `${template.name} (Copy)`,
                                description: template.description,
                                width: template.width,
                                height: template.height,
                                font_size: template.font_size,
                                orientation: template.orientation || 'landscape',
                                include_barcode: template.include_barcode,
                                include_price: template.include_price,
                                include_description: template.include_description,
                                include_mrp: template.include_mrp,
                                include_weight: template.include_weight,
                                include_hsn: template.include_hsn,
                                barcode_position: template.barcode_position,
                                border_style: template.border_style,
                                border_width: template.border_width,
                                background_color: template.background_color,
                                text_color: template.text_color,
                                custom_css: template.custom_css,
                                is_default: false
                              };
                              createTemplateMutation.mutate(duplicatedData);
                            }}
                            title="Duplicate template"
                          >
                            <RefreshCwIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this template?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                            title="Delete template"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Visual Size Representation with Preview */}
                      <div className="flex justify-center py-3">
                        <div 
                          className="border-2 border-dashed border-blue-300 bg-blue-50 rounded flex flex-col items-center justify-center text-xs font-medium text-blue-700 p-2"
                          style={{
                            width: `${Math.min(template.width / 2, 150)}px`,
                            height: `${Math.min(template.height / 2, 100)}px`,
                            minWidth: '80px',
                            minHeight: '60px',
                            fontSize: `${Math.min(template.font_size / 3, 12)}px`
                          }}
                        >
                          <div className="text-center">
                            <div className="font-bold" style={{ fontSize: `${Math.min(template.font_size / 2.5, 14)}px` }}>
                              PRODUCT NAME
                            </div>
                            {template.include_price && <div>₹99.00</div>}
                            {template.include_barcode && (
                              <div className="mt-1 bg-black h-3 w-12 mx-auto opacity-50"></div>
                            )}
                          </div>
                          <div className="mt-2 text-[10px] opacity-75">
                            {template.width}×{template.height}mm
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <span className="text-muted-foreground block text-xs">Dimensions</span>
                            <span className="font-medium">{template.width}mm × {template.height}mm</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <span className="text-muted-foreground block text-xs">Font Size</span>
                            <span className="font-medium">{template.font_size}pt</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-2">
                          <span className="text-muted-foreground block text-xs mb-1">Layout & Status</span>
                          <div className="flex items-center gap-2 mb-2">
                            {template.orientation === 'landscape' ? (
                              <>
                                <RectangleHorizontalIcon className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">Landscape</span>
                                <span className="text-xs text-muted-foreground">• Wide format</span>
                              </>
                            ) : (
                              <>
                                <RectangleVerticalIcon className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">Portrait</span>
                                <span className="text-xs text-muted-foreground">• Tall format</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {template.is_default && (
                              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                Default
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs text-blue-600">
                              ID: {template.id}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {template.include_barcode && <Badge variant="secondary" className="text-xs">📊 Barcode</Badge>}
                          {template.include_price && <Badge variant="secondary" className="text-xs">💰 Price</Badge>}
                          {template.include_mrp && <Badge variant="secondary" className="text-xs">🏷️ MRP</Badge>}
                          {template.include_weight && <Badge variant="secondary" className="text-xs">⚖️ Weight</Badge>}
                          {template.include_hsn && <Badge variant="secondary" className="text-xs">📋 HSN</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Print Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Print Configuration</CardTitle>
                <CardDescription>
                  Configure print settings for your labels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="copies">Number of Copies</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        max="100"
                        value={copies}
                        onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>

                    {/* Orientation Quick Selector */}
                    <div>
                      <Label>Label Layout Orientation</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          type="button"
                          variant={orientation === "portrait" ? "default" : "outline"}
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setOrientation("portrait")}
                        >
                          <RectangleVerticalIcon className="h-8 w-8" />
                          <span className="text-xs">Portrait</span>
                        </Button>
                        <Button
                          type="button"
                          variant={orientation === "landscape" ? "default" : "outline"}
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setOrientation("landscape")}
                        >
                          <RectangleHorizontalIcon className="h-8 w-8" />
                          <span className="text-xs">Landscape</span>
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {orientation === "portrait" ? (
                          <div className="flex items-center gap-1">
                            <RectangleVerticalIcon className="h-3 w-3" />
                            <span>Vertical layout - ideal for product price tags and detailed item labels</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <RectangleHorizontalIcon className="h-3 w-3" />
                            <span>Horizontal layout - perfect for shelf labels and wide product information</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="labels-per-row">Labels per Row</Label>
                      <Select value={labelsPerRow.toString()} onValueChange={(value) => setLabelsPerRow(parseInt(value))}>
                        <SelectTrigger className="mt-1">
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
                    <div>
                      <Label htmlFor="paper-size">Paper Size</Label>
                      <Select value={paperSize} onValueChange={setPaperSize}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                          <SelectItem value="Legal">Legal</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="orientation">Label Orientation</Label>
                      <Select value={orientation} onValueChange={setOrientation}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">
                            <div className="flex items-center gap-2">
                              <RectangleVerticalIcon className="h-4 w-4" />
                              <span>Portrait (Vertical)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="landscape">
                            <div className="flex items-center gap-2">
                              <RectangleHorizontalIcon className="h-4 w-4" />
                              <span>Landscape (Horizontal)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {orientation === "portrait" ? (
                          <div className="flex items-center gap-1">
                            <RectangleVerticalIcon className="h-3 w-3" />
                            <span>Taller than wide - ideal for product labels</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <RectangleHorizontalIcon className="h-3 w-3" />
                            <span>Wider than tall - ideal for shelf labels</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="custom-text">Custom Text (Optional)</Label>
                      <Textarea
                        id="custom-text"
                        placeholder="Add custom text to all labels..."
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Print Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Selected Products:</span>
                          <span>{selectedProducts.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Copies per Product:</span>
                          <span>{copies}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Labels:</span>
                          <span className="font-medium">{selectedProducts.length * copies}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Template:</span>
                          <span>{getCurrentTemplate()?.name || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Print History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Print History
                </CardTitle>
                <CardDescription>
                  View recent print jobs and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {printJobs.length > 0 ? (
                    printJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              Print Job #{job.id}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Template: {job.template_name || 'Unknown'} • 
                              User: {job.user_name || 'Unknown'} • 
                              {job.total_labels} labels
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              job.status === 'completed' ? 'default' : 
                              job.status === 'failed' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No print history</h3>
                      <p className="text-muted-foreground">
                        Print jobs will appear here once you start printing labels
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Creation/Edit Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
          if (!open) {
            handleTemplateDialogClose();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={(e) => {
                console.log('Form submit event triggered');
                templateForm.handleSubmit(onTemplateSubmit)(e);
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter template name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="font_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Font Size (pt)</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex gap-2 items-center">
                              <Input 
                                type="number" 
                                min="6"
                                max="200"
                                step="1"
                                value={field.value}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 6;
                                  field.onChange(value);
                                }}
                                className="w-20"
                              />
                              <input
                                type="range"
                                min="6"
                                max="200"
                                step="1"
                                value={field.value}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(value);
                                }}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((field.value - 6) / (200 - 6)) * 100}%, #e5e7eb ${((field.value - 6) / (200 - 6)) * 100}%, #e5e7eb 100%)`
                                }}
                              />
                              <span className="text-sm font-medium text-blue-600 min-w-[35px]">{field.value}pt</span>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                              <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Live Preview:
                              </div>
                              <div style={{ 
                                fontSize: `${Math.min(watchedFontSize || 18, 40)}px`, 
                                fontWeight: 'bold', 
                                color: '#1e40af',
                                lineHeight: '1.2',
                                marginBottom: '4px',
                                transition: 'font-size 0.2s ease'
                              }}>
                                SUGAR BULK
                              </div>
                              <div style={{ 
                                fontSize: `${Math.max((watchedFontSize || 18) - 6, 8)}px`, 
                                color: '#666',
                                fontWeight: '500',
                                transition: 'font-size 0.2s ease'
                              }}>
                                SKU: 24 • ₹45.00
                              </div>
                              <div className="text-xs text-blue-500 mt-2 opacity-75">
                                Font size: {watchedFontSize || 18}pt
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="orientation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orientation</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || 'landscape'}
                          defaultValue="landscape"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select orientation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="landscape">
                              <div className="flex items-center gap-2">
                                <RectangleHorizontalIcon className="h-4 w-4" />
                                <span>Landscape</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="portrait">
                              <div className="flex items-center gap-2">
                                <RectangleVerticalIcon className="h-4 w-4" />
                                <span>Portrait</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Include Elements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { name: 'include_barcode', label: 'Barcode' },
                      { name: 'include_price', label: 'Price' },
                      { name: 'include_description', label: 'Description' },
                      { name: 'include_mrp', label: 'MRP' },
                      { name: 'include_weight', label: 'Weight' },
                      { name: 'include_hsn', label: 'HSN Code' }
                    ].map((item) => (
                      <FormField
                        key={item.name}
                        control={templateForm.control}
                        name={item.name as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="barcode_position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode Position</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'bottom'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="border_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Border Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'solid'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select border style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="dashed">Dashed</SelectItem>
                            <SelectItem value="dotted">Dotted</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="border_width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Border Width (px)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="background_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="text_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={templateForm.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Set as default template
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleTemplateDialogClose}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Print Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Products:</span>
                  <span className="font-medium">{selectedProducts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Copies each:</span>
                  <span className="font-medium">{copies}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total labels:</span>
                  <span className="font-medium">{selectedProducts.length * copies}</span>
                </div>
                <div className="flex justify-between">
                  <span>Template:</span>
                  <span className="font-medium">{getCurrentTemplate()?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper:</span>
                  <span className="font-medium">{paperSize} {orientation}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will create a print job and open the labels in a new window for printing.
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsPrintDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={executePrint}
                disabled={createPrintJobMutation.isPending}
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Label Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProducts.length > 0 && getCurrentTemplate() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {products
                    .filter(p => selectedProducts.slice(0, 6).includes(p.id))
                    .map(product => (
                      <div 
                        key={product.id}
                        className="border rounded p-2"
                        dangerouslySetInnerHTML={{
                          __html: generateLabelHTML(product, getCurrentTemplate()!)
                        }}
                      />
                    ))}
                </div>
              )}
              {selectedProducts.length > 6 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 6 labels. Total: {selectedProducts.length} products
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsPreviewDialogOpen(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visual Designer */}
      {isDesignerOpen && designerTemplate && (
        <div className="fixed inset-0 z-50 bg-white">
          <LabelDesigner
            templateData={designerTemplate}
            onSave={handleDesignerSave}
            onCancel={handleDesignerCancel}
          />
        </div>
      )}
    </DashboardLayout>
  );
}