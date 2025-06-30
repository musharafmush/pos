import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Checking database structure...');

// Check if products table exists and its structure
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('\nAvailable tables:', tables.map(t => t.name));

  if (tables.some(t => t.name === 'products')) {
    const productsInfo = db.prepare("PRAGMA table_info(products)").all();
    console.log('\nProducts table columns:');
    productsInfo.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });

    // Check if model column exists
    const hasModelColumn = productsInfo.some(col => col.name === 'model');
    console.log('\nModel column exists:', hasModelColumn);

    // Test a simple query
    try {
      const testQuery = db.prepare("SELECT COUNT(*) as count FROM products").get();
      console.log('Products count:', testQuery.count);
    } catch (error) {
      console.error('Error querying products:', error.message);
    }
  } else {
    console.log('\nProducts table does not exist!');
  }

} catch (error) {
  console.error('Error checking database:', error.message);
} finally {
  db.close();
}