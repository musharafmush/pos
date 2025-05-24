import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Applying final database fixes...');

try {
  // Check and fix sale_items table
  console.log('Checking sale_items table...');
  const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
  
  if (!saleItemsColumns.includes('unit_price')) {
    console.log('Adding unit_price column to sale_items...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    console.log('✅ Added unit_price column');
  }

  // Update any existing records
  const updateCount = db.prepare("UPDATE sale_items SET unit_price = price WHERE unit_price IS NULL OR unit_price = ''").run();
  console.log(`✅ Updated ${updateCount.changes} sale_items records`);

  // Test the final query that was failing
  console.log('Testing sale_items query...');
  const testQuery = db.prepare(`
    SELECT si.*, p.name as product_name
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    WHERE si.unit_price IS NOT NULL
    LIMIT 1
  `);
  
  const testResult = testQuery.all();
  console.log('✅ Sale_items query working');

  console.log('✅ All database fixes completed successfully!');

} catch (error) {
  console.error('❌ Error in database fix:', error);
} finally {
  db.close();
}