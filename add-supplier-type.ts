import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Adding supplier_type column...');

try {
  // Add the missing supplier_type column
  db.exec("ALTER TABLE suppliers ADD COLUMN supplier_type TEXT DEFAULT 'vendor'");
  console.log('✅ Added supplier_type column');

  // Also ensure unit_price exists in sale_items
  try {
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    console.log('✅ Added unit_price column to sale_items');
  } catch (error) {
    console.log('ℹ️ unit_price column already exists in sale_items');
  }

  console.log('✅ All missing columns added successfully!');

} catch (error) {
  console.error('❌ Error adding columns:', error);
} finally {
  db.close();
}