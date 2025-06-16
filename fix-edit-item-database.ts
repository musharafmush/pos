
#!/usr/bin/env node

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixEditItemDatabase() {
  try {
    console.log('🔧 Fixing database for edit item functionality...');
    
    const dbPath = join(__dirname, 'pos-data.db');
    const db = new Database(dbPath);
    
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('📋 Current product table columns:', existingColumns);
    
    // Required columns for edit functionality
    const requiredColumns = [
      { name: 'gst_code', sql: 'ALTER TABLE products ADD COLUMN gst_code TEXT DEFAULT ""' },
      { name: 'hsn_code', sql: 'ALTER TABLE products ADD COLUMN hsn_code TEXT DEFAULT ""' },
      { name: 'cgst_rate', sql: 'ALTER TABLE products ADD COLUMN cgst_rate TEXT DEFAULT "0"' },
      { name: 'sgst_rate', sql: 'ALTER TABLE products ADD COLUMN sgst_rate TEXT DEFAULT "0"' },
      { name: 'igst_rate', sql: 'ALTER TABLE products ADD COLUMN igst_rate TEXT DEFAULT "0"' },
      { name: 'cess_rate', sql: 'ALTER TABLE products ADD COLUMN cess_rate TEXT DEFAULT "0"' },
      { name: 'tax_calculation_method', sql: 'ALTER TABLE products ADD COLUMN tax_calculation_method TEXT DEFAULT "exclusive"' },
      { name: 'tax_selection_mode', sql: 'ALTER TABLE products ADD COLUMN tax_selection_mode TEXT DEFAULT "auto"' },
      { name: 'mrp', sql: 'ALTER TABLE products ADD COLUMN mrp TEXT DEFAULT "0"' },
      { name: 'weight', sql: 'ALTER TABLE products ADD COLUMN weight TEXT' },
      { name: 'weight_unit', sql: 'ALTER TABLE products ADD COLUMN weight_unit TEXT DEFAULT "kg"' },
      { name: 'alert_threshold', sql: 'ALTER TABLE products ADD COLUMN alert_threshold INTEGER DEFAULT 5' },
      { name: 'barcode', sql: 'ALTER TABLE products ADD COLUMN barcode TEXT' },
      { name: 'updated_at', sql: 'ALTER TABLE products ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    let addedColumns = 0;
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          db.exec(column.sql);
          console.log(`✅ Added missing column: ${column.name}`);
          addedColumns++;
        } catch (error) {
          console.log(`⚠️ Column ${column.name} may already exist:`, error.message);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Update any null/empty tax values with defaults
    const updateDefaults = [
      { column: 'gst_code', value: 'GST 18%' },
      { column: 'hsn_code', value: '' },
      { column: 'cgst_rate', value: '0' },
      { column: 'sgst_rate', value: '0' },
      { column: 'igst_rate', value: '0' },
      { column: 'cess_rate', value: '0' },
      { column: 'tax_calculation_method', value: 'exclusive' },
      { column: 'tax_selection_mode', value: 'auto' }
    ];
    
    for (const update of updateDefaults) {
      if (existingColumns.includes(update.column)) {
        try {
          const result = db.prepare(`
            UPDATE products 
            SET ${update.column} = ? 
            WHERE ${update.column} IS NULL OR ${update.column} = ''
          `).run(update.value);
          
          if (result.changes > 0) {
            console.log(`🔄 Updated ${result.changes} null/empty values in ${update.column} column`);
          }
        } catch (error) {
          console.log(`⚠️ Could not update ${update.column}:`, error.message);
        }
      }
    }
    
    // Test product update functionality
    const testProduct = db.prepare('SELECT * FROM products LIMIT 1').get();
    if (testProduct) {
      try {
        const updateTest = db.prepare(`
          UPDATE products SET 
            gst_code = ?,
            hsn_code = ?,
            cgst_rate = ?,
            sgst_rate = ?,
            tax_calculation_method = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        updateTest.run('GST 18%', '1234', '9', '9', 'exclusive', testProduct.id);
        console.log('✅ Product update test successful');
      } catch (error) {
        console.error('❌ Product update test failed:', error);
      }
    }
    
    // Final verification
    const finalTableInfo = db.prepare("PRAGMA table_info(products)").all();
    const finalColumns = finalTableInfo.map((col: any) => col.name);
    
    console.log('\n📋 Updated products table columns:', finalColumns);
    console.log(`✅ Added ${addedColumns} missing columns`);
    
    db.close();
    console.log('\n🎉 Edit item database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing edit item database:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixEditItemDatabase().then(() => {
    console.log('✅ Database fix completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  });
}

export default fixEditItemDatabase;
