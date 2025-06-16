
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Adding tax_selection_mode column to products table...');

try {
  const dbPath = path.join(__dirname, 'pos-data.db');
  const sqlite = new Database(dbPath);
  
  // Add the new column
  sqlite.exec(`
    ALTER TABLE products 
    ADD COLUMN tax_selection_mode TEXT DEFAULT 'auto';
  `);
  
  console.log('✅ Successfully added tax_selection_mode column');
  
  // Update existing products to have 'auto' mode
  const updateResult = sqlite.exec(`
    UPDATE products 
    SET tax_selection_mode = 'auto' 
    WHERE tax_selection_mode IS NULL;
  `);
  
  console.log('✅ Updated existing products with default tax selection mode');
  
  sqlite.close();
  console.log('🎉 Tax selection mode migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
