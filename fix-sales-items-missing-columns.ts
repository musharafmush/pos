
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Fixing sales_items table - adding missing columns...');

try {
  // Check current columns
  const columnsResult = db.prepare("PRAGMA table_info(sale_items)").all();
  const existingColumns = columnsResult.map((col: any) => col.name);
  console.log('📋 Current sale_items columns:', existingColumns);

  // Add missing columns one by one
  const columnsToAdd = [
    { name: 'subtotal', sql: 'ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"' },
    { name: 'unit_price', sql: 'ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"' }
  ];

  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column.name)) {
      try {
        db.exec(column.sql);
        console.log(`✅ Added ${column.name} column`);
      } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
          console.log(`ℹ️ ${column.name} column already exists`);
        } else {
          console.error(`❌ Error adding ${column.name}:`, error.message);
        }
      }
    } else {
      console.log(`ℹ️ ${column.name} column already exists`);
    }
  }

  // Update existing sale_items to have proper subtotal values
  console.log('💰 Calculating subtotal for existing sale items...');
  db.exec(`
    UPDATE sale_items 
    SET subtotal = CAST((quantity * unit_price) AS TEXT)
    WHERE subtotal IS NULL OR subtotal = '' OR subtotal = '0'
  `);

  // Update unit_price from unitPrice if it exists
  try {
    db.exec(`
      UPDATE sale_items 
      SET unit_price = unitPrice
      WHERE unit_price IS NULL OR unit_price = '' OR unit_price = '0'
    `);
  } catch (error) {
    console.log('ℹ️ unitPrice column may not exist, skipping update');
  }

  // Verify the fix
  const updatedColumns = db.prepare("PRAGMA table_info(sale_items)").all();
  console.log('✅ Updated sale_items columns:', updatedColumns.map((col: any) => col.name));

  // Test query
  const testQuery = db.prepare(`
    SELECT COUNT(*) as count 
    FROM sale_items 
    WHERE subtotal IS NOT NULL
  `);
  const testResult = testQuery.get() as { count: number };
  console.log(`🧪 Test query results: ${testResult.count} items found`);

  console.log('✅ Sales items table fixed successfully!');

} catch (error) {
  console.error('❌ Error fixing sales_items table:', error);
} finally {
  db.close();
  console.log('Database fix completed');
}
