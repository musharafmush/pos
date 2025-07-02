import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializePostgresDatabase } from "../db/postgres.js";
import labelPrintingRoutes from "./label-printing-routes.js";

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
    await initializePostgresDatabase();
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

    // Database modules will be imported at the top level

    // Label Templates API Routes
    app.get('/api/label-templates', async (req, res) => {
      try {
        // Ensure label templates table exists
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS label_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            font_size INTEGER DEFAULT 12,
            include_barcode INTEGER DEFAULT 1,
            include_price INTEGER DEFAULT 1,
            include_description INTEGER DEFAULT 0,
            include_mrp INTEGER DEFAULT 1,
            include_weight INTEGER DEFAULT 0,
            include_hsn INTEGER DEFAULT 0,
            barcode_position TEXT DEFAULT 'bottom',
            border_style TEXT DEFAULT 'solid',
            border_width INTEGER DEFAULT 1,
            background_color TEXT DEFAULT '#ffffff',
            text_color TEXT DEFAULT '#000000',
            is_default INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const templates = sqlite.prepare(`
          SELECT * FROM label_templates 
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
        const templateData = req.body;

        // Validate required fields
        if (!templateData.name || !templateData.width || !templateData.height) {
          return res.status(400).json({ 
            message: 'Name, width, and height are required' 
          });
        }

        // Ensure label templates table exists
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS label_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            font_size INTEGER DEFAULT 12,
            include_barcode INTEGER DEFAULT 1,
            include_price INTEGER DEFAULT 1,
            include_description INTEGER DEFAULT 0,
            include_mrp INTEGER DEFAULT 1,
            include_weight INTEGER DEFAULT 0,
            include_hsn INTEGER DEFAULT 0,
            barcode_position TEXT DEFAULT 'bottom',
            border_style TEXT DEFAULT 'solid',
            border_width INTEGER DEFAULT 1,
            background_color TEXT DEFAULT '#ffffff',
            text_color TEXT DEFAULT '#000000',
            is_default INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const stmt = sqlite.prepare(`
          INSERT INTO label_templates (
            name, description, width, height, font_size, include_barcode, include_price,
            include_description, include_mrp, include_weight, include_hsn, barcode_position,
            border_style, border_width, background_color, text_color, is_default, is_active,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();
        const result = stmt.run(
          templateData.name,
          templateData.description || '',
          templateData.width,
          templateData.height,
          templateData.font_size || 12,
          templateData.include_barcode ? 1 : 0,
          templateData.include_price ? 1 : 0,
          templateData.include_description ? 1 : 0,
          templateData.include_mrp ? 1 : 0,
          templateData.include_weight ? 1 : 0,
          templateData.include_hsn ? 1 : 0,
          templateData.barcode_position || 'bottom',
          templateData.border_style || 'solid',
          templateData.border_width || 1,
          templateData.background_color || '#ffffff',
          templateData.text_color || '#000000',
          templateData.is_default ? 1 : 0,
          templateData.is_active !== false ? 1 : 0,
          now,
          now
        );

        // Get the created template
        const newTemplate = sqlite.prepare('SELECT * FROM label_templates WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newTemplate);
      } catch (error) {
        console.error('Error creating label template:', error);
        res.status(500).json({ error: 'Failed to create label template' });
      }
    });

    app.get('/api/print-jobs', async (req, res) => {
      try {
        // Ensure print jobs table exists
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS print_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            user_id INTEGER DEFAULT 1,
            printer_name TEXT NOT NULL,
            product_ids TEXT NOT NULL,
            copies INTEGER DEFAULT 1,
            labels_per_row INTEGER DEFAULT 2,
            paper_size TEXT DEFAULT 'A4',
            orientation TEXT DEFAULT 'portrait',
            status TEXT DEFAULT 'completed',
            total_labels INTEGER NOT NULL,
            custom_text TEXT,
            print_settings TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const jobs = sqlite.prepare(`
          SELECT * FROM print_jobs 
          ORDER BY created_at DESC 
          LIMIT 50
        `).all();
        res.json(jobs);
      } catch (error) {
        console.error('Error fetching print jobs:', error);
        res.status(500).json({ error: 'Failed to fetch print jobs' });
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();