
const express = require('express');
const path = require('path');
const { fileURLToPath } = require('url');

const app = express();

// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// API routes (if you have any backend API endpoints)
app.use(express.json());

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 POS System running on port ${PORT}`);
  console.log(`💰 Awesome Shop POS is live!`);
});
