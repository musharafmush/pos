
import Database from 'better-sqlite3';
import path from 'path';

async function diagnoseAndFixDatabase() {
  try {
    console.log('🔍 Starting comprehensive database diagnosis...');
    
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys but with error handling
    try {
      db.pragma('foreign_keys = ON');
      console.log('✅ Foreign keys enabled');
    } catch (error) {
      console.log('⚠️ Foreign keys issue:', error.message);
    }

    // 1. Check all tables exist
    console.log('\n📋 Checking table existence...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    const tableNames = tables.map(t => t.name);
    console.log('Existing tables:', tableNames);
    
    const requiredTables = [
      'users', 'categories', 'products', 'customers', 'suppliers',
      'sales', 'sale_items', 'purchases', 'purchase_items', 'settings'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    } else {
      console.log('✅ All required tables exist');
    }

    // 2. Check sales table structure
    console.log('\n🔍 Checking sales table...');
    const salesColumns = db.prepare("PRAGMA table_info(sales)").all();
    console.log('Sales columns:', salesColumns.map(c => `${c.name}(${c.type})`));
    
    // 3. Check sale_items table structure 
    console.log('\n🔍 Checking sale_items table...');
    const saleItemsColumns = db.prepare("PRAGMA table_info(sale_items)").all();
    console.log('Sale_items columns:', saleItemsColumns.map(c => `${c.name}(${c.type})`));
    
    // 4. Test a simple insert
    console.log('\n🧪 Testing database writes...');
    
    // Test settings table write
    try {
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES ('test_key', 'test_value', CURRENT_TIMESTAMP)
      `).run();
      console.log('✅ Settings write test passed');
      
      // Cleanup
      db.prepare('DELETE FROM settings WHERE key = ?').run('test_key');
    } catch (error) {
      console.log('❌ Settings write test failed:', error.message);
    }

    // Test sales table write
    try {
      const testSale = db.prepare(`
        INSERT INTO sales (
          order_number, user_id, total, tax, discount, payment_method, status, created_at
        ) VALUES (?, 1, '10.00', '0', '0', 'cash', 'completed', CURRENT_TIMESTAMP)
      `);
      
      const result = testSale.run(`TEST-${Date.now()}`);
      const saleId = result.lastInsertRowid;
      console.log('✅ Sales write test passed, sale ID:', saleId);
      
      // Test sale_items write
      try {
        db.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, subtotal, created_at
          ) VALUES (?, 1, 1, '10.00', '10.00', CURRENT_TIMESTAMP)
        `).run(saleId);
        console.log('✅ Sale_items write test passed');
      } catch (itemError) {
        console.log('❌ Sale_items write test failed:', itemError.message);
      }
      
      // Cleanup test data
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
      db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
      
    } catch (error) {
      console.log('❌ Sales write test failed:', error.message);
    }

    // 5. Check data integrity
    console.log('\n📊 Checking data counts...');
    const counts = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      categories: db.prepare('SELECT COUNT(*) as count FROM categories').get().count,
      products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      customers: db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
      suppliers: db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count,
      sales: db.prepare('SELECT COUNT(*) as count FROM sales').get().count,
      sale_items: db.prepare('SELECT COUNT(*) as count FROM sale_items').get().count,
      purchases: db.prepare('SELECT COUNT(*) as count FROM purchases').get().count,
      purchase_items: db.prepare('SELECT COUNT(*) as count FROM purchase_items').get().count
    };
    
    console.log('Data counts:', counts);

    // 6. Fix common issues
    console.log('\n🔧 Applying fixes...');
    
    // Add missing columns to sale_items if needed
    const saleItemColumnNames = saleItemsColumns.map(c => c.name);
    
    const requiredSaleItemColumns = [
      { name: 'unit_price', sql: 'ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT "0"' },
      { name: 'price', sql: 'ALTER TABLE sale_items ADD COLUMN price TEXT DEFAULT "0"' },
      { name: 'total', sql: 'ALTER TABLE sale_items ADD COLUMN total TEXT DEFAULT "0"' }
    ];
    
    let columnsAdded = 0;
    for (const col of requiredSaleItemColumns) {
      if (!saleItemColumnNames.includes(col.name)) {
        try {
          db.exec(col.sql);
          console.log(`✅ Added ${col.name} column to sale_items`);
          columnsAdded++;
        } catch (error) {
          console.log(`⚠️ Could not add ${col.name}:`, error.message);
        }
      }
    }

    // Update existing sale_items with missing data
    if (columnsAdded > 0) {
      try {
        db.prepare(`
          UPDATE sale_items 
          SET unit_price = COALESCE(unit_price, subtotal), 
              price = COALESCE(price, subtotal),
              total = COALESCE(total, subtotal)
          WHERE unit_price IS NULL OR price IS NULL OR total IS NULL
        `).run();
        console.log('✅ Updated existing sale_items records');
      } catch (error) {
        console.log('⚠️ Could not update sale_items:', error.message);
      }
    }

    // 7. Test the actual API endpoints that might be failing
    console.log('\n🌐 Testing API compatibility...');
    
    // Test recent sales query (used by dashboard)
    try {
      const recentSales = db.prepare(`
        SELECT 
          s.id,
          s.order_number as orderNumber,
          s.customer_id as customerId,
          s.user_id as userId,
          s.total,
          s.tax,
          s.discount,
          s.payment_method as paymentMethod,
          s.status,
          s.created_at as createdAt,
          c.name as customerName,
          u.name as userName,
          COUNT(si.id) as itemCount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 5
      `).all();
      
      console.log('✅ Recent sales query works, found:', recentSales.length, 'sales');
    } catch (error) {
      console.log('❌ Recent sales query failed:', error.message);
    }

    // 8. Final recommendations
    console.log('\n💡 Recommendations:');
    
    if (counts.users === 0) {
      console.log('⚠️ No users found - you may need to create an admin user');
    }
    
    if (counts.categories === 0) {
      console.log('⚠️ No categories found - create a default category');
    }
    
    if (counts.products === 0) {
      console.log('⚠️ No products found - add some products to test sales');
    }
    
    if (counts.sales > 0 && counts.sale_items === 0) {
      console.log('❌ Sales exist but no sale items - this indicates a data consistency issue');
    }

    console.log('\n✅ Database diagnosis complete!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Database diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseAndFixDatabase().catch(console.error);
