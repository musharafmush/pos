#!/usr/bin/env node

/**
 * Quick Build Script for cPanel Deployment
 * Awesome Shop POS - Fast production build optimized for cPanel hosting
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const log = (message, color = 'white') => {
  console.log(colors[color] + message + colors.reset);
};

const buildDir = 'cpanel-build';

try {
  log('🚀 Quick Build for cPanel Deployment', 'cyan');
  log('💡 Optimized for fast hosting deployment', 'yellow');
  
  // Clean previous build
  if (fs.existsSync(buildDir)) {
    log('🧹 Cleaning previous build', 'blue');
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  
  // Create build directory
  fs.mkdirSync(buildDir, { recursive: true });
  
  // Copy essential files
  log('📁 Copying essential files', 'blue');
  const filesToCopy = [
    'package.json',
    'package-lock.json',
    '.htaccess',
    'shared/',
    'server/',
    'client/',
    'db/',
    'electron/',
    'desktop-backend/',
    'replit.md',
    'README.md',
    'CHANGELOG.md',
    'cpanel-setup.md'
  ];
  
  filesToCopy.forEach(file => {
    const src = file;
    const dest = path.join(buildDir, file);
    
    if (fs.existsSync(src)) {
      if (fs.statSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
        log(`   ✓ Copied directory: ${file}`, 'green');
      } else {
        fs.cpSync(src, dest);
        log(`   ✓ Copied file: ${file}`, 'green');
      }
    } else {
      log(`   ⚠ File not found: ${file}`, 'yellow');
    }
  });
  
  // Copy node_modules (essential dependencies only)
  log('📦 Copying essential node_modules', 'blue');
  const essentialDeps = [
    'better-sqlite3',
    'express',
    'bcryptjs',
    'drizzle-orm',
    'zod',
    'passport',
    'passport-local',
    'express-session',
    'date-fns',
    'jsbarcode'
  ];
  
  const nodeModulesDir = path.join(buildDir, 'node_modules');
  fs.mkdirSync(nodeModulesDir, { recursive: true });
  
  essentialDeps.forEach(dep => {
    const src = path.join('node_modules', dep);
    const dest = path.join(nodeModulesDir, dep);
    
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
      log(`   ✓ Copied dependency: ${dep}`, 'green');
    } else {
      log(`   ⚠ Dependency not found: ${dep}`, 'yellow');
    }
  });
  
  // Create production environment file
  log('🔧 Creating production environment', 'blue');
  const prodEnv = `NODE_ENV=production
PORT=5000
DATABASE_URL=./pos-data.db
SESSION_SECRET=your-secret-key-here
`;
  
  fs.writeFileSync(path.join(buildDir, '.env'), prodEnv);
  log('   ✓ Created .env file', 'green');
  
  // Create build info
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production',
    platform: 'cpanel',
    features: [
      'Point of Sale System',
      'Inventory Management', 
      'Customer Loyalty',
      'GST Compliance',
      'Thermal Printing',
      'Label Printing',
      'Multi-language Support'
    ]
  };
  
  fs.writeFileSync(path.join(buildDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
  log('   ✓ Created build info', 'green');
  
  // Create deployment instructions
  const deployInstructions = `# cPanel Deployment Instructions

1. Upload the contents of this folder to your cPanel public_html directory
2. Install Node.js dependencies: npm install
3. Set up your database connection in .env
4. Start the application: node server/index.js

For detailed instructions, see cpanel-setup.md
`;
  
  fs.writeFileSync(path.join(buildDir, 'DEPLOY.md'), deployInstructions);
  log('   ✓ Created deployment instructions', 'green');
  
  log('✅ Quick build completed successfully!', 'green');
  log(`📁 Build output: ${buildDir}/`, 'cyan');
  log('📋 Ready for cPanel deployment', 'green');
  
} catch (error) {
  log(`❌ Build failed: ${error.message}`, 'red');
  process.exit(1);
}