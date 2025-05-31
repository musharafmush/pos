
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');

async function fixSaleItemsSubtotal() {
  const db = new Database(dbPath);
  
  try {
    console.log('🔧 Fixing sale_items table - adding missing subtotal column...');
    
    // Check current table structure
    const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
    const columns = tableInfo.map((col: any) => col.name);
    
    console.log('📋 Current sale_items columns:', columns);
    
    // Add subtotal column if missing
    if (!columns.includes('subtotal')) {
      console.log('➕ Adding subtotal column...');
      db.exec("ALTER TABLE sale_items ADD COLUMN subtotal TEXT DEFAULT '0'");
      console.log('✅ Added subtotal column');
    } else {
      console.log('ℹ️ subtotal column already exists');
    }
    
    // Add unit_price column if missing (backup fix)
    if (!columns.includes('unit_price')) {
      console.log('➕ Adding unit_price column...');
      db.exec("ALTER TABLE sale_items ADD COLUMN unit_price TEXT DEFAULT '0'");
      console.log('✅ Added unit_price column');
    } else {
      console.log('ℹ️ unit_price column already exists');
    }
    
    // Update existing records to calculate subtotal
    console.log('🔄 Updating existing records...');
    const updateSubtotal = db.prepare(`
      UPDATE sale_items 
      SET subtotal = CAST((CAST(quantity AS REAL) * CAST(COALESCE(unit_price, price) AS REAL)) AS TEXT)
      WHERE subtotal IS NULL OR subtotal = '' OR subtotal = '0'
    `);
    
    const result = updateSubtotal.run();
    console.log(`✅ Updated ${result.changes} sale_items records with calculated subtotals`);
    
    // Update unit_price from price where needed
    const updateUnitPrice = db.prepare(`
      UPDATE sale_items 
      SET unit_price = price 
      WHERE unit_price IS NULL OR unit_price = '' OR unit_price = '0'
    `);
    
    const unitPriceResult = updateUnitPrice.run();
    console.log(`✅ Updated ${unitPriceResult.changes} sale_items records with unit_price`);
    
    // Test the query that was failing
    console.log('🧪 Testing sale_items query...');
    const testQuery = db.prepare(`
      SELECT 
        si.id,
        si.sale_id,
        si.product_id,
        si.quantity,
        si.price,
        COALESCE(si.unit_price, si.price) as unit_price,
        si.subtotal,
        p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LIMIT 3
    `);
    
    const testResult = testQuery.all();
    console.log('✅ Sale_items query working successfully');
    console.log(`📊 Found ${testResult.length} sale items`);
    
    if (testResult.length > 0) {
      console.log('Sample record:', {
        id: testResult[0].id,
        quantity: testResult[0].quantity,
        price: testResult[0].price,
        unit_price: testResult[0].unit_price,
        subtotal: testResult[0].subtotal
      });
    }
    
    console.log('🎉 Sale_items table fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing sale_items table:', error);
  } finally {
    db.close();
    console.log('Database connection closed');
  }
}

// Run the fix
fixSaleItemsSubtotal().then(() => {
  console.log('✅ Database fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
