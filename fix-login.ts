import { sqlite } from './db/index.js';
import bcrypt from 'bcryptjs';

console.log('🔧 Creating simple admin user for login...');

try {
  // Create users table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'admin',
      image TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Hash password
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  // Insert admin user directly
  const stmt = sqlite.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, email, role, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run('admin', hashedPassword, 'Administrator', 'admin@pos.local', 'admin', 1);

  console.log('✅ Login ready!');
  console.log('🎯 Use these credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('💰 Your POS system is ready!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

sqlite.close();