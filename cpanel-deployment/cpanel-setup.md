
# POS System - cPanel Hosting Setup Guide

## Prerequisites
- cPanel hosting account with Node.js support
- File Manager or FTP access
- Terminal access (optional but recommended)

## Step 1: Build for Production
Run the build script locally:
```bash
node build-for-cpanel.js
```

## Step 2: Upload Files
Upload these files to your cPanel public_html directory:
- All contents from `dist/` folder
- `app.js` (main server file)
- `.htaccess` (URL rewriting rules)

## Step 3: Install Dependencies
In cPanel File Manager or Terminal, navigate to public_html and run:
```bash
npm install
```

## Step 4: Configure Node.js App
In cPanel Node.js section:
- Set Application Root: `/public_html`
- Set Application URL: Your domain
- Set Application Startup File: `app.js`
- Set Node.js Version: 16 or higher

## Step 5: Environment Variables (Optional)
Set these in cPanel Node.js environment variables:
- `NODE_ENV=production`
- `SESSION_SECRET=your-secret-key`

## Database Setup
The SQLite database (pos-data.db) will be automatically created on first run.

## File Structure in cPanel
```
public_html/
├── app.js (main server)
├── .htaccess (URL rewriting)
├── package.json (dependencies)
├── pos-data.db (SQLite database)
├── index.html (React app)
├── assets/ (CSS, JS, images)
└── server/ (compiled server code)
```

## Troubleshooting
1. **App not starting**: Check Node.js logs in cPanel
2. **Database errors**: Ensure write permissions for pos-data.db
3. **Static files not loading**: Check .htaccess configuration
4. **API errors**: Verify server compilation and dependencies

## Features Available
- ✅ Complete POS system
- ✅ Product management
- ✅ Sales tracking
- ✅ Customer management
- ✅ Inventory control
- ✅ Purchase management
- ✅ Reports and analytics
- ✅ User authentication
- ✅ Offline capability with SQLite

Your professional POS system is now ready for cPanel hosting!
