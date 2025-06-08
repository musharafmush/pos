
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 POS System Diagnostics');
console.log('========================');

// Check Node.js environment
console.log('📋 System Information:');
console.log('- Node.js version:', process.version);
console.log('- Platform:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Working directory:', process.cwd());
console.log('- Script location:', __dirname);

// Check file structure
console.log('\n📁 File Structure Check:');
const checkFile = (filePath, description) => {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`- ${description}: ${exists ? '✅ Found' : '❌ Missing'} (${fullPath})`);
  return exists;
};

checkFile('app.js', 'Main app.js file');
checkFile('package.json', 'Package.json');
checkFile('.htaccess', 'Apache .htaccess');
checkFile('dist', 'Built client files (dist/)');
checkFile('dist/index.html', 'Client index.html');
checkFile('pos-data.db', 'SQLite database');

// Check package.json
console.log('\n📦 Package Information:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('- Name:', packageJson.name);
  console.log('- Version:', packageJson.version);
  console.log('- Main script:', packageJson.main || 'Not specified');
  console.log('- Scripts available:', Object.keys(packageJson.scripts || {}));
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Check environment variables
console.log('\n🌍 Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('- PORT:', process.env.PORT || 'Not set (will use default 3000)');

// Test port availability
console.log('\n🔌 Port Availability Test:');
const testPort = (port) => {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '0.0.0.0', () => {
      server.close(() => {
        console.log(`- Port ${port}: ✅ Available`);
        resolve(true);
      });
    });
    server.on('error', () => {
      console.log(`- Port ${port}: ❌ In use or restricted`);
      resolve(false);
    });
  });
};

async function runPortTests() {
  await testPort(3000);
  await testPort(3001);
  await testPort(8080);
  
  console.log('\n🚀 Diagnostic Complete!');
  console.log('If you see any ❌ marks above, those issues need to be resolved.');
  console.log('\nTo start the server manually, run: node app.js');
}

runPortTests().catch(console.error);
