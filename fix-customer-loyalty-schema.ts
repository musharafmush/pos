import Database from 'better-sqlite3';
import { join } from 'path';

async function fixCustomerLoyaltySchema() {
  console.log('Fixing customer loyalty table schema...');
  
  const dbPath = join(process.cwd(), 'pos-data.db');
  const db = new Database(dbPath);
  
  try {
    // Check current customer_loyalty table columns
    const currentColumns = db.prepare("PRAGMA table_info(customer_loyalty)").all();
    console.log('Current customer_loyalty table columns:', currentColumns.map((col: any) => col.name));
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'total_earned', def: 'total_earned TEXT DEFAULT "0"' },
      { name: 'total_redeemed', def: 'total_redeemed TEXT DEFAULT "0"' },
      { name: 'total_spent', def: 'total_spent TEXT DEFAULT "0"' },
      { name: 'tier', def: 'tier TEXT DEFAULT "Member"' },
      { name: 'tier_benefits', def: 'tier_benefits TEXT' },
      { name: 'last_earned_date', def: 'last_earned_date DATE' }
    ];
    
    const existingColumnNames = currentColumns.map((col: any) => col.name);
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          db.prepare(`ALTER TABLE customer_loyalty ADD COLUMN ${column.def}`).run();
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
    const updatedColumns = db.prepare("PRAGMA table_info(customer_loyalty)").all();
    console.log('\nUpdated customer_loyalty table columns:', updatedColumns.map((col: any) => col.name));
    
    console.log('\n✅ Customer loyalty table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing customer loyalty table:', error);
  } finally {
    db.close();
  }
}

fixCustomerLoyaltySchema().catch(console.error);