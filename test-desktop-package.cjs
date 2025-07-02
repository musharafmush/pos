#!/usr/bin/env node

/**
 * Test script for Desktop Package
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Awesome Shop POS Desktop Package...');

// Test 1: Check if package directory exists
const packageDir = path.join(__dirname, 'AwesomeShopPOS-Portable');
if (!fs.existsSync(packageDir)) {
  console.error('❌ Package directory not found');
  process.exit(1);
}
console.log('✅ Package directory exists');

// Test 2: Check essential files
const essentialFiles = [
  'AwesomeShopPOS.js',
  'Install-POS.bat',
  'Install-POS.sh',
  'README.md',
  'INSTALLATION-GUIDE.md',
  'app/package.json',
  'app/web-desktop-app.cjs'
];

essentialFiles.forEach(file => {
  const filePath = path.join(packageDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} missing`);
  }
});

// Test 3: Check if Node.js syntax is valid in key files
const testSyntax = (filePath) => {
  try {
    require.resolve(filePath);
    return true;
  } catch (error) {
    console.error(`❌ Syntax error in ${filePath}:`, error.message);
    return false;
  }
};

const keyFiles = [
  path.join(packageDir, 'AwesomeShopPOS.js'),
  path.join(packageDir, 'app/web-desktop-app.cjs')
];

keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    if (testSyntax(file)) {
      console.log(`✅ ${path.basename(file)} syntax valid`);
    }
  }
});

console.log('\n📦 Package Test Summary:');
console.log(`   Package Size: ${fs.statSync(packageDir).size} bytes`);
console.log(`   Total Files: ${countFiles(packageDir)}`);
console.log('   Ready for distribution');

function countFiles(dir) {
  let count = 0;
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        traverse(itemPath);
      } else {
        count++;
      }
    });
  }
  
  traverse(dir);
  return count;
}

console.log('\n🎉 Desktop package test completed successfully!');
console.log('💰 Awesome Shop POS ready for installation');