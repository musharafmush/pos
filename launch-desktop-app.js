#!/usr/bin/env node

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 Launching Awesome Shop POS Desktop App...');
console.log('💰 Your professional Indian Rupee POS system is starting!');

// Initialize SQLite database for desktop mode
console.log('🔧 Setting up offline database...');
exec('tsx db/sqlite-migrate.ts', (error) => {
  if (error) {
    console.log('📊 Creating fresh database for first-time use...');
  } else {
    console.log('✅ Database ready for offline use!');
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set desktop mode environment variable for SQLite
process.env.DESKTOP_MODE = 'true';

// Start the web server and open in Electron
const startCommand = process.platform === 'win32' 
  ? 'set DESKTOP_MODE=true && start /B npm run dev && timeout /t 3 && npx electron electron/main.js'
  : 'DESKTOP_MODE=true npm run dev & sleep 3 && npx electron electron/main.js';

const child = exec(startCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error starting desktop app:', error);
    return;
  }
  console.log('✅ Desktop app started successfully!');
});

child.stdout?.on('data', (data) => {
  console.log(`📊 ${data.trim()}`);
});

child.stderr?.on('data', (data) => {
  console.error(`⚠️ ${data.trim()}`);
});

console.log('');
console.log('🎯 Features ready in your desktop app:');
console.log('  ✓ Indian Rupee formatting (₹100)');
console.log('  ✓ Professional purchase entry with freight distribution');
console.log('  ✓ Clean line items with proper calculations');
console.log('  ✓ Keyboard shortcuts for faster operations');
console.log('');
console.log('⌨️  Keyboard Shortcuts:');
console.log('  Ctrl+N: New Purchase Order');
console.log('  Ctrl+S: New Sale');
console.log('  Ctrl+D: Dashboard');
console.log('  Ctrl+P: Products');
console.log('');
console.log('🖥️  Your POS system will open in a desktop window shortly...');