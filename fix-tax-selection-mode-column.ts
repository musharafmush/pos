
import Database from 'better-sqlite3';
import path from 'path';

async function fixTaxSelectionModeColumn() {
  try {
    console.log('🔧 Adding missing tax_selection_mode column to products table...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check current products table structure
    const productsInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = productsInfo.map((col: any) => col.name);
    
    console.log('📋 Current products table columns:', existingColumns);
    
    // Add tax_selection_mode column if it doesn't exist
    if (!existingColumns.includes('tax_selection_mode')) {
      console.log('➕ Adding tax_selection_mode column...');
      db.exec(`
        ALTER TABLE products 
        ADD COLUMN tax_selection_mode TEXT DEFAULT 'auto'
      `);
      console.log('✅ Added tax_selection_mode column');
      
      // Update existing records with default value
      const updateResult = db.prepare(`
        UPDATE products 
        SET tax_selection_mode = 'auto' 
        WHERE tax_selection_mode IS NULL
      `).run();
      
      console.log(`✅ Updated ${updateResult.changes} records with default tax_selection_mode value`);
    } else {
      console.log('ℹ️ tax_selection_mode column already exists');
    }
    
    // Verify the column was added successfully
    const updatedInfo = db.prepare("PRAGMA table_info(products)").all();
    const updatedColumns = updatedInfo.map((col: any) => col.name);
    
    if (updatedColumns.includes('tax_selection_mode')) {
      console.log('✅ tax_selection_mode column verification successful');
    } else {
      console.error('❌ Failed to add tax_selection_mode column');
    }
    
    // Test a query that was failing before
    console.log('🧪 Testing products query with tax_selection_mode...');
    const testQuery = db.prepare(`
      SELECT 
        id, 
        name, 
        tax_selection_mode
      FROM products 
      LIMIT 1
    `);
    
    const testResult = testQuery.all();
    console.log('✅ Products query with tax_selection_mode working successfully');
    
    db.close();
    console.log('🎉 Tax selection mode column fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing tax_selection_mode column:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTaxSelectionModeColumn().then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
}

export { fixTaxSelectionModeColumn };
