
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve static files from the dist/public directory (where Vite builds to)
const staticPath = path.join(__dirname, '../dist/public');
console.log('Static files path:', staticPath);

// Check if build directory exists
if (!fs.existsSync(staticPath)) {
  console.error('Build directory not found:', staticPath);
  console.log('Please run "npm run build:client" first');
  process.exit(1);
}

app.use(express.static(staticPath));

// API routes (if you have any backend API endpoints)
app.use(express.json());

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Please run "npm run build:client" first.');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 POS System running on port ${PORT}`);
  console.log(`💰 Awesome Shop POS is live!`);
});
