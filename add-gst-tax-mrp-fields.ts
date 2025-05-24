import { db } from './db/sqlite-index.js';

async function addGSTTaxMRPFields() {
  try {
    console.log('Adding GST, TAX, and MRP fields to products table...');
    
    // List of new tax-related columns to add
    const taxColumns = [
      { name: 'mrp', sql: 'ALTER TABLE products ADD COLUMN mrp TEXT DEFAULT "0"' },
      { name: 'gst_rate', sql: 'ALTER TABLE products ADD COLUMN gst_rate TEXT DEFAULT "18"' },
      { name: 'hsn_code', sql: 'ALTER TABLE products ADD COLUMN hsn_code TEXT' },
      { name: 'tax_type', sql: 'ALTER TABLE products ADD COLUMN tax_type TEXT DEFAULT "inclusive"' },
      { name: 'cgst_rate', sql: 'ALTER TABLE products ADD COLUMN cgst_rate TEXT DEFAULT "9"' },
      { name: 'sgst_rate', sql: 'ALTER TABLE products ADD COLUMN sgst_rate TEXT DEFAULT "9"' },
      { name: 'igst_rate', sql: 'ALTER TABLE products ADD COLUMN igst_rate TEXT DEFAULT "18"' },
      { name: 'cess_rate', sql: 'ALTER TABLE products ADD COLUMN cess_rate TEXT DEFAULT "0"' },
      { name: 'wholesale_price', sql: 'ALTER TABLE products ADD COLUMN wholesale_price TEXT DEFAULT "0"' },
      { name: 'retail_price', sql: 'ALTER TABLE products ADD COLUMN retail_price TEXT DEFAULT "0"' },
      { name: 'margin_percentage', sql: 'ALTER TABLE products ADD COLUMN margin_percentage TEXT DEFAULT "0"' },
      { name: 'tax_exempted', sql: 'ALTER TABLE products ADD COLUMN tax_exempted INTEGER DEFAULT 0' },
      { name: 'unit_type', sql: 'ALTER TABLE products ADD COLUMN unit_type TEXT DEFAULT "piece"' },
      { name: 'weight', sql: 'ALTER TABLE products ADD COLUMN weight TEXT DEFAULT "0"' },
      { name: 'dimensions', sql: 'ALTER TABLE products ADD COLUMN dimensions TEXT' }
    ];
    
    // Check which columns already exist
    const tableInfo = await db.all("PRAGMA table_info(products)");
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('Existing columns:', existingColumns);
    
    // Add missing columns
    for (const column of taxColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          await db.run(column.sql);
          console.log(`✅ Added column: ${column.name}`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name')) {
            console.log(`Column ${column.name} already exists`);
          } else {
            console.error(`❌ Error adding column ${column.name}:`, error.message);
          }
        }
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }
    
    // Update existing products with default GST calculations
    await db.run(`
      UPDATE products 
      SET 
        mrp = CASE 
          WHEN mrp IS NULL OR mrp = '' THEN 
            CAST((CAST(price AS REAL) * 1.2) AS TEXT)
          ELSE mrp 
        END,
        gst_rate = COALESCE(gst_rate, '18'),
        cgst_rate = COALESCE(cgst_rate, '9'),
        sgst_rate = COALESCE(sgst_rate, '9'),
        igst_rate = COALESCE(igst_rate, '18'),
        tax_type = COALESCE(tax_type, 'inclusive'),
        wholesale_price = CASE 
          WHEN wholesale_price IS NULL OR wholesale_price = '' THEN 
            CAST((CAST(cost AS REAL) * 1.1) AS TEXT)
          ELSE wholesale_price 
        END,
        retail_price = CASE 
          WHEN retail_price IS NULL OR retail_price = '' THEN price
          ELSE retail_price 
        END,
        unit_type = COALESCE(unit_type, 'piece'),
        weight = COALESCE(weight, '0'),
        margin_percentage = CASE 
          WHEN margin_percentage IS NULL OR margin_percentage = '' THEN 
            CAST(((CAST(price AS REAL) - CAST(cost AS REAL)) / CAST(cost AS REAL) * 100) AS TEXT)
          ELSE margin_percentage 
        END
      WHERE id > 0
    `);
    
    console.log('✅ Updated existing products with GST and tax defaults');
    
    // Test the new structure
    const sampleProduct = await db.get("SELECT * FROM products LIMIT 1");
    console.log('Sample product with new fields:', sampleProduct);
    
    console.log('✅ GST, TAX, and MRP fields added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding GST/TAX/MRP fields:', error);
    throw error;
  }
}

addGSTTaxMRPFields().catch(console.error);