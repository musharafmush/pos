import { sqlite } from './db/index.js';

async function fixCustomerLoyaltyTable() {
  try {
    console.log('🔧 Checking and fixing customer loyalty table...');

    // Check if customer_loyalty table exists
    const tableExists = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='customer_loyalty'
    `).get();

    if (!tableExists) {
      console.log('📝 Creating customer_loyalty table...');
      
      // Create customer_loyalty table
      sqlite.prepare(`
        CREATE TABLE customer_loyalty (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          total_points REAL DEFAULT 0,
          used_points REAL DEFAULT 0,
          available_points REAL DEFAULT 0,
          tier TEXT DEFAULT 'Member',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          UNIQUE(customer_id)
        )
      `).run();
      
      console.log('✅ Customer loyalty table created successfully');
    } else {
      console.log('⚠️ Customer loyalty table already exists');
      
      // Check if all required columns exist
      const columns = sqlite.prepare("PRAGMA table_info(customer_loyalty)").all();
      console.log('Current columns:', columns.map((col: any) => col.name));
      
      const requiredColumns = [
        { name: 'id', type: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
        { name: 'customer_id', type: 'INTEGER NOT NULL' },
        { name: 'total_points', type: 'REAL DEFAULT 0' },
        { name: 'used_points', type: 'REAL DEFAULT 0' },
        { name: 'available_points', type: 'REAL DEFAULT 0' },
        { name: 'tier', type: 'TEXT DEFAULT "Member"' },
        { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { name: 'last_updated', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
      ];
      
      // Add missing columns
      for (const column of requiredColumns) {
        const columnExists = columns.some((col: any) => col.name === column.name);
        
        if (!columnExists && column.name !== 'id') {
          try {
            const alterQuery = `ALTER TABLE customer_loyalty ADD COLUMN ${column.name} ${column.type}`;
            sqlite.prepare(alterQuery).run();
            console.log(`✅ Added column: ${column.name}`);
          } catch (error: any) {
            if (error.message.includes('duplicate column name')) {
              console.log(`⚠️ Column ${column.name} already exists`);
            } else {
              console.error(`❌ Failed to add column ${column.name}:`, error.message);
            }
          }
        }
      }
    }

    // Create some sample loyalty data if none exists
    const existingLoyalty = sqlite.prepare('SELECT COUNT(*) as count FROM customer_loyalty').get();
    
    if (existingLoyalty.count === 0) {
      console.log('📝 Creating sample loyalty data...');
      
      // Get existing customers
      const customers = sqlite.prepare('SELECT id FROM customers LIMIT 5').all();
      
      for (const customer of customers) {
        const points = Math.floor(Math.random() * 500) + 100; // Random points between 100-600
        const usedPoints = Math.floor(points * 0.2); // 20% used
        const availablePoints = points - usedPoints;
        
        sqlite.prepare(`
          INSERT INTO customer_loyalty (
            customer_id, total_points, used_points, available_points, tier
          ) VALUES (?, ?, ?, ?, ?)
        `).run(customer.id, points, usedPoints, availablePoints, 'Bronze');
        
        console.log(`✅ Created loyalty record for customer ${customer.id}: ${availablePoints} points`);
      }
    }

    console.log('✅ Customer loyalty table setup complete!');

  } catch (error) {
    console.error('❌ Error fixing customer loyalty table:', error);
  }
}

fixCustomerLoyaltyTable();