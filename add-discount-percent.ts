import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

console.log('Adding discount_percent column to suppliers table...');

try {
  // Add the missing discount_percent column
  db.exec("ALTER TABLE suppliers ADD COLUMN discount_percent TEXT DEFAULT '0'");
  console.log('✅ Added discount_percent column to suppliers');

  console.log('✅ Supplier table fix completed!');

} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('ℹ️ discount_percent column already exists');
  } else {
    console.error('❌ Error adding discount_percent column:', error);
  }
} finally {
  db.close();
}