#!/usr/bin/env node

/**
 * Awesome Shop POS - Desktop Installer Creator
 * Creates a complete installable desktop package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DesktopInstaller {
  constructor() {
    this.appName = 'AwesomeShopPOS';
    this.version = '1.0.0';
    this.outputDir = path.join(process.cwd(), 'AwesomeShopPOS-Portable');
    
    console.log('🏗️  Creating Awesome Shop POS Desktop Installer');
    console.log('💰 Professional Indian Rupee POS System');
    console.log('📦 Building portable desktop application...\n');
    
    this.createInstaller();
  }

  createInstaller() {
    try {
      // Create output directory
      this.createOutputDirectory();
      
      // Copy application files
      this.copyApplicationFiles();
      
      // Create desktop executable
      this.createDesktopExecutable();
      
      // Create installer scripts
      this.createInstallerScripts();
      
      // Create documentation
      this.createDocumentation();
      
      // Create package info
      this.createPackageInfo();
      
      console.log('✅ Desktop installer created successfully!');
      console.log(`📁 Location: ${this.outputDir}`);
      console.log('\n📋 Installation Instructions:');
      console.log('   1. Copy the AwesomeShopPOS-Portable folder to desired location');
      console.log('   2. Run Install-POS.bat (Windows) or Install-POS.sh (Linux/Mac)');
      console.log('   3. Launch using the created desktop shortcut');
      console.log('\n💰 Ready for professional retail operations!');
      
    } catch (error) {
      console.error('❌ Failed to create installer:', error.message);
      process.exit(1);
    }
  }

  createOutputDirectory() {
    console.log('📁 Creating output directory...');
    
    if (fs.existsSync(this.outputDir)) {
      this.removeDirectory(this.outputDir);
    }
    
    fs.mkdirSync(this.outputDir, { recursive: true });
    
    // Create subdirectories
    const subdirs = ['app', 'data', 'logs', 'backups', 'exports'];
    subdirs.forEach(dir => {
      fs.mkdirSync(path.join(this.outputDir, dir), { recursive: true });
    });
  }

  copyApplicationFiles() {
    console.log('📋 Copying application files...');
    
    const appDir = path.join(this.outputDir, 'app');
    
    // Essential files to copy
    const filesToCopy = [
      'package.json',
      'package-lock.json',
      'web-desktop-app.cjs',
      'Start-Desktop-POS.bat',
      'Start-Desktop-POS.sh',
      'create-desktop-shortcut.cjs',
      'DESKTOP-SETUP.md',
      'Desktop-README.md'
    ];
    
    // Essential directories to copy
    const dirsToCopy = [
      'client',
      'server', 
      'shared',
      'desktop-backend',
      'db'
    ];
    
    // Copy files
    filesToCopy.forEach(file => {
      if (fs.existsSync(file)) {
        this.copyFile(file, path.join(appDir, file));
      }
    });
    
    // Copy directories
    dirsToCopy.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.copyDirectory(dir, path.join(appDir, dir));
      }
    });
    
    // Copy configuration files
    const configFiles = [
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'components.json',
      'drizzle.config.ts',
      '.env'
    ];
    
    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.copyFile(file, path.join(appDir, file));
      }
    });
  }

  createDesktopExecutable() {
    console.log('⚙️  Creating desktop executable...');
    
    const executablePath = path.join(this.outputDir, 'AwesomeShopPOS.js');
    const executableContent = `#!/usr/bin/env node

/**
 * Awesome Shop POS - Desktop Application Launcher
 * Professional Point of Sale System for Indian Retail Businesses
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class AwesomeShopPOSLauncher {
  constructor() {
    this.appDir = path.join(__dirname, 'app');
    this.dataDir = path.join(__dirname, 'data');
    this.logsDir = path.join(__dirname, 'logs');
    
    console.log('🚀 Starting Awesome Shop POS Desktop Application');
    console.log('💰 Professional Indian Rupee POS System');
    console.log('🏪 Designed for Indian Retail Businesses\\n');
    
    this.launch();
  }
  
  launch() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Set environment variables
    process.env.DESKTOP_MODE = 'true';
    process.env.DATA_DIR = this.dataDir;
    process.env.LOGS_DIR = this.logsDir;
    
    // Change to app directory
    process.chdir(this.appDir);
    
    // Launch the application
    const appProcess = spawn('node', ['web-desktop-app.cjs'], {
      stdio: 'inherit',
      shell: true,
      cwd: this.appDir,
      env: process.env
    });
    
    appProcess.on('close', (code) => {
      console.log(\`\\n💰 Awesome Shop POS closed with code \${code}\`);
      console.log('Thank you for using our professional POS system!');
    });
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down Awesome Shop POS...');
      appProcess.kill('SIGTERM');
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    });
  }
}

new AwesomeShopPOSLauncher();`;

    fs.writeFileSync(executablePath, executableContent);
    
    // Make executable on Unix systems
    try {
      execSync(`chmod +x "${executablePath}"`);
    } catch (error) {
      // Ignore on Windows
    }
  }

  createInstallerScripts() {
    console.log('📜 Creating installer scripts...');
    
    // Windows installer
    const windowsInstaller = `@echo off
REM Awesome Shop POS Desktop Installer for Windows
echo 🏗️  Installing Awesome Shop POS Desktop Application
echo 💰 Professional Indian Rupee POS System
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed
    echo 💡 Please install Node.js from https://nodejs.org/
    echo 💡 Then run this installer again
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Navigate to app directory
cd /d "%~dp0\\app"

REM Install dependencies
echo 📦 Installing application dependencies...
call npm install --production --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Create desktop shortcut
echo 🖥️  Creating desktop shortcut...
node create-desktop-shortcut.cjs

REM Return to installer directory
cd /d "%~dp0"

echo.
echo 🎉 Installation Complete!
echo.
echo 📋 How to Launch:
echo    • Double-click the desktop shortcut "Awesome Shop POS"
echo    • Or run: AwesomeShopPOS.js
echo    • Or use: Start-Desktop-POS.bat
echo.
echo 💰 Awesome Shop POS - Ready for professional retail operations!
echo.
pause`;

    fs.writeFileSync(path.join(this.outputDir, 'Install-POS.bat'), windowsInstaller);

    // Linux/Mac installer
    const unixInstaller = `#!/bin/bash

# Awesome Shop POS Desktop Installer for Linux/Mac
echo "🏗️  Installing Awesome Shop POS Desktop Application"
echo "💰 Professional Indian Rupee POS System"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "💡 Please install Node.js from https://nodejs.org/"
    echo "💡 Then run this installer again"
    exit 1
fi

echo "✅ Node.js detected"
echo ""

# Navigate to app directory
cd "$(dirname "$0")/app"

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production --silent
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create desktop shortcut
echo "🖥️  Creating desktop shortcut..."
node create-desktop-shortcut.cjs

# Return to installer directory
cd "$(dirname "$0")"

# Make launcher executable
chmod +x AwesomeShopPOS.js

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "📋 How to Launch:"
echo "   • Double-click the desktop shortcut 'Awesome Shop POS'"
echo "   • Or run: ./AwesomeShopPOS.js"
echo "   • Or use: ./Start-Desktop-POS.sh"
echo ""
echo "💰 Awesome Shop POS - Ready for professional retail operations!"
echo ""`;

    fs.writeFileSync(path.join(this.outputDir, 'Install-POS.sh'), unixInstaller);
    
    // Make Unix installer executable
    try {
      execSync(`chmod +x "${path.join(this.outputDir, 'Install-POS.sh')}"`);
    } catch (error) {
      // Ignore on Windows
    }
  }

  createDocumentation() {
    console.log('📚 Creating documentation...');
    
    const readmeContent = `# Awesome Shop POS - Desktop Application

## Professional Point of Sale System for Indian Retail Businesses

### 🚀 Quick Start

1. **Install the Application**
   - Windows: Run \`Install-POS.bat\`
   - Linux/Mac: Run \`./Install-POS.sh\`

2. **Launch the Application**
   - Double-click the desktop shortcut
   - Or run \`AwesomeShopPOS.js\`
   - Or use the launch scripts

3. **Login**
   - Username: \`admin\`
   - Password: \`admin\`

### 💰 Indian Business Features

- **Currency**: Complete Indian Rupee (₹) formatting
- **GST Compliance**: CGST/SGST/IGST calculations
- **HSN Codes**: Tax compliance management
- **Thermal Printing**: Professional receipt printing
- **Offline Support**: Complete offline capability

### 🏪 Core Features

- **POS Sales**: Complete point of sale interface
- **Inventory**: Product and stock management
- **Purchases**: Supplier and purchase management
- **Customers**: Customer loyalty program
- **Reports**: Sales and business analytics
- **Label Printing**: Professional product labels

### 🔧 System Requirements

- **Operating System**: Windows 7+, macOS 10.12+, Linux
- **Node.js**: Version 18 or higher
- **RAM**: Minimum 2GB recommended
- **Storage**: 500MB free space
- **Network**: Not required (offline capable)

### 📞 Support

For technical support or business inquiries:
- Check the \`DESKTOP-SETUP.md\` file for detailed setup instructions
- Review \`Desktop-README.md\` for troubleshooting guides

### 📋 File Structure

\`\`\`
AwesomeShopPOS-Portable/
├── AwesomeShopPOS.js          # Main launcher
├── Install-POS.bat            # Windows installer
├── Install-POS.sh             # Linux/Mac installer
├── app/                       # Application files
├── data/                      # Database and user data
├── logs/                      # Application logs
├── backups/                   # Database backups
└── exports/                   # Data exports
\`\`\`

### 💡 Usage Tips

- The application runs completely offline
- All data is stored locally in the \`data\` directory
- Regular backups are created in the \`backups\` directory
- Use the built-in export features for data portability

---

**Awesome Shop POS** - Professional retail management made simple.
Built specifically for Indian businesses with complete GST compliance.`;

    fs.writeFileSync(path.join(this.outputDir, 'README.md'), readmeContent);
  }

  createPackageInfo() {
    console.log('📋 Creating package information...');
    
    const packageInfo = {
      name: 'awesome-shop-pos-desktop',
      version: this.version,
      description: 'Professional Point of Sale System for Indian Retail Businesses',
      type: 'desktop-application',
      main: 'AwesomeShopPOS.js',
      features: [
        'Indian Rupee formatting',
        'GST compliance',
        'Offline capability',
        'Thermal printing',
        'Inventory management',
        'Customer loyalty',
        'Professional reporting'
      ],
      requirements: {
        nodejs: '>=18.0.0',
        platform: ['win32', 'darwin', 'linux'],
        memory: '2GB',
        storage: '500MB'
      },
      installation: {
        windows: 'Install-POS.bat',
        unix: 'Install-POS.sh'
      },
      launch: {
        main: 'AwesomeShopPOS.js',
        windows: 'Start-Desktop-POS.bat',
        unix: 'Start-Desktop-POS.sh'
      },
      created: new Date().toISOString(),
      author: 'Awesome Shop POS Team'
    };
    
    fs.writeFileSync(
      path.join(this.outputDir, 'package-info.json'), 
      JSON.stringify(packageInfo, null, 2)
    );
  }

  copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        // Skip node_modules and other unnecessary directories
        if (item === 'node_modules' || item === '.git' || item === 'dist') {
          return;
        }
        this.copyDirectory(srcPath, destPath);
      } else {
        this.copyFile(srcPath, destPath);
      }
    });
  }

  removeDirectory(dir) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

// Create the desktop installer
new DesktopInstaller();