
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');

console.log('🔧 Starting comprehensive database repair...');

try {
  // Create database if it doesn't exist
  const db = new Database(dbPath);
  
  console.log('📊 Creating/updating database tables...');
  
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      image TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      supplier_type TEXT DEFAULT 'regular',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT UNIQUE,
      barcode TEXT,
      category_id INTEGER,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      cost DECIMAL(10,2) DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      max_stock_level INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      image TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
  
  // Create sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      user_id INTEGER,
      subtotal DECIMAL(10,2) DEFAULT 0,
      tax DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Create sale_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  
  // Create purchases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      user_id INTEGER,
      subtotal DECIMAL(10,2) DEFAULT 0,
      tax DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Create purchase_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  
  // Create admin user if not exists
  const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get('admin');
  if (!existingAdmin) {
    console.log('👤 Creating admin user...');
    db.prepare(`
      INSERT INTO users (username, password, name, email, role, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin123', 'Administrator', 'admin@pos.com', 'admin', 1);
  }
  
  // Create default category if not exists
  const existingCategory = db.prepare("SELECT id FROM categories WHERE name = ?").get('General');
  if (!existingCategory) {
    console.log('📂 Creating default category...');
    db.prepare(`
      INSERT INTO categories (name, description)
      VALUES (?, ?)
    `).run('General', 'Default category for products');
  }
  
  // Add sample products if none exist
  const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
  if (productCount.count === 0) {
    console.log('📦 Adding sample products...');
    const categoryId = db.prepare("SELECT id FROM categories WHERE name = ?").get('General').id;
    
    const sampleProducts = [
      { name: 'Sample Product 1', price: 100, cost: 80, stock: 50, sku: 'SP001' },
      { name: 'Sample Product 2', price: 200, cost: 150, stock: 30, sku: 'SP002' },
      { name: 'Sample Product 3', price: 150, cost: 120, stock: 25, sku: 'SP003' }
    ];
    
    for (const product of sampleProducts) {
      db.prepare(`
        INSERT INTO products (name, price, cost, stock_quantity, sku, category_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(product.name, product.price, product.cost, product.stock, product.sku, categoryId);
    }
  }
  
  // Verify database structure
  console.log('🔍 Verifying database structure...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  console.log('✅ Tables created:', tables.map(t => t.name).join(', '));
  
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const productCount2 = db.prepare("SELECT COUNT(*) as count FROM products").get();
  const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get();
  
  console.log(`✅ Database populated: ${userCount.count} users, ${productCount2.count} products, ${categoryCount.count} categories`);
  
  db.close();
  console.log('🎉 Database repair completed successfully!');
  
} catch (error) {
  console.error('❌ Database repair failed:', error);
  process.exit(1);
}
