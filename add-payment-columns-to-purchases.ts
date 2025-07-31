import { db } from './db/index.js';

async function addPaymentColumnsToPs() {
  try {
    console.log('🔄 Adding payment columns to purchases table...');
    
    // Import SQLite instance
    const { sqlite } = await import('./db/index.js');
    
    // Check existing columns
    const tableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
    console.log('📋 Existing columns:', tableInfo.map((col: any) => col.name));
    
    // Add missing payment columns to purchases table
    const columnsToAdd = [
      { name: 'payment_status', sql: 'ALTER TABLE purchases ADD COLUMN payment_status TEXT DEFAULT "due"' },
      { name: 'paid_amount', sql: 'ALTER TABLE purchases ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0.00' },
      { name: 'payment_method', sql: 'ALTER TABLE purchases ADD COLUMN payment_method TEXT DEFAULT "Cash"' },
      { name: 'payment_date', sql: 'ALTER TABLE purchases ADD COLUMN payment_date TIMESTAMP' },
      { name: 'payment_type', sql: 'ALTER TABLE purchases ADD COLUMN payment_type TEXT DEFAULT "Credit"' }
    ];
    
    const existingColumnNames = tableInfo.map((col: any) => col.name);
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          console.log(`➕ Adding column: ${column.name}`);
          sqlite.prepare(column.sql).run();
          console.log(`✅ Added ${column.name} column successfully`);
        } catch (error) {
          console.log(`⚠️ Column ${column.name} might already exist or error:`, error.message);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Verify the new structure
    const updatedTableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
    console.log('📋 Updated columns:', updatedTableInfo.map((col: any) => col.name));
    
    console.log('🎉 Payment columns addition completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding payment columns:', error);
    throw error;
  }
}

// Run the function
addPaymentColumnsToPs().catch(console.error);