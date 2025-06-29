import { sqlite } from './db/index.js';

async function createSampleDashboardData() {
  try {
    console.log('🎯 Creating sample dashboard data...');

    // First, let's check if we have any existing sales
    const existingSales = sqlite.prepare('SELECT COUNT(*) as count FROM sales').get();
    console.log('📊 Existing sales count:', existingSales.count);

    if (existingSales.count > 0) {
      console.log('✅ Sales data already exists, skipping sample data creation');
      return;
    }

    // Create some sample sales for today
    const today = new Date().toISOString();
    const todayDate = today.split('T')[0];
    
    // Sample sales data
    const sampleSales = [
      {
        order_number: `POS${Date.now()}001`,
        customer_id: 1,
        user_id: 1,
        total: 1250.00,
        tax: 225.00,
        discount: 0,
        payment_method: 'cash',
        status: 'completed',
        created_at: today
      },
      {
        order_number: `POS${Date.now()}002`,
        customer_id: 2,
        user_id: 1,
        total: 890.00,
        tax: 160.20,
        discount: 50.00,
        payment_method: 'upi',
        status: 'completed',
        created_at: today
      },
      {
        order_number: `POS${Date.now()}003`,
        customer_id: null,
        user_id: 1,
        total: 567.50,
        tax: 102.15,
        discount: 0,
        payment_method: 'card',
        status: 'completed',
        created_at: today
      }
    ];

    // Insert sample sales
    const insertSale = sqlite.prepare(`
      INSERT INTO sales (order_number, customer_id, user_id, total, tax, discount, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sale of sampleSales) {
      const result = insertSale.run(
        sale.order_number,
        sale.customer_id,
        sale.user_id,
        sale.total,
        sale.tax,
        sale.discount,
        sale.payment_method,
        sale.status,
        sale.created_at
      );
      console.log(`✅ Created sample sale: ${sale.order_number} - ₹${sale.total}`);
    }

    // Create some sample purchases for today
    const samplePurchases = [
      {
        order_number: `PUR${Date.now()}001`,
        supplier_id: 1,
        user_id: 1,
        total: 15000.00,
        tax: 2700.00,
        discount: 0,
        status: 'completed',
        created_at: today
      },
      {
        order_number: `PUR${Date.now()}002`,
        supplier_id: 2,
        user_id: 1,
        total: 8500.00,
        tax: 1530.00,
        discount: 200.00,
        status: 'completed',
        created_at: today
      }
    ];

    const insertPurchase = sqlite.prepare(`
      INSERT INTO purchases (order_number, supplier_id, user_id, total, tax, discount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const purchase of samplePurchases) {
      const result = insertPurchase.run(
        purchase.order_number,
        purchase.supplier_id,
        purchase.user_id,
        purchase.total,
        purchase.tax,
        purchase.discount,
        purchase.status,
        purchase.created_at
      );
      console.log(`✅ Created sample purchase: ${purchase.order_number} - ₹${purchase.total}`);
    }

    console.log('🎉 Sample dashboard data created successfully!');
    console.log('📊 Dashboard should now show:');
    console.log(`   - Today's Sales: ₹${sampleSales.reduce((sum, sale) => sum + sale.total, 0)}`);
    console.log(`   - Today's Purchases: ₹${samplePurchases.reduce((sum, purchase) => sum + purchase.total, 0)}`);

  } catch (error) {
    console.error('❌ Error creating sample dashboard data:', error);
  }
}

// Run the function
createSampleDashboardData();