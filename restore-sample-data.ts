import Database from 'better-sqlite3';
import { join } from 'path';

async function restoreSampleData() {
  console.log('🔄 Restoring sample data...');
  
  const dbPath = join(process.cwd(), 'pos-data.db');
  const db = new Database(dbPath);
  
  try {
    // Insert sample offers using direct SQL
    const insertOffer = db.prepare(`
      INSERT OR REPLACE INTO offers (
        name, description, offer_type, discount_value, min_purchase_amount, 
        max_discount_amount, buy_quantity, get_quantity, valid_from, valid_to,
        active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const offers = [
      ['Weekend Special', '20% off on all items', 'percentage', '20', '100', '500', null, null, '2025-06-01', '2025-12-31', 1, 1],
      ['Flat ₹50 Off', 'Flat discount of ₹50 on orders above ₹200', 'flat', '50', '200', null, null, null, '2025-06-01', '2025-12-31', 1, 1],
      ['Buy 2 Get 1 Free', 'Buy 2 items and get 1 free', 'buy_x_get_y', '0', '0', null, 2, 1, '2025-06-01', '2025-12-31', 1, 1],
      ['New Customer 15%', 'Special discount for new customers', 'percentage', '15', '50', '200', null, null, '2025-06-01', '2025-12-31', 1, 1],
      ['Loyalty Bonus', 'Extra loyalty points on purchase', 'loyalty_points', '100', '300', null, null, null, '2025-06-01', '2025-12-31', 1, 1]
    ];
    
    for (const offer of offers) {
      insertOffer.run(...offer);
    }
    console.log('✅ Sample offers created');
    
    // Check if customers already exist
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    
    if (customerCount.count === 0) {
      const insertCustomer = db.prepare(`
        INSERT INTO customers (name, email, phone, address, created_at) 
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      const customers = [
        ['Rajesh Kumar', 'rajesh@example.com', '9876543210', 'Mumbai, Maharashtra'],
        ['Priya Sharma', 'priya@example.com', '9876543211', 'Delhi, India'],
        ['Amit Patel', 'amit@example.com', '9876543212', 'Ahmedabad, Gujarat'],
        ['Sneha Singh', 'sneha@example.com', '9876543213', 'Pune, Maharashtra'],
        ['Vikram Rao', 'vikram@example.com', '9876543214', 'Bangalore, Karnataka']
      ];
      
      for (const customer of customers) {
        insertCustomer.run(...customer);
      }
      console.log('✅ Sample customers created');
    } else {
      console.log('✅ Customers already exist');
    }
    
    // Insert sample loyalty data using only existing columns
    const insertLoyalty = db.prepare(`
      INSERT OR REPLACE INTO customer_loyalty (
        customer_id, total_points, used_points, available_points, 
        last_updated, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const loyaltyData = [
      [1, '1500', '300', '1200'],
      [2, '800', '100', '700'],
      [3, '2200', '500', '1700'],
      [4, '600', '0', '600'],
      [5, '1100', '200', '900']
    ];
    
    for (const loyalty of loyaltyData) {
      insertLoyalty.run(...loyalty);
    }
    console.log('✅ Sample loyalty data created');
    
    console.log('\n🎉 All sample data restored successfully!');
    
  } catch (error) {
    console.error('❌ Error restoring sample data:', error);
  } finally {
    db.close();
  }
}

restoreSampleData().catch(console.error);