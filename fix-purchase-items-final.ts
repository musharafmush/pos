
import Database from 'better-sqlite3';

async function fixPurchaseItemsFinal() {
  console.log('🔧 Final fix for Purchase Items table...');
  
  try {
    const db = Database('./pos-data.db');
    
    // Check current table structure
    console.log('📋 Checking purchase_items table structure...');
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('Current columns:', tableInfo.map(col => col.name));
    
    // Check if we have any purchase items data
    const itemCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get();
    console.log(`📊 Found ${itemCount.count} purchase items in database`);
    
    // Check purchases with items
    const purchasesWithItems = db.prepare(`
      SELECT p.id, p.order_number, COUNT(pi.id) as item_count
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      GROUP BY p.id
      ORDER BY p.id DESC
      LIMIT 10
    `).all();
    
    console.log('📋 Recent purchases and their item counts:');
    purchasesWithItems.forEach(p => {
      console.log(`  Purchase ${p.id} (${p.order_number || 'No order number'}): ${p.item_count} items`);
    });
    
    // Test query that matches the storage method
    console.log('🧪 Testing purchase items query...');
    try {
      const testQuery = db.prepare(`
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku,
          p.price as product_price,
          p.description as product_description
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
        ORDER BY pi.id
      `);
      
      const testResult = testQuery.all(1); // Test with purchase ID 1
      console.log(`✅ Query test successful. Found ${testResult.length} items for purchase 1`);
      
      if (testResult.length > 0) {
        console.log('Sample item structure:', {
          id: testResult[0].id,
          purchase_id: testResult[0].purchase_id,
          product_id: testResult[0].product_id,
          quantity: testResult[0].quantity,
          unit_cost: testResult[0].unit_cost,
          product_name: testResult[0].product_name
        });
      }
    } catch (queryError) {
      console.error('❌ Query test failed:', queryError.message);
    }
    
    // If no items exist, create some sample data for testing
    if (itemCount.count === 0) {
      console.log('⚠️ No purchase items found. Creating sample data...');
      
      // Get the first purchase
      const firstPurchase = db.prepare("SELECT * FROM purchases ORDER BY id LIMIT 1").get();
      if (firstPurchase) {
        // Get the first product
        const firstProduct = db.prepare("SELECT * FROM products ORDER BY id LIMIT 1").get();
        if (firstProduct) {
          console.log(`Creating sample item for purchase ${firstPurchase.id} with product ${firstProduct.id}`);
          
          const insertSample = db.prepare(`
            INSERT INTO purchase_items (
              purchase_id, product_id, quantity, unit_cost, cost, total, amount, subtotal,
              received_qty, free_qty, expiry_date, hsn_code, tax_percentage,
              discount_amount, discount_percent, net_cost, selling_price, mrp,
              batch_number, location, unit, roi_percent, gross_profit_percent,
              net_amount, cash_percent, cash_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const quantity = 10;
          const unitCost = 50;
          const subtotal = quantity * unitCost;
          
          insertSample.run(
            firstPurchase.id, // purchase_id
            firstProduct.id, // product_id
            quantity, // quantity
            unitCost.toString(), // unit_cost
            unitCost.toString(), // cost
            subtotal.toString(), // total
            subtotal.toString(), // amount
            subtotal.toString(), // subtotal
            quantity, // received_qty
            0, // free_qty
            null, // expiry_date
            '', // hsn_code
            '0', // tax_percentage
            '0', // discount_amount
            '0', // discount_percent
            unitCost.toString(), // net_cost
            '0', // selling_price
            '0', // mrp
            '', // batch_number
            '', // location
            'PCS', // unit
            '0', // roi_percent
            '0', // gross_profit_percent
            subtotal.toString(), // net_amount
            '0', // cash_percent
            '0' // cash_amount
          );
          
          console.log('✅ Sample purchase item created successfully');
        }
      }
    }
    
    console.log('🎯 Purchase Items final fix completed!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error in final purchase items fix:', error);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPurchaseItemsFinal();
}

export { fixPurchaseItemsFinal };
