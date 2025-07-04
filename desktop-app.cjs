/**
 * Awesome Shop POS - Advanced Desktop Application Launcher
 * Professional desktop integration with system tray, auto-updater, and native menus
 */

const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog, autoUpdater } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configure auto-updater
if (process.env.NODE_ENV === 'production') {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'awesomeshop',
    repo: 'pos-system'
  });
}

let mainWindow = null;
let tray = null;
let serverProcess = null;
let splashWindow = null;

// Application configuration
const APP_CONFIG = {
  name: 'Awesome Shop POS',
  version: '1.0.0',
  description: 'Professional Point of Sale System for Indian Retail Businesses',
  author: 'Awesome Shop POS Team',
  serverPort: 5000,
  dataDir: path.join(process.env.APPDATA || process.env.HOME, 'AwesomeShopPOS'),
  splashDuration: 3000
};

// Ensure data directory exists
function ensureDataDirectory() {
  const dirs = [
    APP_CONFIG.dataDir,
    path.join(APP_CONFIG.dataDir, 'data'),
    path.join(APP_CONFIG.dataDir, 'backups'),
    path.join(APP_CONFIG.dataDir, 'exports'),
    path.join(APP_CONFIG.dataDir, 'logs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Create splash screen
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: white;
          text-align: center;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
          font-size: 18px;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .loading {
          width: 200px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
        }
        .loading-bar {
          width: 0%;
          height: 100%;
          background: #10b981;
          border-radius: 2px;
          animation: loading 3s ease-in-out;
        }
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .version {
          position: absolute;
          bottom: 20px;
          font-size: 12px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="logo">₹ Awesome Shop POS</div>
      <div class="subtitle">Professional Point of Sale System</div>
      <div class="loading">
        <div class="loading-bar"></div>
      </div>
      <div class="version">Version ${APP_CONFIG.version}</div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  
  // Auto-close splash after duration
  setTimeout(() => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
  }, APP_CONFIG.splashDuration);
}

// Start the Express server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Awesome Shop POS server...');
    
    const serverPath = path.join(__dirname, 'server', 'index.js');
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: APP_CONFIG.serverPort.toString(),
      DATA_DIR: APP_CONFIG.dataDir
    };

    serverProcess = spawn('node', [serverPath], {
      cwd: __dirname,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Server: ${output}`);
      
      if (output.includes('serving on port') && !serverReady) {
        serverReady = true;
        console.log('✅ Server started successfully');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data.toString()}`);
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Timeout fallback
    setTimeout(() => {
      if (!serverReady) {
        console.log('⏰ Server timeout - proceeding anyway');
        resolve();
      }
    }, 10000);
  });
}

// Create main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'generated-icon.png'),
    title: APP_CONFIG.name,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'electron', 'preload.js')
    },
    show: false,
    titleBarStyle: 'default'
  });

  // Load the application
  const serverUrl = `http://localhost:${APP_CONFIG.serverPort}`;
  console.log(`🌐 Loading application from: ${serverUrl}`);
  
  mainWindow.loadURL(serverUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✨ Application window ready');
  });

  // Handle window events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', () => {
    if (process.platform === 'darwin') {
      mainWindow.hide();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Development tools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create system tray
function createTray() {
  const trayIconPath = path.join(__dirname, 'generated-icon.png');
  
  if (fs.existsSync(trayIconPath)) {
    tray = new Tray(trayIconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Awesome Shop POS',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'New Sale',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('navigate', '/pos-enhanced');
          }
        }
      },
      {
        label: 'Dashboard',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('navigate', '/dashboard');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'About',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About Awesome Shop POS',
            message: APP_CONFIG.name,
            detail: `${APP_CONFIG.description}\n\nVersion: ${APP_CONFIG.version}\nAuthor: ${APP_CONFIG.author}`,
            buttons: ['OK']
          });
        }
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip(APP_CONFIG.name);
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

// Create application menu
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sale',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('navigate', '/pos-enhanced')
        },
        {
          label: 'Products',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('navigate', '/products')
        },
        { type: 'separator' },
        {
          label: 'Import Data',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (!result.canceled) {
              mainWindow?.webContents.send('import-data', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Export Data',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              filters: [{ name: 'JSON', extensions: ['json'] }],
              defaultPath: `awesome-pos-backup-${new Date().toISOString().split('T')[0]}.json`
            });
            if (!result.canceled) {
              mainWindow?.webContents.send('export-data', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow?.webContents.send('navigate', '/dashboard')
        },
        {
          label: 'Sales',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('navigate', '/sales-dashboard')
        },
        {
          label: 'Inventory',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('navigate', '/inventory')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Reports',
      submenu: [
        {
          label: 'Sales Report',
          click: () => mainWindow?.webContents.send('navigate', '/reports/sales')
        },
        {
          label: 'Inventory Report',
          click: () => mainWindow?.webContents.send('navigate', '/reports/inventory')
        },
        {
          label: 'Customer Report',
          click: () => mainWindow?.webContents.send('navigate', '/reports/customers')
        }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Printer Settings',
          click: () => mainWindow?.webContents.send('navigate', '/printer-settings')
        },
        {
          label: 'System Settings',
          click: () => mainWindow?.webContents.send('navigate', '/settings')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Awesome Shop POS',
              message: APP_CONFIG.name,
              detail: `${APP_CONFIG.description}\n\nVersion: ${APP_CONFIG.version}\nAuthor: ${APP_CONFIG.author}\n\nFeatures:\n• Indian Rupee (₹) support\n• GST compliance\n• Customer loyalty program\n• Inventory management\n• Professional receipts\n• Desktop integration`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            if (process.env.NODE_ENV === 'production') {
              autoUpdater.checkForUpdatesAndNotify();
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Updates',
                message: 'Update checking is only available in production builds.',
                buttons: ['OK']
              });
            }
          }
        }
      ]
    }
  ];

  // macOS specific adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize application
async function initializeApp() {
  console.log(`🎯 Initializing ${APP_CONFIG.name}...`);
  
  try {
    // Setup data directory
    ensureDataDirectory();
    
    // Create splash screen
    createSplashWindow();
    
    // Start server
    await startServer();
    
    // Create main window
    createMainWindow();
    
    // Create system tray
    createTray();
    
    // Create application menu
    createApplicationMenu();
    
    console.log('🎉 Application initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    dialog.showErrorBox('Startup Error', 
      `Failed to start ${APP_CONFIG.name}:\n\n${error.message}\n\nPlease try restarting the application.`
    );
    
    app.quit();
  }
}

// App event handlers
app.whenReady().then(() => {
  initializeApp();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('🛑 Stopping server...');
    serverProcess.kill();
  }
});

// Auto-updater events (production only)
if (process.env.NODE_ENV === 'production') {
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
  });

  autoUpdater.on('update-available', () => {
    console.log('📦 Update available');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. It will be downloaded in the background.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('✅ Update downloaded');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

console.log('🚀 Awesome Shop POS Desktop Application Starting...');