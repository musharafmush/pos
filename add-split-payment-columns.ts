#!/usr/bin/env tsx

import { sqlite } from './db/index.js';

async function addSplitPaymentColumns() {
  console.log('🔄 Adding split payment columns to sales table...');
  
  try {
    // Add new columns for split payment amounts
    const alterQueries = [
      'ALTER TABLE sales ADD COLUMN cash_amount REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN upi_amount REAL DEFAULT 0', 
      'ALTER TABLE sales ADD COLUMN card_amount REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN bank_transfer_amount REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN cheque_amount REAL DEFAULT 0'
    ];

    for (const query of alterQueries) {
      try {
        sqlite.exec(query);
        console.log(`✅ ${query}`);
      } catch (error) {
        // Column might already exist, check error message
        if (error.message.includes('duplicate column name')) {
          console.log(`⚠️ Column already exists: ${query}`);
        } else {
          throw error;
        }
      }
    }

    // Update existing sales to populate split payment amounts based on payment method and total
    console.log('🔄 Migrating existing sales data...');
    
    const migrationQueries = [
      // For cash payments, set cash_amount = total
      `UPDATE sales SET cash_amount = CAST(total AS REAL) WHERE payment_method = 'cash'`,
      
      // For UPI payments, set upi_amount = total  
      `UPDATE sales SET upi_amount = CAST(total AS REAL) WHERE payment_method = 'upi'`,
      
      // For card payments, set card_amount = total
      `UPDATE sales SET card_amount = CAST(total AS REAL) WHERE payment_method = 'card'`,
      
      // For bank transfer payments, set bank_transfer_amount = total
      `UPDATE sales SET bank_transfer_amount = CAST(total AS REAL) WHERE payment_method = 'bank_transfer'`,
      
      // For cheque payments, set cheque_amount = total
      `UPDATE sales SET cheque_amount = CAST(total AS REAL) WHERE payment_method = 'cheque'`
    ];

    for (const query of migrationQueries) {
      const result = sqlite.prepare(query).run();
      console.log(`✅ ${query} (${result.changes} rows updated)`);
    }

    console.log('🎉 Split payment columns added and data migrated successfully!');
    
    // Display summary of migrated data
    const summary = sqlite.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(CAST(total AS REAL)) as total_amount,
        SUM(cash_amount) as cash_total,
        SUM(upi_amount) as upi_total,
        SUM(card_amount) as card_total,
        SUM(bank_transfer_amount) as bank_transfer_total,
        SUM(cheque_amount) as cheque_total
      FROM sales 
      GROUP BY payment_method
    `).all();
    
    console.log('\n📊 Migration Summary:');
    console.table(summary);
    
  } catch (error) {
    console.error('❌ Error adding split payment columns:', error);
    throw error;
  }
}

if (import.meta.main) {
  addSplitPaymentColumns()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}