import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing user authentication and login...');

try {
  // Check if users table exists and its structure
  const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
  console.log('Users table structure:', userTableInfo);

  // Check existing users
  const existingUsers = db.prepare("SELECT id, username, name, email, role, active FROM users").all();
  console.log('Existing users:', existingUsers);

  // Ensure we have an admin user
  const adminUser = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get('admin', 'admin@pos.local');
  
  if (!adminUser) {
    console.log('Creating admin user...');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, email, role, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = insertUser.run('admin', hashedPassword, 'Administrator', 'admin@pos.local', 'admin', 1);
    console.log('✅ Admin user created:', result);
  } else {
    console.log('✅ Admin user already exists');
    
    // Update password to ensure it's working
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const updateUser = db.prepare(`
      UPDATE users SET password = ?, active = 1 WHERE id = ?
    `);
    updateUser.run(hashedPassword, adminUser.id);
    console.log('✅ Admin password updated');
  }

  // Verify the admin user can be found
  const verifyUser = db.prepare("SELECT id, username, name, email, role, active FROM users WHERE username = ?").get('admin');
  console.log('✅ Admin user verified:', verifyUser);

} catch (error) {
  console.error('❌ Error fixing login:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}