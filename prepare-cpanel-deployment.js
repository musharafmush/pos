#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Preparing POS system for cPanel deployment...');

// Create deployment folder
const deployDir = path.join(__dirname, 'cpanel-deployment');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir);

console.log('📁 Created deployment directory');

// Copy essential files
const filesToCopy = [
  'app.js',
  '.htaccess',
  'cpanel-setup.md',
  'CPANEL-DEPLOYMENT-GUIDE.md'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(deployDir, file));
    console.log(`✅ Copied ${file}`);
  } else {
    console.log(`⚠️ ${file} not found`);
  }
});

// Copy database if exists
if (fs.existsSync('pos-data.db')) {
  fs.copyFileSync('pos-data.db', path.join(deployDir, 'pos-data.db'));
  console.log('✅ Copied database');
}

// Create production package.json
const prodPackageJson = {
  "name": "awesome-shop-pos",
  "version": "1.0.0",
  "description": "Professional Point of Sale System for Indian Retail Businesses",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "zod": "^3.22.4"
  },
  "engines": {
    "node": ">=16.0.0"
  }
};

fs.writeFileSync(
  path.join(deployDir, 'package.json'), 
  JSON.stringify(prodPackageJson, null, 2)
);
console.log('✅ Created production package.json');

// Copy dist folder if it exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  const deployDistPath = path.join(deployDir, 'dist');
  fs.cpSync(distPath, deployDistPath, { recursive: true });
  console.log('✅ Copied dist folder');
} else {
  console.log('⚠️ Dist folder not found. Run "npm run build" first.');
}

// Create deployment instructions
const instructions = `
# Quick cPanel Deployment Instructions

## 1. Upload to cPanel
Upload ALL files from this folder to your public_html directory.

## 2. Install Dependencies
In cPanel terminal or file manager:
\`\`\`bash
cd public_html
npm install
\`\`\`

## 3. Configure Node.js App
- Application Root: public_html
- Startup File: app.js
- Node.js Version: 16+ 

## 4. Start Application
Click "Start App" in cPanel Node.js section.

## 5. Access Your POS
Visit your domain - login with admin/admin123

## Files Included:
${fs.readdirSync(deployDir).map(file => `- ${file}`).join('\n')}

Your professional POS system is ready for deployment!
`;

fs.writeFileSync(path.join(deployDir, 'DEPLOYMENT-INSTRUCTIONS.txt'), instructions);
console.log('✅ Created deployment instructions');

console.log(`
🎉 Deployment package ready!

📦 Location: ${deployDir}
📋 Next steps:
1. Upload all files from cpanel-deployment/ to your cPanel public_html
2. Run 'npm install' in cPanel terminal
3. Configure Node.js app in cPanel
4. Start the application

📖 Read CPANEL-DEPLOYMENT-GUIDE.md for detailed instructions.
`);