# Complete cPanel Hosting Guide for POS System

## Step 1: Access Your cPanel Account

1. **Login to cPanel**
   - Go to your hosting provider's website
   - Login to your account
   - Click on "cPanel" or "Control Panel"

2. **Access File Manager**
   - In cPanel, find "File Manager"
   - Click to open it
   - Navigate to `public_html` folder

## Step 2: Upload Your Files

### Upload Method 1: Using File Manager
1. **Delete existing files** in public_html (if any)
2. **Upload these files** from your `cpanel-deployment` folder:
   - `app.cjs` (main server file)
   - `.htaccess` (important for routing)
   - `package.json` (dependencies)
   - `pos-data.db` (database with sample products)
   - Entire `dist` folder (your built app)

### Upload Method 2: Using FTP
1. **Connect via FTP** using FileZilla or similar
2. **Upload all files** from `cpanel-deployment` folder
3. **Ensure file permissions** are set correctly (755 for folders, 644 for files)

## Step 3: Install Dependencies

### Method 1: Using cPanel Terminal
1. **Find "Terminal" in cPanel**
2. **Navigate to your directory**:
   ```bash
   cd public_html
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

### Method 2: Using SSH (if available)
1. **Connect via SSH**:
   ```bash
   ssh username@yoursite.com
   ```
2. **Navigate and install**:
   ```bash
   cd public_html
   npm install
   ```

## Step 4: Configure Node.js Application

1. **Find "Node.js Selector" in cPanel**
   - Look under "Software" section
   - Click "Node.js Selector"

2. **Create New Application**
   - Click "Create Application"
   - Set these values:
     - **Node.js Version**: 16.x or higher
     - **Application Mode**: Production
     - **Application Root**: `public_html`
     - **Application URL**: your-domain.com
     - **Application Startup File**: `app.cjs`

3. **Set Environment Variables** (optional)
   - Click "Environment Variables"
   - Add: `NODE_ENV=production`
   - Add: `PORT=3000`

## Step 5: Start Your Application

1. **Start the App**
   - In Node.js Selector, click "Start App"
   - Wait for "Running" status

2. **Check Application Status**
   - Should show "Running" with green indicator
   - Note the assigned port (usually 3000)

## Step 6: Access Your POS System

1. **Visit Your Website**
   - Go to `https://your-domain.com`
   - You should see the POS login page

2. **Login with Default Credentials**
   - Username: `admin`
   - Password: `admin123`

## Your File Structure Should Look Like:

```
public_html/
├── app.cjs                 # Main server file
├── .htaccess              # URL routing rules
├── package.json           # Dependencies
├── pos-data.db           # Database with sample products
├── dist/                  # Built React application
│   ├── index.html
│   └── assets/
├── node_modules/          # Installed dependencies
└── tmp/                   # Temporary files (auto-created)
```

## Troubleshooting Common Issues

### App Not Starting
**Problem**: Application shows "Stopped" status
**Solution**: 
- Check Node.js logs in cPanel
- Verify `app.cjs` file is present
- Ensure Node.js version is 16+

### Database Errors
**Problem**: Database connection issues
**Solution**:
- Check file permissions on `pos-data.db`
- Database auto-creates if missing
- Verify SQLite is available

### Static Files Not Loading
**Problem**: CSS/JS files not loading
**Solution**:
- Verify `dist` folder uploaded completely
- Check `.htaccess` file is present
- Restart Node.js application

### "require is not defined" Error
**Problem**: ES module error
**Solution**:
- Use `app.cjs` (not `app.js`)
- Verify `package.json` points to `app.cjs`
- This is already fixed in your deployment package

## Testing Your Installation

1. **Health Check**
   - Visit: `https://your-domain.com/health`
   - Should return JSON with "OK" status

2. **API Test**
   - Visit: `https://your-domain.com/api/test`
   - Should return API working message

3. **Full POS Test**
   - Login to POS system
   - Try adding a product to cart
   - Complete a test sale

## What's Included in Your POS System

- **17 Sample Products** ready for testing
- **Customer Management** with loyalty program
- **Inventory Tracking** with low stock alerts
- **Sales Dashboard** with reports
- **Receipt Printing** (thermal printer support)
- **Purchase Orders** and supplier management
- **User Management** with role-based access
- **GST/Tax Compliance** for Indian businesses

## Support

If you encounter issues:
1. Check cPanel Node.js application logs
2. Verify all files uploaded correctly
3. Ensure Node.js application is running
4. Test the health endpoint first

Your POS system is now ready for business operations!