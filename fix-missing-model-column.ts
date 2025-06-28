import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Adding missing "model" column to products table...');

try {
  // Check if model column exists
  const productsInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasModelColumn = productsInfo.some(col => col.name === 'model');
  
  if (!hasModelColumn) {
    console.log('Adding model column to products table...');
    db.exec('ALTER TABLE products ADD COLUMN model TEXT');
    console.log('✅ Model column added successfully!');
  } else {
    console.log('Model column already exists');
  }

  // Add any other missing columns from the SQLite schema
  const requiredColumns = [
    { name: 'size', type: 'TEXT' },
    { name: 'color', type: 'TEXT' },
    { name: 'material', type: 'TEXT' },
    { name: 'min_order_qty', type: 'INTEGER DEFAULT 1' },
    { name: 'max_order_qty', type: 'INTEGER' },
    { name: 'reorder_point', type: 'INTEGER' },
    { name: 'shelf_life', type: 'INTEGER' },
    { name: 'expiry_date', type: 'TEXT' },
    { name: 'batch_number', type: 'TEXT' },
    { name: 'serial_number', type: 'TEXT' },
    { name: 'warranty', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'rack', type: 'TEXT' },
    { name: 'bin', type: 'TEXT' }
  ];

  for (const column of requiredColumns) {
    const hasColumn = productsInfo.some(col => col.name === column.name);
    if (!hasColumn) {
      console.log(`Adding ${column.name} column to products table...`);
      db.exec(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type}`);
      console.log(`✅ ${column.name} column added successfully!`);
    }
  }

  // Test the query that was failing
  console.log('Testing products query...');
  const testQuery = db.prepare("SELECT COUNT(*) as count FROM products").get();
  console.log('Products count:', testQuery.count);

  console.log('🎉 Database schema fix completed!');

} catch (error) {
  console.error('❌ Error fixing database schema:', error.message);
} finally {
  db.close();
}