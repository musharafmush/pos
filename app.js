
const express = require('express');
const path = require('path');

const app = express();

// Set port for cPanel hosting - cPanel typically uses port 3000 or the PORT environment variable
const PORT = process.env.PORT || 3000;

// Enhanced logging for debugging
console.log('🚀 Starting POS System...');
console.log('📍 Current directory:', __dirname);
console.log('🔧 Node.js version:', process.version);
console.log('📦 Environment:', process.env.NODE_ENV || 'production');

// Parse JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Serve static files from dist directory
const staticPath = path.join(__dirname, 'dist');
console.log('📂 Static files path:', staticPath);

// Check if dist directory exists
const fs = require('fs');
if (fs.existsSync(staticPath)) {
  console.log('✅ Static files directory found');
  app.use(express.static(staticPath));
} else {
  console.log('❌ Static files directory not found:', staticPath);
  // Fallback to current directory
  app.use(express.static(__dirname));
}

// Basic API routes for testing
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Try to import and use your API routes
try {
  console.log('🔌 Loading API routes...');
  
  // Check for compiled server files
  const routesPath = path.join(__dirname, 'dist', 'server', 'routes.js');
  const serverPath = path.join(__dirname, 'server', 'routes.js');
  
  let routes;
  if (fs.existsSync(routesPath)) {
    console.log('📍 Loading routes from:', routesPath);
    routes = require(routesPath);
  } else if (fs.existsSync(serverPath)) {
    console.log('📍 Loading routes from:', serverPath);
    routes = require(serverPath);
  } else {
    console.log('⚠️ No compiled routes found, running in static mode');
  }
  
  if (routes && routes.registerRoutes) {
    console.log('✅ Registering API routes...');
    // Create a simple HTTP server for the routes
    const http = require('http');
    const server = http.createServer(app);
    routes.registerRoutes(app).then(() => {
      console.log('✅ API routes registered successfully');
    }).catch(err => {
      console.error('❌ Error registering routes:', err);
    });
  }
} catch (error) {
  console.log('⚠️ Routes not available, serving in static mode only');
  console.log('Error details:', error.message);
}

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback HTML
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>POS System</title>
        </head>
        <body>
          <h1>POS System</h1>
          <p>Application is starting up...</p>
          <p>If you see this message, the server is running but the client files may not be built yet.</p>
        </body>
        </html>
      `);
    }
  } else {
    res.status(404).json({ message: 'API endpoint not found' });
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Application Error:', err);
  console.error('Stack trace:', err.stack);
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Handle uncaught exceptions more gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  console.error('Process will continue running...');
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('Process will continue running...');
});

// Add graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Add pre-startup diagnostics
console.log('🔍 Pre-startup diagnostics:');
console.log('- Node.js version:', process.version);
console.log('- Working directory:', process.cwd());
console.log('- Platform:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Memory usage:', JSON.stringify(process.memoryUsage(), null, 2));

// Test database connection if possible
try {
  const fs = require('fs');
  const dbPath = path.join(__dirname, 'pos-data.db');
  if (fs.existsSync(dbPath)) {
    console.log('✅ Database file found at:', dbPath);
  } else {
    console.log('⚠️ Database file not found, will be created on first use');
  }
} catch (dbError) {
  console.log('⚠️ Database check failed:', dbError.message);
}

// Start the server with better error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 POS System successfully started!');
  console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📂 Serving from: ${__dirname}`);
  console.log('✅ Ready to accept connections');
  
  // Log available routes
  console.log('📋 Available routes:');
  console.log('- GET /health - Health check');
  console.log('- GET /api/test - API test');
  console.log('- Static files from /dist or current directory');
}).on('error', (error) => {
  console.error('❌ Server startup error:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('💡 Try these solutions:');
    console.error('1. Check if another process is using port', PORT);
    console.error('2. Wait a few moments and try again');
    console.error('3. Restart your hosting service');
    
    // Don't try alternative ports in production - this could cause issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Trying alternative ports...');
      const altPorts = [3001, 3002, 8080, 8081];
      for (const altPort of altPorts) {
        try {
          const altServer = app.listen(altPort, '0.0.0.0', () => {
            console.log(`🎉 Server started on alternative port ${altPort}`);
          });
          break;
        } catch (altError) {
          console.log(`❌ Port ${altPort} also in use, trying next...`);
        }
      }
    }
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied for port ${PORT}`);
    console.error('💡 Try running with appropriate permissions or use a different port');
  } else {
    console.error('❌ Unknown server error:', error.message);
  }
});

module.exports = app;
