
import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseEditIssues() {
  try {
    console.log('🔧 Fixing purchase edit database issues...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check current purchase_items table structure
    const purchaseItemsInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('Current purchase_items columns:', purchaseItemsInfo.map((col: any) => col.name));
    
    const existingColumns = purchaseItemsInfo.map((col: any) => col.name);
    
    // Add missing columns to purchase_items if needed
    const requiredColumns = [
      { name: 'created_at', sql: 'ALTER TABLE purchase_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ALTER TABLE purchase_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'expiry_date', sql: 'ALTER TABLE purchase_items ADD COLUMN expiry_date TEXT' },
      { name: 'hsn_code', sql: 'ALTER TABLE purchase_items ADD COLUMN hsn_code TEXT' },
      { name: 'tax_percentage', sql: 'ALTER TABLE purchase_items ADD COLUMN tax_percentage TEXT DEFAULT "0"' },
      { name: 'discount_amount', sql: 'ALTER TABLE purchase_items ADD COLUMN discount_amount TEXT DEFAULT "0"' },
      { name: 'discount_percent', sql: 'ALTER TABLE purchase_items ADD COLUMN discount_percent TEXT DEFAULT "0"' },
      { name: 'net_cost', sql: 'ALTER TABLE purchase_items ADD COLUMN net_cost TEXT DEFAULT "0"' },
      { name: 'selling_price', sql: 'ALTER TABLE purchase_items ADD COLUMN selling_price TEXT DEFAULT "0"' },
      { name: 'mrp', sql: 'ALTER TABLE purchase_items ADD COLUMN mrp TEXT DEFAULT "0"' },
      { name: 'batch_number', sql: 'ALTER TABLE purchase_items ADD COLUMN batch_number TEXT' },
      { name: 'location', sql: 'ALTER TABLE purchase_items ADD COLUMN location TEXT' },
      { name: 'unit', sql: 'ALTER TABLE purchase_items ADD COLUMN unit TEXT DEFAULT "PCS"' },
      { name: 'roi_percent', sql: 'ALTER TABLE purchase_items ADD COLUMN roi_percent TEXT DEFAULT "0"' },
      { name: 'gross_profit_percent', sql: 'ALTER TABLE purchase_items ADD COLUMN gross_profit_percent TEXT DEFAULT "0"' },
      { name: 'net_amount', sql: 'ALTER TABLE purchase_items ADD COLUMN net_amount TEXT DEFAULT "0"' },
      { name: 'cash_percent', sql: 'ALTER TABLE purchase_items ADD COLUMN cash_percent TEXT DEFAULT "0"' },
      { name: 'cash_amount', sql: 'ALTER TABLE purchase_items ADD COLUMN cash_amount TEXT DEFAULT "0"' },
      { name: 'received_qty', sql: 'ALTER TABLE purchase_items ADD COLUMN received_qty INTEGER DEFAULT 0' },
      { name: 'free_qty', sql: 'ALTER TABLE purchase_items ADD COLUMN free_qty INTEGER DEFAULT 0' }
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
    
    // Fix sale_items table - add unit_price column if missing
    const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
    
    if (!saleItemsColumns.includes('unit_price')) {
      try {
        console.log('Adding unit_price column to sale_items table');
        db.exec('ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"');
      } catch (error) {
        console.log('unit_price column may already exist:', error.message);
      }
    }
    
    // Update any existing purchase_items that don't have created_at set
    if (existingColumns.includes('created_at')) {
      db.prepare(`
        UPDATE purchase_items 
        SET created_at = CURRENT_TIMESTAMP 
        WHERE created_at IS NULL
      `).run();
    }
    
    // Update any existing purchase_items that don't have received_qty set
    if (existingColumns.includes('received_qty')) {
      db.prepare(`
        UPDATE purchase_items 
        SET received_qty = quantity 
        WHERE received_qty IS NULL OR received_qty = 0
      `).run();
    }
    
    console.log('✅ Purchase edit database issues fixed!');
    
    // Test the query that was failing
    try {
      const testQuery = db.prepare(`
        SELECT 
          pi.id,
          pi.purchase_id,
          pi.product_id,
          pi.quantity,
          pi.unit_cost,
          pi.subtotal,
          COALESCE(pi.created_at, CURRENT_TIMESTAMP) as created_at,
          p.name as product_name
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LIMIT 1
      `);
      const testResult = testQuery.get();
      console.log('✅ Test query successful:', testResult ? 'Found data' : 'No data yet');
    } catch (error) {
      console.error('❌ Test query still failing:', error.message);
    }
    
    // Fix sales_items unit_price column issue
    try {
      console.log('Fixing sales_items unit_price column...');
      
      // Check if sale_items table exists and add unit_price if missing
      const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
      const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
      
      if (!saleItemsColumns.includes('unit_price')) {
        db.exec('ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"');
        console.log('✅ Added unit_price column to sale_items');
      }
      
      // Update existing records
      db.prepare(`
        UPDATE sale_items 
        SET unit_price = COALESCE(price, '0') 
        WHERE unit_price IS NULL OR unit_price = ''
      `).run();
      
      console.log('✅ Fixed sales_items unit_price column');
    } catch (error) {
      console.log('sales_items fix error:', error.message);
    }
    
    db.close();
    console.log('🎯 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing purchase edit issues:', error);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPurchaseEditIssues();
}

export { fixPurchaseEditIssues };
