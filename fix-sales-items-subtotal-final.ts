
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'pos-data.db');
const db = new Database(dbPath);

try {
  console.log('🔧 Fixing sale_items table subtotal column...');
  
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  console.log('Current sale_items columns:', tableInfo.map((col: any) => col.name));
  
  // Check if subtotal column exists
  const hasSubtotal = tableInfo.some((col: any) => col.name === 'subtotal');
  
  if (!hasSubtotal) {
    console.log('Adding missing subtotal column...');
    db.exec('ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"');
    
    // Update existing records to calculate subtotal
    db.exec(`
      UPDATE sale_items 
      SET subtotal = CAST((quantity * CAST(unit_price AS REAL)) AS TEXT)
      WHERE subtotal = "0" OR subtotal IS NULL
    `);
    
    console.log('✅ Added subtotal column and updated existing records');
  } else {
    console.log('✅ subtotal column already exists');
  }
  
  // Verify the fix
  const testQuery = db.prepare(`
    SELECT s.id, s.order_number, si.quantity, si.unit_price, si.subtotal
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LIMIT 1
  `);
  
  try {
    testQuery.all();
    console.log('✅ Query test successful - subtotal column is working');
  } catch (error) {
    console.error('❌ Query test failed:', error);
  }
  
  console.log('🎯 Sales items subtotal fix completed!');
  
} catch (error) {
  console.error('❌ Error fixing sales items:', error);
} finally {
  db.close();
}
