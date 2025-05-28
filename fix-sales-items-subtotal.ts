
import Database from 'better-sqlite3';
import path from 'path';

async function fixSalesItemsSubtotal() {
  console.log('🔧 Fixing sales_items table - adding missing subtotal column...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const columnNames = tableInfo.map((col: any) => col.name);
    console.log('📋 Current sale_items columns:', columnNames);
    
    // Add missing subtotal column if it doesn't exist
    if (!columnNames.includes('subtotal')) {
      console.log('Adding subtotal column to sale_items table...');
      db.exec('ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"');
    }
    
    // Update existing records to calculate subtotal
    console.log('💰 Calculating subtotal for existing sale items...');
    db.prepare(`
      UPDATE sale_items 
      SET subtotal = CAST((quantity * CAST(unit_price AS DECIMAL)) AS TEXT)
      WHERE subtotal IS NULL OR subtotal = '0'
    `).run();
    
    // Verify the fix
    const updatedTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const updatedColumns = updatedTableInfo.map((col: any) => col.name);
    console.log('✅ Updated sale_items columns:', updatedColumns);
    
    // Test query that was failing
    const testQuery = db.prepare(`
      SELECT 
        si.id, si.sale_id, si.product_id, si.quantity, 
        si.unit_price, si.subtotal,
        p.name as product_name,
        s.order_number
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN sales s ON si.sale_id = s.id
      LIMIT 5
    `);
    
    const testResults = testQuery.all();
    console.log('🧪 Test query results:', testResults.length, 'items found');
    
    db.close();
    console.log('✅ Sales items table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sales items table:', error);
    throw error;
  }
}

// Run the fix
fixSalesItemsSubtotal().then(() => {
  console.log('Database fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('Fix failed:', error);
  process.exit(1);
});
