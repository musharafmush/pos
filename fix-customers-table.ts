
import { sqlite } from './db/sqlite-index.js';

async function fixCustomersTable() {
  try {
    console.log('🔧 Fixing customers table schema...');

    // Check if customers table exists
    const tableExists = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='customers'
    `).get();

    if (!tableExists) {
      console.log('📝 Creating customers table...');
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
    } else {
      console.log('📝 Updating customers table schema...');
      
      // Add missing columns if they don't exist
      try {
        sqlite.exec('ALTER TABLE customers ADD COLUMN tax_id TEXT');
      } catch (e) {
        console.log('tax_id column already exists');
      }
      
      try {
        sqlite.exec('ALTER TABLE customers ADD COLUMN credit_limit TEXT DEFAULT "0"');
      } catch (e) {
        console.log('credit_limit column already exists');
      }
      
      try {
        sqlite.exec('ALTER TABLE customers ADD COLUMN business_name TEXT');
      } catch (e) {
        console.log('business_name column already exists');
      }
    }

    console.log('✅ Customers table schema fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing customers table:', error);
  }
}

fixCustomersTable().catch(console.error);
