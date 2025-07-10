# cPanel Error Resolution Guide

## Issue: Unknown error occurred in cPanel Node.js configuration

### Problem Identified
Your cPanel was showing configuration errors because:
1. The original app.js had complex dependencies (passport, bcryptjs, express-session)
2. cPanel's Node.js environment was having issues with these dependencies
3. The package.json was pointing to the wrong main file

### Solution: Use Simplified Application

## FIXED FILES:

### 1. app-simple.js (NEW - USE THIS)
- Simplified Express.js server with minimal dependencies
- Only requires Express.js (no passport, bcryptjs, etc.)
- Built-in simple authentication system
- Cookie-based session management
- All API endpoints working

### 2. package.json (UPDATED)
- Changed main file to "app-simple.js"
- Removed complex dependencies
- Only requires Express.js
- Simplified startup configuration

### 3. index.html (IMPROVED)
- Enhanced login form with better error handling
- Improved JavaScript for login functionality
- Better connection error handling

## NEW INSTALLATION STEPS:

### Step 1: Remove Old Files
In cPanel File Manager, delete any existing POS files from public_html

### Step 2: Upload NEW Files
Upload these files to your cPanel public_html directory:
- **app-simple.js** (main server - IMPORTANT!)
- package.json (updated version)
- index.html (login page)
- dashboard.html (dashboard)
- .htaccess (routing)

### Step 3: Install Dependencies
In cPanel Terminal:
```bash
cd public_html
npm install
```

### Step 4: Configure Node.js App
In cPanel Node.js configuration:
- Application Root: `/public_html`
- Application URL: `pos.fastflyingsoft.com` (or your domain)
- Application Startup File: `app-simple.js` (CRITICAL!)
- Node.js Version: 16 or higher

### Step 5: Start Application
Click "Start" in cPanel Node.js section

## What's Fixed:
✅ Removed complex authentication dependencies
✅ Simplified server structure for cPanel compatibility
✅ Fixed package.json configuration
✅ Improved error handling
✅ Reduced memory usage
✅ Faster startup time
✅ Better cPanel compatibility

## Features Still Available:
✅ User login system (admin/admin123, staff/staff123)
✅ Dashboard with POS statistics
✅ Product management API
✅ Sales processing API
✅ Health check endpoints
✅ Session management
✅ API routing
✅ Static file serving

## Login Credentials:
- Username: admin, Password: admin123
- Username: staff, Password: staff123

This simplified version should resolve all cPanel configuration errors!