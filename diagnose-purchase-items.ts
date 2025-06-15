
import Database from 'better-sqlite3';
import path from 'path';

async function diagnosePurchaseItems() {
  console.log('🔍 Diagnosing purchase items data...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = Database(dbPath);
    
    // Check if purchase_items table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='purchase_items'
    `).get();
    
    if (!tableExists) {
      console.log('❌ purchase_items table does not exist!');
      return;
    }
    
    console.log('✅ purchase_items table exists');
    
    // Check table structure
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('📋 Table structure:', tableInfo.map(col => col.name).join(', '));
    
    // Get total counts
    const purchaseCount = db.prepare("SELECT COUNT(*) as count FROM purchases").get() as any;
    const itemCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get() as any;
    
    console.log(`📦 Total purchases: ${purchaseCount.count}`);
    console.log(`📋 Total purchase items: ${itemCount.count}`);
    
    // Get purchases with their item counts
    const purchasesWithItems = db.prepare(`
      SELECT 
        p.id,
        p.order_number,
        p.total,
        COUNT(pi.id) as item_count
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id OR p.id = pi.purchase_id
      GROUP BY p.id, p.order_number, p.total
      ORDER BY p.id DESC
      LIMIT 10
    `).all();
    
    console.log('📊 Recent purchases with item counts:');
    purchasesWithItems.forEach((purchase: any) => {
      console.log(`  • PO ${purchase.order_number || purchase.id}: ${purchase.item_count} items (Total: ₹${purchase.total || 0})`);
    });
    
    // Check for any purchase items without proper linkage
    const orphanedItems = db.prepare(`
      SELECT pi.*, p.order_number
      FROM purchase_items pi
      LEFT JOIN purchases p ON pi.purchase_id = p.id
      WHERE p.id IS NULL
      LIMIT 5
    `).all();
    
    if (orphanedItems.length > 0) {
      console.log('⚠️ Found orphaned purchase items:', orphanedItems.length);
    }
    
    // Sample a few purchase items
    const sampleItems = db.prepare(`
      SELECT 
        pi.*,
        p.order_number,
        pr.name as product_name
      FROM purchase_items pi
      LEFT JOIN purchases p ON pi.purchase_id = p.id
      LEFT JOIN products pr ON pi.product_id = pr.id
      LIMIT 5
    `).all();
    
    console.log('🎯 Sample purchase items:');
    sampleItems.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. PO: ${item.order_number || 'N/A'} | Product: ${item.product_name || 'Unknown'} | Qty: ${item.quantity || item.received_qty || 0}`);
    });
    
    db.close();
    console.log('✅ Diagnosis completed!');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run the diagnosis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnosePurchaseItems();
}

export { diagnosePurchaseItems };
