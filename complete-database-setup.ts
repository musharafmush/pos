import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('🔧 Complete database setup for SQLite compatibility...');

try {
  // === FIX SUPPLIERS TABLE ===
  console.log('\n📋 Checking suppliers table...');
  const suppliersInfo = db.prepare("PRAGMA table_info(suppliers)").all();
  const supplierColumns = suppliersInfo.map((col: any) => col.name);
  
  const requiredSupplierColumns = [
    'registration_number', 'website', 'bank_name', 'bank_account', 'ifsc_code',
    'credit_period', 'credit_limit', 'default_discount', 'notes', 'mobile_no',
    'status', 'extension_number', 'fax', 'fax_no', 'country', 'state', 'city',
    'pincode', 'pin_code', 'building', 'street', 'area', 'landmark'
  ];

  for (const column of requiredSupplierColumns) {
    if (!supplierColumns.includes(column)) {
      console.log(`Adding suppliers.${column}...`);
      if (column === 'credit_period') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} INTEGER DEFAULT 30`);
      } else if (column === 'credit_limit' || column === 'default_discount') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} TEXT DEFAULT '0'`);
      } else if (column === 'status') {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} TEXT DEFAULT 'active'`);
      } else {
        db.exec(`ALTER TABLE suppliers ADD COLUMN ${column} TEXT DEFAULT NULL`);
      }
      console.log(`✅ Added ${column}`);
    }
  }

  // === FIX SALE_ITEMS TABLE ===
  console.log('\n📋 Checking sale_items table...');
  const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const saleItemsColumns = saleItemsInfo.map((col: any) => col.name);
  
  if (!saleItemsColumns.includes('unit_price')) {
    console.log('Adding sale_items.unit_price...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    
    // Update existing records
    const updateResult = db.prepare("UPDATE sale_items SET unit_price = price WHERE unit_price = '0' OR unit_price IS NULL").run();
    console.log(`✅ Added unit_price and updated ${updateResult.changes} records`);
  }

  // === TEST ALL QUERIES ===
  console.log('\n🧪 Testing database queries...');
  
  // Test suppliers query
  const testSuppliers = db.prepare(`
    SELECT id, name, email, phone, address, contact_person, tax_id,
           COALESCE(registration_number, '') as registration_number,
           COALESCE(website, '') as website,
           COALESCE(status, 'active') as status,
           created_at
    FROM suppliers LIMIT 1
  `).all();
  console.log('✅ Suppliers query working');

  // Test sale_items query
  const testSaleItems = db.prepare(`
    SELECT si.id, si.sale_id, si.product_id, si.quantity,
           COALESCE(si.unit_price, si.price) as unit_price,
           si.price, si.total
    FROM sale_items si LIMIT 1
  `).all();
  console.log('✅ Sale_items query working');

  // Test sales with items query (the one that was failing)
  const testSalesWithItems = db.prepare(`
    SELECT s.id, s.order_number, s.total, s.created_at,
           si.quantity, COALESCE(si.unit_price, si.price) as unit_price
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LIMIT 1
  `).all();
  console.log('✅ Sales with items query working');

  console.log('\n🎉 All database fixes completed successfully!');
  console.log('✅ Suppliers table: Complete with all required columns');
  console.log('✅ Sale_items table: unit_price column added and working');
  console.log('✅ All queries tested and functional');

} catch (error) {
  console.error('❌ Error in database setup:', error);
} finally {
  db.close();
  console.log('\n🔐 Database connection closed');
}