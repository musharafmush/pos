
import { db } from './db/sqlite-index';

async function fixPurchaseItemsSchema() {
  try {
    console.log('🔧 Fixing purchase_items table schema...');
    
    // Get the SQLite database directly
    const { sqlite } = await import('./db/index');
    
    // Check current table structure
    const tableInfo = sqlite.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('Current purchase_items columns:', tableInfo.map((col: any) => col.name));
    
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    // Define all required columns for purchase_items
    const requiredColumns = [
      { name: 'expiry_date', type: 'TEXT', default: 'NULL' },
      { name: 'hsn_code', type: 'TEXT', default: 'NULL' },
      { name: 'tax_percentage', type: 'TEXT', default: '0' },
      { name: 'discount_amount', type: 'TEXT', default: '0' },
      { name: 'discount_percent', type: 'TEXT', default: '0' },
      { name: 'net_cost', type: 'TEXT', default: '0' },
      { name: 'selling_price', type: 'TEXT', default: '0' },
      { name: 'mrp', type: 'TEXT', default: '0' },
      { name: 'batch_number', type: 'TEXT', default: 'NULL' },
      { name: 'location', type: 'TEXT', default: 'NULL' },
      { name: 'unit', type: 'TEXT', default: 'PCS' },
      { name: 'roi_percent', type: 'TEXT', default: '0' },
      { name: 'gross_profit_percent', type: 'TEXT', default: '0' },
      { name: 'net_amount', type: 'TEXT', default: '0' },
      { name: 'cash_percent', type: 'TEXT', default: '0' },
      { name: 'cash_amount', type: 'TEXT', default: '0' },
      { name: 'received_qty', type: 'INTEGER', default: '0' },
      { name: 'free_qty', type: 'INTEGER', default: '0' }
    ];
    
    // Add missing columns
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          const alterSQL = `ALTER TABLE purchase_items ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`;
          console.log(`Adding column: ${alterSQL}`);
          sqlite.prepare(alterSQL).run();
          console.log(`✅ Added column: ${column.name}`);
        } catch (error) {
          console.log(`⚠️  Column ${column.name} might already exist:`, error.message);
        }
      }
    }
    
    // Update any NULL values to defaults
    sqlite.prepare(`
      UPDATE purchase_items SET 
        expiry_date = COALESCE(expiry_date, NULL),
        hsn_code = COALESCE(hsn_code, ''),
        tax_percentage = COALESCE(tax_percentage, '0'),
        discount_amount = COALESCE(discount_amount, '0'),
        discount_percent = COALESCE(discount_percent, '0'),
        net_cost = COALESCE(net_cost, '0'),
        selling_price = COALESCE(selling_price, '0'),
        mrp = COALESCE(mrp, '0'),
        batch_number = COALESCE(batch_number, ''),
        location = COALESCE(location, ''),
        unit = COALESCE(unit, 'PCS'),
        roi_percent = COALESCE(roi_percent, '0'),
        gross_profit_percent = COALESCE(gross_profit_percent, '0'),
        net_amount = COALESCE(net_amount, '0'),
        cash_percent = COALESCE(cash_percent, '0'),
        cash_amount = COALESCE(cash_amount, '0'),
        received_qty = COALESCE(received_qty, quantity),
        free_qty = COALESCE(free_qty, 0)
    `).run();
    
    // Verify the updated table structure
    const updatedTableInfo = sqlite.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('Updated purchase_items columns:', updatedTableInfo.map((col: any) => col.name));
    
    // Test the query that was failing
    try {
      const testQuery = sqlite.prepare(`
        SELECT pi.*, p.name as product_name
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LIMIT 1
      `);
      const testResult = testQuery.get();
      console.log('✅ Test query successful:', testResult ? 'Found data' : 'No data yet');
    } catch (error) {
      console.error('❌ Test query still failing:', error.message);
    }
    
    console.log('🎯 Purchase items schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing purchase items schema:', error);
    throw error;
  }
}

fixPurchaseItemsSchema().catch(console.error);
