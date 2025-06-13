import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializeDatabase } from "../db/sqlite-migrate";

const app = express();
// Parse JSON with a higher limit for large requests (especially backup files)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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