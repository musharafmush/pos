# Complete cPanel Deployment Guide for Awesome Shop POS

## Quick Setup (5 Minutes)

### Step 1: Download Deployment Package
You need to build and prepare the files for cPanel. Run these commands locally:

```bash
# Build the application
npm run build

# Or use the cPanel build script
node build-for-cpanel.js
```

### Step 2: Upload Files to cPanel
Upload these files to your **public_html** directory:

**Required Files:**
- `app.cjs` (main server file - CommonJS for cPanel compatibility)
- `.htaccess` (URL rewriting rules)
- All contents from `dist/` folder (built application)
- `package.json` (configured for cPanel hosting)

**File Structure in cPanel:**
```
public_html/
├── app.cjs                # Main server file (CommonJS)
├── .htaccess              # URL rewriting
├── package.json           # Dependencies
├── dist/                  # Built React application
│   ├── index.html         # React app entry
│   └── assets/            # Built CSS, JS, images
├── pos-data.db           # SQLite database (auto-created)
└── node_modules/          # Dependencies (after npm install)
```

### Step 3: Install Dependencies in cPanel
In cPanel File Manager or Terminal:

```bash
cd public_html
npm install
```

### Step 4: Configure Node.js App in cPanel
1. Go to **cPanel → Software → Node.js Selector**
2. Click **Create Application**
3. Set these values:
   - **Node.js Version:** 16.x or higher
   - **Application Mode:** Production
   - **Application Root:** public_html
   - **Application URL:** your-domain.com
   - **Application Startup File:** app.cjs

### Step 5: Set Environment Variables (Optional)
In cPanel Node.js section, add:
- `NODE_ENV=production`
- `SESSION_SECRET=your-secure-random-string`

### Step 6: Start the Application
Click **Start App** in cPanel Node.js section.

## What You Get

✅ **Complete POS System with:**
- Product management (17 products included)
- Sales tracking and checkout
- Customer management with loyalty
- Purchase order management
- Inventory control and alerts
- Professional reporting
- User authentication (admin/admin123)
- Thermal receipt printing
- Label printing system
- GST/Tax compliance (Indian business)
- Multi-language support ready

## Database
- **SQLite database** (pos-data.db) - no MySQL setup needed
- **Automatic creation** on first run
- **Sample data included** - ready to use immediately
- **Backup system** built-in

## Security Features
- ✅ Password hashing with bcrypt
- ✅ Session management
- ✅ User authentication
- ✅ Role-based access
- ✅ Input validation
- ✅ SQL injection protection

## Performance Optimizations
- ✅ Gzip compression enabled
- ✅ Static file caching
- ✅ Optimized build bundle
- ✅ Lazy loading components
- ✅ Database indexing

## Troubleshooting

### App Not Starting
**Check:** cPanel Node.js logs
**Solution:** Verify app.js is in public_html root

### Database Errors
**Check:** File permissions for pos-data.db
**Solution:** Set write permissions (755 or 644)

### Static Files Not Loading
**Check:** .htaccess file is uploaded
**Solution:** Verify .htaccess configuration

### API Errors
**Check:** Node.js is running
**Solution:** Restart app in cPanel Node.js section

### Login Issues
**Default credentials:**
- Username: admin
- Password: admin123

## Cost-Effective Features

### No MySQL Required
- Uses SQLite (included)
- No additional database fees
- Automatic backup system

### Minimal Resource Usage
- Optimized for shared hosting
- Low memory footprint
- Efficient database queries

### Professional Features
- Complete business solution
- Indian GST compliance
- Professional receipts
- Inventory management
- Customer loyalty program

## Support & Maintenance

### Backup Your Data
The system includes built-in backup:
- Automatic database backups
- Export/import functionality
- JSON data export

### Updates
- Self-contained system
- No external dependencies
- Easy to update

## Ready to Use!

Once deployed, your POS system will be available at:
`https://your-domain.com`

**First Login:**
- Go to your website
- Login with admin/admin123
- Start adding products and making sales!

The system includes sample products and is ready for immediate use in your retail business.