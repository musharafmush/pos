import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Adding wholesale_price column to products table...');

try {
  // Check current table structure
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const existingColumns = tableInfo.map((col: any) => col.name);
  
  console.log('📋 Existing columns in products table:', existingColumns);
  
  // Add wholesale_price column if it doesn't exist
  if (!existingColumns.includes('wholesale_price')) {
    try {
      db.exec('ALTER TABLE products ADD COLUMN wholesale_price TEXT DEFAULT NULL');
      console.log('✅ Added wholesale_price column to products table');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ wholesale_price column already exists');
      } else {
        console.error('❌ Error adding wholesale_price column:', error.message);
        throw error;
      }
    }
  } else {
    console.log('ℹ️ wholesale_price column already exists');
  }
  
  // Verify the column was added
  const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
  const updatedColumns = updatedTableInfo.map((col: any) => col.name);
  console.log('📋 Updated products columns:', updatedColumns);
  
  // Test query to ensure wholesale_price column works
  const testQuery = db.prepare(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE wholesale_price IS NOT NULL
  `);
  const testResult = testQuery.get() as { count: number };
  console.log(`🧪 Test query results: ${testResult.count} products with wholesale price data`);
  
  console.log('✅ Wholesale price column migration completed successfully!');
  
} catch (error) {
  console.error('❌ Error adding wholesale_price column to products:', error);
  throw error;
} finally {
  db.close();
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running wholesale price migration...');
}