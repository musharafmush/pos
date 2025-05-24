import { db } from './db/sqlite-index.js';

async function fixDraftColumn() {
  try {
    console.log('Adding missing draft column to purchases table...');
    
    // Add the draft column to purchases table
    await db.run(`
      ALTER TABLE purchases 
      ADD COLUMN draft TEXT DEFAULT 'No'
    `);
    
    console.log('✅ Added draft column to purchases table');
    
    // Update existing records
    await db.run(`
      UPDATE purchases 
      SET draft = 'No'
      WHERE draft IS NULL
    `);
    
    console.log('✅ Updated existing purchases with default draft value');
    
    // Test the query now
    const result = await db.query.purchases.findMany({
      limit: 5,
      orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
      with: {
        supplier: true,
        user: true
      }
    });
    
    console.log(`✅ Purchase listing now works! Found ${result.length} purchases`);
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('Draft column already exists, continuing...');
      
      // Test the query
      try {
        const result = await db.query.purchases.findMany({
          limit: 5,
          orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
          with: {
            supplier: true,
            user: true
          }
        });
        
        console.log(`✅ Purchase listing works! Found ${result.length} purchases`);
      } catch (queryError) {
        console.error('❌ Query still failing:', queryError.message);
      }
    } else {
      console.error('❌ Error adding draft column:', error);
      throw error;
    }
  }
}

fixDraftColumn().catch(console.error);