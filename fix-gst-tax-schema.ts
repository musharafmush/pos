import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Adding GST and Tax Information fields to products table...');

try {
  // Check current products table structure
  const productTableInfo = db.prepare("PRAGMA table_info(products)").all();
  console.log('Current products table structure:', productTableInfo);

  // Add GST and tax compliance fields to products table
  const addColumns = [
    'ALTER TABLE products ADD COLUMN hsn_code TEXT',
    'ALTER TABLE products ADD COLUMN gst_code TEXT',
    'ALTER TABLE products ADD COLUMN cgst_rate TEXT',
    'ALTER TABLE products ADD COLUMN sgst_rate TEXT',
    'ALTER TABLE products ADD COLUMN igst_rate TEXT',
    'ALTER TABLE products ADD COLUMN cess_rate TEXT',
    'ALTER TABLE products ADD COLUMN tax_calculation_method TEXT'
  ];

  for (const sql of addColumns) {
    try {
      db.exec(sql);
      console.log(`✅ Added column: ${sql.split(' ')[4]}`);
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log(`⚠️ Column already exists: ${sql.split(' ')[4]}`);
      } else {
        console.error(`❌ Error adding column: ${error.message}`);
      }
    }
  }

  // Fix sales_items table for unit_price column
  console.log('\nFixing sales_items table...');
  try {
    db.exec('ALTER TABLE sale_items ADD COLUMN unit_price TEXT');
    console.log('✅ Added unit_price column to sale_items');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ unit_price column already exists in sale_items');
    } else {
      console.error(`❌ Error adding unit_price column: ${error.message}`);
    }
  }

  // Verify the changes
  const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
  console.log('\nUpdated products table structure:');
  updatedTableInfo.forEach(column => {
    console.log(`- ${column.name}: ${column.type}`);
  });

  console.log('\n✅ GST Tax Information schema update completed successfully!');

} catch (error) {
  console.error('❌ Error updating GST tax schema:', error);
} finally {
  db.close();
  console.log('Database connection closed.');
}