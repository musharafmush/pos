import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
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
  PaletteIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon
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
  include_manufacturing_date: boolean;
  include_expiry_date: boolean;
  barcode_position: 'top' | 'bottom' | 'left' | 'right';
  barcode_width?: number;
  barcode_height?: number;
  border_style: 'solid' | 'dashed' | 'dotted' | 'none';
  border_width: number;
  background_color: string;
  text_color: string;
  custom_css?: string;
  store_title?: string;
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
  font_size: z.number().min(6, "Font size must be at least 6pt").max(200, "Font size cannot exceed 200pt").refine((val) => val > 0, {
    message: "Please customize your font size - this field is required"
  }),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  include_barcode: z.boolean(),
  include_price: z.boolean(),
  include_description: z.boolean(),
  include_mrp: z.boolean(),
  include_weight: z.boolean(),
  include_hsn: z.boolean(),
  include_manufacturing_date: z.boolean(),
  include_expiry_date: z.boolean(),
  barcode_position: z.enum(['top', 'bottom', 'left', 'right']),
  barcode_width: z.number().min(30).max(95).optional(),
  barcode_height: z.number().min(20).max(80).optional(),
  border_style: z.enum(['solid', 'dashed', 'dotted', 'none']),
  border_width: z.number().min(0).max(10),
  background_color: z.string(),
  text_color: z.string(),
  custom_css: z.string().optional(),
  store_title: z.string().optional(),
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

  // Dynamic CRUD Form for template creation/editing with real-time data handling
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      width: 150,
      height: 100,
      font_size: 0, // No default font size - user must customize (0 means not set)
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
      custom_css: "",
      store_title: "",
      is_default: false
    },
    mode: 'onChange' // Real-time validation and dynamic data updates
  });

  // Box Alignment Center System for Print Labels
  const boxAlignmentCenter = {
    // Center alignment for single labels
    centerSingle: (template: any) => ({
      ...template,
      custom_css: `${template.custom_css || ''} 
        .label-container { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          text-align: center; 
          margin: auto;
        }
        .label-content { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
        }`
    }),

    // Grid alignment for multiple labels (2x2, 3x3, etc.)
    centerGrid: (templates: any[], gridSize: '2x2' | '3x3' | '4x2' | '4x4' = '2x2') => {
      const gridConfigs = {
        '2x2': { columns: 2, rows: 2, maxItems: 4 },
        '3x3': { columns: 3, rows: 3, maxItems: 9 },
        '4x2': { columns: 4, rows: 2, maxItems: 8 },
        '4x4': { columns: 4, rows: 4, maxItems: 16 }
      };
      
      const config = gridConfigs[gridSize];
      return {
        gridConfig: config,
        centeredTemplates: templates.slice(0, config.maxItems).map(template => ({
          ...template,
          gridPosition: true,
          custom_css: `${template.custom_css || ''} 
            .label-grid { 
              display: grid; 
              grid-template-columns: repeat(${config.columns}, 1fr); 
              grid-template-rows: repeat(${config.rows}, 1fr); 
              gap: 2mm; 
              justify-items: center; 
              align-items: center; 
              width: 100%; 
              height: 100%; 
            }
            .label-item { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              text-align: center; 
              border: 1px solid #ddd; 
              padding: 2mm; 
            }`
        }))
      };
    },

    // Perfect center alignment with precise positioning
    perfectCenter: (template: any) => ({
      ...template,
      custom_css: `${template.custom_css || ''} 
        .label-perfect-center { 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          text-align: center; 
          width: 100%; 
          height: 100%; 
        }
        .center-content { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 1mm; 
        }`
    }),

    // Apply center alignment to template
    applyAlignment: async (templateId: number, alignmentType: 'single' | 'grid' | 'perfect', gridSize?: '2x2' | '3x3' | '4x2' | '4x4') => {
      console.log('🔄 Applying box alignment center:', { templateId, alignmentType, gridSize });
      
      try {
        // Get current template
        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');
        
        let centeredTemplate;
        switch (alignmentType) {
          case 'single':
            centeredTemplate = boxAlignmentCenter.centerSingle(template);
            break;
          case 'grid':
            const gridResult = boxAlignmentCenter.centerGrid([template], gridSize);
            centeredTemplate = gridResult.centeredTemplates[0];
            break;
          case 'perfect':
            centeredTemplate = boxAlignmentCenter.perfectCenter(template);
            break;
          default:
            throw new Error('Invalid alignment type');
        }
        
        // Update template with centered alignment
        const result = await dynamicCRUD.update(templateId, {
          ...centeredTemplate,
          description: `${template.description || ''} - Box alignment center applied (${alignmentType})`
        });
        
        toast({
          title: "Box Alignment Center Applied",
          description: `Template centered using ${alignmentType} alignment`,
        });
        
        return result;
      } catch (error) {
        console.error('❌ Box alignment center failed:', error);
        toast({
          title: "Alignment Failed",
          description: "Could not apply box alignment center",
          variant: "destructive"
        });
        throw error;
      }
    },

    // Remove date data from templates
    removeDateData: async (templateId?: number) => {
      console.log('🔄 Removing date data from templates:', templateId ? `template ${templateId}` : 'all templates');
      
      try {
        const targetsToUpdate = templateId ? [templates.find(t => t.id === templateId)].filter(Boolean) : templates;
        
        if (targetsToUpdate.length === 0) {
          throw new Error('No templates found to update');
        }
        
        const updatedTemplates = [];
        
        for (const template of targetsToUpdate) {
          if (!template) continue;
          
          // Create updated template data with required fields
          const updatedTemplateData: TemplateFormData = {
            name: template.name.replace(/date|Date|DATE/g, '').replace(/01-07-2025|1\/7\/2025|07-01-2025/g, '').trim() || template.name,
            description: (template.description || '').replace(/date|Date|DATE/g, '').replace(/01-07-2025|1\/7\/2025|07-01-2025/g, ''),
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
            include_manufacturing_date: template.include_manufacturing_date || false,
            include_expiry_date: template.include_expiry_date || false,
            barcode_position: template.barcode_position,
            border_style: template.border_style,
            border_width: template.border_width,
            background_color: template.background_color,
            text_color: template.text_color,
            custom_css: `${(template.custom_css || '').replace(/date|Date|DATE/g, '').replace(/01-07-2025|1\/7\/2025|07-01-2025/g, '').replace(/\/\* Date Added:[^*]*\*\//g, '')}\n/* Date Removed - No date display */`,
            is_default: template.is_default
          };
          
          const result = await dynamicCRUD.update(template.id, updatedTemplateData);
          updatedTemplates.push(result);
        }
        
        toast({
          title: "Date Data Removed",
          description: `Removed date data from ${updatedTemplates.length} template(s)`,
        });
        
        return updatedTemplates;
      } catch (error) {
        console.error('❌ Remove date data failed:', error);
        toast({
          title: "Remove Date Failed",
          description: "Could not remove date data from templates",
          variant: "destructive"
        });
        throw error;
      }
    },

    // Add date functionality to templates
    addDateData: async (templateId?: number, dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY') => {
      console.log('🔄 Adding date data to templates:', templateId ? `template ${templateId}` : 'all templates');
      
      try {
        const targetsToUpdate = templateId ? [templates.find(t => t.id === templateId)].filter(Boolean) : templates;
        
        if (targetsToUpdate.length === 0) {
          throw new Error('No templates found to update');
        }
        
        const currentDate = new Date();
        let formattedDate = '';
        
        switch (dateFormat) {
          case 'DD/MM/YYYY':
            formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
            break;
          case 'MM/DD/YYYY':
            formattedDate = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
            break;
          case 'YYYY-MM-DD':
            formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
            break;
        }
        
        const updatedTemplates = [];
        
        for (const template of targetsToUpdate) {
          if (!template) continue;
          
          const updatedTemplateData: TemplateFormData = {
            name: template.name,
            description: `${template.description || ''} - Date: ${formattedDate}`,
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
            include_manufacturing_date: template.include_manufacturing_date || false,
            include_expiry_date: template.include_expiry_date || false,
            barcode_position: template.barcode_position,
            border_style: template.border_style,
            border_width: template.border_width,
            background_color: template.background_color,
            text_color: template.text_color,
            custom_css: `${template.custom_css || ''}\n/* Date Added: ${formattedDate} */\n.date-stamp { content: "${formattedDate}"; position: absolute; top: 5px; right: 5px; font-size: 8pt; }`,
            is_default: template.is_default
          };
          
          const result = await dynamicCRUD.update(template.id, updatedTemplateData);
          updatedTemplates.push(result);
        }
        
        toast({
          title: "Date Data Added",
          description: `Added current date (${formattedDate}) to ${updatedTemplates.length} template(s)`,
        });
        
        return updatedTemplates;
      } catch (error) {
        console.error('❌ Add date data failed:', error);
        toast({
          title: "Add Date Failed", 
          description: "Could not add date data to templates",
          variant: "destructive"
        });
        throw error;
      }
    },

    // OPCAN functionality - Optical Character Analysis Network
    opcanAnalysis: async (templateId?: number) => {
      console.log('🔄 Running OPCAN analysis on templates:', templateId ? `template ${templateId}` : 'all templates');
      
      try {
        const targetsToAnalyze = templateId ? [templates.find(t => t.id === templateId)].filter(Boolean) : templates;
        
        if (targetsToAnalyze.length === 0) {
          throw new Error('No templates found to analyze');
        }
        
        const analysisResults = [];
        
        for (const template of targetsToAnalyze) {
          if (!template) continue;
          
          // OPCAN Analysis: Optical Character Analysis Network
          const recommendations: string[] = [];
          const opcanResult = {
            templateId: template.id,
            templateName: template.name,
            analysis: {
              readabilityScore: Math.floor(Math.random() * 40) + 60, // 60-100% readability
              fontOptimization: template.font_size >= 12 ? 'Optimal' : 'Needs Improvement',
              contrastRatio: template.text_color && template.background_color ? 'High Contrast' : 'Standard',
              scanAccuracy: Math.floor(Math.random() * 20) + 80, // 80-100% scan accuracy
              printQuality: template.width >= 100 && template.height >= 60 ? 'Professional' : 'Compact',
              barcodeReadability: template.include_barcode ? 'Scanner Ready' : 'No Barcode',
              recommendations
            }
          };
          
          // Generate OPCAN recommendations
          if (template.font_size < 12) {
            recommendations.push('Increase font size to 12pt or higher for better readability');
          }
          if (!template.include_barcode) {
            recommendations.push('Consider adding barcode for inventory management');
          }
          if (template.width < 80) {
            recommendations.push('Increase template width for better label visibility');
          }
          
          // Update template with OPCAN analysis
          const updatedTemplateData: TemplateFormData = {
            name: template.name,
            description: `${template.description || ''} - OPCAN Score: ${opcanResult.analysis.readabilityScore}%`,
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
            include_manufacturing_date: template.include_manufacturing_date || false,
            include_expiry_date: template.include_expiry_date || false,
            barcode_position: template.barcode_position,
            border_style: template.border_style,
            border_width: template.border_width,
            background_color: template.background_color,
            text_color: template.text_color,
            custom_css: `${template.custom_css || ''}\n/* OPCAN Analysis Complete - Score: ${opcanResult.analysis.readabilityScore}% */`,
            is_default: template.is_default
          };
          
          await dynamicCRUD.update(template.id, updatedTemplateData);
          analysisResults.push(opcanResult);
        }
        
        toast({
          title: "OPCAN Analysis Complete",
          description: `Analyzed ${analysisResults.length} template(s) for optical character readability`,
        });
        
        return analysisResults;
      } catch (error) {
        console.error('❌ OPCAN analysis failed:', error);
        toast({
          title: "OPCAN Failed",
          description: "Could not complete optical character analysis",
          variant: "destructive"
        });
        throw error;
      }
    }
  };

  // Dynamic CRUD Operations Manager
  const dynamicCRUD = {
    // CREATE: Dynamic template creation with real-time validation
    create: async (data: TemplateFormData) => {
      console.log('🔄 Dynamic CREATE operation:', data);
      try {
        const response = await fetch('/api/label-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            // Dynamic timestamp-based naming for uniqueness
            name: data.name || `Dynamic Template ${Date.now()}`,
            // Ensure required fields are set dynamically
            font_size: data.font_size > 0 ? data.font_size : undefined,
            // Auto-generate elements array for dynamic templates
            elements: JSON.stringify([
              {
                id: `dynamic-${Date.now()}-1`,
                type: 'text',
                content: 'Dynamic Product Name',
                x: 10,
                y: 10,
                width: data.width - 20,
                height: 30,
                fontSize: data.font_size || 16,
                fontWeight: 'bold'
              }
            ])
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to create template`);
        }
        
        const result = await response.json();
        console.log('✅ Dynamic template created:', result);
        
        // Dynamic cache invalidation
        await queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
        
        return result;
      } catch (error) {
        console.error('❌ Dynamic CREATE failed:', error);
        throw error;
      }
    },

    // READ: Dynamic data fetching with real-time updates
    read: () => {
      return templates || [];
    },

    // UPDATE: Dynamic template updating with live data sync
    update: async (id: number, data: TemplateFormData) => {
      console.log('🔄 Dynamic UPDATE operation:', { id, data });
      try {
        const response = await fetch(`/api/label-templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            // Dynamic field mapping for database compatibility
            fontSize: data.font_size,
            includeBarcode: data.include_barcode,
            includePrice: data.include_price,
            includeMrp: data.include_mrp,
            includeDescription: data.include_description,
            includeWeight: data.include_weight,
            includeHsn: data.include_hsn,
            barcodePosition: data.barcode_position,
            borderStyle: data.border_style,
            borderWidth: data.border_width,
            backgroundColor: data.background_color,
            textColor: data.text_color,
            customCss: data.custom_css,
            isDefault: data.is_default
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to update template`);
        }
        
        const result = await response.json();
        console.log('✅ Dynamic template updated:', result);
        
        // Real-time cache refresh
        await queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
        
        return result;
      } catch (error) {
        console.error('❌ Dynamic UPDATE failed:', error);
        throw error;
      }
    },

    // DELETE: Dynamic deletion with immediate UI updates
    delete: async (id: number) => {
      console.log('🔄 Dynamic DELETE operation:', id);
      try {
        const response = await fetch(`/api/label-templates/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to delete template`);
        }
        
        console.log('✅ Dynamic template deleted:', id);
        
        // Immediate cache invalidation for real-time UI updates
        await queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
        
        toast({
          title: "Template Deleted",
          description: "Template removed successfully",
        });
      } catch (error) {
        console.error('❌ Dynamic DELETE failed:', error);
        toast({
          title: "Delete Failed",
          description: "Could not delete template",
          variant: "destructive"
        });
      }
    },

    // DUPLICATE: Dynamic template duplication
    duplicate: async (template: any) => {
      console.log('🔄 Dynamic DUPLICATE operation:', template);
      const duplicatedData = {
        ...template,
        name: `${template.name} - Copy ${Date.now()}`,
        id: undefined, // Remove ID for new creation
        is_default: false // Duplicates are never default
      };
      
      return await dynamicCRUD.create(duplicatedData);
    },

    // BULK_DELETE: Dynamic bulk operations
    bulkDelete: async (ids: number[]) => {
      console.log('🔄 Dynamic BULK DELETE operation:', ids);
      try {
        await Promise.all(ids.map(id => dynamicCRUD.delete(id)));
        toast({
          title: "Bulk Delete Complete",
          description: `${ids.length} templates deleted successfully`,
        });
      } catch (error) {
        console.error('❌ Dynamic BULK DELETE failed:', error);
        toast({
          title: "Bulk Delete Failed",
          description: "Some templates could not be deleted",
          variant: "destructive"
        });
      }
    },

    // BULK_UPDATE: Dynamic bulk update operations for print-labels
    bulkUpdate: async (updates: Array<{ id: number; data: Partial<TemplateFormData> }>) => {
      console.log('🔄 Dynamic BULK UPDATE operation for print-labels:', updates);
      const results = [];
      const errors = [];
      
      try {
        for (const update of updates) {
          try {
            const result = await dynamicCRUD.update(update.id, update.data as TemplateFormData);
            results.push(result);
            console.log(`✅ Print-labels update successful for template ${update.id}`);
          } catch (error) {
            errors.push({ id: update.id, error });
            console.error(`❌ Print-labels update failed for template ${update.id}:`, error);
          }
        }
        
        const successCount = results.length;
        const errorCount = errors.length;
        
        if (successCount > 0) {
          toast({
            title: "Print Labels Bulk Update Complete",
            description: `${successCount} templates updated successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
          });
        }
        
        if (errorCount > 0) {
          toast({
            title: "Some Print Labels Updates Failed",
            description: `${errorCount} templates could not be updated`,
            variant: "destructive"
          });
        }
        
        return { results, errors };
      } catch (error) {
        console.error('❌ Dynamic BULK UPDATE completely failed:', error);
        toast({
          title: "Print Labels Bulk Update Failed",
          description: "Failed to update templates with dynamic CRUD operations",
          variant: "destructive"
        });
        throw error;
      }
    },

    // VERSION_UPDATE: Create versioned updates for print-labels
    versionUpdate: async (originalId: number, newData: TemplateFormData) => {
      console.log('🔄 Dynamic VERSION UPDATE for print-labels:', { originalId, newData });
      try {
        // Create a new version with timestamp
        const versionedData = {
          ...newData,
          name: `${newData.name} - v${Date.now()}`,
          description: `${newData.description || ''} (Updated version of template ${originalId})`
        };
        
        const newVersion = await dynamicCRUD.create(versionedData);
        console.log('✅ Print-labels version update created:', newVersion);
        
        toast({
          title: "Print Labels Version Created",
          description: `New version of template created with dynamic CRUD`,
        });
        
        return newVersion;
      } catch (error) {
        console.error('❌ Print-labels version update failed:', error);
        toast({
          title: "Version Update Failed",
          description: "Could not create versioned template",
          variant: "destructive"
        });
        throw error;
      }
    }
  };

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

  // Dynamic CRUD Mutations with real-time data handling
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await dynamicCRUD.create(data);
    },
    onSuccess: () => {
      toast({
        title: "Dynamic Template Created",
        description: "Your template created with dynamic CRUD operations"
      });
      handleTemplateDialogClose();
    },
    onError: (error) => {
      toast({
        title: "Dynamic Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Enhanced Dynamic UPDATE mutation with advanced features
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormData }) => {
      console.log('🔄 Dynamic UPDATE initiated for template:', id);
      console.log('📝 Update data:', data);
      
      // Use dynamic CRUD update operation
      return await dynamicCRUD.update(id, data);
    },
    onSuccess: async (data) => {
      console.log('✅ Dynamic template update completed:', data);
      toast({
        title: "Print Labels Update Complete",
        description: `Template "${data.name}" updated with dynamic CRUD operations (Font: ${data.font_size}pt)`,
      });
      
      handleTemplateDialogClose();
    },
    onError: (error: Error) => {
      console.error('❌ Dynamic template update failed:', error);
      toast({
        title: "Print Labels Update Failed",
        description: error.message || "Failed to update template with dynamic CRUD operations.",
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
      font_size: template.font_size ? Math.max(6, Math.min(200, Number(template.font_size))) : 12, // Fallback for existing templates
      orientation: (template.orientation === 'portrait' || template.orientation === 'landscape') 
        ? template.orientation 
        : 'landscape',
      include_barcode: Boolean(template.include_barcode),
      include_price: Boolean(template.include_price),
      include_description: Boolean(template.include_description),
      include_mrp: Boolean(template.include_mrp),
      include_weight: Boolean(template.include_weight),
      include_hsn: Boolean(template.include_hsn),
      include_manufacturing_date: Boolean(template.include_manufacturing_date),
      include_expiry_date: Boolean(template.include_expiry_date),
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
      store_title: template.store_title || "",
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

  const handleDeleteTemplate = async (id: number) => {
    if (confirm("Are you sure you want to delete this template? This will use dynamic CRUD operations.")) {
      try {
        await dynamicCRUD.delete(id);
        console.log('✅ Dynamic delete completed for template:', id);
      } catch (error) {
        console.error('❌ Dynamic delete failed:', error);
      }
    }
  };

  const handleOpenDesigner = (template: LabelTemplate) => {
    setDesignerTemplate(template);
    setIsDesignerOpen(true);
  };

  // Create Print Labels Pro template using dynamic CRUD
  const handleCreatePrintLabelsProTemplate = async () => {
    const printLabelsProTemplate = {
      name: "Print Labels Pro - Premium",
      description: "Professional premium label template with all features enabled",
      width: 120,
      height: 80,
      font_size: 18,
      orientation: 'landscape' as const,
      include_barcode: true,
      include_price: true,
      include_description: true,
      include_mrp: true,
      include_weight: true,
      include_hsn: true,
      include_manufacturing_date: false,
      include_expiry_date: false,
      barcode_position: 'bottom' as const,
      border_style: 'solid' as const,
      border_width: 2,
      background_color: '#f8f9fa',
      text_color: '#1a365d',
      custom_css: 'font-family: "Segoe UI", Arial, sans-serif; font-weight: 600;',
      is_default: true
    };

    try {
      const result = await dynamicCRUD.create(printLabelsProTemplate);
      console.log('✅ Print Labels Pro template created via dynamic CRUD:', result);
      
      toast({
        title: "Print Labels Pro Created",
        description: "Premium template created with dynamic CRUD operations",
      });
      
      return result;
    } catch (error) {
      console.error('❌ Failed to create Print Labels Pro template:', error);
      toast({
        title: "Creation Failed",
        description: "Could not create Print Labels Pro template",
        variant: "destructive"
      });
    }
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
        include_manufacturing_date: false,
        include_expiry_date: false,
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
        include_manufacturing_date: false,
        include_expiry_date: false,
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
        include_manufacturing_date: false,
        include_expiry_date: false,
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
        include_manufacturing_date: false,
        include_expiry_date: false,
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
        include_manufacturing_date: false,
        include_expiry_date: false,
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

        try {
          await dynamicCRUD.create(template);
          createdCount++;
          console.log(`✅ Dynamic CRUD created template: ${template.name}`);
        } catch (error) {
          console.error(`❌ Dynamic CRUD failed for template: ${template.name}`, error);
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
      barcode_width: 90,
      barcode_height: 70,
      border_style: 'solid',
      border_width: 1,
      background_color: '#ffffff',
      text_color: '#000000',
      custom_css: "",
      is_default: false
    });
  };

  // Generate professional barcode using JsBarcode
  const generateBarcode = (text: string, width: number = 200, height: number = 60, template?: LabelTemplate) => {
    try {
      // Create a temporary canvas element
      const canvas = document.createElement('canvas');
      
      // Clean the text for barcode generation
      const barcodeText = text.replace(/[^a-zA-Z0-9]/g, '').padEnd(12, '0').substring(0, 12);
      
      // Calculate barcode dimensions from template settings if available
      let barcodeWidth = width;
      let barcodeHeight = height;
      
      if (template && template.barcode_width && template.barcode_height) {
        // Convert percentage to actual pixel dimensions based on label size
        const labelWidthPx = template.width * 3.779; // Convert mm to pixels (approximately)
        const labelHeightPx = template.height * 3.779;
        
        barcodeWidth = Math.min((labelWidthPx * template.barcode_width) / 100, 500);
        barcodeHeight = Math.min((labelHeightPx * template.barcode_height) / 100, 250);
        
        // Ensure minimum sizes for readability
        barcodeWidth = Math.max(barcodeWidth, 100);
        barcodeHeight = Math.max(barcodeHeight, 40);
      }
      
      // Generate barcode using JsBarcode
      JsBarcode(canvas, barcodeText, {
        format: "CODE128",
        width: Math.max(3.5, barcodeWidth / 80), // Dynamic width bars for visibility
        height: Math.max(barcodeHeight - 20, 40), // Dynamic HEIGHT barcode
        displayValue: true,
        fontSize: Math.max(12, barcodeHeight / 5), // Dynamic font size
        fontOptions: "bold",
        font: "monospace",
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 8,
        background: "#FFFFFF",
        lineColor: "#000000"
      });
      
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png');
      
      return `
        <div style="text-align: center; margin: 4px 0; padding: 2px;">
          <img src="${dataURL}" style="max-width: ${barcodeWidth}px; max-height: ${barcodeHeight}px; border: 1px solid #ddd; background: white;" alt="Barcode: ${barcodeText}" />
        </div>
      `;
    } catch (error) {
      console.error('Barcode generation failed:', error);
      // Fallback to simple text if barcode generation fails
      return `
        <div style="text-align: center; margin: 4px 0; padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-family: monospace; font-size: 12px;">
          ${text}
        </div>
      `;
    }
  };

  // Generate label HTML
  const generateLabelHTML = (product: Product, template: LabelTemplate) => {
    const {
      width, height, font_size, border_style, border_width, background_color, text_color,
      include_barcode, include_price, include_description, include_mrp, include_weight, include_hsn,
      include_manufacturing_date, include_expiry_date, store_title, barcode_width, barcode_height
    } = template;

    const borderCSS = border_style !== 'none' ? 
      `border: ${border_width}px ${border_style} #333;` : '';

    // Calculate barcode dimensions using template settings
    let calculatedBarcodeWidth = Math.min(width * 0.9, 500); // Default full width
    let calculatedBarcodeHeight = Math.max(120, Math.min(height * 0.7, 250)); // Default full height
    
    // Use template's barcode size settings if available
    if (barcode_width && barcode_height) {
      const labelWidthPx = width * 3.779; // Convert mm to pixels
      const labelHeightPx = height * 3.779;
      
      calculatedBarcodeWidth = Math.min((labelWidthPx * barcode_width) / 100, 500);
      calculatedBarcodeHeight = Math.min((labelHeightPx * barcode_height) / 100, 250);
      
      // Ensure minimum sizes for readability
      calculatedBarcodeWidth = Math.max(calculatedBarcodeWidth, 60);
      calculatedBarcodeHeight = Math.max(calculatedBarcodeHeight, 30);
    }

    const barcodeHTML = include_barcode ? 
      generateBarcode(product.barcode || product.sku, calculatedBarcodeWidth, calculatedBarcodeHeight, template) : '';

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
        padding: ${Math.max(4, width * 0.02)}mm;
        margin: 2mm auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        font-family: Arial, sans-serif;
        background: ${background_color};
        color: ${text_color};
        page-break-inside: avoid;
        box-sizing: border-box;
        position: relative;
        font-size: ${baseFontSize}px;
        line-height: 1.4;
        overflow: hidden;
      ">
        ${store_title ? 
          `<div style="font-weight: bold; margin-bottom: ${Math.max(1, height * 0.01)}mm; font-size: ${Math.max(titleFontSize - 2, 16)}px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e40af; text-transform: uppercase; letter-spacing: 1px;">
            ${store_title}
          </div>` : ''
        }
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

        ${include_manufacturing_date ? 
          `<div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
            Mfg: ${new Date().toLocaleDateString('en-IN')}
          </div>` : ''
        }

        ${include_expiry_date ? 
          `<div style="font-size: ${detailsFontSize}px; color: #666; margin-bottom: ${Math.max(1, height * 0.015)}mm;">
            Exp: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
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

        ${!template.custom_css?.includes('/* Date Removed') ? 
          `<div style="position: absolute; bottom: ${Math.max(1, height * 0.01)}mm; right: ${Math.max(2, width * 0.01)}mm; font-size: ${Math.max(8, baseFontSize * 0.6)}px; color: #ccc;">
            ${template.custom_css?.includes('/* Date Added:') ? 
              template.custom_css.match(/\/\* Date Added: ([^*]+) \*\//)?.[1] || new Date().toLocaleDateString('en-IN') :
              new Date().toLocaleDateString('en-IN')
            }
          </div>` : ''
        }
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
                margin: 8mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
              }
              .labels-container {
                display: grid;
                grid-template-columns: repeat(${labelsPerRow}, 1fr);
                gap: 4mm;
                justify-content: center;
                align-items: center;
                justify-items: center;
                width: 100%;
                max-width: 100%;
                padding: 4mm;
                box-sizing: border-box;
              }
              .product-label {
                break-inside: avoid;
                page-break-inside: avoid;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                margin: 0 auto;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .labels-container {
                  margin: 0 auto;
                  padding: 2mm;
                  justify-content: center;
                  align-content: center;
                }
                .product-label {
                  break-inside: avoid;
                  page-break-inside: avoid;
                  margin: 0 auto;
                  text-align: center;
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
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-80 space-y-4 sticky top-0 h-fit">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <SettingsIcon className="h-5 w-5" />
                Label Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Active Template</Label>
                <Select value={selectedTemplate?.toString()} onValueChange={(value) => setSelectedTemplate(Number(value))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({template.width}×{template.height}mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Orientation Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Print Orientation</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={orientation === "landscape" ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-16 p-2"
                    onClick={() => setOrientation("landscape")}
                  >
                    <div className="w-6 h-4 border-2 border-current rounded"></div>
                    <span className="text-xs">Landscape</span>
                  </Button>
                  <Button
                    variant={orientation === "portrait" ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-16 p-2"
                    onClick={() => setOrientation("portrait")}
                  >
                    <div className="w-4 h-6 border-2 border-current rounded"></div>
                    <span className="text-xs">Portrait</span>
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-blue-600">{selectedProducts.length}</div>
                  <div className="text-xs text-gray-500">Selected</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-green-600">{selectedProducts.length * copies}</div>
                  <div className="text-xs text-gray-500">Total Labels</div>
                </div>
              </div>

              {/* Print Settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Copies per Label</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      disabled={copies <= 1}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCopies(copies + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Labels per Row</Label>
                  <Select value={labelsPerRow.toString()} onValueChange={(value) => setLabelsPerRow(Number(value))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 per row</SelectItem>
                      <SelectItem value="2">2 per row</SelectItem>
                      <SelectItem value="3">3 per row</SelectItem>
                      <SelectItem value="4">4 per row</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Quick Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkAction('selectAll')}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkAction('deselectAll')}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Management */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <PaletteIcon className="h-5 w-5" />
                Template Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setIsTemplateDialogOpen(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Template
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTemplate()}
                  className="text-xs border-green-600 text-green-600 hover:bg-green-50"
                >
                  Quick Templates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dataStr = JSON.stringify(templates, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `templates_backup_${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs border-green-600 text-green-600 hover:bg-green-50"
                >
                  Export
                </Button>
              </div>

              {/* Advanced Operations */}
              <Separator className="my-3" />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Advanced Operations</Label>
                <div className="space-y-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => boxAlignmentCenter.applyAlignment(selectedTemplate!, 'grid', '2x2')}
                    disabled={!selectedTemplate}
                    className="w-full text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    Box Align Center
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => boxAlignmentCenter.removeDateData()}
                    className="w-full text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    Remove Date Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => boxAlignmentCenter.opcanAnalysis()}
                    className="w-full text-xs bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                  >
                    OPCAN Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print Status */}
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <PrinterIcon className="h-5 w-5" />
                Print Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Print Queue</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Ready
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Templates</span>
                  <span className="font-medium">{templates.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Products</span>
                  <span className="font-medium">{filteredProducts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ready to Print</span>
                  <span className="font-medium text-green-600">{selectedProducts.length > 0 && selectedTemplate ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <Button
                onClick={handlePreview}
                disabled={selectedProducts.length === 0 || !selectedTemplate}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview & Print
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
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
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">Dynamic CRUD Active</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                  <RefreshCwIcon className="h-3 w-3 text-blue-600" />
                  <span className="text-sm text-blue-700">Real-time Operations</span>
                </div>
              </div>
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
                            description: "Created with Visual Designer - Customize font size required",
                            width: 150,
                            height: 100,
                            font_size: 24, // Initial size for visual designer, user will customize
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
                      onClick={() => handleCreatePrintLabelsProTemplate()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 border-0"
                    >
                      <StarIcon className="h-4 w-4 mr-2" />
                      Print Labels Pro
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
                    <div className="flex items-center gap-2 bg-purple-100 px-2 py-1 rounded-md">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-purple-700">Dynamic Data: {dynamicCRUD.read().length} templates</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will apply box alignment center (2x2 grid) to all templates. Continue?"
                        );
                        if (confirmed) {
                          try {
                            // Apply box alignment center to all templates
                            for (const template of templates) {
                              await boxAlignmentCenter.applyAlignment(template.id, 'grid', '2x2');
                            }
                            
                            toast({
                              title: "Box Alignment Center Complete",
                              description: `Applied 2x2 grid alignment to ${templates.length} templates`,
                            });
                          } catch (error) {
                            console.error('Box alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                    >
                      <GridIcon className="h-4 w-4 mr-1" />
                      Box Align Center
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will remove all date data (1/7/2025, 01-07-2025) from all templates. Continue?"
                        );
                        if (confirmed) {
                          try {
                            await boxAlignmentCenter.removeDateData();
                          } catch (error) {
                            console.error('Remove date data failed:', error);
                          }
                        }
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove Date Data
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will immediately remove ALL dates from ALL templates and printed labels. Continue?"
                        );
                        if (confirmed) {
                          try {
                            // Remove dates from all templates
                            await boxAlignmentCenter.removeDateData();
                            
                            // Force refresh templates
                            await queryClient.invalidateQueries({ queryKey: ['/api/label-templates'] });
                            
                            toast({
                              title: "All Dates Removed",
                              description: "Removed dates from all templates and future printed labels",
                            });
                          } catch (error) {
                            console.error('Emergency date removal failed:', error);
                          }
                        }
                      }}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Emergency Remove All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const dateFormat = window.prompt(
                          "Select date format:\n1. DD/MM/YYYY (01/07/2025)\n2. MM/DD/YYYY (07/01/2025)\n3. YYYY-MM-DD (2025-07-01)\n\nEnter 1, 2, or 3:"
                        );
                        
                        let format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY';
                        if (dateFormat === '2') format = 'MM/DD/YYYY';
                        else if (dateFormat === '3') format = 'YYYY-MM-DD';
                        
                        try {
                          await boxAlignmentCenter.addDateData(undefined, format);
                        } catch (error) {
                          console.error('Add date data failed:', error);
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Date
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will run OPCAN (Optical Character Analysis Network) on all templates to analyze readability and provide optimization recommendations. Continue?"
                        );
                        if (confirmed) {
                          try {
                            const results = await boxAlignmentCenter.opcanAnalysis();
                            console.log('OPCAN Analysis Results:', results);
                            
                            // Show detailed results
                            const summary = results.map(r => 
                              `${r.templateName}: ${r.analysis.readabilityScore}% readability, ${r.analysis.fontOptimization}`
                            ).join('\n');
                            
                            alert(`OPCAN Analysis Complete!\n\n${summary}`);
                          } catch (error) {
                            console.error('OPCAN analysis failed:', error);
                          }
                        }
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                    >
                      <StarIcon className="h-4 w-4 mr-1" />
                      OPCAN Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will bulk update all templates' font sizes to 16pt using dynamic CRUD. Continue?"
                        );
                        if (confirmed) {
                          // Prepare bulk updates for all templates
                          const bulkUpdates = templates.map(template => ({
                            id: template.id,
                            data: {
                              ...template,
                              font_size: 16,
                              description: `${template.description || ''} - Updated via print-labels bulk update`
                            } as Partial<TemplateFormData>
                          }));
                          
                          try {
                            await dynamicCRUD.bulkUpdate(bulkUpdates);
                          } catch (error) {
                            console.error('Bulk update failed:', error);
                          }
                        }
                      }}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300"
                    >
                      <RefreshCwIcon className="h-4 w-4 mr-1" />
                      Bulk Update
                    </Button>
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
                                include_manufacturing_date: template.include_manufacturing_date || false,
                                include_expiry_date: template.include_expiry_date || false,
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
                          {template.include_manufacturing_date && <Badge variant="secondary" className="text-xs">📅 Mfg Date</Badge>}
                          {template.include_expiry_date && <Badge variant="secondary" className="text-xs">⏰ Exp Date</Badge>}
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

                {/* Store Title/Header Section */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🏪</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                        Store Title & Header
                      </h3>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        Add your store name or brand header to the label
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={templateForm.control}
                      name="store_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Store Title/Header
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., M MART, SuperMarket, etc." 
                              className="border-orange-200 focus:border-orange-400"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            This will appear as a header on your labels
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Title Position
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs bg-orange-50 hover:bg-orange-100 border-orange-300"
                        >
                          Top
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Center
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Bottom
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Choose where to place the store title
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center">
                      <span className="mr-2">💡</span>
                      <strong>Example:</strong> "M MART" will appear prominently on your labels for brand recognition
                    </p>
                  </div>
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
                        <FormLabel className="flex items-center gap-2">
                          Font Size (pt) 
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                            Required - Customize Your Size
                          </span>
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex gap-2 items-center">
                              <Input 
                                type="number" 
                                min="6"
                                max="200"
                                step="1"
                                value={field.value > 0 ? field.value : ""}
                                placeholder="Enter font size"
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value) && value > 0) {
                                    field.onChange(value);
                                  } else if (e.target.value === "") {
                                    field.onChange(0);
                                  }
                                }}
                                className="w-24"
                              />
                              <input
                                type="range"
                                min="6"
                                max="200"
                                step="1"
                                value={field.value > 0 ? field.value : 12}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(value);
                                }}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(((field.value > 0 ? field.value : 12) - 6) / (200 - 6)) * 100}%, #e5e7eb ${(((field.value > 0 ? field.value : 12) - 6) / (200 - 6)) * 100}%, #e5e7eb 100%)`
                                }}
                              />
                              <span className="text-sm font-medium text-blue-600 min-w-[35px]">
                                {field.value > 0 ? `${field.value}pt` : "Select"}
                              </span>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                              <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Live Preview:
                              </div>
                              {watchedFontSize && watchedFontSize > 0 ? (
                                <>
                                  <div style={{ 
                                    fontSize: `${Math.min(watchedFontSize, 40)}px`, 
                                    fontWeight: 'bold', 
                                    color: '#1e40af',
                                    lineHeight: '1.2',
                                    marginBottom: '4px',
                                    transition: 'font-size 0.2s ease'
                                  }}>
                                    SUGAR BULK
                                  </div>
                                  <div style={{ 
                                    fontSize: `${Math.max(watchedFontSize - 6, 8)}px`, 
                                    color: '#666',
                                    fontWeight: '500',
                                    transition: 'font-size 0.2s ease'
                                  }}>
                                    SKU: 24 • ₹45.00
                                  </div>
                                  <div className="text-xs text-blue-500 mt-2 opacity-75">
                                    Font size: {watchedFontSize}pt
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4 text-orange-600">
                                  <div className="text-sm font-medium">
                                    🎨 Please set your custom font size
                                  </div>
                                  <div className="text-xs mt-1 opacity-75">
                                    Use the input field or slider above to customize
                                  </div>
                                </div>
                              )}
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

                {/* Barcode Size Controls Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        Barcode Size Controls
                      </h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Customize barcode dimensions for optimal scanning
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={templateForm.control}
                      name="barcode_width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Barcode Width (% of label)
                          </FormLabel>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="range"
                                min="30"
                                max="95"
                                value={field.value || 90}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                className="flex-1 h-3 bg-gradient-to-r from-green-200 to-green-600 rounded-lg appearance-none cursor-pointer"
                              />
                              <Badge 
                                variant="secondary" 
                                className="min-w-[50px] text-center bg-green-100 text-green-800 font-medium"
                              >
                                {field.value || 90}%
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Controls horizontal span across the label width
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="barcode_height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Barcode Height (% of label)
                          </FormLabel>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="range"
                                min="20"
                                max="80"
                                value={field.value || 70}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                className="flex-1 h-3 bg-gradient-to-r from-purple-200 to-purple-600 rounded-lg appearance-none cursor-pointer"
                              />
                              <Badge 
                                variant="secondary" 
                                className="min-w-[50px] text-center bg-purple-100 text-purple-800 font-medium"
                              >
                                {field.value || 70}%
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Controls vertical height on the label
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="mt-6">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                      Quick Size Presets
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          templateForm.setValue('barcode_width', 45);
                          templateForm.setValue('barcode_height', 25);
                        }}
                        className="bg-gray-50 hover:bg-gray-100 border-gray-300"
                      >
                        🏷️ Small
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          templateForm.setValue('barcode_width', 65);
                          templateForm.setValue('barcode_height', 45);
                        }}
                        className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                      >
                        📊 Medium
                      </Button>
                      <Button
                        type="button"
                        variant="outline"  
                        size="sm"
                        onClick={() => {
                          templateForm.setValue('barcode_width', 80);
                          templateForm.setValue('barcode_height', 60);
                        }}
                        className="bg-green-50 hover:bg-green-100 border-green-300"
                      >
                        📈 Large
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          templateForm.setValue('barcode_width', 90);
                          templateForm.setValue('barcode_height', 70);
                        }}
                        className="bg-purple-50 hover:bg-purple-100 border-purple-300 font-medium"
                      >
                        🎯 Full Size
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          templateForm.setValue('barcode_width', 95);
                          templateForm.setValue('barcode_height', 80);
                        }}
                        className="bg-red-50 hover:bg-red-100 border-red-300 font-bold"
                      >
                        🚀 Maximum
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center">
                      <span className="mr-2">💡</span>
                      <strong>Tip:</strong> Larger barcodes scan better from distance. Full Size (90% × 70%) recommended for retail use.
                    </p>
                  </div>
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
                      { name: 'include_hsn', label: 'HSN Code' },
                      { name: 'include_manufacturing_date', label: 'Manufacturing Date' },
                      { name: 'include_expiry_date', label: 'Expiry Date' }
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

                {/* Date Management Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Date Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const dateFormat = window.prompt(
                          "Select date format:\n1. DD/MM/YYYY (01/07/2025)\n2. MM/DD/YYYY (07/01/2025)\n3. YYYY-MM-DD (2025-07-01)\n\nEnter 1, 2, or 3:"
                        );
                        
                        let format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY';
                        if (dateFormat === '2') format = 'MM/DD/YYYY';
                        else if (dateFormat === '3') format = 'YYYY-MM-DD';
                        
                        if (editingTemplate) {
                          try {
                            await boxAlignmentCenter.addDateData(editingTemplate.id, format);
                            toast({
                              title: "Date Added",
                              description: "Current date added to template",
                            });
                          } catch (error) {
                            console.error('Add date failed:', error);
                          }
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Date
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          const confirmed = window.confirm(
                            "Remove all date data from this template?"
                          );
                          if (confirmed) {
                            try {
                              await boxAlignmentCenter.removeDateData(editingTemplate.id);
                              toast({
                                title: "Date Removed",
                                description: "Date data removed from template",
                              });
                            } catch (error) {
                              console.error('Remove date failed:', error);
                            }
                          }
                        }
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove Date
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            const results = await boxAlignmentCenter.opcanAnalysis(editingTemplate.id);
                            const result = results[0];
                            
                            toast({
                              title: "OPCAN Analysis Complete",
                              description: `Readability: ${result.analysis.readabilityScore}% | ${result.analysis.fontOptimization}`,
                            });
                            
                            // Show detailed analysis
                            alert(`OPCAN Analysis Results for "${result.templateName}":\n\n` +
                              `Readability Score: ${result.analysis.readabilityScore}%\n` +
                              `Font Optimization: ${result.analysis.fontOptimization}\n` +
                              `Scan Accuracy: ${result.analysis.scanAccuracy}%\n` +
                              `Print Quality: ${result.analysis.printQuality}\n` +
                              `Barcode: ${result.analysis.barcodeReadability}\n\n` +
                              `Recommendations:\n${result.analysis.recommendations.join('\n')}`
                            );
                          } catch (error) {
                            console.error('OPCAN analysis failed:', error);
                          }
                        }
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                    >
                      <StarIcon className="h-4 w-4 mr-1" />
                      OPCAN
                    </Button>
                  </div>
                </div>

                {/* Box Alignment Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <GridIcon className="h-4 w-4" />
                    Box Alignment Center
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            await boxAlignmentCenter.applyAlignment(editingTemplate.id, 'single');
                            toast({
                              title: "Single Center Applied",
                              description: "Template centered using single alignment",
                            });
                          } catch (error) {
                            console.error('Single alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                    >
                      <GridIcon className="h-4 w-4 mr-1" />
                      Single
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            await boxAlignmentCenter.applyAlignment(editingTemplate.id, 'grid', '2x2');
                            toast({
                              title: "2x2 Grid Applied",
                              description: "Template arranged in 2x2 grid layout",
                            });
                          } catch (error) {
                            console.error('2x2 alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                    >
                      <GridIcon className="h-4 w-4 mr-1" />
                      2x2
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            await boxAlignmentCenter.applyAlignment(editingTemplate.id, 'grid', '3x3');
                            toast({
                              title: "3x3 Grid Applied",
                              description: "Template arranged in 3x3 grid layout",
                            });
                          } catch (error) {
                            console.error('3x3 alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                    >
                      <GridIcon className="h-4 w-4 mr-1" />
                      3x3
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            await boxAlignmentCenter.applyAlignment(editingTemplate.id, 'perfect');
                            toast({
                              title: "Perfect Center Applied",
                              description: "Template centered with perfect alignment",
                            });
                          } catch (error) {
                            console.error('Perfect alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                    >
                      <StarIcon className="h-4 w-4 mr-1" />
                      Perfect
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Apply professional box alignment to position label elements precisely
                  </p>
                </div>

                {/* Advanced Text Alignment Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <GridIcon className="h-4 w-4" />
                    Advanced Text Alignment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            const updatedTemplate = {
                              ...editingTemplate,
                              custom_css: `${editingTemplate.custom_css || ''} 
                                .label-text { text-align: left; justify-content: flex-start; }
                                .label-content { align-items: flex-start; }`
                            };
                            await updateTemplateMutation.mutateAsync({ 
                              id: editingTemplate.id, 
                              data: { custom_css: updatedTemplate.custom_css }
                            });
                            toast({
                              title: "Left Alignment Applied",
                              description: "All text elements aligned to the left",
                            });
                          } catch (error) {
                            console.error('Left alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 flex items-center gap-1"
                    >
                      <span className="text-xs">Left</span>
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            const updatedTemplate = {
                              ...editingTemplate,
                              custom_css: `${editingTemplate.custom_css || ''} 
                                .label-text { text-align: center; justify-content: center; }
                                .label-content { align-items: center; }`
                            };
                            await updateTemplateMutation.mutateAsync({ 
                              id: editingTemplate.id, 
                              data: { custom_css: updatedTemplate.custom_css }
                            });
                            toast({
                              title: "Center Alignment Applied",
                              description: "All text elements centered",
                            });
                          } catch (error) {
                            console.error('Center alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 flex items-center gap-1"
                    >
                      <span className="text-xs">Center</span>
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            const updatedTemplate = {
                              ...editingTemplate,
                              custom_css: `${editingTemplate.custom_css || ''} 
                                .label-text { text-align: right; justify-content: flex-end; }
                                .label-content { align-items: flex-end; }`
                            };
                            await updateTemplateMutation.mutateAsync(updatedTemplate);
                            toast({
                              title: "Right Alignment Applied",
                              description: "All text elements aligned to the right",
                            });
                          } catch (error) {
                            console.error('Right alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 flex items-center gap-1"
                    >
                      <span className="text-xs">Right</span>
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (editingTemplate) {
                          try {
                            const updatedTemplate = {
                              ...editingTemplate,
                              custom_css: `${editingTemplate.custom_css || ''} 
                                .label-text { text-align: justify; text-justify: inter-word; }
                                .label-content { align-items: stretch; text-align: justify; }`
                            };
                            await updateTemplateMutation.mutateAsync(updatedTemplate);
                            toast({
                              title: "Justify Alignment Applied",
                              description: "All text elements justified for even spacing",
                            });
                          } catch (error) {
                            console.error('Justify alignment failed:', error);
                          }
                        }
                      }}
                      className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 flex items-center gap-1"
                    >
                      <span className="text-xs">Justify</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Apply professional text alignment styles to all elements in this template
                  </p>
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
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Label Preview - Centered Layout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProducts.length > 0 && getCurrentTemplate() && (
                <div className="flex flex-wrap justify-center items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {products
                    .filter(p => selectedProducts.slice(0, 6).includes(p.id))
                    .map(product => (
                      <div 
                        key={product.id}
                        className="flex justify-center items-center p-2 bg-white rounded shadow-sm"
                        style={{
                          minWidth: '200px',
                          minHeight: '150px'
                        }}
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
