#!/usr/bin/env node

/**
 * Test script to verify Windows EXE installer build readiness
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Windows EXE Installer Build Readiness...\n');

const checks = [
  {
    name: 'Node.js modules installed',
    test: () => fs.existsSync('node_modules') && fs.existsSync('node_modules/electron-builder'),
    fix: 'Run: npm install'
  },
  {
    name: 'Electron dependencies available',
    test: () => fs.existsSync('node_modules/electron') && fs.existsSync('node_modules/electron-updater'),
    fix: 'Run: npm install electron electron-updater'
  },
  {
    name: 'Build configuration exists',
    test: () => fs.existsSync('electron-builder.json'),
    fix: 'electron-builder.json file is missing'
  },
  {
    name: 'Electron main file exists',
    test: () => fs.existsSync('electron/main.js'),
    fix: 'electron/main.js file is missing'
  },
  {
    name: 'Desktop app launcher exists',
    test: () => fs.existsSync('desktop-app.cjs'),
    fix: 'desktop-app.cjs file is missing'
  },
  {
    name: 'Build scripts exist',
    test: () => fs.existsSync('create-exe-installer.js') && fs.existsSync('Build-Windows-Installer.bat'),
    fix: 'Build scripts are missing'
  },
  {
    name: 'Icon files exist',
    test: () => fs.existsSync('build/icon.svg') || fs.existsSync('generated-icon.png'),
    fix: 'Icon files are missing'
  },
  {
    name: 'Application built',
    test: () => fs.existsSync('dist') || fs.existsSync('build'),
    fix: 'Run: npm run build'
  }
];

let allPassed = true;

console.log('Running build readiness checks:\n');

checks.forEach((check, index) => {
  const passed = check.test();
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${check.name}: ${status}`);
  
  if (!passed) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Ready to build Windows EXE installer');
  console.log('\nTo build the installer, run:');
  console.log('• Windows: .\\Build-Windows-Installer.bat');
  console.log('• Node.js: node create-exe-installer.js');
  console.log('• Cross-platform: ./build-installer.sh');
} else {
  console.log('❌ Some checks failed. Please fix the issues above before building.');
}

console.log('\n📁 Expected output:');
console.log('• installer-dist/AwesomeShopPOS-Setup-1.0.0.exe');
console.log('• Approximately 150-200MB installer file');
console.log('• Professional Windows installer with NSIS');

console.log('\n🚀 Features included in the installer:');
console.log('• Professional splash screen and system tray');
console.log('• Desktop and Start Menu shortcuts');
console.log('• Auto-updater with GitHub integration');
console.log('• Native Windows menus and keyboard shortcuts');
console.log('• Isolated user data storage');
console.log('• Complete offline POS functionality');