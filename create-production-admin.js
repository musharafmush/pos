
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Creating production admin user...');

try {
  // Check if admin user exists
  const adminUser = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get('admin', 'admin@pos.local');
  
  if (!adminUser) {
    console.log('Creating admin user...');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, email, role, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = insertUser.run('admin', hashedPassword, 'Administrator', 'admin@pos.local', 'admin', 1);
    console.log('✅ Admin user created with ID:', result.lastInsertRowid);
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

  console.log('✅ Production admin setup complete!');
  console.log('Login credentials:');
  console.log('Username: admin');
  console.log('Password: admin123');

} catch (error) {
  console.error('❌ Error creating admin user:', error);
} finally {
  db.close();
}
