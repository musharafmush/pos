import { Router } from "express";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { products, categories, labelTemplates, printJobs } from "@shared/schema";

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
    res.json(mockTemplates);
  } catch (error) {
    console.error("Error fetching label templates:", error);
    res.status(500).json({ error: "Failed to fetch label templates" });
  }
});

// Create new label template
router.post("/label-templates", async (req, res) => {
  try {
    const templateData = req.body;
    const newTemplate = {
      ...templateData,
      id: Math.max(...mockTemplates.map(t => t.id)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockTemplates.push(newTemplate);
    res.status(201).json(newTemplate);
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
    
    const templateIndex = mockTemplates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      return res.status(404).json({ error: "Template not found" });
    }

    mockTemplates[templateIndex] = {
      ...mockTemplates[templateIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json(mockTemplates[templateIndex]);
  } catch (error) {
    console.error("Error updating label template:", error);
    res.status(500).json({ error: "Failed to update label template" });
  }
});

// Delete label template
router.delete("/label-templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const templateIndex = mockTemplates.findIndex(t => t.id === templateId);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: "Template not found" });
    }

    mockTemplates.splice(templateIndex, 1);
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