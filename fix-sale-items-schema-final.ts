import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

async function fixSaleItemsSchemaFinal() {
  console.log('🔧 Starting final sale_items schema repair...');
  
  const sqlite = new Database('pos-data.db');
  const db = drizzle(sqlite);
  
  try {
    // Check current schema
    console.log('📋 Checking current sale_items table schema...');
    const tableInfo = sqlite.prepare("PRAGMA table_info(sale_items)").all();
    console.log('Current columns:', tableInfo.map((col: any) => col.name));
    
    // Create backup of existing data
    console.log('💾 Creating backup of sale_items data...');
    const existingData = sqlite.prepare("SELECT * FROM sale_items").all();
    console.log(`Found ${existingData.length} existing sale items`);
    
    // Drop and recreate table with correct schema
    console.log('🗑️ Dropping existing sale_items table...');
    sqlite.exec('DROP TABLE IF EXISTS sale_items');
    
    // Create new sale_items table with all required columns
    console.log('🏗️ Creating new sale_items table with complete schema...');
    sqlite.exec(`
      CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price TEXT NOT NULL DEFAULT '0',
        subtotal TEXT NOT NULL DEFAULT '0',
        discount TEXT DEFAULT '0',
        tax TEXT DEFAULT '0',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    
    // Restore existing data with proper column mapping
    if (existingData.length > 0) {
      console.log('📥 Restoring existing data with proper schema...');
      const insertStmt = sqlite.prepare(`
        INSERT INTO sale_items (
          id, sale_id, product_id, quantity, unit_price, subtotal, 
          discount, tax, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of existingData) {
        insertStmt.run(
          item.id,
          item.sale_id,
          item.product_id,
          item.quantity || 1,
          item.unit_price || item.unitPrice || '0',
          item.subtotal || (parseFloat(item.unit_price || item.unitPrice || '0') * (item.quantity || 1)).toString(),
          item.discount || '0',
          item.tax || '0',
          item.created_at || item.createdAt || new Date().toISOString(),
          item.updated_at || item.updatedAt || new Date().toISOString()
        );
      }
      console.log(`✅ Restored ${existingData.length} sale items`);
    }
    
    // Verify the new schema
    console.log('🔍 Verifying new schema...');
    const newTableInfo = sqlite.prepare("PRAGMA table_info(sale_items)").all();
    console.log('New columns:', newTableInfo.map((col: any) => col.name));
    
    // Test query to ensure everything works
    const testQuery = sqlite.prepare(`
      SELECT si.*, p.name as product_name 
      FROM sale_items si 
      LEFT JOIN products p ON si.product_id = p.id 
      LIMIT 1
    `);
    const testResult = testQuery.all();
    console.log('✅ Schema test successful, found', testResult.length, 'items');
    
    console.log('🎉 Sale items schema repair completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during schema repair:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// Run the repair
fixSaleItemsSchemaFinal().catch(console.error);