import { db } from './db/sqlite-index.js';

async function fixAllPurchaseColumns() {
  try {
    console.log('Adding all missing columns to purchases table...');
    
    // List of all columns that should exist based on the schema
    const requiredColumns = [
      { name: 'draft', sql: 'ALTER TABLE purchases ADD COLUMN draft TEXT DEFAULT "No"' },
      { name: 'po_no', sql: 'ALTER TABLE purchases ADD COLUMN po_no TEXT' },
      { name: 'po_date', sql: 'ALTER TABLE purchases ADD COLUMN po_date TEXT' },
      { name: 'due_date', sql: 'ALTER TABLE purchases ADD COLUMN due_date TEXT' },
      { name: 'invoice_no', sql: 'ALTER TABLE purchases ADD COLUMN invoice_no TEXT' },
      { name: 'invoice_date', sql: 'ALTER TABLE purchases ADD COLUMN invoice_date TEXT' },
      { name: 'invoice_amount', sql: 'ALTER TABLE purchases ADD COLUMN invoice_amount TEXT DEFAULT "0"' },
      { name: 'payment_method', sql: 'ALTER TABLE purchases ADD COLUMN payment_method TEXT DEFAULT "Cash"' },
      { name: 'payment_type', sql: 'ALTER TABLE purchases ADD COLUMN payment_type TEXT DEFAULT "Credit"' },
      { name: 'remarks', sql: 'ALTER TABLE purchases ADD COLUMN remarks TEXT' }
    ];
    
    // Check which columns already exist
    const tableInfo = await db.all("PRAGMA table_info(purchases)");
    const existingColumns = tableInfo.map((col: any) => col.name);
    
    console.log('Existing columns:', existingColumns);
    
    // Add missing columns
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        try {
          await db.run(column.sql);
          console.log(`✅ Added column: ${column.name}`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name')) {
            console.log(`Column ${column.name} already exists`);
          } else {
            console.error(`❌ Error adding column ${column.name}:`, error.message);
          }
        }
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }
    
    // Test the purchase listing query
    console.log('Testing purchase listing query...');
    const result = await db.query.purchases.findMany({
      limit: 5,
      orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
      with: {
        supplier: true,
        user: true
      }
    });
    
    console.log(`✅ Purchase listing now works! Found ${result.length} purchases`);
    if (result.length > 0) {
      console.log('Sample purchase:', result[0]);
    }
    
  } catch (error) {
    console.error('❌ Error fixing purchase columns:', error);
    throw error;
  }
}

fixAllPurchaseColumns().catch(console.error);