
const express = require('express');
const path = require('path');

// Import your main server
const app = require('./dist/index.js');

// Set port for cPanel hosting
const PORT = process.env.PORT || 3000;

// Serve static files from dist/public
app.use(express.static(path.join(__dirname, 'dist/public')));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist/public', 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`POS System running on port ${PORT}`);
});
