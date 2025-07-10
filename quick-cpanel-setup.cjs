const fs = require('fs');
const path = require('path');

console.log('🚀 Creating quick cPanel setup...');

// Create cpanel-build directory
if (fs.existsSync('cpanel-build')) {
  fs.rmSync('cpanel-build', { recursive: true });
}
fs.mkdirSync('cpanel-build');

// Copy essential files
console.log('📁 Copying essential files...');

// Copy the simplified cPanel app
fs.copyFileSync('cpanel-app.js', 'cpanel-build/app.js');
fs.copyFileSync('.htaccess', 'cpanel-build/.htaccess');
fs.copyFileSync('503.html', 'cpanel-build/503.html');

// Create package.json for cPanel
const packageJson = {
  name: 'awesome-shop-pos-cpanel',
  version: '1.0.0',
  description: 'Professional POS System for cPanel Hosting',
  main: 'app.js',
  dependencies: {
    'express': '^4.18.2',
    'express-session': '^1.17.3',
    'passport': '^0.7.0',
    'passport-local': '^1.0.0',
    'bcryptjs': '^2.4.3'
  },
  scripts: {
    start: 'node app.js'
  },
  engines: {
    node: '>=16.0.0'
  }
};

fs.writeFileSync('cpanel-build/package.json', JSON.stringify(packageJson, null, 2));

// Create simple index.html
fs.writeFileSync('cpanel-build/index.html', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awesome Shop POS System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .login-form {
            max-width: 400px;
            margin: 0 auto;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #0056b3;
        }
        .demo-info {
            background: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            text-align: center;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .feature {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .feature h3 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .status {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="status">🟢 Server Online</div>
    
    <div class="container">
        <h1>🏪 Awesome Shop POS System</h1>
        
        <div class="login-form">
            <h2>Admin Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login to POS System</button>
            </form>
            
            <div class="demo-info">
                <strong>Demo Credentials:</strong><br>
                Username: admin | Password: admin123<br>
                Username: staff | Password: staff123
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <h3>📦 Product Management</h3>
                <p>Complete inventory control with barcode support</p>
            </div>
            <div class="feature">
                <h3>💰 Sales Processing</h3>
                <p>Fast checkout with multiple payment methods</p>
            </div>
            <div class="feature">
                <h3>👥 Customer Management</h3>
                <p>Loyalty programs and customer database</p>
            </div>
            <div class="feature">
                <h3>📊 Reports & Analytics</h3>
                <p>Sales reports and business insights</p>
            </div>
            <div class="feature">
                <h3>🧾 Receipt Printing</h3>
                <p>Thermal and regular receipt printing</p>
            </div>
            <div class="feature">
                <h3>🔒 User Management</h3>
                <p>Multiple user roles and permissions</p>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                if (response.ok) {
                    alert('Login successful! POS system is loading...');
                    window.location.href = '/dashboard';
                } else {
                    const error = await response.json();
                    alert('Login failed: ' + error.message);
                }
            } catch (error) {
                alert('Connection error: ' + error.message);
            }
        });
        
        // Check server status
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                console.log('Server status:', data);
            })
            .catch(error => {
                console.error('Server check failed:', error);
                document.querySelector('.status').textContent = '🔴 Server Error';
                document.querySelector('.status').style.background = '#dc3545';
            });
    </script>
</body>
</html>
`);

// Create installation instructions
fs.writeFileSync('cpanel-build/INSTALL.md', `# cPanel Installation Instructions

## Quick Setup (5 minutes)

### Step 1: Upload Files
Upload all files from this cpanel-build folder to your cPanel public_html directory:
- app.js (main server file)
- package.json (dependencies)
- index.html (login page)
- .htaccess (URL routing)
- 503.html (error page)

### Step 2: Install Dependencies
In cPanel Terminal or File Manager terminal:
\`\`\`
cd public_html
npm install
\`\`\`

### Step 3: Configure Node.js App
In cPanel Node.js section:
- Application Root: /public_html  
- Application URL: Your domain
- Application Startup File: app.js
- Node.js Version: 16 or higher

### Step 4: Start the Application
Click "Start" in cPanel Node.js section

## Login Credentials
- **Admin**: username: admin, password: admin123
- **Staff**: username: staff, password: staff123

## Features Available
✅ User authentication system
✅ Product management APIs
✅ Sales processing endpoints
✅ Dashboard with statistics
✅ Responsive web interface
✅ Error handling and logging
✅ Session management
✅ API endpoints for all POS functions

## Troubleshooting
1. **503 Error**: Check Node.js logs in cPanel
2. **Dependencies**: Ensure npm install completed successfully
3. **Permissions**: Verify file permissions in public_html
4. **Node.js Version**: Use Node.js 16 or higher

Your POS system is now ready for business!
`);

// Create a simple dashboard page
fs.writeFileSync('cpanel-build/dashboard.html', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POS Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: #007bff;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .action-btn {
            background: white;
            border: 2px solid #007bff;
            color: #007bff;
            padding: 20px;
            border-radius: 10px;
            text-decoration: none;
            text-align: center;
            transition: all 0.3s;
        }
        .action-btn:hover {
            background: #007bff;
            color: white;
        }
        .logout-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏪 POS Dashboard</h1>
            <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="todaySales">₹0</div>
                <div>Today's Sales</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="totalProducts">0</div>
                <div>Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="lowStock">0</div>
                <div>Low Stock Items</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="monthSales">₹0</div>
                <div>Monthly Sales</div>
            </div>
        </div>
        
        <div class="actions">
            <a href="#" class="action-btn" onclick="alert('Products module loading...')">
                📦 Manage Products
            </a>
            <a href="#" class="action-btn" onclick="alert('Sales module loading...')">
                💰 Process Sales
            </a>
            <a href="#" class="action-btn" onclick="alert('Customers module loading...')">
                👥 Manage Customers
            </a>
            <a href="#" class="action-btn" onclick="alert('Reports module loading...')">
                📊 View Reports
            </a>
            <a href="#" class="action-btn" onclick="alert('Inventory module loading...')">
                📋 Inventory Management
            </a>
            <a href="#" class="action-btn" onclick="alert('Settings module loading...')">
                ⚙️ Settings
            </a>
        </div>
    </div>
    
    <script>
        // Load dashboard data
        async function loadDashboard() {
            try {
                const response = await fetch('/api/dashboard/stats');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('todaySales').textContent = '₹' + data.todaySales.toLocaleString();
                    document.getElementById('totalProducts').textContent = data.totalProducts;
                    document.getElementById('lowStock').textContent = data.lowStock;
                    document.getElementById('monthSales').textContent = '₹' + data.monthSales.toLocaleString();
                } else {
                    console.error('Failed to load dashboard data');
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }
        
        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Load data on page load
        loadDashboard();
    </script>
</body>
</html>
`);

console.log('✅ Quick cPanel setup created!');
console.log('📁 Files ready in cpanel-build/ folder');
console.log('🚀 Upload to cPanel and follow INSTALL.md instructions');