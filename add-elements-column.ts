import Database from 'better-sqlite3';

async function addElementsColumn() {
  try {
    console.log('🔧 Adding elements column to label_templates table...');
    
    const db = new Database('./pos-data.db');
    
    // Check if elements column already exists
    const checkColumn = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='label_templates'
    `).get();
    
    if (checkColumn && !checkColumn.sql.includes('elements')) {
      // Add elements column to store visual designer data
      db.exec(`ALTER TABLE label_templates ADD COLUMN elements TEXT DEFAULT NULL`);
      console.log('✅ Elements column added successfully');
    } else {
      console.log('ℹ️ Elements column already exists');
    }
    
    // Verify the column was added
    const tableInfo = db.prepare("PRAGMA table_info(label_templates)").all();
    const elementsColumn = tableInfo.find((col: any) => col.name === 'elements');
    
    if (elementsColumn) {
      console.log('✅ Elements column verified in database schema');
    } else {
      console.log('❌ Elements column not found in schema');
    }
    
    db.close();
    console.log('🎉 Database update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding elements column:', error);
    process.exit(1);
  }
}

// Run the function
addElementsColumn().catch(console.error);