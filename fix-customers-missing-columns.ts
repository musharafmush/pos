import { Database } from 'better-sqlite3';

async function fixCustomersMissingColumns() {
  console.log('🔧 Fixing customers table missing columns...');
  
  try {
    const { sqlite } = await import('./db');
    
    // Check current table structure
    const tableInfo = sqlite.prepare('PRAGMA table_info(customers)').all();
    console.log('Current customers table columns:', tableInfo.map((col: any) => col.name));
    
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    // Add missing columns one by one
    const columnsToAdd = [
      { name: 'tax_id', type: 'TEXT', exists: existingColumns.includes('tax_id') },
      { name: 'credit_limit', type: 'DECIMAL(10,2) DEFAULT 0', exists: existingColumns.includes('credit_limit') },
      { name: 'business_name', type: 'TEXT', exists: existingColumns.includes('business_name') }
    ];
    
    for (const column of columnsToAdd) {
      if (!column.exists) {
        try {
          const alterQuery = `ALTER TABLE customers ADD COLUMN ${column.name} ${column.type}`;
          console.log(`Adding column: ${alterQuery}`);
          sqlite.exec(alterQuery);
          console.log(`✅ Added ${column.name} column`);
        } catch (error) {
          console.log(`⚠️ Column ${column.name} might already exist or error:`, error);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Verify final structure
    const finalTableInfo = sqlite.prepare('PRAGMA table_info(customers)').all();
    console.log('Final customers table columns:', finalTableInfo.map((col: any) => col.name));
    
    console.log('✅ Customers table schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing customers table:', error);
    throw error;
  }
}

// Auto-run when executed directly
fixCustomersMissingColumns()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

export { fixCustomersMissingColumns };