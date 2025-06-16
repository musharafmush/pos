
import Database from 'better-sqlite3';
import path from 'path';

console.log('🔧 Fixing tax_selection_mode column for dashboard...');

try {
  const dbPath = path.join(process.cwd(), 'pos-data.db');
  const sqlite = new Database(dbPath);
  
  // Check if the column exists
  const tableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  console.log('📋 Current products table columns:', columnNames);
  
  if (!columnNames.includes('tax_selection_mode')) {
    console.log('➕ Adding missing tax_selection_mode column...');
    
    // Add the column with default value
    sqlite.exec(`
      ALTER TABLE products 
      ADD COLUMN tax_selection_mode TEXT DEFAULT 'auto';
    `);
    
    console.log('✅ Successfully added tax_selection_mode column');
    
    // Update existing products to have 'auto' mode
    const updateResult = sqlite.exec(`
      UPDATE products 
      SET tax_selection_mode = 'auto' 
      WHERE tax_selection_mode IS NULL;
    `);
    
    console.log('✅ Updated existing products with default tax selection mode');
  } else {
    console.log('✅ tax_selection_mode column already exists');
  }
  
  // Verify the column was added
  const updatedTableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const updatedColumnNames = updatedTableInfo.map((col: any) => col.name);
  
  if (updatedColumnNames.includes('tax_selection_mode')) {
    console.log('✅ Verification: tax_selection_mode column is present');
  } else {
    console.log('❌ Verification failed: tax_selection_mode column is missing');
  }
  
  // Test a simple query that uses the column
  try {
    const testQuery = sqlite.prepare('SELECT id, name, tax_selection_mode FROM products LIMIT 1');
    const testResult = testQuery.get();
    console.log('✅ Test query successful:', testResult);
  } catch (testError) {
    console.error('❌ Test query failed:', testError.message);
  }
  
  sqlite.close();
  console.log('🎉 Tax selection mode dashboard fix completed successfully!');
  
} catch (error) {
  console.error('❌ Fix failed:', error);
  process.exit(1);
}
