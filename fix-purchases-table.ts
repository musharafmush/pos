import Database from 'better-sqlite3';

const db = new Database('pos-data.db');

async function fixPurchasesTable() {
  console.log('Fixing purchases table structure...');
  
  try {
    // Check current purchases table structure
    const tableInfo = db.prepare("PRAGMA table_info(purchases)").all();
    console.log('Current purchases table structure:', tableInfo);
    
    // Get existing columns
    const existingColumns = tableInfo.map((col: any) => col.name);
    console.log('Existing columns:', existingColumns);
    
    // Define required columns that might be missing
    const requiredColumns = [
      { name: 'order_number', sql: 'ALTER TABLE purchases ADD COLUMN order_number TEXT' },
      { name: 'sub_total', sql: 'ALTER TABLE purchases ADD COLUMN sub_total TEXT DEFAULT "0"' },
      { name: 'freight_cost', sql: 'ALTER TABLE purchases ADD COLUMN freight_cost TEXT DEFAULT "0"' },
      { name: 'other_charges', sql: 'ALTER TABLE purchases ADD COLUMN other_charges TEXT DEFAULT "0"' },
      { name: 'discount_amount', sql: 'ALTER TABLE purchases ADD COLUMN discount_amount TEXT DEFAULT "0"' }
    ];
    
    // Add missing columns
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        db.exec(column.sql);
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }
    
    // Check purchase_items table as well
    const purchaseItemsInfo = db.prepare("PRAGMA table_info(purchase_items)").all();
    console.log('Current purchase_items table structure:', purchaseItemsInfo);
    
    const existingPurchaseItemsColumns = purchaseItemsInfo.map((col: any) => col.name);
    
    // Add missing columns to purchase_items if needed
    const requiredPurchaseItemsColumns = [
      { name: 'amount', sql: 'ALTER TABLE purchase_items ADD COLUMN amount TEXT DEFAULT "0"' }
    ];
    
    for (const column of requiredPurchaseItemsColumns) {
      if (!existingPurchaseItemsColumns.includes(column.name)) {
        console.log(`Adding missing column to purchase_items: ${column.name}`);
        db.exec(column.sql);
      } else {
        console.log(`Column ${column.name} already exists in purchase_items`);
      }
    }
    
    console.log('✅ Purchases table structure fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing purchases table:', error);
  } finally {
    db.close();
  }
}

fixPurchasesTable();