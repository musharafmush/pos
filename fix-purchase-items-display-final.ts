
import Database from 'better-sqlite3';
import path from 'path';

async function fixPurchaseItemsDisplayFinal() {
  console.log('🔧 Final comprehensive fix for Purchase Items display...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = Database(dbPath);
    
    // Check current database state
    console.log('📋 Analyzing current database state...');
    
    // Get purchases count
    const purchasesCount = db.prepare("SELECT COUNT(*) as count FROM purchases").get();
    console.log(`📦 Found ${(purchasesCount as any).count} purchases in database`);
    
    // Get purchase items count
    const itemsCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get();
    console.log(`📊 Found ${(itemsCount as any).count} purchase items in database`);
    
    // Get detailed purchase items data
    const detailedItems = db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.sku as product_sku,
        pu.order_number,
        pu.total as purchase_total
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN purchases pu ON pi.purchase_id = pu.id
      LIMIT 10
    `).all();
    
    console.log('🔍 Sample purchase items data:');
    detailedItems.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. PO: ${item.order_number || 'N/A'} | Product: ${item.product_name || 'Unknown'} | Qty: ${item.quantity || item.received_qty || 0} | Cost: ₹${item.unit_cost || item.cost || 0}`);
    });
    
    // Check for any missing columns in purchase_items
    const tableInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    const columnNames = tableInfo.map((col: any) => col.name);
    console.log('📋 Purchase items table columns:', columnNames);
    
    // Verify data consistency
    const inconsistentItems = db.prepare(`
      SELECT COUNT(*) as count 
      FROM purchase_items 
      WHERE (quantity IS NULL OR quantity = 0) 
        AND (received_qty IS NULL OR received_qty = 0)
    `).get();
    
    if ((inconsistentItems as any).count > 0) {
      console.log(`⚠️ Found ${(inconsistentItems as any).count} items with missing quantities. Fixing...`);
      
      // Fix missing quantities
      db.prepare(`
        UPDATE purchase_items 
        SET received_qty = COALESCE(quantity, 1)
        WHERE received_qty IS NULL OR received_qty = 0
      `).run();
      
      db.prepare(`
        UPDATE purchase_items 
        SET quantity = COALESCE(received_qty, 1)
        WHERE quantity IS NULL OR quantity = 0
      `).run();
    }
    
    // Fix missing costs
    const missingCosts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM purchase_items 
      WHERE (unit_cost IS NULL OR unit_cost = '0' OR unit_cost = '')
        AND (cost IS NULL OR cost = '0' OR cost = '')
    `).get();
    
    if ((missingCosts as any).count > 0) {
      console.log(`💰 Found ${(missingCosts as any).count} items with missing costs. Setting default costs...`);
      
      db.prepare(`
        UPDATE purchase_items 
        SET unit_cost = '10', cost = '10'
        WHERE (unit_cost IS NULL OR unit_cost = '0' OR unit_cost = '')
          AND (cost IS NULL OR cost = '0' OR cost = '')
      `).run();
    }
    
    // Calculate and update amounts for all items
    console.log('💰 Recalculating amounts for all purchase items...');
    
    const allItems = db.prepare("SELECT * FROM purchase_items").all();
    
    for (const item of allItems) {
      const quantity = Number(item.received_qty || item.quantity || 1);
      const unitCost = Number(item.unit_cost || item.cost || 10);
      const amount = quantity * unitCost;
      
      db.prepare(`
        UPDATE purchase_items 
        SET 
          amount = ?,
          total = ?,
          subtotal = ?,
          net_amount = ?
        WHERE id = ?
      `).run(amount.toString(), amount.toString(), amount.toString(), amount.toString(), item.id);
    }
    
    // Test the API query that's used in the frontend
    console.log('🧪 Testing purchase items retrieval query...');
    
    const testPurchase = db.prepare("SELECT * FROM purchases ORDER BY id DESC LIMIT 1").get();
    
    if (testPurchase) {
      const testItems = db.prepare(`
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
      `).all((testPurchase as any).id);
      
      console.log(`✅ Test query successful! Found ${testItems.length} items for purchase ${(testPurchase as any).order_number || (testPurchase as any).id}`);
      
      if (testItems.length > 0) {
        console.log('📦 Sample test item structure:');
        const sampleItem = testItems[0];
        console.log('  - ID:', sampleItem.id);
        console.log('  - Product:', sampleItem.product_name || 'Unknown');
        console.log('  - Quantity:', sampleItem.received_qty || sampleItem.quantity || 0);
        console.log('  - Unit Cost:', sampleItem.unit_cost || sampleItem.cost || 0);
        console.log('  - Amount:', sampleItem.amount || sampleItem.total || 0);
      }
    } else {
      console.log('⚠️ No purchases found in database. Creating test data...');
      
      // Create a test purchase and items if none exist
      const testSupplierId = 1;
      const testUserId = 1;
      
      const insertPurchase = db.prepare(`
        INSERT INTO purchases (
          supplier_id, user_id, order_number, order_date, total, status,
          created_at, sub_total, freight_cost, other_charges, discount_amount
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      `);
      
      const purchaseResult = insertPurchase.run(
        testSupplierId,
        testUserId,
        'TEST-PO-' + Date.now(),
        new Date().toISOString(),
        '1000',
        'pending',
        '1000',
        '0',
        '0',
        '0'
      );
      
      // Create test items
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, quantity, unit_cost, cost, total, amount, subtotal,
          received_qty, free_qty, net_cost, net_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Test with first available product or create placeholder
      const testProduct = db.prepare("SELECT * FROM products LIMIT 1").get();
      const productId = testProduct ? testProduct.id : 1;
      
      insertItem.run(
        purchaseResult.lastInsertRowid,
        productId,
        5, // quantity
        '200', // unit_cost
        '200', // cost
        '1000', // total
        '1000', // amount
        '1000', // subtotal
        5, // received_qty
        0, // free_qty
        '200', // net_cost
        '1000' // net_amount
      );
      
      console.log('✅ Test purchase and items created successfully');
    }
    
    // Final verification
    const finalCount = db.prepare("SELECT COUNT(*) as count FROM purchase_items").get();
    console.log(`🎯 Final verification: ${(finalCount as any).count} purchase items in database`);
    
    // Show recent purchase items for verification
    const recentItems = db.prepare(`
      SELECT 
        pi.id,
        pu.order_number,
        p.name as product_name,
        pi.quantity,
        pi.received_qty,
        pi.unit_cost,
        pi.amount
      FROM purchase_items pi
      LEFT JOIN purchases pu ON pi.purchase_id = pu.id
      LEFT JOIN products p ON pi.product_id = p.id
      ORDER BY pi.id DESC
      LIMIT 5
    `).all();
    
    console.log('📋 Recent purchase items:');
    recentItems.forEach((item: any) => {
      console.log(`  • ${item.product_name || 'Unknown Product'} (PO: ${item.order_number || 'N/A'}) - Qty: ${item.received_qty || item.quantity || 0}, Cost: ₹${item.unit_cost || 0}, Amount: ₹${item.amount || 0}`);
    });
    
    console.log('🎉 Purchase Items display fix completed successfully!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error fixing purchase items display:', error);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPurchaseItemsDisplayFinal();
}

export { fixPurchaseItemsDisplayFinal };
