import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function createTaxManagementTables() {
  console.log('🔧 Creating tax management tables...');

  try {
    // Create tax_categories table
    await db.execute(sql`
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

    // Create tax_settings table
    await db.execute(sql`
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

    // Create hsn_codes table
    await db.execute(sql`
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

    // Insert default tax categories with standard GST rates
    await db.execute(sql`
      INSERT OR IGNORE INTO tax_categories (name, rate, description, is_active) VALUES
      ('GST 0%', '0', 'Zero rated goods and services', 1),
      ('GST 5%', '5', 'Essential goods and services', 1),
      ('GST 12%', '12', 'Standard goods and services', 1),
      ('GST 18%', '18', 'Most goods and services', 1),
      ('GST 28%', '28', 'Luxury goods and services', 1),
      ('GST 40%', '40', 'Premium luxury goods', 1)
    `);

    // Insert default tax settings
    await db.execute(sql`
      INSERT OR IGNORE INTO tax_settings (
        tax_calculation_method, 
        prices_include_tax, 
        enable_multiple_tax_rates,
        company_state,
        company_state_code
      ) VALUES (
        'exclusive', 
        0, 
        1,
        'Maharashtra',
        '27'
      )
    `);

    // Insert premium luxury HSN codes for 40% tax rate
    await db.execute(sql`
      INSERT OR IGNORE INTO hsn_codes (hsn_code, description, cgst_rate, sgst_rate, igst_rate, tax_category_id) VALUES
      ('7113', 'Articles of jewellery and parts thereof, of precious metal', '20', '20', '40', 6),
      ('7114', 'Articles of goldsmiths or silversmiths wares', '20', '20', '40', 6),
      ('7116', 'Articles of natural or cultured pearls, precious stones', '20', '20', '40', 6),
      ('9701', 'Paintings, drawings and pastels executed entirely by hand', '20', '20', '40', 6),
      ('9702', 'Original engravings, prints and lithographs', '20', '20', '40', 6),
      ('9703', 'Original sculptures and statuary, in any material', '20', '20', '40', 6),
      ('8802', 'Aircraft, aeroplanes and other aircraft', '20', '20', '40', 6),
      ('8903', 'Yachts and other vessels for pleasure or sports', '20', '20', '40', 6),
      ('8704', 'Motor vehicles for transport of goods (luxury variants)', '20', '20', '40', 6),
      ('9401', 'Luxury furniture and seating', '20', '20', '40', 6)
    `);

    // Insert common HSN codes for other tax rates
    await db.execute(sql`
      INSERT OR IGNORE INTO hsn_codes (hsn_code, description, cgst_rate, sgst_rate, igst_rate, tax_category_id) VALUES
      ('1006', 'Rice', '0', '0', '0', 1),
      ('1701', 'Cane or beet sugar', '0', '0', '0', 1),
      ('0401', 'Milk and cream', '0', '0', '0', 1),
      ('1905', 'Bread, pastry, cakes, biscuits', '2.5', '2.5', '5', 2),
      ('0712', 'Dried vegetables', '2.5', '2.5', '5', 2),
      ('6203', 'Mens suits, ensembles, jackets, blazers', '6', '6', '12', 3),
      ('8517', 'Telephone sets, mobile phones', '9', '9', '18', 4),
      ('8471', 'Computers and data processing machines', '9', '9', '18', 4),
      ('2402', 'Cigars, cheroots, cigarillos and cigarettes', '14', '14', '28', 5),
      ('2208', 'Spirits, liqueurs and other spirituous beverages', '14', '14', '28', 5)
    `);

    console.log('✅ Tax management tables created successfully');
    console.log('✅ Default tax categories and HSN codes inserted');

  } catch (error) {
    console.error('❌ Error creating tax management tables:', error);
    throw error;
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  createTaxManagementTables()
    .then(() => {
      console.log('🎉 Tax management setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Tax management setup failed:', error);
      process.exit(1);
    });
}

export { createTaxManagementTables };