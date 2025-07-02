#!/usr/bin/env node

/**
 * Awesome Shop POS - Web Desktop Application
 * Professional Point of Sale System for Indian Retail Businesses
 * Desktop-style experience optimized for Replit environment
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class WebDesktopApp {
  constructor() {
    this.mainServerProcess = null;
    this.desktopBackendProcess = null;
    this.isShuttingDown = false;
    this.mainServerPort = 5000;
    this.desktopBackendPort = 5001;
    
    console.log('🚀 Starting Awesome Shop POS - Web Desktop Application');
    console.log('💰 Professional Indian Rupee POS System');
    console.log('🏪 Designed for Indian Retail Businesses');
    console.log('🌐 Web-based desktop experience optimized for professional use');
    console.log('');
    
    this.initializeApp();
  }

  initializeApp() {
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Awesome Shop POS...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received shutdown signal...');
      this.shutdown();
    });

    // Start the application
    this.startApplication();
  }

  async startApplication() {
    console.log('🔄 Starting application services...');
    
    try {
      // Start main POS server
      await this.startMainServer();
      
      // Start desktop backend service
      await this.startDesktopBackend();
      
      // Display ready message
      this.showReadyMessage();
      
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  async startMainServer() {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting main POS server...');
      
      this.mainServerProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          DESKTOP_MODE: 'true',
          NODE_ENV: 'development'
        }
      });

      this.mainServerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[Main Server]', output.trim());
        
        // Check if server is ready
        if (output.includes('serving on port 5000') || output.includes('Server started')) {
          console.log('✅ Main POS server ready on port 5000');
          resolve(true);
        }
      });

      this.mainServerProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('warning') && !error.includes('deprecated')) {
          console.error('[Main Server Error]', error.trim());
        }
      });

      this.mainServerProcess.on('close', (code) => {
        if (!this.isShuttingDown) {
          console.log(`⚠️  Main server exited with code ${code}`);
        }
      });

      // Timeout fallback
      setTimeout(() => {
        console.log('✅ Main server assumed ready (timeout)');
        resolve(true);
      }, 15000);
    });
  }

  async startDesktopBackend() {
    return new Promise((resolve, reject) => {
      console.log('🔧 Starting desktop backend service...');
      
      this.desktopBackendProcess = spawn('node', ['desktop-backend/main.js'], {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          DESKTOP_MODE: 'true'
        }
      });

      this.desktopBackendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[Desktop Backend]', output.trim());
        
        // Check if backend is ready
        if (output.includes('Desktop Backend Service started') || output.includes('ready for professional use')) {
          console.log('✅ Desktop backend service ready on port 5001');
          resolve(true);
        }
      });

      this.desktopBackendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('warning')) {
          console.error('[Desktop Backend Error]', error.trim());
        }
      });

      this.desktopBackendProcess.on('close', (code) => {
        if (!this.isShuttingDown) {
          console.log(`⚠️  Desktop backend exited with code ${code}`);
        }
      });

      // Timeout fallback
      setTimeout(() => {
        console.log('✅ Desktop backend assumed ready (timeout)');
        resolve(true);
      }, 10000);
    });
  }

  showReadyMessage() {
    console.log('');
    console.log('🎉 Awesome Shop POS Desktop Application Ready!');
    console.log('');
    console.log('📊 Application URLs:');
    console.log(`   Main Application: http://localhost:${this.mainServerPort}`);
    console.log(`   Desktop Backend:  http://localhost:${this.desktopBackendPort}`);
    console.log('');
    console.log('🔗 Quick Access Links:');
    console.log(`   Dashboard:        http://localhost:${this.mainServerPort}/`);
    console.log(`   POS Sale:         http://localhost:${this.mainServerPort}/pos-enhanced`);
    console.log(`   Purchase Entry:   http://localhost:${this.mainServerPort}/purchase-entry-professional`);
    console.log(`   Product Management: http://localhost:${this.mainServerPort}/add-product`);
    console.log(`   Label Printing:   http://localhost:${this.mainServerPort}/print-labels-enhanced`);
    console.log(`   Settings:         http://localhost:${this.mainServerPort}/settings`);
    console.log('');
    console.log('🏪 Indian Business Features:');
    console.log('   ✓ Indian Rupee (₹) formatting throughout');
    console.log('   ✓ GST compliance with CGST/SGST/IGST calculations');
    console.log('   ✓ HSN code management for tax compliance');
    console.log('   ✓ Professional thermal receipt printing');
    console.log('   ✓ Offline SQLite database storage');
    console.log('   ✓ Customer loyalty program management');
    console.log('');
    console.log('💻 Desktop Features Available:');
    console.log('   ✓ Professional database backup system');
    console.log('   ✓ Data export (JSON, CSV formats)');
    console.log('   ✓ System health monitoring');
    console.log('   ✓ Local file system integration');
    console.log('   ✓ Multi-service architecture');
    console.log('');
    console.log('🔄 Service Status:');
    console.log(`   Main Server: Running on port ${this.mainServerPort}`);
    console.log(`   Desktop Backend: Running on port ${this.desktopBackendPort}`);
    console.log('   Database: SQLite with WAL mode optimization');
    console.log('');
    console.log('💡 Usage Instructions:');
    console.log('   • Open your web browser and navigate to the Main Application URL');
    console.log('   • Login with username: admin, password: admin');
    console.log('   • Access all POS features through the web interface');
    console.log('   • Use Ctrl+C to safely shutdown the application');
    console.log('');
    console.log('💰 Awesome Shop POS - Ready for professional retail operations!');
    console.log('');
  }

  shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('🔄 Gracefully shutting down services...');

    // Close main server
    if (this.mainServerProcess) {
      console.log('🛑 Stopping main server...');
      this.mainServerProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.mainServerProcess) {
          this.mainServerProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Close desktop backend
    if (this.desktopBackendProcess) {
      console.log('🛑 Stopping desktop backend...');
      this.desktopBackendProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.desktopBackendProcess) {
          this.desktopBackendProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Final shutdown
    setTimeout(() => {
      console.log('✅ Awesome Shop POS shutdown complete');
      console.log('💰 Thank you for using our professional POS system!');
      process.exit(0);
    }, 1000);
  }

  // Health check endpoint simulation
  async checkHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mainServer: this.mainServerProcess ? 'running' : 'stopped',
        desktopBackend: this.desktopBackendProcess ? 'running' : 'stopped'
      },
      ports: {
        mainServer: this.mainServerPort,
        desktopBackend: this.desktopBackendPort
      },
      features: {
        indianRupeeSupport: true,
        gstCompliance: true,
        offlineCapability: true,
        thermalPrinting: true,
        databaseBackup: true
      }
    };
    
    return health;
  }
}

// Create and start the web desktop application
const webDesktopApp = new WebDesktopApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});