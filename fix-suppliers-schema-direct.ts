import Database from 'better-sqlite3';
import { join } from 'path';

async function fixSuppliersSchema() {
  console.log('Fixing suppliers table schema...');
  
  const dbPath = join(process.cwd(), 'pos-data.db');
  const db = new Database(dbPath);
  
  try {
    // Check current suppliers table columns
    const currentColumns = db.prepare("PRAGMA table_info(suppliers)").all();
    console.log('Current suppliers table columns:', currentColumns.map((col: any) => col.name));
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'mobile_no', def: 'mobile_no TEXT' },
      { name: 'extension_number', def: 'extension_number TEXT' },
      { name: 'fax_no', def: 'fax_no TEXT' },
      { name: 'building', def: 'building TEXT' },
      { name: 'street', def: 'street TEXT' },
      { name: 'city', def: 'city TEXT' },
      { name: 'state', def: 'state TEXT' },
      { name: 'country', def: 'country TEXT' },
      { name: 'pin_code', def: 'pin_code TEXT' },
      { name: 'landmark', def: 'landmark TEXT' },
      { name: 'tax_id', def: 'tax_id TEXT' },
      { name: 'registration_type', def: 'registration_type TEXT' },
      { name: 'registration_number', def: 'registration_number TEXT' },
      { name: 'supplier_type', def: 'supplier_type TEXT' },
      { name: 'credit_days', def: 'credit_days INTEGER' },
      { name: 'discount_percent', def: 'discount_percent DECIMAL(5,2)' },
      { name: 'notes', def: 'notes TEXT' },
      { name: 'status', def: 'status TEXT DEFAULT "active"' }
    ];
    
    const existingColumnNames = currentColumns.map((col: any) => col.name);
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          db.prepare(`ALTER TABLE suppliers ADD COLUMN ${column.def}`).run();
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
    const updatedColumns = db.prepare("PRAGMA table_info(suppliers)").all();
    console.log('\nUpdated suppliers table columns:', updatedColumns.map((col: any) => col.name));
    
    console.log('\n✅ Suppliers table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing suppliers table:', error);
  } finally {
    db.close();
  }
}

fixSuppliersSchema().catch(console.error);