import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
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
import { useForm } from "react-hook-form";
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
  PaletteIcon,
  TypeIcon,
  LayoutIcon,
  ImageIcon,
  ScanIcon,
  DollarSignIcon,
  HashIcon,
  WeightIcon,
  CalendarIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
  GlobeIcon,
  CrownIcon,
  ShieldIcon,
  TrendingUpIcon
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  cost?: string;
  description?: string;
  barcode?: string;
  mrp?: string;
  weight?: string;
  hsn?: string;
  stockQuantity?: number;
  category?: { id: number; name: string; };
}

interface LabelTemplate {
  id: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  font_size: number;
  include_barcode: boolean;
  include_price: boolean;
  include_description: boolean;
  include_mrp: boolean;
  include_weight: boolean;
  include_hsn: boolean;
  is_default: boolean;
  created_at: string;
}

interface ProfessionalTemplate extends LabelTemplate {
  // Brand customization
  company_name?: string;
  company_logo?: string;
  brand_colors?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  
  // Layout customization
  layout_style: 'modern' | 'classic' | 'minimal' | 'premium' | 'retail' | 'industrial';
  border_style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'rounded';
  corner_radius: number;
  shadow_effect: boolean;
  
  // Typography
  font_family: 'Arial' | 'Helvetica' | 'Times' | 'Courier' | 'Verdana' | 'Georgia';
  title_font_size: number;
  price_font_size: number;
  description_font_size: number;
  font_weight: 'normal' | 'bold' | 'light';
  
  // Content positioning
  title_position: 'top' | 'center' | 'bottom';
  price_position: 'top-right' | 'bottom-right' | 'center' | 'prominent';
  barcode_position: 'bottom' | 'top' | 'center' | 'side';
  
  // Professional elements
  include_qr_code: boolean;
  include_company_info: boolean;
  include_batch_number: boolean;
  include_expiry_date: boolean;
  include_manufacturing_date: boolean;
  include_certification_marks: boolean;
  
  // Retail features
  include_discount_badge: boolean;
  include_stock_status: boolean;
  include_category_tag: boolean;
  include_rating_stars: boolean;
  
  // Compliance features
  include_regulatory_info: boolean;
  include_environmental_icon: boolean;
  include_origin_country: boolean;
  include_warranty_info: boolean;
}

const professionalLayoutStyles = {
  modern: {
    name: 'Modern',
    description: 'Clean, contemporary design with bold typography',
    colors: { primary: '#2563eb', secondary: '#64748b', accent: '#06b6d4' }
  },
  classic: {
    name: 'Classic',
    description: 'Traditional, elegant design with serif fonts',
    colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#d97706' }
  },
  minimal: {
    name: 'Minimal',
    description: 'Simple, clean design with lots of white space',
    colors: { primary: '#000000', secondary: '#6b7280', accent: '#10b981' }
  },
  premium: {
    name: 'Premium',
    description: 'Luxury design with gold accents and elegant styling',
    colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#f59e0b' }
  },
  retail: {
    name: 'Retail',
    description: 'Eye-catching design optimized for retail environments',
    colors: { primary: '#dc2626', secondary: '#1f2937', accent: '#16a34a' }
  },
  industrial: {
    name: 'Industrial',
    description: 'Robust design for industrial and warehouse use',
    colors: { primary: '#374151', secondary: '#6b7280', accent: '#f97316' }
  }
};

export default function ProfessionalLabels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copies, setCopies] = useState(1);
  const [customText, setCustomText] = useState("");
  const [labelsPerRow, setLabelsPerRow] = useState(3);
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  
  // Dialog states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isCustomizationDialogOpen, setIsCustomizationDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProfessionalTemplate | null>(null);

  // Data fetching
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/label-templates'],
  });

  // Template form schema
  const templateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    width: z.number().min(10).max(300),
    height: z.number().min(10).max(300),
    font_size: z.number().min(8).max(48),
    title_font_size: z.number().min(8).max(72),
    price_font_size: z.number().min(8).max(72),
    description_font_size: z.number().min(6).max(24),
    corner_radius: z.number().min(0).max(20),
    layout_style: z.enum(['modern', 'classic', 'minimal', 'premium', 'retail', 'industrial']),
    border_style: z.enum(['none', 'solid', 'dashed', 'dotted', 'double', 'rounded']),
    font_family: z.enum(['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia']),
    font_weight: z.enum(['normal', 'bold', 'light']),
    title_position: z.enum(['top', 'center', 'bottom']),
    price_position: z.enum(['top-right', 'bottom-right', 'center', 'prominent']),
    barcode_position: z.enum(['bottom', 'top', 'center', 'side']),
    company_name: z.string().optional(),
    include_barcode: z.boolean(),
    include_price: z.boolean(),
    include_description: z.boolean(),
    include_mrp: z.boolean(),
    include_weight: z.boolean(),
    include_hsn: z.boolean(),
    include_qr_code: z.boolean(),
    include_company_info: z.boolean(),
    include_batch_number: z.boolean(),
    include_expiry_date: z.boolean(),
    include_manufacturing_date: z.boolean(),
    include_certification_marks: z.boolean(),
    include_discount_badge: z.boolean(),
    include_stock_status: z.boolean(),
    include_category_tag: z.boolean(),
    include_rating_stars: z.boolean(),
    include_regulatory_info: z.boolean(),
    include_environmental_icon: z.boolean(),
    include_origin_country: z.boolean(),
    include_warranty_info: z.boolean(),
    shadow_effect: z.boolean(),
    brand_primary_color: z.string().optional(),
    brand_secondary_color: z.string().optional(),
    brand_accent_color: z.string().optional(),
  });

  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      width: 50,
      height: 30,
      font_size: 12,
      title_font_size: 16,
      price_font_size: 18,
      description_font_size: 10,
      corner_radius: 4,
      layout_style: 'modern',
      border_style: 'solid',
      font_family: 'Arial',
      font_weight: 'normal',
      title_position: 'top',
      price_position: 'bottom-right',
      barcode_position: 'bottom',
      company_name: "",
      include_barcode: true,
      include_price: true,
      include_description: true,
      include_mrp: false,
      include_weight: false,
      include_hsn: false,
      include_qr_code: false,
      include_company_info: false,
      include_batch_number: false,
      include_expiry_date: false,
      include_manufacturing_date: false,
      include_certification_marks: false,
      include_discount_badge: false,
      include_stock_status: false,
      include_category_tag: false,
      include_rating_stars: false,
      include_regulatory_info: false,
      include_environmental_icon: false,
      include_origin_country: false,
      include_warranty_info: false,
      shadow_effect: false,
      brand_primary_color: "#2563eb",
      brand_secondary_color: "#64748b",
      brand_accent_color: "#06b6d4",
    },
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/label-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      setEditingTemplate(null);
      toast({
        title: "Template saved",
        description: "Professional label template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/label-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      setEditingTemplate(null);
      toast({
        title: "Template updated",
        description: "Professional label template has been updated successfully.",
      });
    },
  });

  const createPrintJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/print-jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/print-jobs'] });
      setIsPrintDialogOpen(false);
      toast({
        title: "Print job created",
        description: "Your professional labels are being prepared for printing.",
      });
    },
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
                           (product.category && product.category.name === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Get current template
  const getCurrentTemplate = (): ProfessionalTemplate | null => {
    return templates.find((t: ProfessionalTemplate) => t.id === selectedTemplate) || null;
  };

  // Generate professional label HTML
  const generateProfessionalLabelHTML = (product: Product, template: ProfessionalTemplate): string => {
    const layoutStyle = professionalLayoutStyles[template.layout_style];
    const colors = template.brand_colors || layoutStyle.colors;
    
    // Generate barcode pattern
    const generateBarcode = (text: string): string => {
      const patterns = ['█', '▌', '▐', '│', '┃', '║'];
      let barcode = '';
      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      for (let i = 0; i < 30; i++) {
        const patternIndex = (hash + i * 7) % patterns.length;
        const width = (hash + i * 3) % 3 + 1;
        barcode += patterns[patternIndex].repeat(width);
      }
      return barcode;
    };

    // Calculate dimensions
    const discountPercent = template.include_discount_badge && product.mrp ? 
      Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100) : 0;

    const borderStyle = template.border_style === 'rounded' ? 
      `border: 2px solid ${colors.primary}; border-radius: ${template.corner_radius}px;` :
      template.border_style !== 'none' ? 
      `border: 2px ${template.border_style} ${colors.primary};` : '';

    const shadowStyle = template.shadow_effect ? 
      'box-shadow: 0 4px 8px rgba(0,0,0,0.1);' : '';

    return `
      <div style="
        width: ${template.width}mm;
        height: ${template.height}mm;
        padding: 3mm;
        margin: 1mm;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        ${borderStyle}
        ${shadowStyle}
        font-family: ${template.font_family}, sans-serif;
        font-weight: ${template.font_weight};
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      ">
        <!-- Brand Header -->
        ${template.include_company_info && template.company_name ? `
          <div style="
            background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%);
            color: white;
            padding: 1mm 2mm;
            margin: -3mm -3mm 2mm -3mm;
            font-size: ${Math.max(8, template.font_size - 2)}px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            ${template.company_name}
          </div>
        ` : ''}

        <!-- Discount Badge -->
        ${template.include_discount_badge && discountPercent > 0 ? `
          <div style="
            position: absolute;
            top: 2mm;
            right: 2mm;
            background: ${colors.accent};
            color: white;
            padding: 1mm 2mm;
            border-radius: 50%;
            font-size: ${Math.max(8, template.font_size - 2)}px;
            font-weight: bold;
            z-index: 10;
            transform: rotate(15deg);
          ">
            ${discountPercent}% OFF
          </div>
        ` : ''}

        <!-- Product Title -->
        <div style="
          font-size: ${template.title_font_size}px;
          font-weight: bold;
          color: ${colors.primary};
          text-align: ${template.title_position === 'center' ? 'center' : 'left'};
          margin-bottom: 1mm;
          line-height: 1.2;
          ${template.title_position === 'top' ? 'order: 1;' : 
            template.title_position === 'center' ? 'order: 2;' : 'order: 3;'}
        ">
          ${product.name}
        </div>

        <!-- SKU and Category -->
        <div style="
          font-size: ${Math.max(8, template.description_font_size)}px;
          color: ${colors.secondary};
          margin-bottom: 1mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>SKU: ${product.sku}</span>
          ${(template.include_category_tag !== false) && product.category ? `
            <span style="
              background: ${colors.accent};
              color: white;
              padding: 0.5mm 1mm;
              border-radius: 2mm;
              font-size: ${Math.max(6, (template.description_font_size || 12) - 2)}px;
            ">
              ${product.category.name}
            </span>
          ` : ''}
        </div>

        <!-- Price Section -->
        <div style="
          ${(template.price_position || 'left') === 'prominent' ? `
            background: ${colors.primary};
            color: white;
            padding: 2mm;
            margin: 1mm -3mm;
            text-align: center;
            border-radius: 0;
          ` : `
            text-align: ${(template.price_position || 'left').includes('right') ? 'right' : 'left'};
          `}
          font-size: ${template.price_font_size || 14}px;
          font-weight: bold;
          margin-bottom: 1mm;
        ">
          <span style="color: ${(template.price_position || 'left') === 'prominent' ? 'white' : colors.primary};">
            ₹${product.price}
          </span>
          ${(template.include_mrp !== false) && product.mrp && parseFloat(product.mrp) !== parseFloat(product.price) ? `
            <span style="
              font-size: ${Math.max(10, (template.price_font_size || 14) - 4)}px;
              color: ${(template.price_position || 'left') === 'prominent' ? '#ffcccb' : colors.secondary};
              text-decoration: line-through;
              margin-left: 2mm;
            ">
              ₹${product.mrp}
            </span>
          ` : ''}
        </div>

        <!-- Additional Information -->
        <div style="
          font-size: ${Math.max(8, template.description_font_size || 12)}px;
          color: ${colors.secondary};
          margin-bottom: 1mm;
        ">
          ${(template.include_weight !== false) && product.weight ? `
            <div style="margin-bottom: 0.5mm;">
              <strong>Weight:</strong> ${product.weight}
            </div>
          ` : ''}
          ${(template.include_hsn !== false) && product.hsn ? `
            <div style="margin-bottom: 0.5mm;">
              <strong>HSN:</strong> ${product.hsn}
            </div>
          ` : ''}
          ${(template.include_stock_status !== false) ? `
            <div style="margin-bottom: 0.5mm;">
              <span style="
                color: ${(product.stockQuantity || 0) > 0 ? colors.accent : '#dc2626'};
                font-weight: bold;
              ">
                ${(product.stockQuantity || 0) > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          ` : ''}
        </div>

        <!-- Barcode -->
        ${(template.include_barcode !== false) ? `
          <div style="
            text-align: center;
            margin-top: auto;
            padding-top: 1mm;
            ${(template.barcode_position || 'bottom') === 'top' ? 'order: 1;' : 
              (template.barcode_position || 'bottom') === 'center' ? 'order: 2;' : 'order: 4;'}
          ">
            <div style="
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1;
              letter-spacing: -0.5px;
              background: ${colors.primary};
              color: white;
              padding: 1mm;
              border-radius: 1mm;
              overflow: hidden;
            ">
              ${generateBarcode(product.name + product.sku)}
            </div>
            <div style="
              font-size: ${Math.max(6, template.font_size - 4)}px;
              color: ${colors.secondary};
              margin-top: 0.5mm;
            ">
              ${product.barcode || product.sku}
            </div>
          </div>
        ` : ''}

        <!-- QR Code -->
        ${template.include_qr_code ? `
          <div style="
            position: absolute;
            bottom: 2mm;
            right: 2mm;
            width: 8mm;
            height: 8mm;
            background: ${colors.primary};
            border: 1px solid ${colors.secondary};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: white;
            font-weight: bold;
          ">
            QR
          </div>
        ` : ''}

        <!-- Compliance Icons -->
        ${template.include_certification_marks ? `
          <div style="
            position: absolute;
            bottom: 2mm;
            left: 2mm;
            display: flex;
            gap: 1mm;
          ">
            <div style="
              width: 4mm;
              height: 4mm;
              background: ${colors.accent};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              color: white;
              font-weight: bold;
            ">
              ✓
            </div>
            ${template.include_environmental_icon ? `
              <div style="
                width: 4mm;
                height: 4mm;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: white;
              ">
                🌱
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };

  // Event handlers
  const handleProductSelect = (productId: number, selected: boolean) => {
    if (selected) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p: Product) => p.id));
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    templateForm.reset();
    setIsTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: ProfessionalTemplate) => {
    setEditingTemplate(template);
    
    // Parse brand colors safely
    const brandColors = typeof template.brand_colors === 'string' 
      ? JSON.parse(template.brand_colors || '{}') 
      : template.brand_colors || {};

    const formData = {
      name: template.name || "",
      description: template.description || "",
      width: Number(template.width) || 50,
      height: Number(template.height) || 30,
      font_size: Number(template.font_size) || 12,
      title_font_size: Number(template.title_font_size) || 16,
      price_font_size: Number(template.price_font_size) || 18,
      description_font_size: Number(template.description_font_size) || 10,
      corner_radius: Number(template.corner_radius) || 4,
      layout_style: template.layout_style || 'modern',
      border_style: template.border_style || 'solid',
      font_family: template.font_family || 'Arial',
      font_weight: template.font_weight || 'normal',
      title_position: template.title_position || 'top',
      price_position: template.price_position || 'bottom-right',
      barcode_position: template.barcode_position || 'bottom',
      company_name: template.company_name || "",
      include_barcode: Boolean(template.include_barcode),
      include_price: Boolean(template.include_price),
      include_description: Boolean(template.include_description),
      include_mrp: Boolean(template.include_mrp),
      include_weight: Boolean(template.include_weight),
      include_hsn: Boolean(template.include_hsn),
      include_qr_code: Boolean(template.include_qr_code),
      include_company_info: Boolean(template.include_company_info),
      include_batch_number: Boolean(template.include_batch_number),
      include_expiry_date: Boolean(template.include_expiry_date),
      include_manufacturing_date: Boolean(template.include_manufacturing_date),
      include_certification_marks: Boolean(template.include_certification_marks),
      include_discount_badge: Boolean(template.include_discount_badge),
      include_stock_status: Boolean(template.include_stock_status),
      include_category_tag: Boolean(template.include_category_tag),
      include_rating_stars: Boolean(template.include_rating_stars),
      include_regulatory_info: Boolean(template.include_regulatory_info),
      include_environmental_icon: Boolean(template.include_environmental_icon),
      include_origin_country: Boolean(template.include_origin_country),
      include_warranty_info: Boolean(template.include_warranty_info),
      shadow_effect: Boolean(template.shadow_effect),
      brand_primary_color: brandColors.primary || "#2563eb",
      brand_secondary_color: brandColors.secondary || "#64748b",
      brand_accent_color: brandColors.accent || "#06b6d4",
    };

    console.log("Setting form data:", formData);
    templateForm.reset(formData);
    setIsTemplateDialogOpen(true);
  };

  const onTemplateSubmit = async (values: z.infer<typeof templateSchema>) => {
    console.log("Submitting template with values:", values);
    
    const templateData = {
      name: values.name,
      description: values.description || "",
      width: Number(values.width),
      height: Number(values.height),
      font_size: Number(values.font_size),
      title_font_size: Number(values.title_font_size),
      price_font_size: Number(values.price_font_size),
      description_font_size: Number(values.description_font_size),
      corner_radius: Number(values.corner_radius),
      layout_style: values.layout_style,
      border_style: values.border_style,
      font_family: values.font_family,
      font_weight: values.font_weight,
      title_position: values.title_position,
      price_position: values.price_position,
      barcode_position: values.barcode_position,
      company_name: values.company_name || "",
      include_barcode: Boolean(values.include_barcode),
      include_price: Boolean(values.include_price),
      include_description: Boolean(values.include_description),
      include_mrp: Boolean(values.include_mrp),
      include_weight: Boolean(values.include_weight),
      include_hsn: Boolean(values.include_hsn),
      include_qr_code: Boolean(values.include_qr_code),
      include_company_info: Boolean(values.include_company_info),
      include_batch_number: Boolean(values.include_batch_number),
      include_expiry_date: Boolean(values.include_expiry_date),
      include_manufacturing_date: Boolean(values.include_manufacturing_date),
      include_certification_marks: Boolean(values.include_certification_marks),
      include_discount_badge: Boolean(values.include_discount_badge),
      include_stock_status: Boolean(values.include_stock_status),
      include_category_tag: Boolean(values.include_category_tag),
      include_rating_stars: Boolean(values.include_rating_stars),
      include_regulatory_info: Boolean(values.include_regulatory_info),
      include_environmental_icon: Boolean(values.include_environmental_icon),
      include_origin_country: Boolean(values.include_origin_country),
      include_warranty_info: Boolean(values.include_warranty_info),
      shadow_effect: Boolean(values.shadow_effect),
      brand_colors: JSON.stringify({
        primary: values.brand_primary_color || "#2563eb",
        secondary: values.brand_secondary_color || "#64748b",
        accent: values.brand_accent_color || "#06b6d4",
        text: '#1f2937',
        background: '#ffffff'
      }),
      is_default: false
    };

    console.log("Final template data:", templateData);

    try {
      if (editingTemplate) {
        await updateTemplateMutation.mutateAsync({ id: editingTemplate.id, data: templateData });
      } else {
        await createTemplateMutation.mutateAsync(templateData);
      }
    } catch (error) {
      console.error("Template submission error:", error);
    }
  };

  const handlePreview = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to preview labels.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a professional label template.",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewDialogOpen(true);
  };

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
        description: "Please select a professional label template.",
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
        margin: 5,
        professional: true,
        layoutStyle: template.layout_style
      })
    };

    createPrintJobMutation.mutate(printJobData);

    const printContent = selectedProductsData.map((product: Product) => {
      return Array(copies).fill(null).map(() => 
        generateProfessionalLabelHTML(product, template)
      ).join('');
    }).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Professional Labels - ${new Date().toLocaleDateString()}</title>
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
              }
            </style>
          </head>
          <body>
            <div class="labels-container">
              ${printContent}
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }

    setIsPrintDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CrownIcon className="h-8 w-8 text-yellow-500" />
              Professional Labels
            </h1>
            <p className="text-gray-600 mt-2">Fully customized professional label printing with advanced branding and layout options</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handlePreview}
              variant="outline"
              disabled={selectedProducts.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handlePrint}
              disabled={selectedProducts.length === 0 || !selectedTemplate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Professional Labels ({selectedProducts.length})
            </Button>
          </div>
        </div>

        {/* Professional Features Overview */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <ShieldIcon className="h-5 w-5" />
              Professional Label Features
            </CardTitle>
            <CardDescription className="text-purple-700">
              Advanced customization options for professional-grade label printing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <PaletteIcon className="h-4 w-4 text-purple-600" />
                <span>Custom Branding</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <LayoutIcon className="h-4 w-4 text-purple-600" />
                <span>6 Layout Styles</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TypeIcon className="h-4 w-4 text-purple-600" />
                <span>Advanced Typography</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUpIcon className="h-4 w-4 text-purple-600" />
                <span>Retail Features</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products & Selection</TabsTrigger>
            <TabsTrigger value="templates">Professional Templates</TabsTrigger>
            <TabsTrigger value="settings">Print Settings</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Selection</CardTitle>
                    <CardDescription>
                      Select products for professional label printing ({selectedProducts.length} selected)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      disabled={filteredProducts.length === 0}
                    >
                      {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                      >
                        <GridIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
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
                </div>

                {/* Products Grid/List */}
                <div className={viewMode === 'grid' ? 
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : 
                  "space-y-3"
                }>
                  {filteredProducts.map((product: Product) => (
                    <div 
                      key={product.id}
                      className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-all ${
                        selectedProducts.includes(product.id) ? 
                        'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 
                        'hover:shadow-md'
                      } ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}
                      onClick={() => handleProductSelect(product.id, !selectedProducts.includes(product.id))}
                    >
                      <div className={viewMode === 'list' ? 'flex items-center space-x-4 flex-1' : 'space-y-2'}>
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
                    <CardTitle>Professional Label Templates</CardTitle>
                    <CardDescription>
                      Create and manage your professional label templates with advanced customization
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateTemplate} className="bg-gradient-to-r from-green-600 to-emerald-600">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Professional Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template: ProfessionalTemplate) => (
                    <div 
                      key={template.id}
                      className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-all ${
                        selectedTemplate === template.id ? 
                        'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 ring-2 ring-blue-200' : 
                        'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {template.name}
                            {template.is_default && <StarIcon className="h-4 w-4 text-yellow-500" />}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {professionalLayoutStyles[template.layout_style || 'modern'].name}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {template.width}×{template.height}mm
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                          >
                            <EditIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Template preview */}
                      <div className="bg-gray-50 p-2 rounded border-2 border-dashed border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Preview:</div>
                        <div 
                          className="text-xs bg-white p-1 rounded border"
                          style={{ 
                            minHeight: '30px',
                            fontSize: '8px',
                            fontFamily: template.font_family || 'Arial'
                          }}
                        >
                          <div className="font-bold text-blue-600">SAMPLE PRODUCT</div>
                          <div className="text-gray-600">SKU: SAMPLE123</div>
                          <div className="font-bold">₹99.00</div>
                          {template.include_barcode && (
                            <div className="mt-1 text-center">
                              <div className="bg-gray-800 text-white px-1 text-xs font-mono">
                                ||||||||||||||||
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Print Configuration</CardTitle>
                  <CardDescription>Configure your professional label printing settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="copies">Copies per Product</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        max="100"
                        value={copies}
                        onChange={(e) => setCopies(parseInt(e.target.value))}
                      />
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
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paperSize">Paper Size</Label>
                      <Select value={paperSize} onValueChange={setPaperSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                          <SelectItem value="Legal">Legal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="orientation">Orientation</Label>
                      <Select value={orientation} onValueChange={setOrientation}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customText">Custom Text (Optional)</Label>
                    <Textarea
                      id="customText"
                      placeholder="Add custom text to appear on all labels..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selected Template</CardTitle>
                  <CardDescription>Current professional template configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTemplate ? (
                    <div className="space-y-3">
                      {(() => {
                        const template = getCurrentTemplate();
                        if (!template) return null;
                        
                        return (
                          <>
                            <div>
                              <h3 className="font-medium">{template.name}</h3>
                              {template.description && (
                                <p className="text-sm text-muted-foreground">{template.description}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium">Layout:</span> {professionalLayoutStyles[template.layout_style || 'modern'].name}
                              </div>
                              <div>
                                <span className="font-medium">Size:</span> {template.width}×{template.height}mm
                              </div>
                              <div>
                                <span className="font-medium">Font:</span> {template.font_family || 'Arial'}
                              </div>
                              <div>
                                <span className="font-medium">Border:</span> {template.border_style || 'solid'}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {template.include_barcode && <Badge variant="secondary">Barcode</Badge>}
                              {template.include_price && <Badge variant="secondary">Price</Badge>}
                              {template.include_description && <Badge variant="secondary">Description</Badge>}
                              {template.include_mrp && <Badge variant="secondary">MRP</Badge>}
                              {template.include_qr_code && <Badge variant="secondary">QR Code</Badge>}
                              {template.include_company_info && <Badge variant="secondary">Company Info</Badge>}
                              {template.include_discount_badge && <Badge variant="secondary">Discount Badge</Badge>}
                              {template.include_stock_status && <Badge variant="secondary">Stock Status</Badge>}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TagIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No template selected</h3>
                      <p className="text-muted-foreground">
                        Select a professional template from the Templates tab
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Professional Template Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CrownIcon className="h-5 w-5 text-yellow-500" />
                {editingTemplate ? 'Edit Professional Template' : 'Create Professional Template'}
              </DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="layout">Layout</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <FormLabel>Base Font Size (px)</FormLabel>
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
                    </div>
                  </TabsContent>

                  <TabsContent value="layout" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="layout_style"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Layout Style</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select layout style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(professionalLayoutStyles).map(([key, style]) => (
                                  <SelectItem key={key} value={key}>
                                    <div>
                                      <div className="font-medium">{style.name}</div>
                                      <div className="text-xs text-muted-foreground">{style.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <SelectItem value="double">Double</SelectItem>
                                <SelectItem value="rounded">Rounded</SelectItem>
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
                        name="corner_radius"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Corner Radius (px)</FormLabel>
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
                        name="shadow_effect"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Shadow Effect</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="branding" className="space-y-4">
                    <FormField
                      control={templateForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your company name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="brand_primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-16 h-10 p-1 border rounded"
                                />
                                <Input {...field} placeholder="#2563eb" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="brand_secondary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-16 h-10 p-1 border rounded"
                                />
                                <Input {...field} placeholder="#64748b" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="brand_accent_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accent Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-16 h-10 p-1 border rounded"
                                />
                                <Input {...field} placeholder="#06b6d4" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="font_family"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Font Family</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select font family" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Arial">Arial</SelectItem>
                                <SelectItem value="Helvetica">Helvetica</SelectItem>
                                <SelectItem value="Times">Times New Roman</SelectItem>
                                <SelectItem value="Courier">Courier New</SelectItem>
                                <SelectItem value="Verdana">Verdana</SelectItem>
                                <SelectItem value="Georgia">Georgia</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="font_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Font Weight</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select font weight" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
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
                        name="title_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title Font Size (px)</FormLabel>
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
                        name="price_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Font Size (px)</FormLabel>
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
                        name="description_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description Font Size (px)</FormLabel>
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
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Basic Elements</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: 'include_barcode', label: 'Barcode', icon: ScanIcon },
                          { name: 'include_price', label: 'Price', icon: DollarSignIcon },
                          { name: 'include_description', label: 'Description', icon: TypeIcon },
                          { name: 'include_mrp', label: 'MRP', icon: DollarSignIcon },
                          { name: 'include_weight', label: 'Weight', icon: WeightIcon },
                          { name: 'include_hsn', label: 'HSN Code', icon: HashIcon }
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={templateForm.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Content Positioning</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={templateForm.control}
                          name="title_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title Position</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="top">Top</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="price_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Position</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="top-right">Top Right</SelectItem>
                                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="prominent">Prominent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="barcode_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barcode Position</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                  <SelectItem value="top">Top</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="side">Side</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Professional Features</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: 'include_qr_code', label: 'QR Code', icon: ScanIcon },
                          { name: 'include_company_info', label: 'Company Info', icon: BuildingIcon },
                          { name: 'include_batch_number', label: 'Batch Number', icon: HashIcon },
                          { name: 'include_expiry_date', label: 'Expiry Date', icon: CalendarIcon },
                          { name: 'include_manufacturing_date', label: 'Manufacturing Date', icon: CalendarIcon },
                          { name: 'include_certification_marks', label: 'Certification Marks', icon: ShieldIcon }
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={templateForm.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Retail Features</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: 'include_discount_badge', label: 'Discount Badge', icon: TrendingUpIcon },
                          { name: 'include_stock_status', label: 'Stock Status', icon: Package2Icon },
                          { name: 'include_category_tag', label: 'Category Tag', icon: TagIcon },
                          { name: 'include_rating_stars', label: 'Rating Stars', icon: StarIcon },
                          { name: 'include_regulatory_info', label: 'Regulatory Info', icon: ShieldIcon },
                          { name: 'include_environmental_icon', label: 'Environmental Icon', icon: GlobeIcon }
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={templateForm.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Compliance Features</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { name: 'include_origin_country', label: 'Country of Origin', icon: GlobeIcon },
                          { name: 'include_warranty_info', label: 'Warranty Info', icon: ShieldIcon }
                        ].map((item) => (
                          <FormField
                            key={item.name}
                            control={templateForm.control}
                            name={item.name as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update Professional Template' : 'Create Professional Template'}
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
              <DialogTitle>Print Professional Labels</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Print Summary</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Products:</strong> {selectedProducts.length}</p>
                  <p><strong>Copies per product:</strong> {copies}</p>
                  <p><strong>Total labels:</strong> {selectedProducts.length * copies}</p>
                  <p><strong>Paper size:</strong> {paperSize} ({orientation})</p>
                  <p><strong>Labels per row:</strong> {labelsPerRow}</p>
                  {selectedTemplate && (
                    <p><strong>Template:</strong> {getCurrentTemplate()?.name}</p>
                  )}
                </div>
              </div>
              
              {customText && (
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-sm mb-1">Custom Text</h4>
                  <p className="text-sm text-gray-600">{customText}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={executePrint} disabled={createPrintJobMutation.isPending}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Professional Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Professional Label Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProducts.length > 0 && getCurrentTemplate() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {products
                    .filter(p => selectedProducts.slice(0, 6).includes(p.id))
                    .map(product => (
                      <div 
                        key={product.id}
                        className="border rounded p-2 bg-white"
                        dangerouslySetInnerHTML={{
                          __html: generateProfessionalLabelHTML(product, getCurrentTemplate()!)
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
    </DashboardLayout>
  );
}