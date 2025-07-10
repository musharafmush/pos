const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Use cPanel's provided port or default to 3000
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting POS System for cPanel...');
console.log('📍 Port:', PORT);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// Basic authentication (simplified for cPanel)
const users = {
  admin: 'admin123',
  staff: 'staff123'
};

// Simple session store
const sessions = new Map();

// Login route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (users[username] && users[username] === password) {
    const sessionId = Date.now().toString();
    sessions.set(sessionId, { username, loginTime: Date.now() });
    
    res.cookie('sessionId', sessionId, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      user: { username },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
});

// Check authentication
app.get('/api/auth/user', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    res.json({ 
      user: { username: session.username },
      authenticated: true 
    });
  } else {
    res.status(401).json({ 
      authenticated: false,
      message: 'Not authenticated' 
    });
  }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    sessions.delete(sessionId);
    res.clearCookie('sessionId');
  }
  
  res.json({ message: 'Logged out successfully' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'cPanel',
    version: '1.0.0'
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    todaySales: 12450,
    monthSales: 345600,
    totalProducts: 156,
    lowStock: 12
  });
});

// Products API
app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Sugar 1kg', price: 50, cost: 40, mrp: 100, stock: 50 },
    { id: 2, name: 'Rice 5kg', price: 200, cost: 150, mrp: 300, stock: 30 },
    { id: 3, name: 'Wheat 10kg', price: 350, cost: 280, mrp: 500, stock: 25 }
  ]);
});

// Sales API
app.get('/api/sales', (req, res) => {
  res.json([
    { id: 1, date: new Date().toISOString(), total: 150, customer: 'Walk-in Customer' },
    { id: 2, date: new Date().toISOString(), total: 250, customer: 'Regular Customer' }
  ]);
});

// Serve index.html for root route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <html>
        <head><title>POS System</title></head>
        <body>
          <h1>🏪 POS System</h1>
          <p>System is running on cPanel</p>
          <p>Status: <strong>Online</strong></p>
          <p><a href="/login">Login</a></p>
        </body>
      </html>
    `);
  }
});

// Handle dashboard route
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.redirect('/');
  }
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Catch all for SPA routing
app.get('*', (req, res) => {
  res.redirect('/');
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Server error',
    error: err.message 
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ POS System running on port ${PORT}`);
  console.log(`🌐 Ready at your domain`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

module.exports = app;