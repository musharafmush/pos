import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing database schema...');

try {
  // Check if updated_at column exists in products table
  const productColumns = db.prepare("PRAGMA table_info(products)").all();
  const hasUpdatedAt = productColumns.some((col: any) => col.name === 'updated_at');
  
  if (!hasUpdatedAt) {
    console.log('Adding updated_at column to products table...');
    db.exec('ALTER TABLE products ADD COLUMN updated_at DATETIME');
    db.exec('UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL');
  }

  // Check if tax column exists in sales table
  const salesColumns = db.prepare("PRAGMA table_info(sales)").all();
  const hasTax = salesColumns.some((col: any) => col.name === 'tax');
  
  if (!hasTax) {
    console.log('Adding tax column to sales table...');
    db.exec('ALTER TABLE sales ADD COLUMN tax DECIMAL(10,2) DEFAULT 0');
  }

  console.log('Database schema fixed successfully!');
  
} catch (error) {
  console.error('Error fixing database schema:', error);
} finally {
  db.close();
}