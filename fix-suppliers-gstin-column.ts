import { sqlite } from './db/index.js';

async function fixSuppliersGstinColumn() {
  try {
    console.log('🔧 Fixing suppliers table - adding missing GST columns...');

    // Check current table structure
    const currentColumns = sqlite.prepare("PRAGMA table_info(suppliers)").all();
    console.log('Current suppliers columns:', currentColumns.map((col: any) => col.name));

    // List of columns that might be missing
    const requiredColumns = [
      { name: 'gstin', type: 'TEXT' },
      { name: 'gst_treatment', type: 'TEXT' },
      { name: 'pan', type: 'TEXT' },
      { name: 'tan', type: 'TEXT' },
      { name: 'payment_terms', type: 'TEXT' },
      { name: 'opening_balance', type: 'REAL DEFAULT 0' },
      { name: 'balance_type', type: 'TEXT DEFAULT "Dr"' },
      { name: 'business_type', type: 'TEXT' },
      { name: 'bank_name', type: 'TEXT' },
      { name: 'account_number', type: 'TEXT' },
      { name: 'ifsc_code', type: 'TEXT' },
      { name: 'branch_name', type: 'TEXT' },
      { name: 'credit_limit', type: 'REAL DEFAULT 0' },
      { name: 'msme_type', type: 'TEXT' }
    ];

    // Add missing columns
    for (const column of requiredColumns) {
      const columnExists = currentColumns.some((col: any) => col.name === column.name);
      
      if (!columnExists) {
        try {
          const alterQuery = `ALTER TABLE suppliers ADD COLUMN ${column.name} ${column.type}`;
          sqlite.prepare(alterQuery).run();
          console.log(`✅ Added column: ${column.name}`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name')) {
            console.log(`⚠️ Column ${column.name} already exists`);
          } else {
            console.error(`❌ Failed to add column ${column.name}:`, error.message);
          }
        }
      } else {
        console.log(`⚠️ Column ${column.name} already exists`);
      }
    }

    // Verify the updated table structure
    const updatedColumns = sqlite.prepare("PRAGMA table_info(suppliers)").all();
    console.log('Updated suppliers table columns:', updatedColumns.map((col: any) => col.name));

    console.log('✅ Suppliers table GST columns fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing suppliers table:', error);
  }
}

fixSuppliersGstinColumn();