import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

try {
  console.log('Fixing sales_items table schema...');

  // Check if unit_price column exists
  const tableInfo = db.prepare("PRAGMA table_info(sales_items)").all();
  const hasUnitPrice = tableInfo.some((col: any) => col.name === 'unit_price');

  if (!hasUnitPrice) {
    console.log('Adding unit_price column to sales_items table...');
    db.exec(`
      ALTER TABLE sales_items 
      ADD COLUMN unit_price REAL DEFAULT 0;
    `);

    // Update existing records to set unit_price based on total/quantity
    db.exec(`
      UPDATE sales_items 
      SET unit_price = CASE 
        WHEN quantity > 0 THEN total / quantity 
        ELSE 0 
      END;
    `);

    console.log('✅ sales_items table schema fixed successfully');
  } else {
    console.log('✅ unit_price column already exists');
  }

} catch (error) {
  console.error('❌ Error fixing sales_items schema:', error);
} finally {
  db.close();
}

// Execute fix if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running sales_items unit_price column fix...');
}