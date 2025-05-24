import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🛠️ Final database repair for complete compatibility...');

try {
  // Check current sale_items table structure
  console.log('📋 Checking sale_items table structure...');
  const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  console.log('Current sale_items columns:', saleItemsInfo.map((col: any) => col.name));

  // Force add unit_price column if missing
  const hasUnitPrice = saleItemsInfo.some((col: any) => col.name === 'unit_price');
  if (!hasUnitPrice) {
    console.log('🔧 Adding unit_price column to sale_items...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    console.log('✅ Added unit_price column');
  }

  // Update all existing records to have unit_price
  const updateStmt = db.prepare("UPDATE sale_items SET unit_price = price WHERE unit_price IS NULL OR unit_price = '0' OR unit_price = ''");
  const result = updateStmt.run();
  console.log(`✅ Updated ${result.changes} sale_items records with unit_price`);

  // Test the exact Drizzle query that's failing
  console.log('🧪 Testing the exact query pattern...');
  
  // Simulate the Drizzle query structure
  const testQuery = db.prepare(`
    SELECT 
      s.id, s.order_number, s.total, s.created_at, s.customer_id, s.user_id,
      si.id as item_id, si.quantity, si.unit_price, si.price, si.total as item_total,
      p.name as product_name
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    ORDER BY s.created_at DESC
    LIMIT 5
  `);
  
  const testResults = testQuery.all();
  console.log(`✅ Test query successful! Found ${testResults.length} records`);

  // Verify all required columns exist
  const verifyStmt = db.prepare("SELECT unit_price FROM sale_items LIMIT 1");
  verifyStmt.get();
  console.log('✅ unit_price column verified working');

  console.log('🎉 Database repair completed successfully!');
  console.log('✅ sale_items.unit_price column is properly configured');
  console.log('✅ All existing records have been updated');
  console.log('✅ Drizzle ORM queries should now work correctly');

} catch (error) {
  console.error('❌ Error during database repair:', error);
} finally {
  db.close();
  console.log('🔐 Database connection closed');
}