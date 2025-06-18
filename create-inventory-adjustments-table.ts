import Database from 'better-sqlite3';
import path from 'path';

async function createInventoryAdjustmentsTable() {
  const dbPath = path.join(process.cwd(), 'pos-data.db');
  const db = new Database(dbPath);

  try {
    console.log('🔄 Creating inventory_adjustments table...');
    
    // Create the inventory_adjustments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('add', 'remove', 'transfer', 'correction')),
        quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        unit_cost REAL,
        batch_number TEXT,
        expiry_date DATE,
        location_from TEXT,
        location_to TEXT,
        reference_document TEXT,
        approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER,
        approved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      );
    `);
    
    console.log('✅ inventory_adjustments table created successfully');
    
    // Verify the table was created
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory_adjustments'").get();
    if (tableInfo) {
      console.log('✅ Table verification successful');
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating inventory_adjustments table:', error);
  } finally {
    db.close();
  }
}

// Run the function
createInventoryAdjustmentsTable().catch(console.error);