import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const db = new Database(dbPath);

async function testMRPFlow() {
  try {
    console.log('🧪 Testing MRP data flow...\n');
    
    // Get product details
    const product = db.prepare('SELECT id, name, price, mrp FROM products WHERE id = 4').get();
    console.log('📦 Product details:', product);
    
    // Simulate a cart item with MRP (like our fixed addToCart function)
    const cartItem = {
      ...product,
      quantity: 1,
      total: parseFloat(product.price),
      mrp: parseFloat(product.mrp) || 0
    };
    
    console.log('🛒 Cart item with MRP:', cartItem);
    
    // Simulate sale creation data (like our processSale function)
    const saleItemData = {
      productId: cartItem.id,
      quantity: cartItem.quantity,
      unitPrice: parseFloat(cartItem.price).toString(),
      subtotal: cartItem.total.toString(),
      price: parseFloat(cartItem.price).toString(),
      total: cartItem.total.toString(),
      mrp: cartItem.mrp
    };
    
    console.log('💾 Sale item data with MRP:', saleItemData);
    
    // Check what the MRP value would be when saved to database
    const mrpForDB = (saleItemData.mrp || 0).toString();
    console.log('🗄️ MRP value for database:', mrpForDB);
    
    // Get a recent sale to see actual MRP data
    const recentSale = db.prepare(`
      SELECT si.mrp, si.price, si.product_id, p.name, p.mrp as product_mrp
      FROM sale_items si 
      LEFT JOIN products p ON si.product_id = p.id 
      WHERE si.product_id = 4 
      ORDER BY si.id DESC 
      LIMIT 1
    `).get();
    
    console.log('📊 Most recent Sugar sale item:', recentSale);
    
    if (recentSale) {
      const savedMRP = parseFloat(recentSale.mrp) || 0;
      const productMRP = parseFloat(recentSale.product_mrp) || 0;
      const sellingPrice = parseFloat(recentSale.price) || 0;
      
      console.log('\n💰 MRP Analysis:');
      console.log(`   Product MRP: ₹${productMRP}`);
      console.log(`   Saved MRP: ₹${savedMRP}`);
      console.log(`   Selling Price: ₹${sellingPrice}`);
      
      if (savedMRP === productMRP && savedMRP > 0) {
        console.log('   ✅ MRP is correctly saved and matches product MRP');
      } else if (savedMRP === 0) {
        console.log('   ❌ MRP is still being saved as 0 - frontend cart issue');
      } else {
        console.log('   ⚠️ MRP mismatch - investigate data flow');
      }
      
      // Calculate what should be displayed on receipt
      if (sellingPrice < productMRP) {
        const savings = productMRP - sellingPrice;
        console.log(`   📄 Receipt should show: "MRP: ₹${productMRP} | Save: ₹${savings}"`);
      } else if (sellingPrice > productMRP) {
        const above = sellingPrice - productMRP;
        console.log(`   📄 Receipt should show: "MRP: ₹${productMRP} | Above MRP: ₹${above}"`);
      } else {
        console.log(`   📄 Receipt should show: "MRP: ₹${productMRP}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing MRP flow:', error);
  } finally {
    db.close();
  }
}

testMRPFlow().catch(console.error);