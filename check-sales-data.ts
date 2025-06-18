import Database from 'better-sqlite3';
import path from 'path';

// Connect to the SQLite database
const dbPath = path.join(process.cwd(), 'pos-data.db');
const sqlite = new Database(dbPath);

console.log('🔍 Checking sales data in database...');

try {
  // Check if sales table exists
  const tableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='sales'
  `).get();
  
  console.log('📋 Sales table exists:', !!tableExists);
  
  if (tableExists) {
    // Get total count of sales
    const totalCount = sqlite.prepare('SELECT COUNT(*) as count FROM sales').get();
    console.log(`📊 Total sales records: ${totalCount.count}`);
    
    if (totalCount.count > 0) {
      // Get recent sales data
      const recentSales = sqlite.prepare(`
        SELECT 
          id, order_number, total, payment_method, status, created_at,
          customer_id, user_id
        FROM sales 
        ORDER BY created_at DESC 
        LIMIT 5
      `).all();
      
      console.log('📈 Recent sales data:');
      recentSales.forEach(sale => {
        console.log(`  - ID: ${sale.id}, Order: ${sale.order_number}, Total: ${sale.total}, Date: ${sale.created_at}`);
      });
      
      // Check sale_items table
      const saleItemsCount = sqlite.prepare('SELECT COUNT(*) as count FROM sale_items').get();
      console.log(`📦 Total sale items records: ${saleItemsCount.count}`);
      
      if (saleItemsCount.count > 0) {
        const sampleItems = sqlite.prepare(`
          SELECT si.sale_id, si.quantity, si.unit_price, p.name as product_name
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          LIMIT 5
        `).all();
        
        console.log('📝 Sample sale items:');
        sampleItems.forEach(item => {
          console.log(`  - Sale ID: ${item.sale_id}, Product: ${item.product_name}, Qty: ${item.quantity}`);
        });
      }
    }
  }
  
  // Check users table
  const usersCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`👥 Total users: ${usersCount.count}`);
  
  // Check customers table
  const customersCount = sqlite.prepare('SELECT COUNT(*) as count FROM customers').get();
  console.log(`🧑‍🤝‍🧑 Total customers: ${customersCount.count}`);
  
} catch (error) {
  console.error('❌ Error checking database:', error);
} finally {
  sqlite.close();
}