#!/usr/bin/env node

/**
 * Awesome Shop POS - Enhanced Desktop Application Launcher
 * Professional desktop launcher with advanced backend services
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const DesktopBackendService = require('./main');

class DesktopLauncher {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
    
    console.log('🚀 Awesome Shop POS - Enhanced Desktop Launcher');
    console.log('💰 Professional Indian Rupee POS System');
    console.log('📊 Loading desktop backend services...\n');
  }

  async checkPrerequisites() {
    console.log('🔍 Checking system prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`✓ Node.js version: ${nodeVersion}`);
    
    // Check if database directory exists
    const dbDir = path.join(__dirname, '..');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('✓ Created database directory');
    }
    
    // Check if main application exists
    const mainAppPath = path.join(__dirname, '../server');
    if (fs.existsSync(mainAppPath)) {
      console.log('✓ Main POS application found');
    } else {
      console.log('⚠️  Main POS application not found at expected location');
    }
    
    console.log('✅ Prerequisites check completed\n');
    return true;
  }

  async startMainApplication() {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting main POS application server...');
      
      const mainApp = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          DESKTOP_MODE: 'true',
          NODE_ENV: 'development'
        }
      });

      this.processes.set('mainApp', mainApp);

      mainApp.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[Main App] ${output}`);
        }
        
        // Check if server is ready
        if (output.includes('serving on port 5000') || output.includes('Server started on port 5000')) {
          console.log('✅ Main POS application server ready!\n');
          resolve(true);
        }
      });

      mainApp.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error && !error.includes('warning')) {
          console.error(`[Main App Error] ${error}`);
        }
      });

      mainApp.on('close', (code) => {
        if (!this.isShuttingDown) {
          console.log(`⚠️  Main application exited with code ${code}`);
          this.processes.delete('mainApp');
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.processes.has('mainApp')) {
          console.log('✅ Main application server assumed ready (timeout)\n');
          resolve(true);
        }
      }, 30000);
    });
  }

  async startDesktopBackend() {
    return new Promise((resolve) => {
      console.log('🔧 Starting enhanced desktop backend service...');
      
      const desktopBackend = new DesktopBackendService();
      
      // Start the desktop backend service
      desktopBackend.start().then(() => {
        console.log('✅ Desktop backend service ready!\n');
        resolve(desktopBackend);
      }).catch((error) => {
        console.error('❌ Failed to start desktop backend:', error.message);
        console.log('⚠️  Continuing without enhanced desktop backend...\n');
        resolve(null);
      });
    });
  }

  async startElectronApp() {
    return new Promise((resolve) => {
      console.log('🖥️  Launching Electron desktop application...');
      
      // Wait a moment for servers to stabilize
      setTimeout(() => {
        const electronApp = spawn('npx', ['electron', path.join(__dirname, '../electron/main.js')], {
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            DESKTOP_MODE: 'true'
          }
        });

        this.processes.set('electronApp', electronApp);

        electronApp.on('close', (code) => {
          console.log('📱 Desktop application closed');
          this.shutdown();
        });

        electronApp.on('error', (error) => {
          console.error('❌ Electron app error:', error.message);
        });

        console.log('✅ Desktop application launched successfully!\n');
        resolve(electronApp);
      }, 3000);
    });
  }

  displayStartupInfo() {
    console.log('🎯 Awesome Shop POS Desktop Features:');
    console.log('  ✓ Indian Rupee formatting (₹)');
    console.log('  ✓ Professional purchase entry with freight distribution');
    console.log('  ✓ Advanced label printing system');
    console.log('  ✓ Real-time sales dashboard');
    console.log('  ✓ Customer loyalty management');
    console.log('  ✓ Inventory tracking and alerts');
    console.log('  ✓ GST compliance and tax calculations');
    console.log('  ✓ Offline database backup system');
    console.log('');
    console.log('⌨️  Desktop Keyboard Shortcuts:');
    console.log('  Ctrl+N: New Purchase Order');
    console.log('  Ctrl+S: New Sale');
    console.log('  Ctrl+L: Print Labels');
    console.log('  Ctrl+D: Dashboard');
    console.log('  Ctrl+P: Products');
    console.log('  Ctrl+U: Customers');
    console.log('  Ctrl+B: Backup Database');
    console.log('  F12: Developer Tools');
    console.log('');
    console.log('🏪 Your professional POS system is now running!');
    console.log('💼 Perfect for Indian retail businesses');
    console.log('');
  }

  setupShutdownHandlers() {
    const gracefulShutdown = () => {
      if (this.isShuttingDown) return;
      this.shutdown();
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('exit', gracefulShutdown);
  }

  shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('\n🛑 Shutting down Awesome Shop POS Desktop...');

    // Close all processes
    for (const [name, process] of this.processes) {
      console.log(`📱 Closing ${name}...`);
      try {
        process.kill('SIGTERM');
      } catch (error) {
        // Process might already be closed
      }
    }

    // Force exit after 5 seconds
    setTimeout(() => {
      console.log('💰 Thank you for using Awesome Shop POS!');
      process.exit(0);
    }, 5000);
  }

  async launch() {
    try {
      // Setup shutdown handlers first
      this.setupShutdownHandlers();

      // Check prerequisites
      await this.checkPrerequisites();

      // Start main application
      await this.startMainApplication();

      // Start desktop backend service
      const desktopBackend = await this.startDesktopBackend();

      // Launch Electron app
      await this.startElectronApp();

      // Display startup information
      this.displayStartupInfo();

      // Keep the launcher running
      console.log('🔄 Desktop launcher active - Press Ctrl+C to exit\n');

    } catch (error) {
      console.error('❌ Failed to launch desktop application:', error);
      this.shutdown();
    }
  }
}

// Launch the desktop application
if (require.main === module) {
  const launcher = new DesktopLauncher();
  launcher.launch();
}

module.exports = DesktopLauncher;