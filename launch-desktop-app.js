#!/usr/bin/env node

console.log('🚀 Launching Awesome Shop POS Desktop App...');
console.log('💰 Your professional Indian Rupee POS system is starting!');

const { exec } = require('child_process');
const path = require('path');

// Start the web server and open in Electron
const startCommand = process.platform === 'win32' 
  ? 'start /B npm run dev && timeout /t 3 && npx electron electron/main.js'
  : 'npm run dev & sleep 3 && npx electron electron/main.js';

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