import { sqlite } from './db/index.js';

console.log('🔧 Adding missing tables for your POS system...');

try {
  // Fix sale_items table (it was created as sale_items but schema expects sales_items)
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

  // Also create the expected sales_items table for compatibility
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sales_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price TEXT NOT NULL,
      total TEXT NOT NULL
    );
  `);

  // Update suppliers table with missing columns
  sqlite.exec(`
    ALTER TABLE suppliers ADD COLUMN registration_type TEXT DEFAULT '';
  `);

  // Add some sample data so you can see your POS system in action
  console.log('📦 Adding sample categories...');
  sqlite.exec(`
    INSERT OR IGNORE INTO categories (id, name, description) VALUES 
    (1, 'Electronics', 'Electronic devices and accessories'),
    (2, 'Groceries', 'Food and household items'),
    (3, 'Clothing', 'Apparel and fashion items');
  `);

  console.log('📱 Adding sample products...');
  sqlite.exec(`
    INSERT OR IGNORE INTO products (id, name, description, price, cost, stock_quantity, alert_threshold, sku, category_id, active) VALUES 
    (1, 'Smartphone', 'Latest Android smartphone', '15000', '12000', 50, 10, 'PHONE001', 1, 1),
    (2, 'Rice (1kg)', 'Premium basmati rice', '80', '65', 200, 20, 'RICE001', 2, 1),
    (3, 'T-Shirt', 'Cotton casual t-shirt', '500', '350', 30, 5, 'TSHIRT001', 3, 1);
  `);

  console.log('👥 Adding sample customers...');
  sqlite.exec(`
    INSERT OR IGNORE INTO customers (id, name, email, phone, address) VALUES 
    (1, 'Rajesh Kumar', 'rajesh@email.com', '+91-9876543210', 'Mumbai, Maharashtra'),
    (2, 'Priya Sharma', 'priya@email.com', '+91-9876543211', 'Delhi, India');
  `);

  console.log('🏢 Adding sample suppliers...');
  sqlite.exec(`
    INSERT OR IGNORE INTO suppliers (id, name, email, phone, address, contact_person, tax_id) VALUES 
    (1, 'Tech Distributors Ltd', 'contact@techdist.com', '+91-11-12345678', 'Gurgaon, Haryana', 'Mr. Anil Gupta', 'GST123456789'),
    (2, 'Fresh Foods Supply', 'orders@freshfoods.com', '+91-22-87654321', 'Pune, Maharashtra', 'Ms. Sunita Patel', 'GST987654321');
  `);

  console.log('✅ All missing tables and sample data added!');
  console.log('🎯 Your POS system now has demo data to explore!');
  console.log('💰 Ready with Indian Rupee formatting!');
  
} catch (error) {
  if (error.message?.includes('duplicate column name')) {
    console.log('✅ Tables already updated!');
  } else {
    console.error('❌ Error:', error.message);
  }
}

sqlite.close();