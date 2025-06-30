import { Router } from "express";
import { storage } from "./storage";

const router = Router();

// Get all label templates
router.get("/api/label-templates", async (req, res) => {
  try {
    const templates = await storage.getLabelTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching label templates:", error);
    res.status(500).json({ error: "Failed to fetch label templates" });
  }
});

// Create a new label template
router.post("/api/label-templates", async (req, res) => {
  try {
    const templateData = req.body;
    const newTemplate = await storage.addLabelTemplate(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating label template:", error);
    res.status(500).json({ error: "Failed to create label template" });
  }
});

// Get printers
router.get("/api/printers", async (req, res) => {
  try {
    // Return mock printer data for now
    const printers = [
      {
        id: 1,
        name: "Zebra ZD420",
        type: "thermal",
        status: "online",
        paperWidth: 77,
        dpi: 203
      },
      {
        id: 2,
        name: "Brother QL-820NWB",
        type: "label",
        status: "online",
        paperWidth: 62,
        dpi: 300
      }
    ];
    res.json(printers);
  } catch (error) {
    console.error("Error fetching printers:", error);
    res.status(500).json({ error: "Failed to fetch printers" });
  }
});

// Create print job
router.post("/api/print-labels", async (req, res) => {
  try {
    const printData = req.body;
    const printJob = await storage.addPrintJob({
      templateId: printData.templateId,
      productIds: JSON.stringify(printData.productIds),
      copies: printData.copies || 1,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    res.status(201).json(printJob);
  } catch (error) {
    console.error("Error creating print job:", error);
    res.status(500).json({ error: "Failed to create print job" });
  }
});

// Get print jobs
router.get("/api/print-jobs", async (req, res) => {
  try {
    const printJobs = await storage.getPrintJobs();
    res.json(printJobs);
  } catch (error) {
    console.error("Error fetching print jobs:", error);
    res.status(500).json({ error: "Failed to fetch print jobs" });
  }
});

// Update print job status
router.patch("/api/print-jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await storage.updatePrintJobStatus(parseInt(id), status);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating print job:", error);
    res.status(500).json({ error: "Failed to update print job" });
  }
});

export default router;