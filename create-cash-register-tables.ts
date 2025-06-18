import { sqlite } from './db/index.js';

async function createCashRegisterTables() {
  try {
    console.log('Creating cash register tables...');

    // Create cash_registers table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'open',
        opening_cash TEXT NOT NULL DEFAULT '0',
        current_cash TEXT NOT NULL DEFAULT '0',
        cash_received TEXT NOT NULL DEFAULT '0',
        upi_received TEXT NOT NULL DEFAULT '0',
        card_received TEXT NOT NULL DEFAULT '0',
        bank_received TEXT NOT NULL DEFAULT '0',
        cheque_received TEXT NOT NULL DEFAULT '0',
        other_received TEXT NOT NULL DEFAULT '0',
        total_withdrawals TEXT NOT NULL DEFAULT '0',
        total_refunds TEXT NOT NULL DEFAULT '0',
        total_sales TEXT NOT NULL DEFAULT '0',
        notes TEXT,
        opened_by TEXT NOT NULL,
        closed_by TEXT,
        opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      )
    `);

    // Create cash_register_transactions table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS cash_register_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        payment_method TEXT,
        reason TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (register_id) REFERENCES cash_registers(id)
      )
    `);

    console.log('✅ Cash register tables created successfully');

    // Verify tables exist
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('cash_registers', 'cash_register_transactions')
    `).all();

    console.log('Created tables:', tables);

  } catch (error) {
    console.error('❌ Error creating cash register tables:', error);
    throw error;
  }
}

// Run the function
createCashRegisterTables()
  .then(() => {
    console.log('Cash register tables setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create cash register tables:', error);
    process.exit(1);
  });