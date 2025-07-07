
# 🚀 Awesome Shop POS - Complete cPanel Hosting Guide

## Overview
Deploy your professional Point of Sale system to cPanel hosting with GST compliance, inventory management, customer loyalty, and thermal printing capabilities.

## 📋 Prerequisites
- cPanel hosting account with Node.js support (16.0+)
- File Manager or FTP access
- Terminal access (recommended)
- Domain or subdomain configured

## 🔧 Step 1: Build for Production
Run the enhanced build script locally:
```bash
node build-for-cpanel.js
```

This creates:
- `dist/` folder with complete deployment package
- Production-optimized package.json
- Performance-enhanced .htaccess
- Professional app.js server file
- Complete client application build

## 📁 Step 2: Upload Files to cPanel
### Upload ALL contents from `dist/` folder to your cPanel `public_html` directory:

**Essential Files:**
```
public_html/
├── app.js (Express server entry point)
├── .htaccess (URL rewriting + performance)
├── package.json (production dependencies)
├── index.html (React app entry)
├── assets/ (CSS, JS, images)
├── server/ (backend code)
├── shared/ (database schemas)
└── pos-data.db (SQLite database - auto-created)
```

### 📤 Upload Methods:
1. **File Manager**: Upload `dist.zip` and extract in public_html
2. **FTP Client**: Transfer all `dist/` contents to public_html
3. **Git**: Clone repository and copy dist contents

## ⚙️ Step 3: Install Dependencies
In cPanel Terminal or File Manager Terminal:
```bash
cd public_html
npm install
```

**Expected Dependencies:**
- express (web server)
- better-sqlite3 (database)
- bcryptjs (password security)
- express-session (user sessions)
- passport (authentication)
- zod (data validation)
- drizzle-orm (database ORM)

## 🎯 Step 4: Configure Node.js Application
In cPanel → Node.js:

**Application Settings:**
- **Application Root**: `/public_html`
- **Application URL**: `your-domain.com` (or subdomain)
- **Startup File**: `app.js`
- **Node.js Version**: 16.0+ (18.0+ recommended)

**Click "Create" or "Update" to apply settings**

## 🔐 Step 5: Environment Variables (Optional)
In cPanel Node.js → Environment Variables:
```
NODE_ENV=production
SESSION_SECRET=your-unique-secret-key-here
PORT=3000
```

## 🗄️ Step 6: Database Setup
The SQLite database (`pos-data.db`) is automatically created on first startup with:
- User management (admin/staff roles)
- Product catalog with GST compliance
- Customer database with loyalty system
- Sales and purchase tracking
- Inventory management
- Receipt and label printing settings

**No manual database setup required!**

## 🚀 Step 7: Start Application
In cPanel Node.js interface:
1. Click "Start App" or "Restart App"
2. Wait for status to show "Started"
3. Visit your domain to access the POS system

## ✅ Verification Checklist
1. ☐ App shows "Started" status in cPanel
2. ☐ Domain loads React application
3. ☐ Login page is accessible
4. ☐ API endpoints respond (check browser console)
5. ☐ Database file has proper permissions

## 🌟 Features Available in Production
### Core POS Features
- ✅ **Sales Processing**: Complete POS interface with cart management
- ✅ **Product Management**: Catalog with categories, pricing, stock tracking
- ✅ **Inventory Control**: Real-time stock updates, low-stock alerts
- ✅ **Purchase Management**: Supplier management, purchase orders
- ✅ **Customer Management**: Customer database with transaction history

### Indian Business Compliance
- ✅ **GST Compliance**: CGST, SGST, IGST calculations
- ✅ **HSN Codes**: Tax classification and reporting
- ✅ **Indian Currency**: ₹ (Rupee) formatting throughout
- ✅ **Tax Reports**: Business compliance reporting

### Advanced Features
- ✅ **Customer Loyalty**: Tier-based points system (Member, Bronze, Silver, Gold)
- ✅ **Thermal Printing**: Receipt printing with multiple paper sizes
- ✅ **Label Printing**: Product labels with barcodes
- ✅ **User Authentication**: Secure login with role management
- ✅ **Reports & Analytics**: Sales reports, inventory reports, dashboards

### Printing Capabilities
- ✅ **Thermal Receipts**: 58mm, 72mm, 77mm, 80mm paper support
- ✅ **Product Labels**: Professional barcode labels
- ✅ **Business Information**: Customizable receipt headers
- ✅ **GST Details**: Tax breakdowns on receipts

## 🛠️ Troubleshooting

### App Won't Start
**Check:**
1. Node.js version 16.0+ selected
2. All files uploaded correctly
3. `npm install` completed successfully
4. Check error logs in cPanel Node.js section

### Database Permissions
```bash
chmod 644 pos-data.db  # If database file exists
chmod 755 public_html  # Ensure directory permissions
```

### Static Files Not Loading
**Verify:**
1. `.htaccess` file is present
2. `assets/` folder uploaded completely
3. Check cPanel error logs

### API Errors
**Common fixes:**
1. Restart Node.js application
2. Check server logs for specific errors
3. Verify all dependencies installed
4. Ensure startup file is `app.js`

### Performance Issues
**Optimize:**
1. Enable cPanel compression (gzip)
2. Use CDN for static assets
3. Monitor resource usage in cPanel

## 📊 Production Monitoring
### Check Application Health
- cPanel Node.js status should show "Started"
- Test login at `your-domain.com`
- Verify database operations (add product, make sale)
- Test receipt printing functionality

### Regular Maintenance
- Monitor disk space (SQLite database growth)
- Backup `pos-data.db` regularly
- Update Node.js version as needed
- Monitor cPanel resource usage

## 🎉 Congratulations!
Your Awesome Shop POS system is now live and ready for business operations with:
- Professional Indian retail compliance
- Complete inventory and sales management
- Customer loyalty program
- Thermal receipt printing
- Secure user authentication
- Comprehensive reporting

**Access your POS system at: `https://your-domain.com`**

### Support
For technical issues:
1. Check cPanel error logs
2. Review Node.js application logs
3. Verify file permissions and dependencies
4. Test with sample data to isolate issues

Your professional Point of Sale system is ready to power your retail business!
