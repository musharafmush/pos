import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'pos-data.db');

export async function initializeDatabase() {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log('🔄 Creating database tables...');

  // Create tables in correct order (handling foreign key dependencies)
  const tableCreationOrder = [
    'settings',
    'categories', 
    'products',
    'customers',
    'users',
    'suppliers',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'returns',
    'return_items',
    'expense_categories',
    'expenses'
  ];

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
      
      -- Tax Information - Indian GST Compliance
      hsn_code TEXT,
      gst_code TEXT,
      cgst_rate TEXT DEFAULT '0',
      sgst_rate TEXT DEFAULT '0',
      igst_rate TEXT DEFAULT '0',
      cess_rate TEXT DEFAULT '0',
      tax_calculation_method TEXT,
      
      -- Supplier & Manufacturer Information
      manufacturer_name TEXT,
      supplier_name TEXT,
      manufacturer_id INTEGER,
      supplier_id INTEGER,
      
      -- Product Classification
      alias TEXT,
      item_product_type TEXT,
      department TEXT,
      brand TEXT,
      buyer TEXT,
      purchase_gst_calculated_on TEXT,
      gst_uom TEXT,
      purchase_abatement TEXT,
      
      -- Configuration Options
      config_item_with_commodity INTEGER DEFAULT 0,
      senior_exempt_applicable INTEGER DEFAULT 0,
      ean_code_required INTEGER DEFAULT 0,
      weights_per_unit TEXT,
      batch_expiry_details TEXT,
      item_preparations_status TEXT,
      
      -- Pricing & Charges
      grinding_charge TEXT,
      weight_in_gms TEXT,
      bulk_item_name TEXT,
      repackage_units TEXT,
      repackage_type TEXT,
      packaging_material TEXT,
      decimal_point TEXT,
      product_type TEXT,
      sell_by TEXT,
      item_per_unit TEXT,
      maintain_selling_mrp_by TEXT,
      batch_selection TEXT,
      
      -- Item Properties
      is_weighable INTEGER DEFAULT 0,
      sku_type TEXT,
      indent_type TEXT,
      gate_keeper_margin TEXT,
      allow_item_free INTEGER DEFAULT 0,
      show_on_mobile_dashboard INTEGER DEFAULT 0,
      enable_mobile_notifications INTEGER DEFAULT 0,
      quick_add_to_cart INTEGER DEFAULT 0,
      perishable_item INTEGER DEFAULT 0,
      temperature_controlled INTEGER DEFAULT 0,
      fragile_item INTEGER DEFAULT 0,
      
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

  // Create default admin user if it doesn't exist
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (!existingAdmin) {
    console.log('🔄 Creating default admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    db.prepare(`
      INSERT INTO users (username, password, name, email, role, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'Administrator', 'admin@pos.local', 'admin', 1);

    console.log('✅ Default admin user created (username: admin, password: admin123)');
  }

  // Create default category if none exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();

  if (categoryCount.count === 0) {
    console.log('🔄 Creating default categories...');

    const categories = [
      { name: 'General', description: 'General products' },
      { name: 'Electronics', description: 'Electronic items and gadgets' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Food & Beverages', description: 'Food products and drinks' },
      { name: 'Home & Garden', description: 'Home improvement and gardening items' }
    ];

    const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');

    for (const category of categories) {
      insertCategory.run(category.name, category.description);
    }

    console.log('✅ Default categories created');
  }

  // Create default supplier if none exist
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();

  if (supplierCount.count === 0) {
    console.log('🔄 Creating default suppliers...');

    const suppliers = [
      {
        name: 'General Supplier',
        email: 'supplier@example.com',
        phone: '+1234567890',
        address: '123 Business St, City, State',
        contact_person: 'John Doe'
      },
      {
        name: 'Fresh Foods Supply',
        email: 'fresh@foods.com',
        phone: '+1234567891',
        address: '456 Market Ave, City, State',
        contact_person: 'Jane Smith'
      }
    ];

    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, email, phone, address, contact_person)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const supplier of suppliers) {
      insertSupplier.run(
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.contact_person
      );
    }

    console.log('✅ Default suppliers created');
  }

  // Expense Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      amount TEXT NOT NULL,
      expense_date DATETIME NOT NULL,
      payment_method TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      supplier_id INTEGER,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      receipt_number TEXT,
      reference TEXT,
      recurring INTEGER DEFAULT 0,
      recurring_period TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES expense_categories (id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create default expense categories
  const existingExpenseCategories = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get();
  if (existingExpenseCategories.count === 0) {
    const expenseCategories = [
      { name: 'Office Supplies', description: 'Stationery, equipment, and office materials' },
      { name: 'Travel & Transportation', description: 'Business travel, fuel, and transportation costs' },
      { name: 'Marketing & Advertising', description: 'Promotional materials, ads, and marketing campaigns' },
      { name: 'Utilities', description: 'Electricity, water, internet, and phone bills' },
      { name: 'Equipment & Maintenance', description: 'Equipment purchases and maintenance costs' },
      { name: 'Professional Services', description: 'Legal, accounting, and consulting fees' },
      { name: 'Insurance', description: 'Business insurance premiums' },
      { name: 'Rent & Facilities', description: 'Office rent and facility costs' }
    ];

    const insertExpenseCategory = db.prepare(`
      INSERT INTO expense_categories (name, description)
      VALUES (?, ?)
    `);

    for (const category of expenseCategories) {
      insertExpenseCategory.run(category.name, category.description);
    }

    console.log('✅ Default expense categories created');
  }

  db.close();
  console.log('🎉 Database initialization completed successfully!');
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}