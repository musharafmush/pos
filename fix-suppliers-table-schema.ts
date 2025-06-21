import { storage } from './server/storage';

async function fixSuppliersTable() {
  console.log('Fixing suppliers table schema...');
  
  try {
    // Get the current database instance
    const db = (storage as any).db;
    
    // Check current suppliers table columns
    const currentColumns = db.prepare("PRAGMA table_info(suppliers)").all();
    console.log('Current suppliers table columns:', currentColumns.map((col: any) => col.name));
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      'mobile_no TEXT',
      'extension_number TEXT',
      'fax_no TEXT',
      'building TEXT',
      'street TEXT',
      'city TEXT',
      'state TEXT',
      'country TEXT',
      'pin_code TEXT',
      'landmark TEXT',
      'tax_id TEXT',
      'registration_type TEXT',
      'registration_number TEXT',
      'supplier_type TEXT',
      'credit_days INTEGER',
      'discount_percent DECIMAL(5,2)',
      'notes TEXT',
      'status TEXT DEFAULT "active"'
    ];
    
    const existingColumnNames = currentColumns.map((col: any) => col.name);
    
    for (const columnDef of columnsToAdd) {
      const columnName = columnDef.split(' ')[0];
      if (!existingColumnNames.includes(columnName)) {
        try {
          db.prepare(`ALTER TABLE suppliers ADD COLUMN ${columnDef}`).run();
          console.log(`✅ Added column: ${columnName}`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name')) {
            console.log(`⚠️ Column ${columnName} already exists`);
          } else {
            console.error(`❌ Failed to add column ${columnName}:`, error.message);
          }
        }
      } else {
        console.log(`⚠️ Column ${columnName} already exists`);
      }
    }
    
    // Verify the updated table structure
    const updatedColumns = db.prepare("PRAGMA table_info(suppliers)").all();
    console.log('\nUpdated suppliers table columns:', updatedColumns.map((col: any) => col.name));
    
    console.log('\n✅ Suppliers table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing suppliers table:', error);
  }
}

fixSuppliersTable().catch(console.error);