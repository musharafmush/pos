
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Fixing sale_items table - adding missing subtotal column...');

try {
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const columns = tableInfo.map((col: any) => col.name);
  
  console.log('📋 Current sale_items columns:', columns);
  
  // Add subtotal column if it doesn't exist
  if (!columns.includes('subtotal')) {
    console.log('➕ Adding subtotal column...');
    db.exec("ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT '0'");
    console.log('✅ Added subtotal column');
    
    // Update existing records to calculate subtotal
    const updateResult = db.prepare(`
      UPDATE sale_items 
      SET subtotal = CAST((quantity * unit_price) AS TEXT)
      WHERE subtotal = '0' OR subtotal IS NULL
    `).run();
    
    console.log(`✅ Updated ${updateResult.changes} records with calculated subtotal`);
  } else {
    console.log('ℹ️ subtotal column already exists');
  }
  
  // Verify the fix by testing the query that was failing
  console.log('🧪 Testing the recent sales query...');
  const testQuery = db.prepare(`
    SELECT 
      s.id,
      s.order_number,
      s.total,
      s.created_at,
      si.quantity,
      si.unit_price,
      si.subtotal
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    ORDER BY s.created_at DESC
    LIMIT 1
  `);
  
  const testResult = testQuery.all();
  console.log('✅ Recent sales query working successfully');
  
  console.log('🎉 Sale items subtotal column fix completed!');
  
} catch (error) {
  console.error('❌ Error fixing sale_items table:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}
