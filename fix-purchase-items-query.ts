
import { db } from "./db/index.js";

async function fixPurchaseItemsQuery() {
  try {
    console.log('🔧 Diagnosing Purchase Items query issues...');
    
    // Check purchase_items table structure
    const purchaseItemsInfo = db.prepare(`
      PRAGMA table_info(purchase_items)
    `).all();
    
    console.log('📋 Purchase Items table columns:');
    purchaseItemsInfo.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check total purchase items count
    const totalItems = db.prepare(`
      SELECT COUNT(*) as count FROM purchase_items
    `).get() as any;
    
    console.log(`📊 Total purchase items in database: ${totalItems.count}`);
    
    // Check purchase items with product details
    const itemsWithProducts = db.prepare(`
      SELECT 
        pi.id,
        pi.purchase_id,
        pi.product_id,
        pi.quantity,
        pi.received_qty,
        pi.unit_cost,
        pi.amount,
        p.name as product_name,
        pu.order_number
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN purchases pu ON pi.purchase_id = pu.id
      ORDER BY pi.id DESC
      LIMIT 10
    `).all();
    
    console.log('🔍 Sample purchase items with product details:');
    itemsWithProducts.forEach((item: any) => {
      console.log(`  • Item ${item.id}: ${item.product_name || 'Unknown Product'} (PO: ${item.order_number || 'N/A'})`);
      console.log(`    - Qty: ${item.received_qty || item.quantity || 0}, Cost: ₹${item.unit_cost || 0}, Amount: ₹${item.amount || 0}`);
    });
    
    // Test specific purchase order lookup
    const testPurchaseId = 16; // PO-232098506
    const testItems = db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.sku as product_sku
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `).all(testPurchaseId);
    
    console.log(`🧪 Testing items for purchase ID ${testPurchaseId}:`);
    if (testItems.length > 0) {
      testItems.forEach((item: any) => {
        console.log(`  ✅ Found item: ${item.product_name || 'Unknown'} - Qty: ${item.received_qty || item.quantity || 0}`);
      });
    } else {
      console.log(`  ❌ No items found for purchase ID ${testPurchaseId}`);
      
      // Check if the purchase exists
      const purchaseExists = db.prepare(`
        SELECT id, order_number FROM purchases WHERE id = ?
      `).get(testPurchaseId);
      
      if (purchaseExists) {
        console.log(`  📦 Purchase exists: ${JSON.stringify(purchaseExists)}`);
        console.log('  ⚠️  Purchase exists but has no items - this indicates items were not saved during creation');
      } else {
        console.log(`  ❌ Purchase ID ${testPurchaseId} does not exist`);
      }
    }
    
    // Fix any orphaned items or missing data
    console.log('🔧 Checking for data integrity issues...');
    
    // Check for items with missing products
    const orphanedItems = db.prepare(`
      SELECT pi.id, pi.product_id 
      FROM purchase_items pi 
      LEFT JOIN products p ON pi.product_id = p.id 
      WHERE p.id IS NULL
    `).all();
    
    if (orphanedItems.length > 0) {
      console.log(`⚠️  Found ${orphanedItems.length} purchase items with missing products`);
    }
    
    // Check for items with missing purchases
    const orphanedPurchaseItems = db.prepare(`
      SELECT pi.id, pi.purchase_id 
      FROM purchase_items pi 
      LEFT JOIN purchases p ON pi.purchase_id = p.id 
      WHERE p.id IS NULL
    `).all();
    
    if (orphanedPurchaseItems.length > 0) {
      console.log(`⚠️  Found ${orphanedPurchaseItems.length} purchase items with missing purchases`);
    }
    
    console.log('✅ Purchase Items query diagnosis completed!');
    
  } catch (error) {
    console.error('❌ Error diagnosing purchase items:', error);
  }
}

// Run the diagnosis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPurchaseItemsQuery().then(() => {
    console.log('Diagnosis complete');
    process.exit(0);
  }).catch(console.error);
}

export { fixPurchaseItemsQuery };
