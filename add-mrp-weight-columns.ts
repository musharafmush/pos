import Database from 'better-sqlite3';

async function addMrpWeightColumns() {
  console.log('Adding MRP and Weight columns to products table...');
  
  try {
    const db = new Database('./pos-data.db');
    
    // Check if columns already exist
    const tableInfo = db.pragma("table_info(products)");
    const columnNames = tableInfo.map((col: any) => col.name);
    
    // Add MRP column if it doesn't exist
    if (!columnNames.includes('mrp')) {
      console.log('Adding MRP column...');
      db.exec('ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) DEFAULT 0');
      console.log('✅ MRP column added successfully');
    } else {
      console.log('MRP column already exists');
    }
    
    // Add weight column if it doesn't exist
    if (!columnNames.includes('weight')) {
      console.log('Adding weight column...');
      db.exec('ALTER TABLE products ADD COLUMN weight DECIMAL(10,3)');
      console.log('✅ Weight column added successfully');
    } else {
      console.log('Weight column already exists');
    }
    
    // Add weight_unit column if it doesn't exist
    if (!columnNames.includes('weight_unit')) {
      console.log('Adding weight_unit column...');
      db.exec("ALTER TABLE products ADD COLUMN weight_unit TEXT DEFAULT 'kg'");
      console.log('✅ Weight unit column added successfully');
    } else {
      console.log('Weight unit column already exists');
    }
    
    // Update existing products to have MRP = price where MRP is 0
    console.log('Updating existing products with MRP values...');
    const updateMrp = db.prepare('UPDATE products SET mrp = price WHERE mrp = 0 OR mrp IS NULL');
    const result = updateMrp.run();
    console.log(`✅ Updated ${result.changes} products with MRP values`);
    
    db.close();
    console.log('🎉 MRP and Weight columns added successfully to products table!');
    
  } catch (error) {
    console.error('❌ Error adding MRP and Weight columns:', error);
    throw error;
  }
}

addMrpWeightColumns().catch(console.error);