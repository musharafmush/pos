const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const app = express();

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || (isDev ? 5000 : 3000);

console.log('🚀 Starting Awesome Shop POS System for cPanel...');
console.log('📍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔧 Port:', PORT);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'awesome-shop-pos-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Simple in-memory user store for demo
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) },
  { id: 2, username: 'staff', password: bcrypt.hashSync('staff123', 10) }
];

// Passport local strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    const user = users.find(u => u.username === username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: { id: req.user.id, username: req.user.username } });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Sample data endpoints
app.get('/api/products', ensureAuthenticated, (req, res) => {
  res.json([
    { id: 1, name: 'Sugar', price: 50, cost: 40, mrp: 100, stock: 100 },
    { id: 2, name: 'Rice', price: 80, cost: 65, mrp: 150, stock: 50 },
    { id: 3, name: 'Wheat', price: 45, cost: 35, mrp: 80, stock: 75 }
  ]);
});

app.get('/api/dashboard/stats', ensureAuthenticated, (req, res) => {
  res.json({
    todaySales: 5420,
    monthSales: 152340,
    totalProducts: 150,
    lowStock: 8
  });
});

app.get('/api/sales', ensureAuthenticated, (req, res) => {
  res.json([
    { id: 1, date: new Date().toISOString(), total: 150, customer: 'Walk-in Customer' },
    { id: 2, date: new Date().toISOString(), total: 250, customer: 'Regular Customer' }
  ]);
});

// Static files - serve from current directory
app.use(express.static(path.join(__dirname)));

// Handle React routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Awesome Shop POS</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          h1 { color: #333; }
          .login-form { margin-top: 30px; }
          input { margin: 10px; padding: 10px; width: 200px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏪 Awesome Shop POS System</h1>
          <p>Professional Point of Sale System for Indian Retail Businesses</p>
          <div class="login-form">
            <h3>Login</h3>
            <form method="post" action="/api/auth/login">
              <div>
                <input type="text" name="username" placeholder="Username" required>
              </div>
              <div>
                <input type="password" name="password" placeholder="Password" required>
              </div>
              <div>
                <button type="submit">Login</button>
              </div>
            </form>
            <p><small>Demo: admin/admin123 or staff/staff123</small></p>
          </div>
          <p><small>Status: Server running on cPanel hosting</small></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: isDev ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🎉 Awesome Shop POS System running on port ${PORT}`);
  console.log(`🌐 Access your POS system at your domain`);
  console.log('✅ Ready for business!');
});

module.exports = app;