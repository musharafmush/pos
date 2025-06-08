
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixReturnsTable() {
  try {
    console.log('🔧 Fixing returns table schema...');
    
    const dbPath = join(__dirname, 'pos-data.db');
    const db = new Database(dbPath);
    
    // Check if returns table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='returns'
    `).get();
    
    if (!tableExists) {
      console.log('📦 Creating returns table...');
      db.exec(`
        CREATE TABLE returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_number TEXT NOT NULL UNIQUE,
          sale_id INTEGER NOT NULL,
          user_id INTEGER DEFAULT 1,
          refund_method TEXT NOT NULL DEFAULT 'cash',
          total_refund TEXT NOT NULL,
          reason TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'completed',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales (id)
        )
      `);
      console.log('✅ Returns table created');
    } else {
      console.log('📦 Returns table exists, checking schema...');
      
      // Check if return_number column exists
      const columns = db.prepare("PRAGMA table_info(returns)").all();
      const hasReturnNumber = columns.some(col => col.name === 'return_number');
      
      if (!hasReturnNumber) {
        console.log('📝 Adding return_number column...');
        db.exec('ALTER TABLE returns ADD COLUMN return_number TEXT');
        
        // Update existing records with return numbers
        const existingReturns = db.prepare('SELECT id FROM returns WHERE return_number IS NULL').all();
        const updateStmt = db.prepare('UPDATE returns SET return_number = ? WHERE id = ?');
        
        for (const returnRecord of existingReturns) {
          const returnNumber = `RET-${Date.now()}-${returnRecord.id}`;
          updateStmt.run(returnNumber, returnRecord.id);
        }
        console.log('✅ Updated existing returns with return numbers');
      }
    }
    
    // Check if return_items table exists
    const returnItemsExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='return_items'
    `).get();
    
    if (!returnItemsExists) {
      console.log('📦 Creating return_items table...');
      db.exec(`
        CREATE TABLE return_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price TEXT NOT NULL,
          subtotal TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (return_id) REFERENCES returns (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);
      console.log('✅ Return_items table created');
    }
    
    db.close();
    console.log('✅ Returns table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing returns table:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixReturnsTable()
    .then(() => {
      console.log('🎉 Returns table fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Returns table fix failed:', error);
      process.exit(1);
    });
}

export { fixReturnsTable };
