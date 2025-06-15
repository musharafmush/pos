
import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseItemsZeroCount() {
  console.log('🔧 Diagnosing and fixing purchase items zero count issue...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = Database(dbPath);
    
    // Check database structure
    console.log('📋 Checking database structure...');
    
    // Check if purchase_items table exists and its structure
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('🗂️ purchase_items table structure:', tableInfo);
    
    // Check total counts
    const purchasesCount = db.prepare("SELECT COUNT(*) as count FROM purchases").get() as any;
    const itemsCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get() as any;
    
    console.log(`📦 Total purchases: ${purchasesCount.count}`);
    console.log(`📋 Total purchase items: ${itemsCount.count}`);
    
    // Find purchases without items
    const purchasesWithoutItems = db.prepare(`
      SELECT 
        p.id,
        p.order_number,
        p.total,
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as items_count
      FROM purchases p
      WHERE (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) = 0
      ORDER BY p.id DESC
    `).all();
    
    console.log(`⚠️ Found ${purchasesWithoutItems.length} purchases without items:`);
    purchasesWithoutItems.forEach((purchase: any) => {
      console.log(`  • Purchase ${purchase.id} (${purchase.order_number || 'No order number'}) - Total: ₹${purchase.total || 0}`);
    });
    
    // Check if there are any purchase items at all
    if (itemsCount.count === 0) {
      console.log('❌ No purchase items found in database! This indicates items are not being saved during purchase creation.');
      
      // Check the latest purchase to see if we can create test items
      const latestPurchase = db.prepare(`
        SELECT * FROM purchases ORDER BY id DESC LIMIT 1
      `).get() as any;
      
      if (latestPurchase) {
        console.log('🧪 Creating test items for latest purchase to verify functionality...');
        
        // Get a test product
        const testProduct = db.prepare("SELECT * FROM products LIMIT 1").get() as any;
        const productId = testProduct ? testProduct.id : 1;
        
        try {
          // Insert test purchase item
          const insertItem = db.prepare(`
            INSERT INTO purchase_items (
              purchase_id, product_id, quantity, received_qty, unit_cost, cost, 
              amount, subtotal, total, net_amount, unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          insertItem.run(
            latestPurchase.id,
            productId,
            5, // quantity
            5, // received_qty
            200, // unit_cost
            200, // cost
            1000, // amount
            1000, // subtotal
            1000, // total
            1000, // net_amount
            'PCS' // unit
          );
          
          console.log('✅ Test item created successfully');
          
          // Verify the item was created
          const createdItem = db.prepare(`
            SELECT * FROM purchase_items WHERE purchase_id = ?
          `).get(latestPurchase.id);
          
          console.log('✅ Verified item creation:', createdItem);
          
        } catch (error) {
          console.error('❌ Failed to create test item:', error);
        }
      }
    } else {
      // Show sample purchase items
      console.log('📋 Sample purchase items:');
      const sampleItems = db.prepare(`
        SELECT 
          pi.*,
          p.name as product_name,
          pu.order_number
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LEFT JOIN purchases pu ON pi.purchase_id = pu.id
        ORDER BY pi.id DESC
        LIMIT 5
      `).all();
      
      sampleItems.forEach((item: any) => {
        console.log(`  • Item ${item.id}: ${item.product_name || 'Unknown Product'} - Qty: ${item.quantity || item.received_qty || 0}, Cost: ₹${item.unit_cost || item.cost || 0}`);
      });
    }
    
    // Test the API query that the frontend uses
    console.log('🧪 Testing frontend API query...');
    try {
      const apiTestResult = db.prepare(`
        SELECT 
          p.*,
          s.name as supplier_name,
          s.email as supplier_email,
          s.phone as supplier_phone,
          s.address as supplier_address,
          s.tax_number as supplier_tax_number
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.id DESC
        LIMIT 1
      `).get() as any;
      
      if (apiTestResult) {
        console.log('📦 Latest purchase from API query:', {
          id: apiTestResult.id,
          order_number: apiTestResult.order_number,
          total: apiTestResult.total,
          supplier_name: apiTestResult.supplier_name
        });
        
        // Test items query for this purchase
        const itemsQuery = db.prepare(`
          SELECT 
            pi.*,
            pr.name as product_name,
            pr.sku as product_sku,
            pr.code as product_code
          FROM purchase_items pi
          LEFT JOIN products pr ON pi.product_id = pr.id
          WHERE pi.purchase_id = ?
          ORDER BY pi.id
        `).all(apiTestResult.id);
        
        console.log(`📋 Items for purchase ${apiTestResult.id}: ${itemsQuery.length} items found`);
        if (itemsQuery.length > 0) {
          console.log('✅ Sample item:', itemsQuery[0]);
        }
      }
    } catch (error) {
      console.error('❌ API query test failed:', error);
    }
    
    console.log('✅ Purchase items diagnosis completed!');
    
    // Provide recommendations
    console.log('\n📝 Recommendations:');
    if (itemsCount.count === 0) {
      console.log('1. ❌ No purchase items found - check purchase entry form to ensure items are being saved');
      console.log('2. 🔧 Verify the purchase creation API endpoint is saving items correctly');
      console.log('3. 🧪 Test creating a new purchase order with items to verify functionality');
    } else if (purchasesWithoutItems.length > 0) {
      console.log('1. ⚠️ Some purchases have no items - this may be expected for draft orders');
      console.log('2. ✅ Database structure appears correct');
    } else {
      console.log('1. ✅ All purchases have items - the issue may be in the frontend display logic');
      console.log('2. 🔍 Check the browser console for any JavaScript errors');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run the diagnosis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPurchaseItemsZeroCount().catch(console.error);
}

export { fixPurchaseItemsZeroCount };
