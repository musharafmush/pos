# cPanel Apache Hosting Setup - Quick Guide

## Step-by-Step Setup for Shared Hosting

### 1. Prepare Your Files
Build your application for deployment:
```bash
node quick-build-cpanel.mjs
```
This creates a `cpanel-build/` folder with all necessary files.

### 2. Upload to cPanel
1. Login to your cPanel account
2. Open **File Manager**
3. Navigate to `public_html` directory
4. Upload the contents of `cpanel-build/` folder
5. Extract files if uploaded as ZIP

### 3. Set Up Database
1. Go to **MySQL Databases** in cPanel
2. Create a new database: `your_username_awesome_pos`
3. Create a database user with password
4. Add user to database with ALL PRIVILEGES

### 4. Configure Environment
Edit the `.env` file in public_html:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=mysql://username:password@localhost/database_name
SESSION_SECRET=your-secure-random-string-here
```

### 5. Install Dependencies
Access **Terminal** in cPanel (if available) or use SSH:
```bash
cd public_html
npm install --production --only=production
```

### 6. Set Up Node.js Application
1. Go to **Node.js** section in cPanel
2. Create new Node.js app:
   - **Version**: 18.x or latest
   - **Application root**: `public_html`
   - **Application URL**: your domain
   - **Startup file**: `server/index.js`

### 7. Configure Apache (.htaccess)
Your `.htaccess` file should contain:
```apache
RewriteEngine On

# Handle Node.js API routes
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]

# Handle React Router (SPA)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^(.*)$ /index.html [L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"

# Cache static files
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header append Cache-Control "public"
</FilesMatch>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>
```

### 8. Start Your Application
1. In cPanel Node.js section, click **Start**
2. Your app should now be running on your domain

### 9. Test Your Setup
Visit your domain to verify:
- Main page loads correctly
- API endpoints work: `yourdomain.com/api/health`
- Login functionality works
- Database connection is successful

## Troubleshooting Common Issues

### Application Won't Start
- Check Node.js logs in cPanel
- Verify all dependencies are installed
- Check database connection in `.env`
- Ensure startup file path is correct

### Database Connection Issues
- Verify database credentials
- Check if database user has proper privileges
- Test connection from terminal: `mysql -u username -p`

### API Routes Not Working
- Check .htaccess RewriteRule syntax
- Verify mod_rewrite is enabled
- Check Apache error logs

### Static Files Not Loading
- Verify file permissions (644 for files, 755 for directories)
- Check if files exist in public_html
- Clear browser cache

## Performance Tips

### Optimize for Shared Hosting
1. **Enable Compression**: Ensure mod_deflate is working
2. **Set Cache Headers**: Configure static file caching
3. **Minimize Dependencies**: Use only production dependencies
4. **Database Optimization**: Use connection pooling if available

### Monitor Resources
- Check memory usage in cPanel
- Monitor CPU usage
- Watch disk space usage
- Review error logs regularly

## Security Checklist

- [ ] Strong database passwords
- [ ] Secure session secret
- [ ] Updated .htaccess security headers
- [ ] File permissions set correctly
- [ ] SSL certificate installed
- [ ] Regular backups scheduled

## Backup Strategy

### Automatic Backups
Set up cron job for regular backups:
```bash
# Daily backup at 2 AM
0 2 * * * cd /home/username/public_html && tar -czf backup-$(date +\%Y\%m\%d).tar.gz . && mysqldump -u username -p password database_name > db-backup-$(date +\%Y\%m\%d).sql
```

### Manual Backup
```bash
# Application files
tar -czf awesome-pos-backup.tar.gz public_html/

# Database
mysqldump -u username -p database_name > pos-backup.sql
```

## Support Resources

### cPanel Documentation
- Node.js App management
- MySQL database setup
- File Manager usage
- SSL certificate installation

### Logs to Check
- cPanel Error Logs
- Node.js Application Logs
- Apache Access/Error Logs
- MySQL Error Logs

Your Awesome Shop POS system is now ready for production on cPanel hosting!