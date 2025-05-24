import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing suppliers table for SQLite compatibility...');

try {
  // Check suppliers table structure
  const suppliersTableInfo = db.prepare("PRAGMA table_info(suppliers)").all();
  console.log('Suppliers table structure:', suppliersTableInfo);

  const columnNames = suppliersTableInfo.map(col => col.name);

  // Add missing columns if they don't exist
  const requiredColumns = [
    { name: 'registration_number', type: 'TEXT', default: 'NULL' },
    { name: 'website', type: 'TEXT', default: 'NULL' },
    { name: 'bank_name', type: 'TEXT', default: 'NULL' },
    { name: 'bank_account', type: 'TEXT', default: 'NULL' },
    { name: 'ifsc_code', type: 'TEXT', default: 'NULL' },
    { name: 'credit_period', type: 'INTEGER', default: '30' },
    { name: 'credit_limit', type: 'TEXT', default: "'0'" },
    { name: 'default_discount', type: 'TEXT', default: "'0'" },
    { name: 'notes', type: 'TEXT', default: 'NULL' },
    { name: 'mobile_no', type: 'TEXT', default: 'NULL' },
    { name: 'status', type: 'TEXT', default: "'active'" },
    { name: 'extension_number', type: 'TEXT', default: 'NULL' },
    { name: 'fax', type: 'TEXT', default: 'NULL' },
    { name: 'fax_no', type: 'TEXT', default: 'NULL' },
    { name: 'country', type: 'TEXT', default: 'NULL' },
    { name: 'state', type: 'TEXT', default: 'NULL' },
    { name: 'city', type: 'TEXT', default: 'NULL' },
    { name: 'pincode', type: 'TEXT', default: 'NULL' },
    { name: 'pin_code', type: 'TEXT', default: 'NULL' },
    { name: 'building', type: 'TEXT', default: 'NULL' },
    { name: 'street', type: 'TEXT', default: 'NULL' },
    { name: 'area', type: 'TEXT', default: 'NULL' },
    { name: 'landmark', type: 'TEXT', default: 'NULL' }
  ];

  for (const column of requiredColumns) {
    if (!columnNames.includes(column.name)) {
      console.log(`Adding missing column: ${column.name}`);
      db.exec(`ALTER TABLE suppliers ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`);
      console.log(`✅ Added ${column.name} column`);
    }
  }

  // Also fix sales_items table for unit_price column
  const saleItemsTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  const saleItemsColumns = saleItemsTableInfo.map(col => col.name);
  
  if (!saleItemsColumns.includes('unit_price')) {
    console.log('Adding unit_price column to sale_items table...');
    db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
    
    // Update existing records to use price as unit_price
    db.exec("UPDATE sale_items SET unit_price = price WHERE unit_price = '0' OR unit_price IS NULL");
    console.log('✅ Added unit_price column to sale_items');
  }

  // Test suppliers query
  console.log('Testing suppliers query...');
  const testSuppliers = db.prepare(`
    SELECT id, name, email, phone, address, contact_person,
           COALESCE(registration_number, '') as registration_number,
           COALESCE(tax_id, '') as tax_id,
           COALESCE(website, '') as website,
           status, created_at
    FROM suppliers LIMIT 1
  `).all();
  console.log('✅ Suppliers query working');

  // Test sale_items query
  console.log('Testing sale_items query...');
  const testSaleItems = db.prepare(`
    SELECT id, sale_id, product_id, quantity, 
           COALESCE(unit_price, price) as unit_price,
           price, total
    FROM sale_items LIMIT 1
  `).all();
  console.log('✅ Sale_items query working');

  console.log('✅ All supplier table fixes completed successfully!');

} catch (error) {
  console.error('❌ Error fixing suppliers table:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}