
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building POS system for cPanel hosting...');

try {
  // Clean previous build
  if (fs.existsSync('cpanel-build')) {
    fs.rmSync('cpanel-build', { recursive: true });
  }
  fs.mkdirSync('cpanel-build');

  // Build the client (React app)
  console.log('📦 Building client application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Copy client build to cpanel-build
  console.log('📁 Copying client files...');
  execSync('cp -r dist/* cpanel-build/', { stdio: 'inherit' });

  // Copy cPanel-specific files
  console.log('📁 Copying cPanel configuration...');
  fs.copyFileSync('cpanel-app.js', 'cpanel-build/app.js');
  fs.copyFileSync('.htaccess', 'cpanel-build/.htaccess');

  // Create cPanel-specific package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const cpanelPackageJson = {
    name: 'awesome-shop-pos-cpanel',
    version: '1.0.0',
    description: 'Professional POS System for cPanel Hosting',
    main: 'app.js',
    dependencies: {
      'express': packageJson.dependencies.express,
      'express-session': packageJson.dependencies['express-session'],
      'passport': packageJson.dependencies.passport,
      'passport-local': packageJson.dependencies['passport-local'],
      'bcryptjs': packageJson.dependencies.bcryptjs
    },
    scripts: {
      start: 'node app.js'
    },
    engines: {
      node: '>=16.0.0'
    }
  };

  fs.writeFileSync('cpanel-build/package.json', JSON.stringify(cpanelPackageJson, null, 2));

  // Create a simple 500 error page
  fs.writeFileSync('cpanel-build/500.html', `
<!DOCTYPE html>
<html>
<head>
  <title>500 - Internal Server Error</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    h1 { color: #dc3545; }
  </style>
</head>
<body>
  <h1>500 - Internal Server Error</h1>
  <p>The POS system encountered an error. Please try again later.</p>
  <p><a href="/">Return to Homepage</a></p>
</body>
</html>
  `);

  // Create installation instructions
  fs.writeFileSync('cpanel-build/INSTALL.md', `
# cPanel Installation Instructions

## Quick Setup

1. **Upload Files**: Upload all files from this folder to your cPanel public_html directory
2. **Install Dependencies**: In cPanel Terminal or File Manager, run:
   \`\`\`
   npm install
   \`\`\`
3. **Configure Node.js App** in cPanel:
   - Application Root: /public_html
   - Application Startup File: app.js
   - Node.js Version: 16 or higher
4. **Access Your POS**: Visit your domain to access the system

## Login Credentials
- Username: admin, Password: admin123
- Username: staff, Password: staff123

## Features
✅ Complete POS system
✅ Product management
✅ Sales tracking
✅ User authentication
✅ Responsive design
✅ Indian business features

Your professional POS system is ready!
  `);

  console.log('✅ Build completed successfully!');
  console.log('\n📋 cPanel Ready Files:');
  console.log('📁 All files are in the "cpanel-build" folder');
  console.log('📤 Upload contents of cpanel-build/ to your cPanel public_html');
  console.log('🔧 Run "npm install" in cPanel terminal');
  console.log('🚀 Configure Node.js app in cPanel control panel');
  console.log('🎉 Your POS system will be live at your domain!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
