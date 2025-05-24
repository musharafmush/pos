import { sqlite } from './db/index.js';

console.log('🔧 Setting up complete database for your POS system...');

try {
  // Create all required tables with proper column names
  
  // Categories table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products table with correct column names
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price TEXT NOT NULL,
      cost TEXT DEFAULT '0',
      stock_quantity INTEGER DEFAULT 0,
      alert_threshold INTEGER DEFAULT 5,
      sku TEXT UNIQUE,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      image TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Customers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Suppliers table with correct column names
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      contact_person TEXT,
      tax_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sales table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER REFERENCES users(id),
      total TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sale items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price TEXT NOT NULL,
      total TEXT NOT NULL
    );
  `);

  // Purchases table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      user_id INTEGER REFERENCES users(id),
      purchase_number TEXT UNIQUE NOT NULL,
      order_date TEXT NOT NULL,
      expected_date TEXT,
      received_date TEXT,
      total TEXT NOT NULL,
      freight_charges TEXT DEFAULT '0',
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Purchase items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      cost TEXT NOT NULL,
      total TEXT NOT NULL
    );
  `);

  // Settings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default currency settings
  sqlite.exec(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES ('base_currency', 'INR', 'Base currency for the POS system');
  `);

  sqlite.exec(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES ('currency_symbol', '₹', 'Currency symbol for display');
  `);

  console.log('✅ Complete database setup finished!');
  console.log('🎯 Your POS system now has all required tables!');
  console.log('💰 Indian Rupee settings configured!');
  
} catch (error) {
  console.error('❌ Error setting up database:', error.message);
}

sqlite.close();