
import Database from 'better-sqlite3';
import path from 'path';

async function fixSQLiteError() {
  console.log('🔧 Fixing SQLite database errors...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    console.log('📋 Checking and fixing database schema...');
    
    // Get existing tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    console.log('🗂️ Existing tables:', tableNames);
    
    // Fix products table if it has issues
    if (tableNames.includes('products')) {
      const productCols = db.prepare("PRAGMA table_info(products)").all();
      const colNames = productCols.map(c => c.name);
      
      // Add missing columns that might cause Drizzle issues
      const requiredColumns = [
        { name: 'hsn_code', type: 'TEXT' },
        { name: 'cgst_rate', type: 'TEXT' },
        { name: 'sgst_rate', type: 'TEXT' },
        { name: 'igst_rate', type: 'TEXT' },
        { name: 'cess_rate', type: 'TEXT' },
        { name: 'tax_calculation_method', type: 'TEXT' },
        { name: 'manufacturer_name', type: 'TEXT' },
        { name: 'supplier_name', type: 'TEXT' },
        { name: 'manufacturer_id', type: 'INTEGER' },
        { name: 'supplier_id', type: 'INTEGER' },
        { name: 'gst_code', type: 'TEXT' }
      ];
      
      for (const col of requiredColumns) {
        if (!colNames.includes(col.name)) {
          try {
            db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ Added missing column: products.${col.name}`);
          } catch (error) {
            console.log(`⏭️ Column products.${col.name} might already exist`);
          }
        }
      }
    }
    
    // Fix sale_items table
    if (tableNames.includes('sale_items')) {
      const saleItemsCols = db.prepare("PRAGMA table_info(sale_items)").all();
      const colNames = saleItemsCols.map(c => c.name);
      
      if (!colNames.includes('unit_price')) {
        try {
          db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
          // Update existing records
          db.exec("UPDATE sale_items SET unit_price = price WHERE unit_price = '0' OR unit_price IS NULL");
          console.log('✅ Added and populated sale_items.unit_price');
        } catch (error) {
          console.log('⏭️ sale_items.unit_price might already exist');
        }
      }
      
      if (!colNames.includes('subtotal')) {
        try {
          db.exec("ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT '0'");
          // Update existing records
          db.exec("UPDATE sale_items SET subtotal = total WHERE subtotal = '0' OR subtotal IS NULL");
          console.log('✅ Added and populated sale_items.subtotal');
        } catch (error) {
          console.log('⏭️ sale_items.subtotal might already exist');
        }
      }
    }
    
    // Fix suppliers table
    if (tableNames.includes('suppliers')) {
      const supplierCols = db.prepare("PRAGMA table_info(suppliers)").all();
      const colNames = supplierCols.map(c => c.name);
      
      const supplierColumns = [
        { name: 'tax_id', type: 'TEXT' },
        { name: 'registration_type', type: 'TEXT' },
        { name: 'registration_number', type: 'TEXT' },
        { name: 'mobile_no', type: 'TEXT' },
        { name: 'extension_number', type: 'TEXT' },
        { name: 'fax_no', type: 'TEXT' },
        { name: 'building', type: 'TEXT' },
        { name: 'street', type: 'TEXT' },
        { name: 'city', type: 'TEXT' },
        { name: 'state', type: 'TEXT' },
        { name: 'country', type: 'TEXT' },
        { name: 'pin_code', type: 'TEXT' },
        { name: 'landmark', type: 'TEXT' },
        { name: 'supplier_type', type: 'TEXT' },
        { name: 'credit_days', type: 'TEXT' },
        { name: 'discount_percent', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' }
      ];
      
      for (const col of supplierColumns) {
        if (!colNames.includes(col.name)) {
          try {
            db.exec(`ALTER TABLE suppliers ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ Added missing column: suppliers.${col.name}`);
          } catch (error) {
            console.log(`⏭️ Column suppliers.${col.name} might already exist`);
          }
        }
      }
    }
    
    // Test critical queries that commonly fail
    console.log('🧪 Testing database queries...');
    
    try {
      // Test basic SELECT
      db.prepare("SELECT 1").get();
      console.log('✅ Basic SELECT working');
      
      // Test products query
      db.prepare("SELECT * FROM products LIMIT 1").all();
      console.log('✅ Products query working');
      
      // Test JOIN query
      db.prepare(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LIMIT 1
      `).all();
      console.log('✅ Products JOIN query working');
      
      // Test sales query
      db.prepare("SELECT * FROM sales LIMIT 1").all();
      console.log('✅ Sales query working');
      
    } catch (error) {
      console.error('❌ Query test failed:', error.message);
    }
    
    // Fix any timestamp issues
    console.log('🕐 Fixing timestamp issues...');
    try {
      // Update any NULL timestamps
      if (tableNames.includes('products')) {
        db.exec("UPDATE products SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
        db.exec("UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
      }
      
      if (tableNames.includes('sales')) {
        db.exec("UPDATE sales SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
      }
      
      console.log('✅ Timestamps fixed');
    } catch (error) {
      console.log('⚠️ Timestamp fix had issues:', error.message);
    }
    
    db.close();
    console.log('🎉 SQLite error fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during SQLite fix:', error);
    throw error;
  }
}

fixSQLiteError().catch(console.error);
