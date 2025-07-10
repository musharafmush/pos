
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building POS system for cPanel hosting...');

try {
  // Clean previous build
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }

  // Build the client (React app)
  console.log('📦 Building client application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Build the server (TypeScript to JavaScript)
  console.log('🔧 Building server application...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist/server', { stdio: 'inherit' });
  execSync('npx esbuild server/routes.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist/server', { stdio: 'inherit' });
  execSync('npx esbuild server/storage.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist/server', { stdio: 'inherit' });

  // Copy necessary files
  console.log('📁 Copying necessary files...');
  
  // Copy database files if they exist
  if (fs.existsSync('pos-data.db')) {
    fs.copyFileSync('pos-data.db', 'dist/pos-data.db');
  }

  // Copy package.json for dependencies
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    main: 'app.js',
    dependencies: {
      'express': packageJson.dependencies.express,
      'better-sqlite3': packageJson.dependencies['better-sqlite3'],
      'bcryptjs': packageJson.dependencies.bcryptjs,
      'express-session': packageJson.dependencies['express-session'],
      'passport': packageJson.dependencies.passport,
      'passport-local': packageJson.dependencies['passport-local'],
      'zod': packageJson.dependencies.zod
    },
    scripts: {
      start: 'node app.js'
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

  console.log('✅ Build completed successfully!');
  console.log('\n📋 Next steps for cPanel hosting:');
  console.log('1. Upload the contents of the "dist" folder to your cPanel public_html directory');
  console.log('2. Upload app.js and .htaccess to the root of public_html');
  console.log('3. Run "npm install" in cPanel terminal or file manager');
  console.log('4. Your POS system will be accessible at your domain');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
