import { db } from './db/sqlite-index.js';

async function fixPurchaseManagement() {
  try {
    console.log('Fixing purchase management issues...');
    
    // Check if purchases table exists and has all required columns
    const purchases = await db.run(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='purchases'
    `);
    
    console.log('Current purchases table schema:', purchases);
    
    // Fix sales_items table - add unit_price column if missing
    try {
      await db.run(`
        ALTER TABLE sale_items 
        ADD COLUMN unit_price TEXT DEFAULT '0'
      `);
      console.log('Added unit_price column to sale_items table');
    } catch (error) {
      console.log('unit_price column may already exist in sale_items:', error.message);
    }
    
    // Verify purchases table has all required columns
    const requiredColumns = [
      'id', 'supplier_id', 'user_id', 'order_number', 'order_date', 
      'expected_date', 'status', 'sub_total', 'freight_cost', 
      'other_charges', 'discount_amount', 'total_amount', 
      'notes', 'received_date', 'created_at'
    ];
    
    // Check table info
    const tableInfo = await db.all("PRAGMA table_info(purchases)");
    console.log('Purchases table columns:', tableInfo.map(col => col.name));
    
    // Check if we need to add any missing columns
    const existingColumns = tableInfo.map(col => col.name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('Missing columns in purchases table:', missingColumns);
      
      for (const column of missingColumns) {
        let columnDef = '';
        switch (column) {
          case 'order_number':
            columnDef = 'TEXT NOT NULL DEFAULT ""';
            break;
          case 'order_date':
          case 'expected_date':
          case 'received_date':
          case 'created_at':
            columnDef = 'TEXT';
            break;
          case 'status':
            columnDef = 'TEXT NOT NULL DEFAULT "pending"';
            break;
          case 'sub_total':
          case 'freight_cost':
          case 'other_charges':
          case 'discount_amount':
          case 'total_amount':
            columnDef = 'TEXT NOT NULL DEFAULT "0"';
            break;
          case 'notes':
            columnDef = 'TEXT';
            break;
          default:
            columnDef = 'TEXT';
        }
        
        try {
          await db.run(`ALTER TABLE purchases ADD COLUMN ${column} ${columnDef}`);
          console.log(`Added column ${column} to purchases table`);
        } catch (error) {
          console.log(`Column ${column} may already exist:`, error.message);
        }
      }
    }
    
    // Update any purchases that might have NULL values in required fields
    await db.run(`
      UPDATE purchases 
      SET 
        order_number = COALESCE(order_number, 'PO-' || id),
        status = COALESCE(status, 'pending'),
        sub_total = COALESCE(sub_total, '0'),
        freight_cost = COALESCE(freight_cost, '0'),
        other_charges = COALESCE(other_charges, '0'),
        discount_amount = COALESCE(discount_amount, '0'),
        total_amount = COALESCE(total_amount, '0'),
        order_date = COALESCE(order_date, created_at),
        expected_date = COALESCE(expected_date, created_at)
      WHERE order_number IS NULL OR status IS NULL
    `);
    
    console.log('Updated purchases with default values');
    
    // Update sale_items to have unit_price where missing
    await db.run(`
      UPDATE sale_items 
      SET unit_price = COALESCE(unit_price, '0')
      WHERE unit_price IS NULL
    `);
    
    console.log('Updated sale_items with default unit_price values');
    
    console.log('✅ Purchase management fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing purchase management:', error);
    throw error;
  }
}

fixPurchaseManagement().catch(console.error);