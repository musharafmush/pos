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
    'expenses',
    'offers',
    'offer_usage',
    'customer_loyalty'
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
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };

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
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number };

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
  const existingExpenseCategories = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number };
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

  // Offers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      offer_type TEXT NOT NULL,
      discount_value TEXT NOT NULL,
      min_purchase_amount TEXT DEFAULT '0',
      max_discount_amount TEXT,
      buy_quantity INTEGER,
      get_quantity INTEGER,
      free_product_id INTEGER,
      valid_from DATETIME,
      valid_to DATETIME,
      time_start TEXT,
      time_end TEXT,
      applicable_categories TEXT,
      applicable_products TEXT,
      points_multiplier TEXT DEFAULT '1',
      points_threshold TEXT DEFAULT '1000',
      points_reward TEXT DEFAULT '10',
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      per_customer_limit INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (free_product_id) REFERENCES products (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Offer usage tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offer_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER,
      discount_amount TEXT NOT NULL,
      original_amount TEXT NOT NULL,
      final_amount TEXT NOT NULL,
      points_earned TEXT DEFAULT '0',
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES offers (id),
      FOREIGN KEY (sale_id) REFERENCES sales (id),
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )
  `);

  // Customer loyalty points table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_loyalty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL UNIQUE,
      total_points TEXT DEFAULT '0',
      used_points TEXT DEFAULT '0',
      available_points TEXT DEFAULT '0',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )
  `);

  // Tax Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate TEXT NOT NULL,
      hsn_code_range TEXT,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tax Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tax_calculation_method TEXT DEFAULT 'exclusive',
      prices_include_tax BOOLEAN DEFAULT 0,
      enable_multiple_tax_rates BOOLEAN DEFAULT 1,
      company_gstin TEXT,
      company_state TEXT,
      company_state_code TEXT,
      default_tax_category_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_tax_category_id) REFERENCES tax_categories(id)
    )
  `);

  // HSN Codes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hsn_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hsn_code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      cgst_rate TEXT DEFAULT '0',
      sgst_rate TEXT DEFAULT '0',
      igst_rate TEXT DEFAULT '0',
      cess_rate TEXT DEFAULT '0',
      is_active BOOLEAN DEFAULT 1,
      tax_category_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tax_category_id) REFERENCES tax_categories(id)
    )
  `);

  // Create default tax categories
  const existingTaxCategories = db.prepare('SELECT COUNT(*) as count FROM tax_categories').get() as { count: number };
  if (existingTaxCategories.count === 0) {
    const insertTaxCategory = db.prepare(`
      INSERT INTO tax_categories (name, rate, description, is_active) VALUES (?, ?, ?, ?)
    `);

    const taxCategories = [
      ['GST 0%', '0', 'Zero rated goods and services', 1],
      ['GST 5%', '5', 'Essential goods and services', 1],
      ['GST 12%', '12', 'Standard goods and services', 1],
      ['GST 18%', '18', 'Most goods and services', 1],
      ['GST 28%', '28', 'Luxury goods and services', 1],
      ['GST 40%', '40', 'Premium luxury goods', 1]
    ];

    taxCategories.forEach(category => {
      insertTaxCategory.run(...category);
    });

    console.log('✅ Default tax categories created');
  }

  // Create default tax settings
  const existingTaxSettings = db.prepare('SELECT COUNT(*) as count FROM tax_settings').get() as { count: number };
  if (existingTaxSettings.count === 0) {
    db.prepare(`
      INSERT INTO tax_settings (
        tax_calculation_method, 
        prices_include_tax, 
        enable_multiple_tax_rates,
        company_state,
        company_state_code
      ) VALUES (?, ?, ?, ?, ?)
    `).run('exclusive', 0, 1, 'Maharashtra', '27');

    console.log('✅ Default tax settings created');
  }

  // Create sample HSN codes
  const existingHsnCodes = db.prepare('SELECT COUNT(*) as count FROM hsn_codes').get() as { count: number };
  if (existingHsnCodes.count === 0) {
    const insertHsnCode = db.prepare(`
      INSERT INTO hsn_codes (hsn_code, description, cgst_rate, sgst_rate, igst_rate, tax_category_id) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sampleHsnCodes = [
      // GST 0% - Essential items
      ['1001', 'Wheat and meslin', '0', '0', '0', 1],
      ['1006', 'Rice', '0', '0', '0', 1],
      ['0401', 'Milk and cream', '0', '0', '0', 1],
      
      // GST 5% - Essential goods
      ['1701', 'Cane or beet sugar', '2.5', '2.5', '5', 2],
      ['1511', 'Palm oil and its fractions', '2.5', '2.5', '5', 2],
      ['2710', 'Petroleum oils (kerosene)', '2.5', '2.5', '5', 2],
      
      // GST 12% - Standard goods
      ['1704', 'Sugar confectionery', '6', '6', '12', 3],
      ['2202', 'Waters, including mineral waters', '6', '6', '12', 3],
      ['4901', 'Printed books, brochures', '6', '6', '12', 3],
      
      // GST 18% - Most goods
      ['6402', 'Other footwear with outer soles', '9', '9', '18', 4],
      ['6110', 'Jerseys, pullovers, cardigans', '9', '9', '18', 4],
      ['8517', 'Telephone sets, mobile phones', '9', '9', '18', 4],
      ['3004', 'Medicaments for retail sale', '9', '9', '18', 4],
      
      // GST 28% - Luxury goods
      ['8703', 'Motor cars and vehicles', '14', '14', '28', 5],
      ['2402', 'Cigars, cigarettes', '14', '14', '28', 5],
      ['3303', 'Perfumes and toilet waters', '14', '14', '28', 5],
      
      // GST 40% - Premium luxury items
      ['7113', 'Articles of jewellery', '20', '20', '40', 6],
      ['8802', 'Aircraft, aeroplanes', '20', '20', '40', 6],
      ['8903', 'Yachts and pleasure vessels', '20', '20', '40', 6],
    ];

    sampleHsnCodes.forEach(hsn => {
      insertHsnCode.run(...hsn);
    });

    console.log('✅ Sample HSN codes created');
  }

  // Create default offers
  const existingOffers = db.prepare('SELECT COUNT(*) as count FROM offers').get() as { count: number };
  if (existingOffers.count === 0) {
    const defaultOffers = [
      {
        name: 'Weekend Special',
        description: '10% off on weekend purchases above ₹500',
        offer_type: 'percentage',
        discount_value: '10',
        min_purchase_amount: '500',
        max_discount_amount: '200',
        time_start: '09:00',
        time_end: '21:00',
        created_by: 1
      },
      {
        name: 'Buy 2 Get 1 Free',
        description: 'Buy 2 items, get 1 free (lowest priced item)',
        offer_type: 'buy_x_get_y',
        discount_value: '100',
        buy_quantity: 2,
        get_quantity: 1,
        created_by: 1
      },
      {
        name: 'Loyalty Points',
        description: 'Earn 10 points for every ₹1000 spent',
        offer_type: 'loyalty_points',
        discount_value: '0',
        points_threshold: '1000',
        points_reward: '10',
        created_by: 1
      }
    ];

    const insertOffer = db.prepare(`
      INSERT INTO offers (name, description, offer_type, discount_value, min_purchase_amount, max_discount_amount, 
                         buy_quantity, get_quantity, time_start, time_end, points_threshold, points_reward, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const offer of defaultOffers) {
      insertOffer.run(
        offer.name,
        offer.description,
        offer.offer_type,
        offer.discount_value,
        offer.min_purchase_amount || null,
        offer.max_discount_amount || null,
        offer.buy_quantity || null,
        offer.get_quantity || null,
        offer.time_start || null,
        offer.time_end || null,
        offer.points_threshold || null,
        offer.points_reward || null,
        offer.created_by
      );
    }

    console.log('✅ Default offers created');
  }

  db.close();
  console.log('🎉 Database initialization completed successfully!');
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}