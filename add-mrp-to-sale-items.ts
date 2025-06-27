import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

async function addMrpToSaleItems() {
  try {
    console.log('🔧 Adding MRP column to sale_items table...');
    
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('📋 Existing columns in sale_items:', existingColumns);
    
    // Add MRP column if it doesn't exist
    if (!existingColumns.includes('mrp')) {
      try {
        db.exec('ALTER TABLE sale_items ADD COLUMN mrp TEXT DEFAULT "0"');
        console.log('✅ Added MRP column to sale_items table');
      } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
          console.log('ℹ️ MRP column already exists');
        } else {
          console.error('❌ Error adding MRP column:', error.message);
          throw error;
        }
      }
    } else {
      console.log('ℹ️ MRP column already exists');
    }
    
    // Verify the column was added
    const updatedTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const updatedColumns = updatedTableInfo.map((col: any) => col.name);
    console.log('📋 Updated sale_items columns:', updatedColumns);
    
    // Test query to ensure MRP column works
    const testQuery = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sale_items 
      WHERE mrp IS NOT NULL
    `);
    const testResult = testQuery.get() as { count: number };
    console.log(`🧪 Test query results: ${testResult.count} items with MRP data`);
    
    console.log('✅ MRP column migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding MRP column to sale_items:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the migration
addMrpToSaleItems().catch(console.error);