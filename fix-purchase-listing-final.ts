import { db } from './db/sqlite-index.js';

async function fixPurchaseListing() {
  try {
    console.log('Testing purchase listing query...');
    
    // Test the direct query that works
    const result = await db.query.purchases.findMany({
      limit: 20,
      orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
      with: {
        supplier: true,
        user: true
      }
    });
    
    console.log(`✅ Direct query works! Found ${result.length} purchases`);
    console.log('Sample purchase:', result[0] ? result[0] : 'No purchases found');
    
    // Check table structure
    const tableInfo = await db.all("PRAGMA table_info(purchases)");
    console.log('Purchases table columns:', tableInfo.map(col => col.name));
    
    // List all purchases in the database
    const allPurchases = await db.all("SELECT * FROM purchases");
    console.log(`Total purchases in database: ${allPurchases.length}`);
    
    if (allPurchases.length > 0) {
      console.log('Sample purchase data:', allPurchases[0]);
    }
    
    console.log('✅ Purchase listing diagnostics completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in purchase listing:', error);
    throw error;
  }
}

fixPurchaseListing().catch(console.error);