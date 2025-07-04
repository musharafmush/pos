# Windows EXE Installer for Awesome Shop POS

## Overview

Professional Windows EXE installer built with electron-builder for distributing Awesome Shop POS as a native desktop application.

## Features

### Installer Features
- **NSIS-based Professional Installer**: Industry-standard Windows installer format
- **Multi-Architecture Support**: Both 64-bit (x64) and 32-bit (ia32) builds
- **Custom Installation Directory**: Users can choose installation location
- **Desktop & Start Menu Shortcuts**: Automatic shortcut creation
- **Uninstaller**: Clean removal with option to preserve data
- **Visual C++ Redistributable**: Automatic installation of required runtime
- **Data Directory Management**: Isolated user data in AppData folder

### Application Features
- **Native Desktop Experience**: Full Windows integration with system tray
- **Splash Screen**: Professional loading screen with progress animation
- **Auto-Updater**: GitHub-based automatic update system
- **Professional Menus**: Native Windows menus with keyboard shortcuts
- **File Operations**: Native file dialogs for import/export
- **Offline Capability**: Complete offline functionality with local SQLite database

## File Structure

```
├── electron/
│   ├── main.js              # Main Electron process
│   └── preload.js           # Secure renderer communication
├── build/
│   ├── icon.svg             # Source icon file
│   ├── icon.ico             # Windows icon (generated)
│   └── installer.nsh        # NSIS installer script
├── electron-builder.json    # Build configuration
├── desktop-app.cjs          # Advanced desktop launcher
├── create-exe-installer.js  # Build script
├── Build-Windows-Installer.bat  # Windows build script
└── build-installer.sh       # Cross-platform build script
```

## Build Process

### Prerequisites
- Node.js 16+ installed
- All project dependencies installed (`npm install`)
- Built application (`npm run build`)

### Windows Build
```bash
# Using batch script (Windows)
.\Build-Windows-Installer.bat

# Using Node.js script
node create-exe-installer.js

# Using electron-builder directly
npx electron-builder --win --publish=never
```

### Cross-Platform Build
```bash
# Make script executable (Linux/macOS)
chmod +x build-installer.sh

# Run build script
./build-installer.sh
```

## Output Files

### Windows
- `installer-dist/AwesomeShopPOS-Setup-1.0.0.exe` - Main installer
- Supports both x64 and ia32 architectures
- NSIS installer with professional UI

### Linux
- `dist/AwesomeShopPOS-1.0.0.AppImage` - Portable Linux application
- Self-contained executable

### macOS
- `dist/AwesomeShopPOS-1.0.0.dmg` - Mac disk image
- Drag-to-Applications installer

## Installation Process

### Windows Installation
1. Download `AwesomeShopPOS-Setup.exe`
2. Run installer as Administrator (recommended)
3. Choose installation directory
4. Select components (Sample Data, Shortcuts)
5. Complete installation
6. Launch from Desktop or Start Menu

### Installation Components
- **Main Application** (Required): Core POS system files
- **Sample Data** (Optional): Test products and customers
- **Desktop Shortcut** (Optional): Desktop launcher icon
- **Quick Launch** (Optional): Taskbar quick launch

## Directory Structure After Installation

```
# Program Files
C:\Program Files\Awesome Shop POS\
├── AwesomeShopPOS.exe      # Main executable
├── resources/               # Application resources
├── locales/                # Electron locales
└── Uninstall.exe           # Uninstaller

# User Data (Preserved during updates)
%APPDATA%\AwesomeShopPOS\
├── data/
│   └── pos-data.db         # SQLite database
├── backups/                # Automatic backups
├── exports/                # Data exports
└── logs/                   # Application logs
```

## Desktop Integration

### System Tray
- Minimize to system tray
- Right-click context menu
- Quick access to main features
- Exit from tray

### Native Menus
- File menu: New Sale, Products, Import/Export
- View menu: Dashboard, Sales, Inventory
- Reports menu: Sales, Inventory, Customer reports
- Settings menu: Printer, System settings
- Help menu: About, Updates

### Keyboard Shortcuts
- `Ctrl+N`: New Sale
- `Ctrl+P`: Products
- `Ctrl+D`: Dashboard
- `Ctrl+S`: Sales Dashboard
- `Ctrl+I`: Inventory
- `F11`: Toggle Fullscreen
- `Ctrl+Q`: Quit Application

## Auto-Updater

### Configuration
- GitHub-based update distribution
- Automatic update checking on startup
- Background download of updates
- User notification when update ready
- Restart to apply updates

### Update Process
1. Application checks for updates on startup
2. If update available, downloads in background
3. User notified when download complete
4. Option to restart now or later
5. Automatic application restart and update

## Uninstallation

### Clean Removal
- Removes all program files
- Removes registry entries
- Removes shortcuts
- Optionally preserves user data

### Data Preservation Options
- Keep POS data and settings
- Remove all data including backups
- User choice during uninstall

## Professional Features

### Security
- Code signing (when certificates available)
- Secure update verification
- Isolated user data storage
- No admin rights required for normal operation

### Performance
- Fast startup with splash screen
- Efficient memory usage
- Background server management
- Automatic cleanup on exit

### Reliability
- Error handling and recovery
- Automatic data backups
- Crash reporting (optional)
- Graceful shutdown handling

## Distribution

### File Naming
- `AwesomeShopPOS-Setup-{version}.exe`
- Version number embedded in filename
- Single file distribution

### Requirements
- Windows 7, 8, 10, 11 (32-bit or 64-bit)
- .NET Framework (installed automatically)
- Visual C++ Redistributable (installed automatically)
- 500MB disk space minimum

### Download Size
- Approximately 150-200MB
- Includes Node.js runtime
- Self-contained installation

## Development Notes

### Build Optimization
- Production builds exclude development dependencies
- Minified and optimized code
- Compressed resources
- Efficient packaging

### Testing
- Test on clean Windows systems
- Verify installer and uninstaller
- Test update process
- Validate shortcuts and menus

### Maintenance
- Regular updates to electron and dependencies
- Security patches for Node.js runtime
- Icon and branding updates
- Feature additions via updates

## Support

### Common Issues
- **Installer won't run**: Run as Administrator
- **Application won't start**: Check Windows Defender
- **Update fails**: Check internet connection
- **Data not preserved**: Check AppData folder

### Logs Location
- Application logs: `%APPDATA%\AwesomeShopPOS\logs\`
- Installer logs: `%TEMP%\AwesomeShopPOS-Setup.log`

This professional Windows EXE installer provides a complete desktop experience for Awesome Shop POS users on Windows systems.