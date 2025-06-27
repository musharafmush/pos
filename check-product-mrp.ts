import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

async function checkProductMrp() {
  try {
    // Get product 4 (Sugar) details
    const product = db.prepare('SELECT id, name, price, mrp FROM products WHERE id = 4').get();
    console.log('Product 4 (Sugar) details:', product);
    
    // Get recent sale items for product 4
    const saleItems = db.prepare(`
      SELECT si.*, s.order_number 
      FROM sale_items si 
      LEFT JOIN sales s ON si.sale_id = s.id 
      WHERE si.product_id = 4 
      ORDER BY si.id DESC 
      LIMIT 3
    `).all();
    
    console.log('Recent sale items for Sugar:', saleItems);
    
  } catch (error) {
    console.error('Error checking product MRP:', error);
  } finally {
    db.close();
  }
}

checkProductMrp().catch(console.error);