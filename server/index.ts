import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializeDatabase } from "../db/sqlite-migrate";

const app = express();
// Parse JSON with appropriate limits for backup files (reduced to prevent memory issues)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    const server = await registerRoutes(app);

    // Add global error handlers to prevent server crashes
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      console.error('Stack:', error.stack);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Add general error handler middleware
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('❌ Express Error:', err);

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });

    // Handle server errors with better recovery
    server.on('error', (error: any) => {
      console.error('❌ Server error:', error);

      // Don't crash on EADDRINUSE - just log it
      if (error.code === 'EADDRINUSE') {
        console.log('⚠️ Port 5000 is already in use, trying to kill existing process...');
        return;
      }

      // For other errors, log but don't exit
      console.error('Server will continue running despite error');
    });

    // Handle uncaught exceptions more gracefully
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error.message);
      console.error('Stack:', error.stack);
      // Don't exit the process, just log the error
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise);
      console.error('Reason:', reason);
      // Don't exit the process, just log the error
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

// Import label printing routes
import './label-printing-routes';

// Label Templates API Routes
app.get('/api/label-templates', async (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT id, name, description, width, height, font_size, orientation,
             include_barcode, include_price, include_description, include_mrp, 
             include_weight, include_hsn, barcode_position, border_style, 
             border_width, background_color, text_color, custom_css, 
             is_default, is_active, created_at, updated_at
      FROM label_templates 
      WHERE is_active = 1 
      ORDER BY is_default DESC, name ASC
    `).all();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching label templates:', error);
    res.status(500).json({ error: 'Failed to fetch label templates' });
  }
});

app.post('/api/label-templates', async (req, res) => {
  try {
    const template = req.body;
    const result = db.prepare(`
      INSERT INTO label_templates (
        name, description, width, height, font_size, orientation,
        include_barcode, include_price, include_description, include_mrp,
        include_weight, include_hsn, barcode_position, border_style,
        border_width, background_color, text_color, custom_css, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      template.name, template.description, template.width, template.height,
      template.font_size, template.orientation || 'landscape',
      template.include_barcode ? 1 : 0, template.include_price ? 1 : 0,
      template.include_description ? 1 : 0, template.include_mrp ? 1 : 0,
      template.include_weight ? 1 : 0, template.include_hsn ? 1 : 0,
      template.barcode_position, template.border_style, template.border_width,
      template.background_color, template.text_color, template.custom_css,
      template.is_default ? 1 : 0
    );

    const newTemplate = db.prepare('SELECT * FROM label_templates WHERE id = ?').get(result.lastInsertRowid);
    res.json(newTemplate);
  } catch (error) {
    console.error('Error creating label template:', error);
    res.status(500).json({ error: 'Failed to create label template' });
  }
});

app.put('/api/label-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = req.body;

    db.prepare(`
      UPDATE label_templates SET
        name = ?, description = ?, width = ?, height = ?, font_size = ?,
        orientation = ?, include_barcode = ?, include_price = ?,
        include_description = ?, include_mrp = ?, include_weight = ?,
        include_hsn = ?, barcode_position = ?, border_style = ?,
        border_width = ?, background_color = ?, text_color = ?,
        custom_css = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      template.name, template.description, template.width, template.height,
      template.font_size, template.orientation || 'landscape',
      template.include_barcode ? 1 : 0, template.include_price ? 1 : 0,
      template.include_description ? 1 : 0, template.include_mrp ? 1 : 0,
      template.include_weight ? 1 : 0, template.include_hsn ? 1 : 0,
      template.barcode_position, template.border_style, template.border_width,
      template.background_color, template.text_color, template.custom_css,
      template.is_default ? 1 : 0, id
    );

    const updatedTemplate = db.prepare('SELECT * FROM label_templates WHERE id = ?').get(id);
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating label template:', error);
    res.status(500).json({ error: 'Failed to update label template' });
  }
});

app.delete('/api/label-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM label_templates WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting label template:', error);
    res.status(500).json({ error: 'Failed to delete label template' });
  }
});

// Print Jobs API Routes
app.get('/api/print-jobs', async (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT pj.*, lt.name as template_name, u.name as user_name
      FROM print_jobs pj
      LEFT JOIN label_templates lt ON pj.template_id = lt.id
      LEFT JOIN users u ON pj.user_id = u.id
      ORDER BY pj.created_at DESC
      LIMIT 50
    `).all();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching print jobs:', error);
    res.status(500).json({ error: 'Failed to fetch print jobs' });
  }
});

app.post('/api/print-jobs', async (req, res) => {
  try {
    const job = req.body;
    const result = db.prepare(`
      INSERT INTO print_jobs (
        template_id, user_id, product_ids, copies, labels_per_row,
        paper_size, orientation, status, total_labels, custom_text, print_settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.templateId, 1, // Default user_id to 1
      JSON.stringify(job.productIds), job.copies, job.labelsPerRow,
      job.paperSize, job.orientation, 'completed', job.totalLabels,
      job.customText, job.printSettings
    );

    const newJob = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(result.lastInsertRowid);
    res.json(newJob);
  } catch (error) {
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Failed to create print job' });
  }
});