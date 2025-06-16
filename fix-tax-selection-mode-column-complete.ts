
import Database from 'better-sqlite3';
import path from 'path';

async function fixTaxSelectionModeColumnComplete() {
  try {
    console.log('🔧 Starting complete fix for tax_selection_mode column...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    console.log('📁 Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Enable foreign keys
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
    
    // Check current products table structure
    const productsInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = productsInfo.map((col: any) => col.name);
    
    console.log('📋 Current products table columns:', existingColumns);
    
    // Add tax_selection_mode column if it doesn't exist
    if (!existingColumns.includes('tax_selection_mode')) {
      console.log('➕ Adding tax_selection_mode column...');
      
      try {
        db.exec(`
          ALTER TABLE products 
          ADD COLUMN tax_selection_mode TEXT DEFAULT 'auto'
        `);
        console.log('✅ Added tax_selection_mode column successfully');
        
        // Update existing records with default value
        const updateResult = db.prepare(`
          UPDATE products 
          SET tax_selection_mode = 'auto' 
          WHERE tax_selection_mode IS NULL
        `).run();
        
        console.log(`✅ Updated ${updateResult.changes} records with default tax_selection_mode value`);
        
      } catch (alterError) {
        console.error('❌ Error adding column:', alterError);
        throw alterError;
      }
    } else {
      console.log('ℹ️ tax_selection_mode column already exists');
    }
    
    // Verify the column was added successfully
    const updatedInfo = db.prepare("PRAGMA table_info(products)").all();
    const updatedColumns = updatedInfo.map((col: any) => col.name);
    
    if (updatedColumns.includes('tax_selection_mode')) {
      console.log('✅ tax_selection_mode column verification successful');
      
      // Test a query that was failing before
      console.log('🧪 Testing products query with tax_selection_mode...');
      
      try {
        const testQuery = db.prepare(`
          SELECT 
            id, 
            name, 
            tax_selection_mode,
            stock_quantity,
            alert_threshold
          FROM products 
          WHERE stock_quantity <= alert_threshold
          LIMIT 5
        `);
        
        const testResult = testQuery.all();
        console.log(`✅ Low stock products query working successfully (found ${testResult.length} results)`);
        
        // Test the specific query that was failing
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
          LIMIT 10
        `);
        
        const lowStockResults = lowStockQuery.all();
        console.log(`✅ Low stock products endpoint query working (found ${lowStockResults.length} results)`);
        
      } catch (queryError) {
        console.error('❌ Test query failed:', queryError);
        throw queryError;
      }
      
    } else {
      console.error('❌ Failed to add tax_selection_mode column');
      throw new Error('Column verification failed');
    }
    
    db.close();
    console.log('🎉 Tax selection mode column fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing tax_selection_mode column:', error);
    throw error;
  }
}

// Run the fix
fixTaxSelectionModeColumnComplete().then(() => {
  console.log('✅ Fix completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
