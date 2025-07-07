#!/bin/bash

# Deploy Awesome Shop POS to Apache Server
# This script automates the deployment process for Ubuntu/Debian systems

set -e  # Exit on any error

echo "🚀 Deploying Awesome Shop POS to Apache Server"
echo "================================================"

# Configuration
DOMAIN=${1:-localhost}
APP_DIR="/var/www/awesome-pos"
APACHE_CONF="/etc/apache2/sites-available/awesome-pos.conf"
SERVICE_FILE="/etc/systemd/system/awesome-pos.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Step 1: Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install required packages
print_status "Installing Apache and Node.js..."
apt install -y apache2 curl software-properties-common

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MySQL (optional)
read -p "Do you want to install MySQL? (y/n): " install_mysql
if [ "$install_mysql" = "y" ]; then
    apt install -y mysql-server
    print_warning "Remember to run 'mysql_secure_installation' after deployment"
fi

# Step 3: Enable Apache modules
print_status "Enabling Apache modules..."
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod ssl
a2enmod headers
a2enmod expires
a2enmod deflate

# Step 4: Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
chown -R www-data:www-data $APP_DIR

# Step 5: Copy application files (if in current directory)
if [ -d "./cpanel-build" ]; then
    print_status "Copying application files..."
    cp -r ./cpanel-build/* $APP_DIR/
    chown -R www-data:www-data $APP_DIR
    print_success "Application files copied"
else
    print_warning "cpanel-build directory not found. Please copy your files to $APP_DIR manually"
fi

# Step 6: Install Node.js dependencies
if [ -f "$APP_DIR/package.json" ]; then
    print_status "Installing Node.js dependencies..."
    cd $APP_DIR
    sudo -u www-data npm install --production
    print_success "Dependencies installed"
fi

# Step 7: Create Apache virtual host configuration
print_status "Creating Apache virtual host..."
cat > $APACHE_CONF << EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    DocumentRoot $APP_DIR/client/dist
    
    # Proxy API requests to Node.js
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    <Directory "$APP_DIR/client/dist">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api/
        RewriteRule . /index.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain text/html text/css
        AddOutputFilterByType DEFLATE application/javascript application/json
    </IfModule>
    
    ErrorLog \${APACHE_LOG_DIR}/awesome-pos-error.log
    CustomLog \${APACHE_LOG_DIR}/awesome-pos-access.log combined
</VirtualHost>
EOF

# Step 8: Enable the site
print_status "Enabling Apache site..."
a2ensite awesome-pos.conf
a2dissite 000-default.conf

# Step 9: Create systemd service for Node.js application
print_status "Creating systemd service..."
cat > $SERVICE_FILE << EOF
[Unit]
Description=Awesome Shop POS Node.js Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DATABASE_URL=./pos-data.db

# Security settings
NoNewPrivileges=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

# Step 10: Start services
print_status "Starting services..."
systemctl daemon-reload
systemctl enable awesome-pos
systemctl start awesome-pos
systemctl restart apache2

# Step 11: Configure firewall
print_status "Configuring firewall..."
ufw allow 'Apache Full'
ufw allow OpenSSH
ufw --force enable

# Step 12: Create SSL certificate (Let's Encrypt)
read -p "Do you want to install SSL certificate with Let's Encrypt? (y/n): " install_ssl
if [ "$install_ssl" = "y" ] && [ "$DOMAIN" != "localhost" ]; then
    print_status "Installing Certbot for SSL..."
    apt install -y certbot python3-certbot-apache
    
    print_status "Obtaining SSL certificate..."
    certbot --apache -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    print_success "SSL certificate installed"
fi

# Step 13: Create maintenance scripts
print_status "Creating maintenance scripts..."
mkdir -p /opt/awesome-pos

# Backup script
cat > /opt/awesome-pos/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/awesome-pos/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "/var/www/awesome-pos/pos-data.db" ]; then
    cp /var/www/awesome-pos/pos-data.db $BACKUP_DIR/pos-data-$DATE.db
fi

# Backup application
tar -czf $BACKUP_DIR/app-backup-$DATE.tar.gz /var/www/awesome-pos

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/awesome-pos/backup.sh

# Update script
cat > /opt/awesome-pos/update.sh << 'EOF'
#!/bin/bash
cd /var/www/awesome-pos

# Backup before update
/opt/awesome-pos/backup.sh

# Pull updates (if using git)
# git pull

# Install dependencies
sudo -u www-data npm install --production

# Restart services
systemctl restart awesome-pos
systemctl reload apache2

echo "Update completed"
EOF

chmod +x /opt/awesome-pos/update.sh

# Step 14: Setup log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/awesome-pos << 'EOF'
/var/log/apache2/awesome-pos*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload apache2
    endscript
}
EOF

# Step 15: Final status check
print_status "Checking service status..."
sleep 5

if systemctl is-active --quiet awesome-pos; then
    print_success "Node.js application is running"
else
    print_error "Node.js application failed to start"
    journalctl -u awesome-pos --no-pager -l
fi

if systemctl is-active --quiet apache2; then
    print_success "Apache is running"
else
    print_error "Apache failed to start"
fi

# Display final information
echo ""
echo "================================================"
print_success "Deployment completed!"
echo ""
echo -e "${BLUE}Application URL:${NC} http://$DOMAIN"
if [ "$install_ssl" = "y" ] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${BLUE}Secure URL:${NC} https://$DOMAIN"
fi
echo -e "${BLUE}Application Directory:${NC} $APP_DIR"
echo -e "${BLUE}Service Status:${NC} systemctl status awesome-pos"
echo -e "${BLUE}Apache Logs:${NC} tail -f /var/log/apache2/awesome-pos-error.log"
echo -e "${BLUE}App Logs:${NC} journalctl -u awesome-pos -f"
echo ""
echo -e "${YELLOW}Maintenance Scripts:${NC}"
echo "  Backup: /opt/awesome-pos/backup.sh"
echo "  Update: /opt/awesome-pos/update.sh"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure your database connection in $APP_DIR/.env"
echo "2. Test the application at http://$DOMAIN"
echo "3. Set up regular backups with cron"
echo "4. Monitor logs for any issues"
echo ""
print_success "Your Awesome Shop POS is now live!"