#!/usr/bin/env node

/**
 * Awesome Shop POS - Complete Desktop Application
 * Professional Point of Sale System for Indian Retail Businesses
 * Features: Offline capability, Indian Rupee formatting, GST compliance
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class AwesomeShopDesktopApp {
  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.isQuitting = false;
    this.serverReady = false;
    this.serverPort = 5000;
    
    console.log('🚀 Starting Awesome Shop POS Desktop Application');
    console.log('💰 Professional Indian Rupee POS System');
    console.log('🏪 Designed for Indian Retail Businesses');
    
    this.initializeApp();
  }

  initializeApp() {
    // Handle app ready
    app.whenReady().then(() => {
      this.startServer();
    });

    // Handle all windows closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown();
      }
    });

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle before quit
    app.on('before-quit', (event) => {
      this.isQuitting = true;
      if (this.serverProcess) {
        event.preventDefault();
        this.shutdown();
      }
    });

    // Security
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
      });
    });
  }

  async startServer() {
    console.log('🌐 Starting POS server...');
    
    try {
      // Start the Express server
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          DESKTOP_MODE: 'true',
          NODE_ENV: 'development'
        }
      });

      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[Server]', output.trim());
        
        // Check if server is ready
        if (output.includes('serving on port 5000') || output.includes('Server started')) {
          if (!this.serverReady) {
            this.serverReady = true;
            console.log('✅ Server ready! Creating desktop window...');
            setTimeout(() => {
              this.createWindow();
            }, 2000); // Wait a bit for server to fully initialize
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('warning') && !error.includes('deprecated')) {
          console.error('[Server Error]', error.trim());
        }
      });

      this.serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (!this.isQuitting) {
          this.showErrorDialog('Server Error', 'The POS server has stopped unexpectedly.');
        }
      });

      // Fallback: Create window after timeout even if server message not detected
      setTimeout(() => {
        if (!this.serverReady) {
          console.log('⏰ Server timeout - creating window anyway...');
          this.createWindow();
        }
      }, 15000);

    } catch (error) {
      console.error('Failed to start server:', error);
      this.showErrorDialog('Startup Error', 'Failed to start the POS application server.');
    }
  }

  createWindow() {
    // Create the main application window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      icon: this.getAppIcon(),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'desktop-backend/preload.js')
      },
      titleBarStyle: 'default',
      show: false,
      title: 'Awesome Shop POS - Professional Indian Retail System',
      backgroundColor: '#ffffff'
    });

    // Load the application
    const appUrl = `http://localhost:${this.serverPort}`;
    console.log(`🌐 Loading application from: ${appUrl}`);
    
    this.mainWindow.loadURL(appUrl);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
      console.log('✅ Desktop application window ready!');
      
      // Optional: Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        // this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      if (!this.isQuitting) {
        this.shutdown();
      }
    });

    // Handle navigation errors
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load application:', errorDescription);
      if (errorCode === -102) { // CONNECTION_REFUSED
        this.showServerNotReadyDialog();
      }
    });

    // Set up application menu
    this.createMenu();
  }

  getAppIcon() {
    const iconPath = path.join(__dirname, 'generated-icon.png');
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }
    return null;
  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Sale',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.navigateTo('/pos-enhanced');
            }
          },
          {
            label: 'New Purchase',
            accelerator: 'CmdOrCtrl+P',
            click: () => {
              this.navigateTo('/purchase-entry-professional');
            }
          },
          {
            label: 'Add Product',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => {
              this.navigateTo('/add-product');
            }
          },
          { type: 'separator' },
          {
            label: 'Print Labels',
            accelerator: 'CmdOrCtrl+L',
            click: () => {
              this.navigateTo('/print-labels-enhanced');
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.shutdown();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Dashboard',
            accelerator: 'CmdOrCtrl+D',
            click: () => {
              this.navigateTo('/');
            }
          },
          {
            label: 'Sales Management',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.navigateTo('/sales-dashboard');
            }
          },
          {
            label: 'Inventory',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.navigateTo('/inventory-dashboard');
            }
          },
          {
            label: 'Customers',
            accelerator: 'CmdOrCtrl+U',
            click: () => {
              this.navigateTo('/customers');
            }
          },
          {
            label: 'Reports',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.navigateTo('/reports');
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.reload();
              }
            }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.toggleDevTools();
              }
            }
          },
          {
            label: 'Actual Size',
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.setZoomLevel(0);
              }
            }
          },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.setZoomLevel(this.mainWindow.webContents.getZoomLevel() + 0.5);
              }
            }
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.setZoomLevel(this.mainWindow.webContents.getZoomLevel() - 0.5);
              }
            }
          }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Backup Database',
            click: () => {
              this.backupDatabase();
            }
          },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.navigateTo('/settings');
            }
          },
          {
            label: 'Printer Settings',
            click: () => {
              this.navigateTo('/printer-settings');
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Awesome Shop POS',
            click: () => {
              this.showAboutDialog();
            }
          },
          {
            label: 'User Guide',
            click: () => {
              shell.openExternal('https://github.com/awesomeshop/pos-desktop/wiki');
            }
          },
          {
            label: 'Support',
            click: () => {
              shell.openExternal('mailto:support@awesomeshop.com');
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  navigateTo(path) {
    if (this.mainWindow) {
      this.mainWindow.webContents.executeJavaScript(`
        if (window.location.pathname !== '${path}') {
          window.location.href = '${path}';
        }
      `);
    }
  }

  async backupDatabase() {
    try {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: 'Backup Database',
        defaultPath: `awesome-pos-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        const sourcePath = path.join(__dirname, 'pos-data.db');
        const destPath = result.filePath;
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Backup Complete',
            message: 'Database backup created successfully!',
            detail: `Backup saved to: ${destPath}`
          });
        } else {
          dialog.showErrorBox('Backup Error', 'Database file not found.');
        }
      }
    } catch (error) {
      console.error('Backup error:', error);
      dialog.showErrorBox('Backup Error', 'Failed to create database backup.');
    }
  }

  showAboutDialog() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About Awesome Shop POS',
      message: 'Awesome Shop POS',
      detail: `Version: 1.0.0
Professional Point of Sale System for Indian Retail Businesses

Features:
• Indian Rupee (₹) currency support
• GST compliance and HSN code management
• Offline capability with SQLite database
• Inventory management and tracking
• Customer loyalty program
• Professional receipt printing
• Multi-language support (Hindi/English)

© 2024 Awesome Shop POS. All rights reserved.`
    });
  }

  showErrorDialog(title, message) {
    dialog.showErrorBox(title, message);
  }

  showServerNotReadyDialog() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: 'Server Not Ready',
      message: 'The POS server is not responding.',
      detail: 'Please wait a moment and try again. The server may still be starting up.',
      buttons: ['Retry', 'Close']
    }).then((result) => {
      if (result.response === 0) { // Retry
        this.mainWindow.reload();
      } else { // Close
        this.shutdown();
      }
    });
  }

  shutdown() {
    console.log('🔄 Shutting down Awesome Shop POS...');
    this.isQuitting = true;

    // Close server process
    if (this.serverProcess) {
      console.log('🛑 Stopping server...');
      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Close all windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.close();
    });

    // Quit app
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
}

// Create and start the desktop application
const desktopApp = new AwesomeShopDesktopApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});