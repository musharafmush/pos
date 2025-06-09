
import { sqlite } from './db/index.js';

async function fixCustomersTableComplete() {
  try {
    console.log('🔧 Fixing customers table schema completely...');

    // Check if customers table exists
    const tableExists = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='customers'
    `).get();

    if (!tableExists) {
      console.log('📝 Creating customers table with all columns...');
      sqlite.exec(`
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          tax_id TEXT,
          credit_limit TEXT DEFAULT '0',
          business_name TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Customers table created successfully');
    } else {
      console.log('📝 Customers table exists, checking and adding missing columns...');
      
      // Get current table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(customers)").all();
      const existingColumns = tableInfo.map(col => col.name);
      console.log('Current columns:', existingColumns);

      // Define required columns
      const requiredColumns = [
        { name: 'tax_id', type: 'TEXT' },
        { name: 'credit_limit', type: 'TEXT DEFAULT "0"' },
        { name: 'business_name', type: 'TEXT' }
      ];

      // Add missing columns
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          try {
            const alterQuery = `ALTER TABLE customers ADD COLUMN ${column.name} ${column.type}`;
            console.log(`Adding column: ${alterQuery}`);
            sqlite.exec(alterQuery);
            console.log(`✅ Added column: ${column.name}`);
          } catch (e) {
            console.log(`⚠️  Column ${column.name} might already exist or error: ${e.message}`);
          }
        } else {
          console.log(`✅ Column ${column.name} already exists`);
        }
      }
    }

    // Verify final table structure
    const finalTableInfo = sqlite.prepare("PRAGMA table_info(customers)").all();
    console.log('✅ Final customers table structure:');
    finalTableInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    console.log('✅ Customers table schema fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing customers table:', error);
  }
}

fixCustomersTableComplete().catch(console.error);
