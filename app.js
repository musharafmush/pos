
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
    timestamp: new Date().toISOString()
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit in production, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 POS System successfully started!');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('✅ Ready to accept connections');
}).on('error', (error) => {
  console.error('❌ Server startup error:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying alternative ports...`);
    // Try alternative ports
    const altPorts = [3001, 3002, 8080, 8081];
    for (const altPort of altPorts) {
      try {
        app.listen(altPort, '0.0.0.0', () => {
          console.log(`🎉 Server started on alternative port ${altPort}`);
        });
        break;
      } catch (altError) {
        console.log(`Port ${altPort} also in use, trying next...`);
      }
    }
  }
});

module.exports = app;
