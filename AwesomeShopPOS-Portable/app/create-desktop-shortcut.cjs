#!/usr/bin/env node

/**
 * Desktop Shortcut Creator for Awesome Shop POS
 * Creates desktop shortcuts for easy access to the POS application
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class DesktopShortcutCreator {
  constructor() {
    this.appName = 'Awesome Shop POS';
    this.appDescription = 'Professional Indian Rupee POS System';
    this.currentDir = process.cwd();
    this.platform = os.platform();
  }

  createShortcut() {
    console.log('🚀 Creating desktop shortcut for Awesome Shop POS...');
    
    try {
      switch (this.platform) {
        case 'win32':
          this.createWindowsShortcut();
          break;
        case 'darwin':
          this.createMacShortcut();
          break;
        case 'linux':
          this.createLinuxShortcut();
          break;
        default:
          console.log('❌ Unsupported platform:', this.platform);
          return false;
      }
      
      console.log('✅ Desktop shortcut created successfully!');
      console.log('💰 You can now launch Awesome Shop POS from your desktop');
      return true;
    } catch (error) {
      console.error('❌ Failed to create desktop shortcut:', error.message);
      return false;
    }
  }

  createWindowsShortcut() {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutScript = `
@echo off
cd /d "${this.currentDir}"
start "" "${this.currentDir}\\Start-Desktop-POS.bat"
`;
    
    const shortcutPath = path.join(desktopPath, 'Awesome Shop POS.bat');
    fs.writeFileSync(shortcutPath, shortcutScript.trim());
    
    console.log(`✓ Windows shortcut created: ${shortcutPath}`);
  }

  createMacShortcut() {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const appPath = path.join(desktopPath, 'Awesome Shop POS.app');
    const contentsPath = path.join(appPath, 'Contents');
    const macOSPath = path.join(contentsPath, 'MacOS');
    
    // Create app bundle structure
    fs.mkdirSync(macOSPath, { recursive: true });
    
    // Create Info.plist
    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>awesome-shop-pos</string>
    <key>CFBundleIdentifier</key>
    <string>com.awesomeshop.pos</string>
    <key>CFBundleName</key>
    <string>Awesome Shop POS</string>
    <key>CFBundleDisplayName</key>
    <string>Awesome Shop POS</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
</dict>
</plist>`;
    
    fs.writeFileSync(path.join(contentsPath, 'Info.plist'), infoPlist);
    
    // Create executable script
    const executableScript = `#!/bin/bash
cd "${this.currentDir}"
./Start-Desktop-POS.sh
`;
    
    const executablePath = path.join(macOSPath, 'awesome-shop-pos');
    fs.writeFileSync(executablePath, executableScript);
    fs.chmodSync(executablePath, '755');
    
    console.log(`✓ macOS app bundle created: ${appPath}`);
  }

  createLinuxShortcut() {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const shortcutContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Awesome Shop POS
Comment=${this.appDescription}
Icon=${path.join(this.currentDir, 'generated-icon.png')}
Exec=${path.join(this.currentDir, 'Start-Desktop-POS.sh')}
Path=${this.currentDir}
Terminal=false
Categories=Office;Finance;
`;
    
    const shortcutPath = path.join(desktopPath, 'awesome-shop-pos.desktop');
    fs.writeFileSync(shortcutPath, shortcutContent);
    fs.chmodSync(shortcutPath, '755');
    
    console.log(`✓ Linux desktop entry created: ${shortcutPath}`);
  }

  createStartMenuEntry() {
    if (this.platform === 'win32') {
      const startMenuPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      if (fs.existsSync(startMenuPath)) {
        const shortcutScript = `
@echo off
cd /d "${this.currentDir}"
start "" "${this.currentDir}\\Start-Desktop-POS.bat"
`;
        const startMenuShortcut = path.join(startMenuPath, 'Awesome Shop POS.bat');
        fs.writeFileSync(startMenuShortcut, shortcutScript.trim());
        console.log(`✓ Start Menu entry created: ${startMenuShortcut}`);
      }
    }
  }
}

// Create the desktop shortcut
const creator = new DesktopShortcutCreator();
creator.createShortcut();
creator.createStartMenuEntry();

console.log('');
console.log('🎉 Setup Complete!');
console.log('📝 How to use:');
console.log('   • Double-click the desktop shortcut to launch the POS system');
console.log('   • Or run: npm run desktop');
console.log('   • Or use the launch scripts directly');
console.log('');
console.log('💰 Awesome Shop POS - Professional Indian Rupee POS System');