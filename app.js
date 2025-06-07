
const express = require('express');
const path = require('path');

const app = express();

// Set port for cPanel hosting
const PORT = process.env.PORT || 3000;

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from client/dist if it exists, otherwise from dist
const staticPath = path.join(__dirname, 'dist');
app.use(express.static(staticPath));

// Import and use your API routes
// Note: You'll need to build your TypeScript server files first
try {
  const routes = require('./dist/server/routes.js');
  if (routes.registerRoutes) {
    routes.registerRoutes(app);
  }
} catch (error) {
  console.log('Routes not found, serving static files only');
}

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ message: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`POS System running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});

module.exports = app;
