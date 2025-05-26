
import { db } from "./db/sqlite-index";

async function fixSalesItemsSchema() {
  try {
    console.log('Fixing sales_items table schema...');
    
    // Check current table structure
    const tableInfo = await db.all("PRAGMA table_info(sale_items)");
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('Existing columns in sale_items:', existingColumns);
    
    // Required columns for sale_items
    const requiredColumns = [
      { name: 'unit_price', sql: 'ALTER TABLE sale_items ADD COLUMN unit_price TEXT NOT NULL DEFAULT "0"' },
      { name: 'subtotal', sql: 'ALTER TABLE sale_items ADD COLUMN subtotal TEXT NOT NULL DEFAULT "0"' },
      { name: 'cost', sql: 'ALTER TABLE sale_items ADD COLUMN cost TEXT DEFAULT "0"' },
      { name: 'margin', sql: 'ALTER TABLE sale_items ADD COLUMN margin TEXT DEFAULT "0"' }
    ];
    
    // Add missing columns
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          await db.run(column.sql);
          console.log(`Added column ${column.name} to sale_items table`);
        } catch (error) {
          console.log(`Column ${column.name} may already exist:`, error.message);
        }
      }
    }
    
    // Update existing records with default values
    await db.run(`
      UPDATE sale_items 
      SET 
        unit_price = COALESCE(unit_price, '0'),
        subtotal = COALESCE(subtotal, '0'),
        cost = COALESCE(cost, '0'),
        margin = COALESCE(margin, '0')
      WHERE unit_price IS NULL OR subtotal IS NULL
    `);
    
    console.log('Updated sale_items with default values');
    
    // Also fix purchase_items table while we're at it
    const purchaseItemsInfo = await db.all("PRAGMA table_info(purchase_items)");
    const purchaseItemsColumns = purchaseItemsInfo.map((col: any) => col.name);
    
    console.log('Existing columns in purchase_items:', purchaseItemsColumns);
    
    const purchaseItemsRequiredColumns = [
      { name: 'cost', sql: 'ALTER TABLE purchase_items ADD COLUMN cost TEXT NOT NULL DEFAULT "0"' },
      { name: 'total', sql: 'ALTER TABLE purchase_items ADD COLUMN total TEXT NOT NULL DEFAULT "0"' },
      { name: 'amount', sql: 'ALTER TABLE purchase_items ADD COLUMN amount TEXT NOT NULL DEFAULT "0"' },
      { name: 'unit_cost', sql: 'ALTER TABLE purchase_items ADD COLUMN unit_cost TEXT DEFAULT "0"' },
      { name: 'subtotal', sql: 'ALTER TABLE purchase_items ADD COLUMN subtotal TEXT DEFAULT "0"' }
    ];
    
    // Add missing columns to purchase_items
    for (const column of purchaseItemsRequiredColumns) {
      if (!purchaseItemsColumns.includes(column.name)) {
        try {
          await db.run(column.sql);
          console.log(`Added column ${column.name} to purchase_items table`);
        } catch (error) {
          console.log(`Column ${column.name} may already exist:`, error.message);
        }
      }
    }
    
    // Update existing purchase_items records
    await db.run(`
      UPDATE purchase_items 
      SET 
        cost = COALESCE(cost, '0'),
        total = COALESCE(total, '0'),
        amount = COALESCE(amount, '0'),
        unit_cost = COALESCE(unit_cost, cost, '0'),
        subtotal = COALESCE(subtotal, total, '0')
      WHERE cost IS NULL OR total IS NULL OR amount IS NULL
    `);
    
    console.log('Updated purchase_items with default values');
    
    console.log('✅ Sales items schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sales items schema:', error);
    throw error;
  }
}

fixSalesItemsSchema().catch(console.error);
