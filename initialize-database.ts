
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'pos-data.db');

export async function initializeDatabase() {
  console.log('🔄 Initializing fresh SQLite database...');
  
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        image TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Suppliers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        contact_person TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE NOT NULL,
        price TEXT NOT NULL,
        mrp TEXT NOT NULL,
        cost TEXT NOT NULL DEFAULT '0',
        weight TEXT,
        weight_unit TEXT DEFAULT 'kg',
        category_id INTEGER NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        alert_threshold INTEGER NOT NULL DEFAULT 5,
        barcode TEXT,
        image TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Sales table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        user_id INTEGER NOT NULL,
        total TEXT NOT NULL,
        tax TEXT NOT NULL DEFAULT '0',
        discount TEXT NOT NULL DEFAULT '0',
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Sale items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price TEXT NOT NULL,
        price TEXT NOT NULL,
        total TEXT NOT NULL,
        subtotal TEXT NOT NULL,
        cost TEXT,
        margin TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Purchases table
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        purchase_number TEXT,
        order_number TEXT,
        po_no TEXT,
        order_date DATETIME,
        po_date DATETIME,
        expected_date DATETIME,
        due_date DATETIME,
        received_date DATETIME,
        total TEXT NOT NULL,
        sub_total TEXT,
        freight_cost TEXT DEFAULT '0',
        freight TEXT DEFAULT '0',
        other_charges TEXT DEFAULT '0',
        discount_amount TEXT DEFAULT '0',
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Purchase items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost TEXT NOT NULL,
        cost TEXT NOT NULL,
        total TEXT NOT NULL,
        amount TEXT NOT NULL,
        subtotal TEXT NOT NULL,
        received_qty INTEGER,
        free_qty INTEGER DEFAULT 0,
        expiry_date TEXT,
        hsn_code TEXT,
        tax_percentage TEXT DEFAULT '0',
        discount_amount TEXT DEFAULT '0',
        discount_percent TEXT DEFAULT '0',
        net_cost TEXT,
        selling_price TEXT DEFAULT '0',
        mrp TEXT DEFAULT '0',
        batch_number TEXT,
        location TEXT,
        unit TEXT DEFAULT 'PCS',
        roi_percent TEXT DEFAULT '0',
        gross_profit_percent TEXT DEFAULT '0',
        net_amount TEXT,
        cash_percent TEXT DEFAULT '0',
        cash_amount TEXT DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Returns table
    db.exec(`
      CREATE TABLE IF NOT EXISTS returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        refund_method TEXT NOT NULL,
        total_refund TEXT NOT NULL,
        reason TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Return items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price TEXT NOT NULL,
        subtotal TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('✅ All tables created successfully');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password, name, email, role, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Administrator', 'admin@pos.local', 'admin', 1);

    console.log('✅ Default admin user created (username: admin, password: admin123)');

    // Create default category
    db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run('General', 'General products');
    console.log('✅ Default category created');

    // Create default supplier
    db.prepare(`
      INSERT INTO suppliers (name, email, phone, address, contact_person)
      VALUES (?, ?, ?, ?, ?)
    `).run('General Supplier', 'supplier@example.com', '+1234567890', '123 Business St', 'John Doe');

    console.log('✅ Default supplier created');

  } catch (error) {
    console.error('❌ Error creating database:', error);
    throw error;
  } finally {
    db.close();
  }

  console.log('🎉 Database initialization completed successfully!');
}

// Run initialization
initializeDatabase().catch(console.error);
