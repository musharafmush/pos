const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Set port for cPanel hosting - cPanel typically uses port 3000 or the PORT environment variable
const PORT = process.env.PORT || 3000;

// Enhanced logging for debugging
console.log('🚀 Starting Awesome Shop POS System...');
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
    message: 'Awesome Shop POS API is working',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for React routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log('📄 Serving React app from:', indexPath);
    res.sendFile(indexPath);
  } else {
    console.log('❌ index.html not found, serving basic response');
    res.json({ 
      message: 'Awesome Shop POS - Static files not found',
      timestamp: new Date().toISOString(),
      note: 'Please ensure dist folder is uploaded'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Error:', error.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎉 Awesome Shop POS Server is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🏪 POS System: http://localhost:${PORT}`);
  console.log('✅ Ready to serve your retail business!');
});