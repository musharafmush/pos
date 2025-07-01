import Database from 'better-sqlite3';
import path from 'path';

async function debugLabelTemplates() {
  try {
    console.log('🔍 Debugging label templates database structure...');
    
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Check table structure
    console.log('\n📋 Table structure:');
    const tableInfo = db.prepare("PRAGMA table_info(label_templates)").all();
    console.table(tableInfo);
    
    // Check current templates
    console.log('\n📄 Current templates:');
    const templates = db.prepare("SELECT * FROM label_templates").all();
    
    templates.forEach((template: any) => {
      console.log(`\nTemplate ID: ${template.id}`);
      console.log(`Name: ${template.name}`);
      console.log(`Elements column exists: ${template.elements !== undefined}`);
      console.log(`Elements content: ${template.elements}`);
      
      if (template.elements) {
        try {
          const parsed = JSON.parse(template.elements);
          console.log(`Parsed elements count: ${Array.isArray(parsed) ? parsed.length : 'Not array'}`);
        } catch (e) {
          console.log(`Elements parsing error: ${e}`);
        }
      }
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error debugging templates:', error);
  }
}

debugLabelTemplates();