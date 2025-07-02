import Database from 'better-sqlite3';
import { resolve } from 'path';

async function addBrandTitleColumn() {
  try {
    console.log('🔄 Adding brand_title column to label_templates table...');
    
    // Connect to the database
    const dbPath = resolve('./pos-data.db');
    const db = new Database(dbPath);
    
    // Check if the column already exists
    const tableInfo = db.prepare("PRAGMA table_info(label_templates)").all();
    const hasColumn = tableInfo.some((col: any) => col.name === 'brand_title');
    
    if (hasColumn) {
      console.log('✅ brand_title column already exists');
      return;
    }
    
    // Add the brand_title column
    const addColumnStmt = db.prepare(`
      ALTER TABLE label_templates 
      ADD COLUMN brand_title TEXT DEFAULT ''
    `);
    
    addColumnStmt.run();
    
    console.log('✅ Successfully added brand_title column to label_templates table');
    
    // Verify the column was added
    const updatedTableInfo = db.prepare("PRAGMA table_info(label_templates)").all();
    const columnExists = updatedTableInfo.some((col: any) => col.name === 'brand_title');
    
    if (columnExists) {
      console.log('🎉 Column verification successful!');
    } else {
      console.log('❌ Column verification failed!');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error adding brand_title column:', error);
  }
}

// Run the function
addBrandTitleColumn().catch(console.error);