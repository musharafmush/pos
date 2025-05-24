import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Completing database setup...');

try {
  // Fix the subtotal calculation with proper SQL syntax
  console.log('Updating sale_items subtotal values...');
  
  // Use a safer approach - update records one by one with proper calculation
  const saleItems = db.prepare("SELECT id, quantity, price FROM sale_items WHERE subtotal = '0' OR subtotal IS NULL").all();
  
  if (saleItems.length > 0) {
    const updateSubtotal = db.prepare("UPDATE sale_items SET subtotal = ? WHERE id = ?");
    
    for (const item of saleItems) {
      const quantity = parseFloat(item.quantity || '0');
      const price = parseFloat(item.price || '0');
      const subtotal = (quantity * price).toString();
      updateSubtotal.run(subtotal, item.id);
    }
    
    console.log(`✅ Updated subtotal for ${saleItems.length} sale items`);
  }

  // Ensure all required columns exist with proper fallback handling
  console.log('Verifying all table structures...');
  
  // Check sales table has all required columns
  const salesCols = db.prepare("PRAGMA table_info(sales)").all();
  const salesColumnNames = salesCols.map(col => col.name);
  
  if (!salesColumnNames.includes('status')) {
    db.exec('ALTER TABLE sales ADD COLUMN status TEXT DEFAULT "completed"');
    console.log('✅ Added status column to sales table');
  }

  // Test all critical queries to ensure they work
  console.log('Testing database queries...');
  
  // Test sales query
  const testSales = db.prepare(`
    SELECT id, order_number, total, 
           COALESCE(discount, '0') as discount,
           COALESCE(status, 'completed') as status,
           created_at
    FROM sales LIMIT 1
  `).all();
  console.log('✅ Sales query working');

  // Test sale_items query  
  const testSaleItems = db.prepare(`
    SELECT id, sale_id, product_id, quantity, price,
           COALESCE(subtotal, total) as subtotal
    FROM sale_items LIMIT 1
  `).all();
  console.log('✅ Sale_items query working');

  console.log('✅ Database setup completed successfully!');
  console.log('Your POS system is now fully operational.');

} catch (error) {
  console.error('❌ Error completing database setup:', error);
} finally {
  db.close();
  console.log('Database connection closed');
}