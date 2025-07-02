# Awesome Shop POS - Desktop Application

## 🚀 Professional Point of Sale System for Indian Retail Businesses

### Features

✅ **Complete POS Functionality**
- Indian Rupee formatting (₹) throughout the system
- Professional purchase entry with freight distribution
- Advanced label printing system with barcode generation
- Real-time sales dashboard and analytics
- Customer loyalty management with tier-based rewards
- Inventory tracking with low stock alerts
- GST compliance with CGST/SGST/IGST calculations

✅ **Desktop Application Features**
- Offline capability with SQLite database
- Professional Electron-based interface
- Enhanced desktop backend services
- Automatic database backup system
- System information and diagnostics
- Desktop-specific keyboard shortcuts

✅ **Enhanced Backend Services**
- Dedicated desktop backend server (Port 5001)
- Real-time database operations
- Export functionality (JSON/CSV)
- Health monitoring and statistics
- Professional menu system with shortcuts
- Automatic Chrome browser opening to localhost:5000

### Quick Start

#### Windows Users:
```bash
# Double-click the batch file
Start-Desktop-POS.bat
```

#### Linux/Mac Users:
```bash
# Run the shell script
./Start-Desktop-POS.sh
```

#### Manual Launch:
```bash
# Install dependencies (first time only)
npm install

# Launch desktop application
node desktop-backend/launcher.js
```

### System Requirements

- **Node.js**: Version 16 or higher
- **NPM**: Latest version
- **Operating System**: Windows 10+, macOS 10.14+, or Linux
- **Memory**: 2GB RAM minimum
- **Storage**: 500MB free space

### Architecture

```
Desktop Application Stack:
┌─────────────────────────────────────┐
│ Electron Desktop Application        │
│ (Professional UI with Menu System)  │
├─────────────────────────────────────┤
│ Enhanced Desktop Backend Service    │
│ (Port 5001 - Desktop API)          │
├─────────────────────────────────────┤
│ Main POS Application Server         │
│ (Port 5000 - Core POS Features)    │
├─────────────────────────────────────┤
│ SQLite Database                     │
│ (Offline Local Storage)             │
└─────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Purchase Order |
| `Ctrl+S` | New Sale |
| `Ctrl+L` | Print Labels |
| `Ctrl+D` | Dashboard |
| `Ctrl+P` | Products |
| `Ctrl+U` | Customers |
| `Ctrl+B` | Backup Database |
| `Ctrl+R` | Reload |
| `F12` | Developer Tools |

### Desktop-Specific Features

#### 1. Enhanced Backend Services
- **Health Monitoring**: `/api/desktop/health`
- **Database Backup**: `/api/desktop/backup`
- **System Information**: `/api/desktop/system-info`
- **Database Statistics**: `/api/desktop/db-stats`
- **Data Export**: `/api/desktop/export/{format}`

#### 2. Professional Menu System
- File operations with keyboard shortcuts
- View navigation and window controls
- Tools for settings and diagnostics
- Help system with shortcuts reference

#### 3. Database Management
- Automatic SQLite optimization (WAL mode)
- One-click backup functionality
- Export to JSON/CSV formats
- Database statistics and health monitoring

#### 4. Security Features
- Secure Electron preload script
- Context isolation enabled
- Web security enforced
- No remote module access

#### 5. Automatic Browser Integration
- **Smart Chrome Detection**: Automatically detects and opens Chrome browser
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Fallback Handling**: Provides manual URL if automatic opening fails
- **Ready State Detection**: Opens browser only when server is fully ready
- **URL Access**: Direct navigation to http://localhost:5000

### File Structure

```
desktop-backend/
├── main.js              # Enhanced desktop backend service
├── launcher.js          # Desktop application launcher
└── preload.js          # Secure Electron preload script

electron/
└── main.js             # Electron main process

Start-Desktop-POS.bat   # Windows launcher
Start-Desktop-POS.sh    # Linux/Mac launcher
```

### Desktop Backend API Endpoints

#### Core Endpoints
- `GET /api/desktop/health` - Service health check
- `GET /api/desktop/system-info` - System information
- `GET /api/desktop/db-stats` - Database statistics

#### Data Management
- `GET /api/desktop/backup` - Create database backup
- `GET /api/desktop/export/json` - Export data as JSON
- `GET /api/desktop/export/csv` - Export data as CSV

### Troubleshooting

#### Common Issues

**1. Application Won't Start**
```bash
# Check Node.js installation
node --version

# Reinstall dependencies
rm -rf node_modules
npm install
```

**2. Database Issues**
```bash
# Check database file
ls -la pos-data.db

# Reset database (caution: data loss)
rm pos-data.db
npm run db:seed
```

**3. Port Conflicts**
- Main app uses port 5000
- Desktop backend uses port 5001
- Check for conflicts: `lsof -i :5000` (Linux/Mac) or `netstat -an | findstr 5000` (Windows)

### Professional Features

#### Indian Business Compliance
- GST calculation with HSN codes
- CGST, SGST, IGST support
- Indian Rupee formatting (₹)
- Local business requirements

#### Advanced Printing
- Professional barcode generation
- Multiple label templates
- Thermal receipt printing
- Custom label designer

#### Customer Management
- Tier-based loyalty program
- Purchase history tracking
- Customer analytics
- Rewards management

### Development

#### Building for Distribution
```bash
# Install electron-builder
npm install -g electron-builder

# Build desktop application
electron-builder

# Build for specific platform
electron-builder --win
electron-builder --mac
electron-builder --linux
```

#### Development Mode
```bash
# Start with development features
DESKTOP_MODE=true NODE_ENV=development node desktop-backend/launcher.js
```

### Support

For technical support or feature requests, your desktop application includes:
- Built-in system diagnostics
- Database health monitoring
- Export functionality for data backup
- Professional error handling and logging

### License

Professional Point of Sale System for Indian Retail Businesses
© 2025 Awesome Shop

---

**🏪 Your professional POS system is ready for desktop use!**
**💼 Perfect for Indian retail businesses with complete offline capability**