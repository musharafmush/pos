#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Awesome Shop POS Desktop App...');
console.log('📊 Your Indian Rupee POS system is loading...');

// Start the server first
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  shell: true
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Server] ${output.trim()}`);
  
  // When server is ready, start Electron
  if (output.includes('serving on port 5000')) {
    console.log('✅ Server ready! Opening desktop app...');
    
    setTimeout(() => {
      const electron = spawn('npx', ['electron', 'electron/main.js'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
      });
      
      electron.on('close', (code) => {
        console.log('📱 Desktop app closed');
        server.kill();
        process.exit(code);
      });
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data}`);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down desktop app...');
  server.kill();
  process.exit();
});