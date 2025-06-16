
import Database from 'better-sqlite3';
import path from 'path';

async function fixTaxDatabaseComplete() {
  try {
    console.log('🔧 Starting comprehensive tax database fix...');
    
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    console.log('📁 Database path:', dbPath);
    
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    
    // Check if products table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='products'
    `).get();
    
    if (!tableExists) {
      console.log('❌ Products table does not exist');
      return;
    }
    
    // Get current table structure
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('📋 Current products table columns:', existingColumns);
    
    // Define all required tax columns
    const requiredTaxColumns = [
      { name: 'gst_code', type: 'TEXT', default: '' },
      { name: 'hsn_code', type: 'TEXT', default: '' },
      { name: 'cgst_rate', type: 'TEXT', default: '0' },
      { name: 'sgst_rate', type: 'TEXT', default: '0' },
      { name: 'igst_rate', type: 'TEXT', default: '0' },
      { name: 'cess_rate', type: 'TEXT', default: '0' },
      { name: 'tax_calculation_method', type: 'TEXT', default: 'exclusive' },
      { name: 'tax_selection_mode', type: 'TEXT', default: 'auto' }
    ];
    
    // Add missing columns
    let addedColumns = 0;
    for (const column of requiredTaxColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding ${column.name} column...`);
        
        try {
          db.prepare(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type} DEFAULT '${column.default}'`).run();
          
          // Update existing records with default value
          const updateResult = db.prepare(`UPDATE products SET ${column.name} = '${column.default}' WHERE ${column.name} IS NULL`).run();
          
          console.log(`✅ Added ${column.name} column and updated ${updateResult.changes} records`);
          addedColumns++;
        } catch (error: any) {
          console.error(`❌ Error adding ${column.name} column:`, error.message);
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
        
        // Ensure existing null values are updated to defaults
        try {
          const updateResult = db.prepare(`UPDATE products SET ${column.name} = '${column.default}' WHERE ${column.name} IS NULL OR ${column.name} = ''`).run();
          if (updateResult.changes > 0) {
            console.log(`🔄 Updated ${updateResult.changes} null/empty values in ${column.name} column`);
          }
        } catch (error: any) {
          console.log(`⚠️ Could not update ${column.name} defaults:`, error.message);
        }
      }
    }
    
    // Verify all columns are present
    const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
    const updatedColumns = updatedTableInfo.map((col: any) => col.name);
    
    console.log('\n📋 Updated products table columns:', updatedColumns);
    
    // Test queries to ensure everything works
    console.log('\n🧪 Testing database operations...');
    
    try {
      // Test 1: Basic product query with tax fields
      const productQuery = db.prepare(`
        SELECT 
          id, name, price, gst_code, hsn_code, cgst_rate, sgst_rate, 
          igst_rate, cess_rate, tax_calculation_method, tax_selection_mode
        FROM products 
        LIMIT 1
      `);
      
      const productResult = productQuery.get();
      console.log('✅ Product query with tax fields working');
      
      // Test 2: Low stock products query (this was failing before)
      const lowStockQuery = db.prepare(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock_quantity,
          p.alert_threshold,
          p.tax_selection_mode,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.alert_threshold
        ORDER BY p.stock_quantity ASC
        LIMIT 5
      `);
      
      const lowStockResult = lowStockQuery.all();
      console.log(`✅ Low stock query working (found ${lowStockResult.length} items)`);
      
      // Test 3: Product by ID query
      const productByIdQuery = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
        LIMIT 1
      `);
      
      const productResult2 = productByIdQuery.get(1);
      console.log('✅ Product by ID query working');
      
      // Test 4: Update product with tax fields
      if (productResult2) {
        const updateTestQuery = db.prepare(`
          UPDATE products SET 
            gst_code = ?,
            hsn_code = ?,
            cgst_rate = ?,
            sgst_rate = ?,
            tax_selection_mode = ?
          WHERE id = ?
        `);
        
        const updateResult = updateTestQuery.run(
          'GST 18%',
          '1234',
          '9',
          '9',
          'manual',
          productResult2.id
        );
        
        console.log(`✅ Product update with tax fields working (${updateResult.changes} rows updated)`);
      }
      
    } catch (queryError) {
      console.error('❌ Test query failed:', queryError);
      throw queryError;
    }
    
    db.close();
    console.log('\n🎉 Comprehensive tax database fix completed successfully!');
    console.log(`📊 Added ${addedColumns} missing columns`);
    
  } catch (error) {
    console.error('❌ Tax database fix failed:', error);
    throw error;
  }
}

// Run the fix
fixTaxDatabaseComplete().then(() => {
  console.log('✅ Tax database fix completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Tax database fix failed:', error);
  process.exit(1);
});
