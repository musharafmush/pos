# Apache Server Hosting Guide for Awesome Shop POS

## Overview
This guide covers setting up Apache server hosting for your Awesome Shop POS system, including both shared hosting (cPanel) and VPS/dedicated server configurations.

## Option 1: Shared Hosting with cPanel (Recommended)

### Requirements
- cPanel hosting with Node.js support
- MySQL database access
- SSL certificate support
- At least 1GB storage space

### Step 1: Prepare Files for Upload
Use the quick build we created:
```bash
node quick-build-cpanel.mjs
```

### Step 2: Upload to cPanel
1. Log into your cPanel account
2. Open File Manager
3. Navigate to `public_html` directory
4. Upload and extract the `cpanel-build` folder contents
5. Set file permissions: 755 for directories, 644 for files

### Step 3: Configure Database
1. Create MySQL database in cPanel
2. Create database user with full privileges
3. Update `.env` file with database credentials:
```env
DATABASE_URL=mysql://username:password@localhost/database_name
NODE_ENV=production
PORT=5000
```

### Step 4: Install Dependencies
Access Terminal or use SSH:
```bash
cd public_html
npm install --production
```

### Step 5: Configure Apache
Create `.htaccess` file in public_html:
```apache
# Apache configuration for Awesome Shop POS
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.php [L]

# Node.js Application
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
    RewriteRule ^socket.io/(.*)$ http://localhost:5000/socket.io/$1 [P,L]
</IfModule>

# Security Headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>
```

## Option 2: VPS/Dedicated Server Setup

### Requirements
- Ubuntu/CentOS VPS
- Root access
- At least 2GB RAM
- Node.js 18+ support

### Step 1: Install Apache
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install apache2

# CentOS/RHEL
sudo yum install httpd
```

### Step 2: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Configure Apache Virtual Host
Create `/etc/apache2/sites-available/awesome-pos.conf`:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    DocumentRoot /var/www/awesome-pos

    # Proxy API requests to Node.js
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    # Serve static files directly
    <Directory /var/www/awesome-pos>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/awesome-pos-error.log
    CustomLog ${APACHE_LOG_DIR}/awesome-pos-access.log combined
</VirtualHost>

# SSL Configuration (Port 443)
<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    DocumentRoot /var/www/awesome-pos

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-domain.crt
    SSLCertificateKeyFile /etc/ssl/private/your-domain.key

    # Same proxy configuration as above
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    <Directory /var/www/awesome-pos>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/awesome-pos-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/awesome-pos-ssl-access.log combined
</VirtualHost>
```

### Step 4: Enable Site and Modules
```bash
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2ensite awesome-pos.conf
sudo systemctl restart apache2
```

### Step 5: Deploy Application
```bash
cd /var/www/awesome-pos
# Upload your application files
npm install --production
```

### Step 6: Create Systemd Service
Create `/etc/systemd/system/awesome-pos.service`:
```ini
[Unit]
Description=Awesome Shop POS Node.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/awesome-pos
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
sudo systemctl enable awesome-pos
sudo systemctl start awesome-pos
```

## Option 3: Docker with Apache (Advanced)

### Dockerfile
```dockerfile
FROM node:18-alpine

# Install Apache
RUN apk add --no-cache apache2 apache2-proxy

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install --production

# Copy Apache configuration
COPY apache-config/httpd.conf /etc/apache2/httpd.conf

# Expose ports
EXPOSE 80 443 5000

# Start both Apache and Node.js
CMD ["sh", "-c", "node server/index.js & httpd -D FOREGROUND"]
```

## Database Configuration Options

### MySQL (Recommended for Production)
```env
DATABASE_URL=mysql://username:password@localhost/awesome_pos
```

### PostgreSQL
```env
DATABASE_URL=postgresql://username:password@localhost/awesome_pos
```

### SQLite (Development)
```env
DATABASE_URL=./pos-data.db
```

## Security Considerations

### SSL/TLS Setup
1. Obtain SSL certificate (Let's Encrypt recommended)
2. Configure HTTPS redirect
3. Set security headers
4. Enable HSTS

### Firewall Rules
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Database Security
- Use strong passwords
- Restrict database access
- Enable SSL connections
- Regular backups

## Performance Optimization

### Apache Configuration
```apache
# Enable compression
LoadModule deflate_module modules/mod_deflate.so
<Location />
    SetOutputFilter DEFLATE
    SetEnvIfNoCase Request_URI \
        \.(?:gif|jpe?g|png)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \
        \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</Location>

# Enable caching
LoadModule expires_module modules/mod_expires.so
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType application/x-shockwave-flash "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>
```

## Monitoring and Maintenance

### Log Files
- Apache: `/var/log/apache2/`
- Application: Check systemd logs with `journalctl -u awesome-pos`

### Health Checks
```bash
# Check Apache status
sudo systemctl status apache2

# Check Node.js application
sudo systemctl status awesome-pos

# Check database connection
mysql -u username -p database_name
```

### Backup Strategy
```bash
# Database backup
mysqldump -u username -p awesome_pos > backup.sql

# Application backup
tar -czf pos-backup.tar.gz /var/www/awesome-pos
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure port 5000 is available
2. **Permission issues**: Check file ownership and permissions
3. **Database connection**: Verify credentials and network access
4. **Apache proxy**: Enable required modules

### Debug Commands
```bash
# Check Apache configuration
sudo apache2ctl configtest

# Check listening ports
sudo netstat -tlnp | grep :80

# Check application logs
tail -f /var/log/apache2/awesome-pos-error.log
journalctl -u awesome-pos -f
```

## Production Checklist

- [ ] SSL certificate installed
- [ ] Database secured
- [ ] Firewall configured
- [ ] Backups automated
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Application service enabled
- [ ] Apache modules enabled
- [ ] Performance optimized
- [ ] Security headers set

## Support

For additional help:
1. Check the logs first
2. Verify configuration files
3. Test database connectivity
4. Review Apache error logs
5. Monitor system resources

Your Awesome Shop POS system is now ready for Apache hosting with professional-grade configuration and security.