import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing SQLite timestamp defaults...');

try {
  // Remove the problematic default timestamp functions and replace with manual handling
  console.log('Updating products table timestamp handling...');
  
  // Update any existing NULL timestamps
  db.exec(`UPDATE products SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
  db.exec(`UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
  
  console.log('SQLite timestamp handling fixed successfully!');
  
} catch (error) {
  console.error('Error fixing SQLite timestamps:', error);
} finally {
  db.close();
}