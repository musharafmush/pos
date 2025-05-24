import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Fixing missing database columns and tables...');

try {
  // Check sales table structure
  const salesTableInfo = db.prepare("PRAGMA table_info(sales)").all();
  console.log('Sales table structure:', salesTableInfo);

  // Check if discount column exists in sales table
  const hasDiscountColumn = salesTableInfo.some(col => col.name === 'discount');
  if (!hasDiscountColumn) {
    console.log('Adding discount column to sales table...');
    db.exec('ALTER TABLE sales ADD COLUMN discount TEXT DEFAULT "0"');
    console.log('✅ Discount column added to sales table');
  }

  // Check sale_items table structure
  const saleItemsTableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
  console.log('Sale_items table structure:', saleItemsTableInfo);

  // Check if subtotal column exists in sale_items table
  const hasSubtotalColumn = saleItemsTableInfo.some(col => col.name === 'subtotal');
  if (!hasSubtotalColumn) {
    console.log('Adding subtotal column to sale_items table...');
    db.exec('ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT "0"');
    console.log('✅ Subtotal column added to sale_items table');
  }

  // Update existing sale_items records to have proper subtotal values
  console.log('Updating existing sale_items subtotal values...');
  db.exec(`
    UPDATE sale_items 
    SET subtotal = CAST((CAST(quantity AS REAL) * CAST(price AS REAL)) AS TEXT)
    WHERE subtotal = "0" OR subtotal IS NULL
  `);

  // Check purchase_items table structure
  const purchaseItemsTableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
  console.log('Purchase_items table structure:', purchaseItemsTableInfo);

  // Ensure all required columns exist in purchase_items
  const hasFreightColumn = purchaseItemsTableInfo.some(col => col.name === 'freight_allocation');
  if (!hasFreightColumn) {
    console.log('Adding freight_allocation column to purchase_items table...');
    db.exec('ALTER TABLE purchase_items ADD COLUMN freight_allocation TEXT DEFAULT "0"');
    console.log('✅ Freight_allocation column added to purchase_items table');
  }

  // Test queries to ensure everything works
  console.log('Testing sales queries...');
  const testSales = db.prepare("SELECT id, total, discount FROM sales LIMIT 1").all();
  console.log('✅ Sales query test successful:', testSales);

  console.log('Testing sale_items queries...');
  const testSaleItems = db.prepare("SELECT id, quantity, price, subtotal FROM sale_items LIMIT 1").all();
  console.log('✅ Sale_items query test successful:', testSaleItems);

  console.log('✅ All database fixes completed successfully!');

} catch (error) {
  console.error('❌ Error fixing database:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}