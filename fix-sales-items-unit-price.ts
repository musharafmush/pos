
import { db } from "./db/sqlite-index";

async function fixSalesItemsUnitPrice() {
  try {
    console.log('Fixing sales_items unit_price column...');
    
    // Check if unit_price column exists
    const tableInfo = await db.all("PRAGMA table_info(sale_items)");
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('Existing columns in sale_items:', existingColumns);
    
    if (!existingColumns.includes('unit_price')) {
      try {
        await db.run('ALTER TABLE sale_items ADD COLUMN unit_price TEXT NOT NULL DEFAULT "0"');
        console.log('Added unit_price column to sale_items table');
      } catch (error) {
        console.log('Column unit_price may already exist:', error.message);
      }
    } else {
      console.log('unit_price column already exists in sale_items table');
    }
    
    // Also ensure all required columns exist
    const requiredColumns = [
      { name: 'subtotal', sql: 'ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"' },
      { name: 'cost', sql: 'ALTER TABLE sale_items ADD COLUMN cost TEXT DEFAULT "0"' },
      { name: 'margin', sql: 'ALTER TABLE sale_items ADD COLUMN margin TEXT DEFAULT "0"' }
    ];
    
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
    
    // Update existing records with calculated values
    await db.run(`
      UPDATE sale_items 
      SET 
        unit_price = COALESCE(unit_price, price, '0'),
        subtotal = COALESCE(subtotal, total, '0'),
        cost = COALESCE(cost, '0'),
        margin = COALESCE(margin, '0')
      WHERE unit_price IS NULL OR unit_price = ''
    `);
    
    console.log('✅ sales_items unit_price fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sales_items unit_price:', error);
    throw error;
  }
}

fixSalesItemsUnitPrice().catch(console.error);
