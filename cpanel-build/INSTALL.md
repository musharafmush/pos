# cPanel Installation Instructions

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
```
cd public_html
npm install
```

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
