import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');

async function addFinalProductColumns() {
  const db = new Database(dbPath);
  
  console.log('🔄 Adding final missing product columns...');
  
  try {
    // Get existing columns
    const pragma = db.pragma('table_info(products)');
    const existingColumns = pragma.map((col: any) => col.name);
    
    console.log('📋 Current column count:', existingColumns.length);
    
    // Define the final missing columns
    const finalColumnsToAdd = [
      { name: 'track_serial_numbers', definition: 'INTEGER DEFAULT 0' },
      { name: 'fda_approved', definition: 'INTEGER DEFAULT 0' },
      { name: 'bis_certified', definition: 'INTEGER DEFAULT 0' },
      { name: 'organic_certified', definition: 'INTEGER DEFAULT 0' },
      { name: 'item_ingredients', definition: 'TEXT' }
    ];
    
    // Add missing columns
    for (const column of finalColumnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.definition}`;
        console.log(`➕ Adding column: ${column.name}`);
        db.exec(sql);
      } else {
        console.log(`✅ Column already exists: ${column.name}`);
      }
    }
    
    // Verify the columns were added
    const updatedPragma = db.pragma('table_info(products)');
    const updatedColumns = updatedPragma.map((col: any) => col.name);
    
    console.log('✅ Final column count:', updatedColumns.length);
    console.log('🎉 All product columns are now synchronized!');
    
  } catch (error) {
    console.error('❌ Error adding final columns:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  addFinalProductColumns()
    .then(() => console.log('Final migration completed'))
    .catch(console.error);
}

export { addFinalProductColumns };