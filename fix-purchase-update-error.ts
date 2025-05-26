
import Database from 'better-sqlite3';

async function fixPurchaseUpdateError() {
  try {
    const db = new Database('./pos-data.db');
    
    console.log('🔧 Fixing purchase update errors...');
    
    // Check current purchases table structure
    const tableInfo = db.prepare("PRAGMA table_info(purchases)").all();
    console.log('Current purchases table columns:', tableInfo.map((col: any) => col.name));
    
    // Add missing columns if they don't exist
    const columnNames = tableInfo.map((col: any) => col.name);
    
    const columnsToAdd = [
      { name: 'updated_at', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
      { name: 'po_no', type: 'TEXT' },
      { name: 'po_date', type: 'TEXT' },
      { name: 'expected_date', type: 'TEXT' },
      { name: 'invoice_no', type: 'TEXT' },
      { name: 'invoice_date', type: 'TEXT' },
      { name: 'invoice_amount', type: 'TEXT DEFAULT "0"' },
      { name: 'payment_method', type: 'TEXT DEFAULT "Cash"' },
      { name: 'payment_type', type: 'TEXT DEFAULT "Credit"' },
      { name: 'remarks', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        try {
          db.exec(`ALTER TABLE purchases ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Added ${column.name} column to purchases table`);
        } catch (error) {
          console.log(`ℹ️ Column ${column.name} might already exist or error:`, error.message);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Test the update operation
    try {
      const testUpdate = db.prepare(`
        UPDATE purchases 
        SET order_number = order_number, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `);
      console.log('✅ Update operation test successful');
    } catch (error) {
      console.log('❌ Update operation test failed:', error.message);
    }
    
    db.close();
    console.log('🎯 Purchase update error fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing purchase update:', error);
  }
}

fixPurchaseUpdateError().catch(console.error);
