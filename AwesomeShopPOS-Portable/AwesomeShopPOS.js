#!/usr/bin/env node

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
    console.log('🏪 Designed for Indian Retail Businesses\n');
    
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
      console.log(`\n💰 Awesome Shop POS closed with code ${code}`);
      console.log('Thank you for using our professional POS system!');
    });
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Awesome Shop POS...');
      appProcess.kill('SIGTERM');
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    });
  }
}

new AwesomeShopPOSLauncher();