#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Creating installable app file for Awesome Shop POS...');
console.log('💰 Building your Indian Rupee POS system installer!');

// Create a portable app directory structure
const appDir = 'AwesomeShopPOS-Portable';
const distDir = path.join(appDir, 'app');

// Create directories
if (fs.existsSync(appDir)) {
  fs.rmSync(appDir, { recursive: true });
}
fs.mkdirSync(appDir);
fs.mkdirSync(distDir);

// Copy essential files
const filesToCopy = [
  'electron/main.js',
  'launch-desktop-app.js',
  'start-desktop.js',
  'generated-icon.png',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'drizzle.config.ts'
];

console.log('📋 Copying essential files...');

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    const destPath = path.join(distDir, file);
    const destDir = path.dirname(destPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(file, destPath);
    console.log(`✓ Copied ${file}`);
  }
});

// Copy directories
const dirsToCopy = ['client', 'server', 'shared', 'db'];

console.log('📁 Copying application directories...');

dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    const destPath = path.join(distDir, dir);
    copyDirSync(dir, destPath);
    console.log(`✓ Copied ${dir}/`);
  }
});

// Create startup script for Windows
const windowsStartScript = `@echo off
echo 🚀 Starting Awesome Shop POS Desktop App...
echo 💰 Your professional Indian Rupee POS system is loading!
cd /d "%~dp0app"
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)
echo ✅ Starting desktop application...
node launch-desktop-app.js
pause`;

fs.writeFileSync(path.join(appDir, 'Start-POS.bat'), windowsStartScript);

// Create startup script for Mac/Linux
const unixStartScript = `#!/bin/bash
echo "🚀 Starting Awesome Shop POS Desktop App..."
echo "💰 Your professional Indian Rupee POS system is loading!"
cd "$(dirname "$0")/app"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi
echo "✅ Starting desktop application..."
node launch-desktop-app.js`;

fs.writeFileSync(path.join(appDir, 'Start-POS.sh'), unixStartScript);
fs.chmodSync(path.join(appDir, 'Start-POS.sh'), '755');

// Create README
const readmeContent = `# Awesome Shop POS - Desktop Application

🎉 Professional Point of Sale System for Indian Retail Businesses

## Features:
✓ Indian Rupee formatting (₹100)
✓ Professional purchase entry with freight distribution
✓ Clean line items with proper calculations
✓ Keyboard shortcuts for faster operations
✓ Offline capability for your business

## Installation:

### Windows:
Double-click "Start-POS.bat"

### Mac/Linux:
Run "./Start-POS.sh" in terminal

## First Time Setup:
1. The app will automatically install dependencies
2. Your POS system will open in a desktop window
3. Login with your credentials to start using the system

## Keyboard Shortcuts:
- Ctrl+N: New Purchase Order
- Ctrl+S: New Sale
- Ctrl+D: Dashboard
- Ctrl+P: Products
- Ctrl+U: Customers

## Support:
Your POS system includes all features:
- Purchase Entry with freight calculations
- Indian Rupee formatting throughout
- Professional line items management
- Customer and supplier management
- Sales and inventory tracking

Enjoy your professional desktop POS system! 🚀`;

fs.writeFileSync(path.join(appDir, 'README.md'), readmeContent);

console.log('');
console.log('🎉 Installable app created successfully!');
console.log('📁 Location: ./' + appDir);
console.log('');
console.log('📦 What you can do now:');
console.log('1. Zip the "' + appDir + '" folder');
console.log('2. Share it with anyone who needs the POS system');
console.log('3. They just unzip and run Start-POS.bat (Windows) or Start-POS.sh (Mac/Linux)');
console.log('');
console.log('✅ Your POS system is now ready for distribution!');

// Helper function to copy directories recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}