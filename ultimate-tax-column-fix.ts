
import Database from 'better-sqlite3';
import path from 'path';

async function ultimateTaxColumnFix() {
  try {
    console.log('🔧 Starting ultimate fix for all missing columns...');
    
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
    
    // Define all required columns
    const requiredColumns = [
      { name: 'tax_selection_mode', type: 'TEXT', default: "'auto'" },
      { name: 'hsn_code', type: 'TEXT', default: "NULL" },
      { name: 'gst_code', type: 'TEXT', default: "NULL" },
      { name: 'cgst_rate', type: 'TEXT', default: "'0'" },
      { name: 'sgst_rate', type: 'TEXT', default: "'0'" },
      { name: 'igst_rate', type: 'TEXT', default: "'0'" },
      { name: 'cess_rate', type: 'TEXT', default: "'0'" },
      { name: 'tax_calculation_method', type: 'TEXT', default: "'exclusive'" }
    ];
    
    // Add missing columns
    let addedColumns = 0;
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding ${column.name} column...`);
        try {
          db.exec(`
            ALTER TABLE products 
            ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}
          `);
          console.log(`✅ Added ${column.name} column successfully`);
          addedColumns++;
        } catch (alterError) {
          console.error(`❌ Error adding ${column.name} column:`, alterError);
        }
      } else {
        console.log(`ℹ️ ${column.name} column already exists`);
      }
    }
    
    // Update existing records with default values
    if (addedColumns > 0) {
      console.log('🔄 Updating existing records with default values...');
      
      const updateQueries = [
        "UPDATE products SET tax_selection_mode = 'auto' WHERE tax_selection_mode IS NULL",
        "UPDATE products SET cgst_rate = '0' WHERE cgst_rate IS NULL",
        "UPDATE products SET sgst_rate = '0' WHERE sgst_rate IS NULL", 
        "UPDATE products SET igst_rate = '0' WHERE igst_rate IS NULL",
        "UPDATE products SET cess_rate = '0' WHERE cess_rate IS NULL",
        "UPDATE products SET tax_calculation_method = 'exclusive' WHERE tax_calculation_method IS NULL"
      ];
      
      for (const query of updateQueries) {
        try {
          const result = db.prepare(query).run();
          console.log(`✅ Updated ${result.changes} records`);
        } catch (updateError) {
          console.error('❌ Update error:', updateError);
        }
      }
    }
    
    // Verify all columns exist
    const updatedInfo = db.prepare("PRAGMA table_info(products)").all();
    const updatedColumns = updatedInfo.map((col: any) => col.name);
    
    console.log('📋 Updated products table columns:', updatedColumns);
    
    // Test critical queries
    console.log('🧪 Testing critical queries...');
    
    try {
      // Test 1: Basic product query with tax_selection_mode
      const basicQuery = db.prepare(`
        SELECT 
          id, 
          name, 
          tax_selection_mode,
          stock_quantity,
          alert_threshold
        FROM products 
        LIMIT 1
      `);
      
      const basicResult = basicQuery.get();
      console.log('✅ Basic product query working');
      
      // Test 2: Low stock products query
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
      
      const lowStockResults = lowStockQuery.all();
      console.log(`✅ Low stock products query working (found ${lowStockResults.length} results)`);
      
      // Test 3: Product by ID query (the one that was failing)
      const productByIdQuery = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
        LIMIT 1
      `);
      
      const productResult = productByIdQuery.get(1);
      console.log('✅ Product by ID query working');
      
      // Test 4: Dashboard stats query
      const statsQuery = db.prepare(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN stock_quantity <= alert_threshold THEN 1 ELSE 0 END) as low_stock_count,
          AVG(CAST(price AS DECIMAL)) as avg_price
        FROM products
        WHERE active = 1
      `);
      
      const statsResult = statsQuery.get();
      console.log('✅ Dashboard stats query working');
      
    } catch (queryError) {
      console.error('❌ Test query failed:', queryError);
      throw queryError;
    }
    
    db.close();
    console.log('🎉 Ultimate tax column fix completed successfully!');
    console.log(`📊 Added ${addedColumns} missing columns`);
    
  } catch (error) {
    console.error('❌ Ultimate fix failed:', error);
    throw error;
  }
}

// Run the ultimate fix
ultimateTaxColumnFix().then(() => {
  console.log('✅ Ultimate fix completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Ultimate fix failed:', error);
  process.exit(1);
});
