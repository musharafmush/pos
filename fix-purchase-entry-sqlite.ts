import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseEntrySQLite() {
  try {
    console.log('🔧 Fixing Purchase Entry SQLite database schema...');
    
    // Connect to SQLite database
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check current tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📋 Current tables:', tables.map((t: any) => t.name));
    
    // Create purchase_items table if it doesn't exist
    const createPurchaseItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
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
    
    db.exec(createPurchaseItemsTable);
    console.log('✅ Purchase items table created/verified');
    
    // Check if table has data
    const itemCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get();
    console.log(`📊 Purchase items in database: ${(itemCount as any).count}`);
    
    // Show sample data if exists
    if ((itemCount as any).count > 0) {
      const sampleItems = db.prepare(`
        SELECT pi.*, p.name as product_name, pu.order_number 
        FROM purchase_items pi 
        LEFT JOIN products p ON pi.product_id = p.id 
        LEFT JOIN purchases pu ON pi.purchase_id = pu.id 
        LIMIT 5
      `).all();
      
      console.log('📦 Sample purchase items:');
      sampleItems.forEach((item: any) => {
        console.log(`  - ${item.product_name}: Qty ${item.quantity} × ₹${item.unit_cost} = ₹${item.subtotal} (PO: ${item.order_number})`);
      });
    }
    
    console.log('🎯 Purchase Entry SQLite schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing Purchase Entry SQLite:', error);
  }
}

fixPurchaseEntrySQLite();