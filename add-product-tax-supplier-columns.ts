
import { sqlite } from './db/index.js';

console.log('🔧 Adding missing product columns for tax and supplier data...');

try {
  // Check existing columns
  const tableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const existingColumns = tableInfo.map((col: any) => col.name);
  console.log('📋 Existing columns:', existingColumns);

  // Add missing columns with proper defaults
  const columnsToAdd = [
    { name: 'hsn_code', type: 'TEXT', defaultValue: '' },
    { name: 'cgst_rate', type: 'TEXT', defaultValue: '0' },
    { name: 'sgst_rate', type: 'TEXT', defaultValue: '0' },
    { name: 'igst_rate', type: 'TEXT', defaultValue: '0' },
    { name: 'cess_rate', type: 'TEXT', defaultValue: '0' },
    { name: 'tax_calculation_method', type: 'TEXT', defaultValue: 'exclusive' },
    { name: 'manufacturer_name', type: 'TEXT', defaultValue: null },
    { name: 'supplier_name', type: 'TEXT', defaultValue: null },
    { name: 'manufacturer_id', type: 'INTEGER', defaultValue: null },
    { name: 'supplier_id', type: 'INTEGER', defaultValue: null }
  ];

  let columnsAdded = 0;
  
  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column.name)) {
      try {
        const defaultClause = column.defaultValue === null ? '' : `DEFAULT '${column.defaultValue}'`;
        const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.type} ${defaultClause}`;
        console.log(`📝 Adding column: ${sql}`);
        sqlite.exec(sql);
        columnsAdded++;
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        console.error(`❌ Error adding column ${column.name}:`, error.message);
      }
    } else {
      console.log(`⏭️ Column ${column.name} already exists`);
    }
  }

  console.log(`✅ Migration completed! Added ${columnsAdded} new columns.`);

  // Verify the columns were added
  const updatedTableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
  const updatedColumns = updatedTableInfo.map((col: any) => col.name);
  console.log('📋 Updated columns:', updatedColumns);

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
