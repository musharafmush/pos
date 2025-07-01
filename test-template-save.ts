import Database from 'better-sqlite3';
import path from 'path';

async function testTemplateSave() {
  try {
    console.log('🧪 Testing template save functionality...');
    
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Create sample elements for template ID 6 "Large Product Label"
    const sampleElements = [
      {
        id: 'product-name',
        type: 'text',
        x: 10,
        y: 10,
        width: 180,
        height: 30,
        content: '{{product.name}}',
        fontSize: 18,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'none',
        rotation: 0,
        opacity: 1,
        zIndex: 1
      },
      {
        id: 'price',
        type: 'price', 
        x: 10,
        y: 50,
        width: 80,
        height: 25,
        content: '{{product.price}}',
        fontSize: 16,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'none',
        rotation: 0,
        opacity: 1,
        zIndex: 2
      }
    ];
    
    // Update template with elements
    const elementsJson = JSON.stringify(sampleElements);
    const updateStmt = db.prepare(`
      UPDATE label_templates 
      SET elements = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 6
    `);
    
    const result = updateStmt.run(elementsJson);
    console.log('✅ Template updated:', result);
    
    // Verify the update
    const getStmt = db.prepare(`SELECT * FROM label_templates WHERE id = 6`);
    const template = getStmt.get();
    
    console.log('📋 Updated template elements:', template?.elements);
    
    if (template?.elements) {
      const parsed = JSON.parse(template.elements);
      console.log('🎯 Parsed elements count:', parsed.length);
    }
    
    db.close();
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing template save:', error);
  }
}

testTemplateSave();