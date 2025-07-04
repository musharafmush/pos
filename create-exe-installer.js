#!/usr/bin/env node

/**
 * Awesome Shop POS - Windows EXE Installer Builder
 * Creates professional Windows installer using electron-builder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Windows EXE Installer for Awesome Shop POS...\n');

// Create main entry point for electron
const electronMainContent = `
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  // Start the server
  const serverPath = path.join(__dirname, 'server', 'index.js');
  serverProcess = spawn('node', [serverPath], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Wait for server to start then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
`;

// Create the electron main file
fs.writeFileSync('electron-main.js', electronMainContent);

// Create build configuration
const electronBuilderConfig = {
  "appId": "com.awesomeshop.pos",
  "productName": "Awesome Shop POS",
  "main": "electron-main.js",
  "directories": {
    "output": "installer-dist"
  },
  "files": [
    "electron-main.js",
    "dist/**/*",
    "pos-data.db",
    "node_modules/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      }
    ],
    "artifactName": "AwesomeShopPOS-Setup-${version}.exe"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Awesome Shop POS",
    "installerHeaderIcon": "generated-icon.png",
    "installerIcon": "generated-icon.png",
    "uninstallerIcon": "generated-icon.png"
  }
};

// Write the config
fs.writeFileSync('electron-builder-config.json', JSON.stringify(electronBuilderConfig, null, 2));

try {
  console.log('📦 Building application bundle...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('🔧 Creating Windows EXE installer...');
  execSync('npx electron-builder --config electron-builder-config.json --win --publish=never', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('\n✅ Windows EXE installer created successfully!');
  console.log('📁 Check the "installer-dist" folder for your AwesomeShopPOS-Setup.exe file');
  console.log('\n🎉 Your professional Windows installer is ready for distribution!');
  
  // Clean up temporary files
  if (fs.existsSync('electron-main.js')) {
    fs.unlinkSync('electron-main.js');
  }
  if (fs.existsSync('electron-builder-config.json')) {
    fs.unlinkSync('electron-builder-config.json');
  }
  
} catch (error) {
  console.error('\n❌ Error creating Windows installer:', error.message);
  console.log('\n🔧 Make sure you have:');
  console.log('   • electron-builder installed: npm install -g electron-builder');
  console.log('   • Built the application: npm run build');
  console.log('   • All dependencies installed: npm install');
  
  process.exit(1);
}