import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing sale_items table...');

try {
  // Check if unit_price column exists
  const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  if (!columnNames.includes('unit_price')) {
    console.log('Adding unit_price column to sale_items...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    
    // Update existing records to use price as unit_price
    db.exec("UPDATE sale_items SET unit_price = price WHERE unit_price = '0' OR unit_price IS NULL");
    console.log('✅ Added unit_price column and updated existing records');
  } else {
    console.log('✅ unit_price column already exists');
  }

  console.log('✅ Sale_items table fixed!');

} catch (error) {
  console.error('❌ Error fixing sale_items:', error);
} finally {
  db.close();
}