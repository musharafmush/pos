import { Router } from "express";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { products, categories, labelTemplates, printJobs } from "../shared/schema.js";

const router = Router();

// Mock data for label templates (since schema has conflicts, using mock data)
const mockTemplates = [
  {
    id: 1,
    name: "Standard Product Label",
    description: "Basic product label with barcode and price",
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
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Premium Label 50x30",
    description: "Compact label for small products",
    width: 50,
    height: 30,
    fontSize: 14,
    includeBarcode: true,
    includePrice: true,
    includeDescription: true,
    includeMrp: false,
    includeWeight: false,
    includeLogo: true,
    barcodeType: "QR",
    barcodePosition: "right",
    textAlignment: "left",
    borderStyle: "dashed",
    borderWidth: 1,
    backgroundColor: "#f8f9fa",
    textColor: "#212529",
    logoPosition: "top-right",
    customFields: "",
    customCss: "",
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: "Landscape Shelf Label",
    description: "Wide landscape format ideal for shelf pricing",
    width: 100,
    height: 30,
    fontSize: 16,
    includeBarcode: true,
    includePrice: true,
    includeDescription: true,
    includeMrp: true,
    includeWeight: false,
    includeLogo: false,
    barcodeType: "CODE128",
    barcodePosition: "right",
    textAlignment: "left",
    borderStyle: "solid",
    borderWidth: 2,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    logoPosition: "top-left",
    customFields: "",
    customCss: "",
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    name: "Portrait Product Tag",
    description: "Tall portrait format perfect for product tags",
    width: 40,
    height: 80,
    fontSize: 16,
    includeBarcode: true,
    includePrice: true,
    includeDescription: false,
    includeMrp: true,
    includeWeight: true,
    includeLogo: true,
    barcodeType: "CODE128",
    barcodePosition: "bottom",
    textAlignment: "center",
    borderStyle: "solid",
    borderWidth: 1,
    backgroundColor: "#ffffff",
    textColor: "#000000",
    logoPosition: "top-center",
    customFields: "",
    customCss: "",
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockPrinters = [
  {
    id: 1,
    name: "Endura Pro 400",
    type: "endura",
    connection: "usb",
    ipAddress: null,
    port: null,
    paperWidth: 80,
    paperHeight: 40,
    isDefault: true,
    isActive: true
  },
  {
    id: 2,
    name: "Endura Network Printer",
    type: "endura",
    connection: "network",
    ipAddress: "192.168.1.100",
    port: 9100,
    paperWidth: 50,
    paperHeight: 30,
    isDefault: false,
    isActive: true
  }
];

const mockPrintJobs = [
  {
    id: 1,
    templateId: 1,
    userId: 1,
    printerName: "Endura Pro 400",
    productIds: "[1,2,3]",
    copies: 1,
    labelsPerRow: 2,
    paperSize: "80x40",
    orientation: "portrait",
    status: "completed",
    totalLabels: 3,
    customText: "",
    printSettings: "{}",
    errorMessage: null,
    printedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    templateId: 2,
    userId: 1,
    printerName: "Endura Network Printer",
    productIds: "[4,5]",
    copies: 2,
    labelsPerRow: 1,
    paperSize: "50x30",
    orientation: "portrait",
    status: "completed",
    totalLabels: 4,
    customText: "Special Offer",
    printSettings: '{"density": 8, "speed": 4}',
    errorMessage: null,
    printedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// Get all label templates
router.get("/label-templates", async (req, res) => {
  try {
    const templates = await db.select().from(labelTemplates);
    
    // Map database field names to frontend field names
    const mappedTemplates = templates.map(template => ({
      ...template,
      font_size: template.fontSize,
      include_barcode: template.includeBarcode,
      include_price: template.includePrice,
      include_description: template.includeDescription,
      include_mrp: template.includeMRP,
      include_weight: template.includeWeight,
      include_hsn: template.includeHSN,
      include_manufacturing_date: template.includeManufacturingDate,
      include_expiry_date: template.includeExpiryDate,
      barcode_position: template.barcodePosition,
      border_style: template.borderStyle,
      border_width: template.borderWidth,
      background_color: template.backgroundColor,
      text_color: template.textColor,
      custom_css: template.customCSS,
      store_title: template.storeTitle,
      is_default: template.isDefault,
      is_active: template.isActive,
      created_at: template.createdAt,
      updated_at: template.updatedAt
    }));
    
    console.log('Sending templates with mapped fields:', mappedTemplates.map(t => ({ id: t.id, name: t.name, font_size: t.font_size })));
    res.json(mappedTemplates);
  } catch (error) {
    console.error("Error fetching label templates:", error);
    res.status(500).json({ error: "Failed to fetch label templates" });
  }
});

// Create new label template
router.post("/label-templates", async (req, res) => {
  try {
    const templateData = req.body;
    console.log('Creating template with data:', templateData);
    
    // Map frontend field names to database field names
    const dbTemplateData = {
      name: templateData.name,
      description: templateData.description,
      width: templateData.width,
      height: templateData.height,
      fontSize: templateData.font_size, // Map font_size to fontSize
      includeBarcode: templateData.include_barcode,
      includePrice: templateData.include_price,
      includeDescription: templateData.include_description,
      includeMRP: templateData.include_mrp,
      includeWeight: templateData.include_weight,
      includeHSN: templateData.include_hsn,
      includeManufacturingDate: templateData.include_manufacturing_date,
      includeExpiryDate: templateData.include_expiry_date,
      barcodePosition: templateData.barcode_position,
      borderStyle: templateData.border_style,
      borderWidth: templateData.border_width,
      backgroundColor: templateData.background_color,
      textColor: templateData.text_color,
      customCSS: templateData.custom_css,
      storeTitle: templateData.store_title, // Map store_title to storeTitle
      isDefault: templateData.is_default,
      orientation: templateData.orientation
    };
    
    const [newTemplate] = await db.insert(labelTemplates).values(dbTemplateData).returning();
    
    // Map back to frontend field names
    const responseData = {
      ...newTemplate,
      font_size: newTemplate.fontSize,
      include_barcode: newTemplate.includeBarcode,
      include_price: newTemplate.includePrice,
      include_description: newTemplate.includeDescription,
      include_mrp: newTemplate.includeMRP,
      include_weight: newTemplate.includeWeight,
      include_hsn: newTemplate.includeHSN,
      include_manufacturing_date: newTemplate.includeManufacturingDate,
      include_expiry_date: newTemplate.includeExpiryDate,
      barcode_position: newTemplate.barcodePosition,
      border_style: newTemplate.borderStyle,
      border_width: newTemplate.borderWidth,
      background_color: newTemplate.backgroundColor,
      text_color: newTemplate.textColor,
      custom_css: newTemplate.customCSS,
      store_title: newTemplate.storeTitle,
      is_default: newTemplate.isDefault,
      is_active: newTemplate.isActive,
      created_at: newTemplate.createdAt,
      updated_at: newTemplate.updatedAt
    };
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error("Error creating label template:", error);
    res.status(500).json({ error: "Failed to create label template" });
  }
});

// Update label template
router.put("/label-templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const updateData = req.body;
    
    console.log('Received update data:', updateData);
    console.log('Font size received:', updateData.font_size);
    
    // Map frontend field names to database field names
    const dbUpdateData = {
      name: updateData.name,
      description: updateData.description,
      width: updateData.width,
      height: updateData.height,
      fontSize: updateData.font_size, // Map font_size to fontSize
      includeBarcode: updateData.include_barcode,
      includePrice: updateData.include_price,
      includeDescription: updateData.include_description,
      includeMRP: updateData.include_mrp,
      includeWeight: updateData.include_weight,
      includeHSN: updateData.include_hsn,
      includeManufacturingDate: updateData.include_manufacturing_date,
      includeExpiryDate: updateData.include_expiry_date,
      barcodePosition: updateData.barcode_position,
      borderStyle: updateData.border_style,
      borderWidth: updateData.border_width,
      backgroundColor: updateData.background_color,
      textColor: updateData.text_color,
      customCSS: updateData.custom_css,
      storeTitle: updateData.store_title, // Map store_title to storeTitle
      isDefault: updateData.is_default,
      orientation: updateData.orientation
    };
    
    console.log('Mapped data for DB:', dbUpdateData);
    console.log('Font size being saved to database:', dbUpdateData.fontSize);
    
    const [updatedTemplate] = await db
      .update(labelTemplates)
      .set(dbUpdateData)
      .where(eq(labelTemplates.id, templateId))
      .returning();
      
    console.log('Template returned from database after update:', updatedTemplate);
    console.log('Font size returned from database:', updatedTemplate.fontSize);

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Map back to frontend field names
    const responseData = {
      ...updatedTemplate,
      font_size: updatedTemplate.fontSize,
      include_barcode: updatedTemplate.includeBarcode,
      include_price: updatedTemplate.includePrice,
      include_description: updatedTemplate.includeDescription,
      include_mrp: updatedTemplate.includeMRP,
      include_weight: updatedTemplate.includeWeight,
      include_hsn: updatedTemplate.includeHSN,
      include_manufacturing_date: updatedTemplate.includeManufacturingDate,
      include_expiry_date: updatedTemplate.includeExpiryDate,
      barcode_position: updatedTemplate.barcodePosition,
      border_style: updatedTemplate.borderStyle,
      border_width: updatedTemplate.borderWidth,
      background_color: updatedTemplate.backgroundColor,
      text_color: updatedTemplate.textColor,
      custom_css: updatedTemplate.customCSS,
      store_title: updatedTemplate.storeTitle,
      is_default: updatedTemplate.isDefault,
      is_active: updatedTemplate.isActive,
      created_at: updatedTemplate.createdAt,
      updated_at: updatedTemplate.updatedAt
    };

    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error updating label template:", error);
    res.status(500).json({ error: "Failed to update label template" });
  }
});

// Delete label template
router.delete("/label-templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    const [deletedTemplate] = await db
      .delete(labelTemplates)
      .where(eq(labelTemplates.id, templateId))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting label template:", error);
    res.status(500).json({ error: "Failed to delete label template" });
  }
});

// Get all printers
router.get("/printers", async (req, res) => {
  try {
    res.json(mockPrinters);
  } catch (error) {
    console.error("Error fetching printers:", error);
    res.status(500).json({ error: "Failed to fetch printers" });
  }
});

// Get all print jobs
router.get("/print-jobs", async (req, res) => {
  try {
    res.json(mockPrintJobs);
  } catch (error) {
    console.error("Error fetching print jobs:", error);
    res.status(500).json({ error: "Failed to fetch print jobs" });
  }
});

// Create print job (send to printer)
router.post("/print-labels", async (req, res) => {
  try {
    const { templateId, productIds, printerId, quantity } = req.body;
    
    // Find template and printer
    const template = mockTemplates.find(t => t.id === templateId);
    const printer = mockPrinters.find(p => p.id === printerId);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    if (!printer) {
      return res.status(404).json({ error: "Printer not found" });
    }

    // Create new print job
    const newPrintJob = {
      id: Math.max(...mockPrintJobs.map(j => j.id)) + 1,
      templateId,
      userId: req.user?.id || 1,
      printerName: printer.name,
      productIds: JSON.stringify(productIds),
      copies: quantity || 1,
      labelsPerRow: 2,
      paperSize: `${template.width}x${template.height}`,
      orientation: "portrait",
      status: "completed",
      totalLabels: productIds.length * (quantity || 1),
      customText: "",
      printSettings: JSON.stringify({
        printerType: printer.type,
        connection: printer.connection,
        paperWidth: printer.paperWidth,
        paperHeight: printer.paperHeight
      }),
      errorMessage: null,
      printedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    mockPrintJobs.unshift(newPrintJob);

    // Here you would implement actual printer communication
    // For Endura printers, you might use ESC/POS commands or specific APIs
    console.log(`Printing ${productIds.length} labels on ${printer.name}`);
    console.log(`Template: ${template.name} (${template.width}x${template.height}mm)`);
    console.log(`Products: ${productIds.join(", ")}`);

    res.status(201).json({
      message: "Print job created successfully",
      printJob: newPrintJob
    });
  } catch (error) {
    console.error("Error creating print job:", error);
    res.status(500).json({ error: "Failed to create print job" });
  }
});

// Generate barcode data (for frontend preview)
router.post("/generate-barcode", async (req, res) => {
  try {
    const { value, type } = req.body;
    
    // Mock barcode generation - in real implementation, use a barcode library
    const barcodeData = {
      value,
      type,
      width: 200,
      height: 60,
      format: "PNG",
      displayValue: true
    };

    res.json(barcodeData);
  } catch (error) {
    console.error("Error generating barcode:", error);
    res.status(500).json({ error: "Failed to generate barcode" });
  }
});

// Export label template
router.get("/label-templates/:id/export", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = mockTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="template_${template.name.replace(/\s+/g, '_')}.json"`);
    res.json(template);
  } catch (error) {
    console.error("Error exporting template:", error);
    res.status(500).json({ error: "Failed to export template" });
  }
});

// Import label template
router.post("/label-templates/import", async (req, res) => {
  try {
    const templateData = req.body;
    
    // Validate template data
    if (!templateData.name || !templateData.width || !templateData.height) {
      return res.status(400).json({ error: "Invalid template data" });
    }

    const newTemplate = {
      ...templateData,
      id: Math.max(...mockTemplates.map(t => t.id)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockTemplates.push(newTemplate);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error importing template:", error);
    res.status(500).json({ error: "Failed to import template" });
  }
});

// Test printer connection
router.post("/printers/:id/test", async (req, res) => {
  try {
    const printerId = parseInt(req.params.id);
    const printer = mockPrinters.find(p => p.id === printerId);
    
    if (!printer) {
      return res.status(404).json({ error: "Printer not found" });
    }

    // Mock printer test - in real implementation, send test command to printer
    console.log(`Testing printer: ${printer.name}`);
    
    const testResult = {
      success: true,
      message: `Test successful for ${printer.name}`,
      printerStatus: "online",
      paperStatus: "loaded",
      connectionType: printer.connection
    };

    res.json(testResult);
  } catch (error) {
    console.error("Error testing printer:", error);
    res.status(500).json({ error: "Failed to test printer" });
  }
});

export default router;