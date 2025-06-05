
import { db } from './db/sqlite-index';

async function createCashRegisterTables() {
  try {
    console.log('Creating cash register tables...');

    // Create cash_registers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        opening_cash REAL NOT NULL DEFAULT 0,
        current_cash REAL NOT NULL DEFAULT 0,
        closing_cash REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        opened_by INTEGER NOT NULL,
        closed_by INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (opened_by) REFERENCES users(id),
        FOREIGN KEY (closed_by) REFERENCES users(id)
      )
    `);

    // Create cash_transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'sale', 'refund', 'withdrawal')),
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reason TEXT,
        reference TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (register_id) REFERENCES cash_registers(register_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);
      CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON cash_registers(opened_at);
      CREATE INDEX IF NOT EXISTS idx_cash_transactions_register_id ON cash_transactions(register_id);
      CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at ON cash_transactions(created_at);
    `);

    console.log('✅ Cash register tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating cash register tables:', error);
    throw error;
  }
}

if (require.main === module) {
  createCashRegisterTables()
    .then(() => {
      console.log('Cash register setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { createCashRegisterTables };
