import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing SQLite database schema for compatibility...');

try {
  // First, let's check what tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Existing tables:', tables);

  // Update the products table to remove PostgreSQL-specific constraints
  console.log('Updating products table schema...');
  
  // Check if products table exists and its structure
  const productTableInfo = db.prepare("PRAGMA table_info(products)").all();
  console.log('Products table structure:', productTableInfo);

  // Create a new products table with proper SQLite syntax
  db.exec(`
    CREATE TABLE IF NOT EXISTS products_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT NOT NULL UNIQUE,
      price TEXT NOT NULL,
      cost TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      alert_threshold INTEGER NOT NULL DEFAULT 10,
      barcode TEXT,
      image TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Copy existing data if any
  const existingProducts = db.prepare("SELECT COUNT(*) as count FROM products").get();
  console.log('Existing products count:', existingProducts);

  if (existingProducts.count > 0) {
    console.log('Migrating existing product data...');
    db.exec(`
      INSERT INTO products_new (id, name, description, sku, price, cost, category_id, stock_quantity, alert_threshold, barcode, image, active, created_at, updated_at)
      SELECT id, name, description, sku, price, cost, category_id, stock_quantity, alert_threshold, barcode, image, active, 
             COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
             COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
      FROM products
    `);
  }

  // Replace the old table
  db.exec('DROP TABLE IF EXISTS products');
  db.exec('ALTER TABLE products_new RENAME TO products');

  console.log('✅ Products table schema updated successfully!');
  
  // Test insertion
  console.log('Testing product insertion...');
  const testInsert = db.prepare(`
    INSERT INTO products (name, description, sku, price, cost, category_id, stock_quantity, alert_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = testInsert.run('Test Product', 'Test Description', 'TEST001', '100', '80', 1, 50, 10);
  console.log('✅ Test insertion successful:', result);
  
  // Clean up test data
  db.prepare('DELETE FROM products WHERE sku = ?').run('TEST001');
  console.log('✅ Test data cleaned up');

} catch (error) {
  console.error('❌ Error fixing database schema:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}