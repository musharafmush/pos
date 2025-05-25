import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseItemsTableName() {
  try {
    console.log('🔧 Fixing Purchase Items table name issue...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Check if purchases_items table exists (incorrect name)
    const checkPurchasesItems = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='purchases_items'
    `).get();
    
    console.log('❌ purchases_items table exists:', !!checkPurchasesItems);
    
    // Check if purchase_items table exists (correct name)
    const checkPurchaseItems = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_items'
    `).get();
    
    console.log('✅ purchase_items table exists:', !!checkPurchaseItems);
    
    // If purchases_items exists but purchase_items doesn't, rename it
    if (checkPurchasesItems && !checkPurchaseItems) {
      console.log('🔄 Renaming purchases_items to purchase_items...');
      db.exec('ALTER TABLE purchases_items RENAME TO purchase_items');
      console.log('✅ Table renamed successfully!');
    }
    
    // If neither exists, create the correct table
    if (!checkPurchasesItems && !checkPurchaseItems) {
      console.log('🆕 Creating purchase_items table...');
      const createTable = `
        CREATE TABLE purchase_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          purchase_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          received_qty INTEGER DEFAULT 0,
          unit_cost TEXT NOT NULL DEFAULT '0',
          subtotal TEXT NOT NULL DEFAULT '0',
          amount TEXT DEFAULT '0',
          expiry_date TEXT,
          hsn_code TEXT,
          tax_percentage TEXT,
          discount_amount TEXT,
          discount_percent TEXT,
          net_cost TEXT,
          selling_price TEXT,
          mrp TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purchase_id) REFERENCES purchases (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `;
      db.exec(createTable);
      console.log('✅ purchase_items table created!');
    }
    
    // Add received_qty column if it doesn't exist
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    const hasReceivedQty = tableInfo.some((col: any) => col.name === 'received_qty');
    
    if (!hasReceivedQty) {
      console.log('➕ Adding received_qty column...');
      db.exec('ALTER TABLE purchase_items ADD COLUMN received_qty INTEGER DEFAULT 0');
      console.log('✅ received_qty column added!');
    }
    
    // Show current table structure
    console.log('📋 Current purchase_items table structure:');
    tableInfo.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    console.log('🎯 Purchase Items table name issue fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing Purchase Items table:', error);
  }
}

fixPurchaseItemsTableName();