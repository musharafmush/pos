
import { sqlite } from "./db/index";

console.log('🔧 Fixing database schema issues...');

try {
  // Check if sale_items table exists and has the correct columns
  const saleItemsInfo = sqlite.prepare(`PRAGMA table_info(sale_items)`).all();
  console.log('📋 Sale Items table columns:', saleItemsInfo.map((col: any) => col.name));

  // Check if subtotal column exists
  const hasSubtotal = saleItemsInfo.some((col: any) => col.name === 'subtotal');
  
  if (!hasSubtotal) {
    console.log('➕ Adding missing subtotal column to sale_items...');
    sqlite.exec(`
      ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT '0';
    `);
    
    // Update existing records to calculate subtotal
    sqlite.exec(`
      UPDATE sale_items 
      SET subtotal = CAST((quantity * COALESCE(unit_price, price, 0)) AS TEXT)
      WHERE subtotal IS NULL OR subtotal = '0';
    `);
    
    console.log('✅ Subtotal column added and populated');
  }

  // Ensure unit_price column exists  
  const hasUnitPrice = saleItemsInfo.some((col: any) => col.name === 'unit_price');
  
  if (!hasUnitPrice) {
    console.log('➕ Adding missing unit_price column to sale_items...');
    sqlite.exec(`
      ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0';
    `);
    
    // Copy data from price column if it exists
    sqlite.exec(`
      UPDATE sale_items 
      SET unit_price = COALESCE(price, '0')
      WHERE unit_price IS NULL OR unit_price = '0';
    `);
    
    console.log('✅ Unit_price column added and populated');
  }

  // Check purchase_items table
  const purchaseItemsInfo = sqlite.prepare(`PRAGMA table_info(purchase_items)`).all();
  console.log('📋 Purchase Items table columns:', purchaseItemsInfo.map((col: any) => col.name));

  // Ensure amount column exists in purchase_items
  const hasAmount = purchaseItemsInfo.some((col: any) => col.name === 'amount');
  
  if (!hasAmount) {
    console.log('➕ Adding missing amount column to purchase_items...');
    sqlite.exec(`
      ALTER TABLE purchase_items ADD COLUMN amount TEXT DEFAULT '0';
    `);
    
    // Calculate amount from quantity * unit_cost
    sqlite.exec(`
      UPDATE purchase_items 
      SET amount = CAST((quantity * COALESCE(unit_cost, 0)) AS TEXT)
      WHERE amount IS NULL OR amount = '0';
    `);
    
    console.log('✅ Amount column added and populated');
  }

  // Test the queries that were failing
  console.log('🧪 Testing sale items query...');
  const testSaleItems = sqlite.prepare(`
    SELECT si.id, si.quantity, si.unit_price, si.subtotal, p.name
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    LIMIT 1
  `).all();
  console.log('✅ Sale items query working');

  console.log('🧪 Testing purchase items query...');
  const testPurchaseItems = sqlite.prepare(`
    SELECT pi.id, pi.quantity, pi.unit_cost, pi.amount, p.name
    FROM purchase_items pi
    LEFT JOIN products p ON pi.product_id = p.id
    LIMIT 1
  `).all();
  console.log('✅ Purchase items query working');

  console.log('🎉 Database schema fixed successfully!');

} catch (error) {
  console.error('❌ Error fixing database:', error);
} finally {
  sqlite.close();
}
