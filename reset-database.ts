
import { db } from "./db/index.js";
import { sqlite } from "./db/index.js";

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...');

    // List of tables to clear (in order to respect foreign key constraints)
    const tablesToClear = [
      'sale_items',
      'sales',
      'purchase_items', 
      'purchases',
      'return_items',
      'returns',
      'products',
      'categories',
      'customers',
      'suppliers',
      'users'
    ];

    // Disable foreign key constraints temporarily
    sqlite.exec('PRAGMA foreign_keys = OFF;');

    // Clear all tables
    for (const table of tablesToClear) {
      try {
        const result = sqlite.prepare(`DELETE FROM ${table}`).run();
        console.log(`✅ Cleared ${table}: ${result.changes} records deleted`);
      } catch (error) {
        console.log(`⚠️  Could not clear ${table}:`, error.message);
      }
    }

    // Reset auto-increment counters
    for (const table of tablesToClear) {
      try {
        sqlite.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
        console.log(`🔄 Reset auto-increment for ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not reset sequence for ${table}:`, error.message);
      }
    }

    // Re-enable foreign key constraints
    sqlite.exec('PRAGMA foreign_keys = ON;');

    // Clear any stored settings from localStorage (browser-specific data)
    console.log('📝 Database reset complete!');
    console.log('');
    console.log('🔧 To also clear browser settings, you may need to:');
    console.log('   - Clear browser localStorage');
    console.log('   - Clear receipt settings');
    console.log('   - Reset user preferences');
    console.log('');
    console.log('✨ Your database is now empty and ready for fresh data!');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run the reset
resetDatabase().catch(console.error);
