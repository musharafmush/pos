
import Database from 'better-sqlite3';
import path from 'path';

console.log('🔧 Adding gstCode column to products table...');

try {
  const dbPath = path.join(process.cwd(), 'pos-data.db');
  const sqlite = new Database(dbPath);
  
  // Check if the column exists
  const tableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  console.log('📋 Current products table columns:', columnNames);
  
  if (!columnNames.includes('gst_code') && !columnNames.includes('gstCode')) {
    console.log('➕ Adding missing gstCode column...');
    
    // Add the column with default value
    sqlite.exec(`
      ALTER TABLE products 
      ADD COLUMN gst_code TEXT DEFAULT 'GST 18%';
    `);
    
    console.log('✅ Successfully added gst_code column');
    
    // Update existing products to have default GST code
    sqlite.exec(`
      UPDATE products 
      SET gst_code = 'GST 18%' 
      WHERE gst_code IS NULL;
    `);
    
    console.log('✅ Updated existing products with default GST code');
  } else {
    console.log('✅ gst_code column already exists');
  }
  
  // Verify the column was added
  const updatedTableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const updatedColumnNames = updatedTableInfo.map((col: any) => col.name);
  
  if (updatedColumnNames.includes('gst_code') || updatedColumnNames.includes('gstCode')) {
    console.log('✅ Verification: gst_code column is present');
  } else {
    console.log('❌ Verification failed: gst_code column is missing');
  }
  
  sqlite.close();
  console.log('🎉 GST code column fix completed successfully!');
  
} catch (error) {
  console.error('❌ Fix failed:', error);
  process.exit(1);
}
