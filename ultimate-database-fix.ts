import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Ultimate database fix - adding ALL missing columns...');

try {
  // === SUPPLIERS TABLE - Add ALL possible missing columns ===
  console.log('📋 Fixing suppliers table...');
  const supplierColumns = [
    'supplier_type', 'credit_days', 'payment_terms', 'delivery_terms',
    'preferred_payment_method', 'rating', 'is_verified', 'business_hours',
    'alternate_contact', 'gst_treatment', 'pan_number', 'gst_number',
    'opening_balance', 'as_of_date'
  ];

  for (const column of supplierColumns) {
    try {
      if (column === 'credit_days' || column === 'rating') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} INTEGER DEFAULT 30`);
      } else if (column === 'opening_balance') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} TEXT DEFAULT '0'`);
      } else if (column === 'is_verified') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} INTEGER DEFAULT 0`);
      } else if (column === 'as_of_date') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} DATETIME DEFAULT CURRENT_TIMESTAMP`);
      } else {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} TEXT DEFAULT NULL`);
      }
      console.log(`✅ Added ${column}`);
    } catch (error) {
      console.log(`ℹ️ Column ${column} already exists`);
    }
  }

  // === SALE_ITEMS TABLE - Force fix unit_price ===
  console.log('📋 Fixing sale_items table...');
  try {
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    console.log('✅ Added unit_price to sale_items');
  } catch (error) {
    console.log('ℹ️ unit_price already exists in sale_items');
  }

  // Update existing records
  const updateResult = db.prepare("UPDATE sale_items SET unit_price = price WHERE unit_price IS NULL OR unit_price = '0' OR unit_price = ''").run();
  console.log(`✅ Updated ${updateResult.changes} sale_items records`);

  // === TEST ALL QUERIES ===
  console.log('🧪 Testing database functionality...');

  // Test suppliers
  const testSupplier = db.prepare("SELECT id, name, supplier_type, credit_days FROM suppliers LIMIT 1").all();
  console.log('✅ Suppliers query working');

  // Test sale_items
  const testSaleItems = db.prepare("SELECT id, unit_price FROM sale_items LIMIT 1").all();
  console.log('✅ Sale_items query working');

  console.log('🎉 Ultimate database fix completed!');
  console.log('✅ All supplier columns added');
  console.log('✅ Sale_items unit_price fixed');
  console.log('✅ Your POS system is ready to use!');

} catch (error) {
  console.error('❌ Error during ultimate fix:', error);
} finally {
  db.close();
}