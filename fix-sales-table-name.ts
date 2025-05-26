
import { db } from "./db/sqlite-index";

async function fixSalesTableName() {
  try {
    console.log('Checking sales table structure...');
    
    // Check which table exists
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%sale%'");
    console.log('Sales-related tables found:', tables);
    
    // Check sale_items table structure (singular)
    try {
      const saleItemsInfo = await db.all("PRAGMA table_info(sale_items)");
      const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
      console.log('sale_items columns:', saleItemsColumns);
      
      // Add missing columns to sale_items if needed
      const requiredColumns = [
        { name: 'unit_price', sql: 'ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"' },
        { name: 'subtotal', sql: 'ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"' },
        { name: 'cost', sql: 'ALTER TABLE sale_items ADD COLUMN cost TEXT DEFAULT "0"' },
        { name: 'margin', sql: 'ALTER TABLE sale_items ADD COLUMN margin TEXT DEFAULT "0"' }
      ];
      
      for (const column of requiredColumns) {
        if (!saleItemsColumns.includes(column.name)) {
          try {
            await db.run(column.sql);
            console.log(`Added column ${column.name} to sale_items table`);
          } catch (error) {
            console.log(`Column ${column.name} may already exist:`, error.message);
          }
        }
      }
      
      // Update existing records
      await db.run(`
        UPDATE sale_items 
        SET 
          unit_price = COALESCE(unit_price, price, '0'),
          subtotal = COALESCE(subtotal, total, '0'),
          cost = COALESCE(cost, '0'),
          margin = COALESCE(margin, '0')
        WHERE unit_price IS NULL OR unit_price = ''
      `);
      
    } catch (error) {
      console.log('sale_items table does not exist:', error.message);
    }
    
    // Check if sales_items table exists (plural)
    try {
      const salesItemsInfo = await db.all("PRAGMA table_info(sales_items)");
      console.log('sales_items table exists');
    } catch (error) {
      console.log('sales_items table does not exist, creating alias view...');
      
      // Create a view to map sale_items to sales_items for compatibility
      try {
        await db.run('DROP VIEW IF EXISTS sales_items');
        await db.run(`
          CREATE VIEW sales_items AS 
          SELECT 
            id,
            sale_id,
            product_id,
            quantity,
            price,
            total,
            subtotal,
            unit_price,
            cost,
            margin
          FROM sale_items
        `);
        console.log('Created sales_items view for compatibility');
      } catch (viewError) {
        console.log('Error creating view:', viewError.message);
      }
    }
    
    console.log('✅ Sales table structure fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing sales table structure:', error);
    throw error;
  }
}

fixSalesTableName().catch(console.error);
