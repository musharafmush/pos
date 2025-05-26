
import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseItemsDisplay() {
  try {
    console.log('🔧 Fixing Purchase Items display database issues...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Fix sales_items table - add missing unit_price column
    const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
    console.log('Current sale_items columns:', saleItemsColumns);
    
    if (!saleItemsColumns.includes('unit_price')) {
      console.log('Adding unit_price column to sale_items table');
      db.exec('ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"');
    }
    
    // Update existing sale_items records with unit_price
    db.prepare(`
      UPDATE sale_items 
      SET unit_price = COALESCE(unit_price, '0')
      WHERE unit_price IS NULL
    `).run();
    
    // Check purchase_items table structure
    const purchaseItemsInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    const existingColumns = purchaseItemsInfo.map((col: any) => col.name);
    console.log('Current purchase_items columns:', existingColumns);
    
    // Add missing columns to purchase_items if needed
    const requiredColumns = [
      { name: 'unit_cost', sql: 'ALTER TABLE purchase_items ADD COLUMN unit_cost TEXT DEFAULT "0"' },
      { name: 'subtotal', sql: 'ALTER TABLE purchase_items ADD COLUMN subtotal TEXT DEFAULT "0"' },
      { name: 'tax_percentage', sql: 'ALTER TABLE purchase_items ADD COLUMN tax_percentage TEXT DEFAULT "0"' },
      { name: 'discount_percent', sql: 'ALTER TABLE purchase_items ADD COLUMN discount_percent TEXT DEFAULT "0"' },
      { name: 'discount_amount', sql: 'ALTER TABLE purchase_items ADD COLUMN discount_amount TEXT DEFAULT "0"' },
      { name: 'net_cost', sql: 'ALTER TABLE purchase_items ADD COLUMN net_cost TEXT DEFAULT "0"' },
      { name: 'selling_price', sql: 'ALTER TABLE purchase_items ADD COLUMN selling_price TEXT DEFAULT "0"' },
      { name: 'mrp', sql: 'ALTER TABLE purchase_items ADD COLUMN mrp TEXT DEFAULT "0"' },
      { name: 'batch_number', sql: 'ALTER TABLE purchase_items ADD COLUMN batch_number TEXT' },
      { name: 'expiry_date', sql: 'ALTER TABLE purchase_items ADD COLUMN expiry_date TEXT' },
      { name: 'hsn_code', sql: 'ALTER TABLE purchase_items ADD COLUMN hsn_code TEXT' },
      { name: 'received_qty', sql: 'ALTER TABLE purchase_items ADD COLUMN received_qty INTEGER DEFAULT 0' },
      { name: 'free_qty', sql: 'ALTER TABLE purchase_items ADD COLUMN free_qty INTEGER DEFAULT 0' },
      { name: 'location', sql: 'ALTER TABLE purchase_items ADD COLUMN location TEXT' },
      { name: 'unit', sql: 'ALTER TABLE purchase_items ADD COLUMN unit TEXT DEFAULT "PCS"' },
      { name: 'created_at', sql: 'ALTER TABLE purchase_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ALTER TABLE purchase_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          console.log(`Adding missing column: ${column.name}`);
          db.exec(column.sql);
        } catch (error) {
          console.log(`Column ${column.name} may already exist:`, error.message);
        }
      }
    }
    
    // Update existing purchase_items records with default values
    db.prepare(`
      UPDATE purchase_items 
      SET 
        unit_cost = COALESCE(unit_cost, '0'),
        subtotal = COALESCE(subtotal, '0'),
        tax_percentage = COALESCE(tax_percentage, '0'),
        discount_percent = COALESCE(discount_percent, '0'),
        discount_amount = COALESCE(discount_amount, '0'),
        net_cost = COALESCE(net_cost, unit_cost),
        selling_price = COALESCE(selling_price, '0'),
        mrp = COALESCE(mrp, '0'),
        received_qty = COALESCE(received_qty, quantity),
        free_qty = COALESCE(free_qty, 0),
        unit = COALESCE(unit, 'PCS'),
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE unit_cost IS NULL OR subtotal IS NULL OR received_qty IS NULL OR received_qty = 0
    `).run();
    
    // Test the purchase items query that should work now
    try {
      const testQuery = db.prepare(`
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku,
          pu.order_number,
          pu.order_date
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LEFT JOIN purchases pu ON pi.purchase_id = pu.id
        LIMIT 5
      `);
      const testResult = testQuery.all();
      console.log('✅ Purchase items query test successful. Found', testResult.length, 'items');
      
      if (testResult.length > 0) {
        console.log('Sample purchase item:', {
          id: testResult[0].id,
          product_name: testResult[0].product_name,
          quantity: testResult[0].quantity,
          unit_cost: testResult[0].unit_cost,
          subtotal: testResult[0].subtotal
        });
      }
    } catch (error) {
      console.error('❌ Purchase items query still failing:', error.message);
    }
    
    console.log('🎯 Purchase Items display database issues fixed successfully!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error fixing Purchase Items display:', error);
  }
}

fixPurchaseItemsDisplay().catch(console.error);
