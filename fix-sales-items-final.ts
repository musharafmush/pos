import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing sales_items table unit_price column...');

try {
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  console.log('Current sale_items structure:', tableInfo);
  
  const columnNames = tableInfo.map((col: any) => col.name);
  
  if (!columnNames.includes('unit_price')) {
    console.log('Adding unit_price column...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    console.log('✅ Added unit_price column');
  } else {
    console.log('✅ unit_price column already exists');
  }

  // Ensure all records have unit_price values
  const updateResult = db.prepare(`
    UPDATE sale_items 
    SET unit_price = COALESCE(price, '0') 
    WHERE unit_price IS NULL OR unit_price = '' OR unit_price = '0'
  `).run();
  
  console.log(`✅ Updated ${updateResult.changes} records with unit_price values`);

  // Test the exact query that's failing
  console.log('Testing the exact query that was failing...');
  const testQuery = db.prepare(`
    SELECT s.*, si.product_id, si.quantity, si.unit_price, si.price, si.total,
           p.name as product_name
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.id IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT 1
  `);
  
  const result = testQuery.all();
  console.log('✅ Sales query working, found', result.length, 'records');

  console.log('✅ Sales_items table completely fixed!');

} catch (error) {
  console.error('❌ Error fixing sales_items:', error);
} finally {
  db.close();
}