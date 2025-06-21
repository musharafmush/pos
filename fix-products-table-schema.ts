import Database from 'better-sqlite3';
import { join } from 'path';

async function fixProductsSchema() {
  console.log('Fixing products table schema...');
  
  const dbPath = join(process.cwd(), 'pos-data.db');
  const db = new Database(dbPath);
  
  try {
    // Check current products table columns
    const currentColumns = db.prepare("PRAGMA table_info(products)").all();
    console.log('Current products table columns:', currentColumns.map((col: any) => col.name));
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'track_serial_numbers', def: 'track_serial_numbers INTEGER DEFAULT 0' },
      { name: 'fda_approved', def: 'fda_approved INTEGER DEFAULT 0' },
      { name: 'bis_certified', def: 'bis_certified INTEGER DEFAULT 0' },
      { name: 'organic_certified', def: 'organic_certified INTEGER DEFAULT 0' },
      { name: 'item_ingredients', def: 'item_ingredients TEXT' }
    ];
    
    const existingColumnNames = currentColumns.map((col: any) => col.name);
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          db.prepare(`ALTER TABLE products ADD COLUMN ${column.def}`).run();
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
    const updatedColumns = db.prepare("PRAGMA table_info(products)").all();
    console.log('\nUpdated products table columns:', updatedColumns.map((col: any) => col.name));
    
    console.log('\n✅ Products table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing products table:', error);
  } finally {
    db.close();
  }
}

fixProductsSchema().catch(console.error);