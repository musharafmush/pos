
import Database from 'better-sqlite3';
import path from 'path';

async function fixMissingAliasColumn() {
  console.log('🔧 Fixing missing alias column in products table...');
  
  try {
    const dbPath = path.join(process.cwd(), 'pos-data.db');
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check current products table structure
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const columnNames = tableInfo.map((col: any) => col.name);
    
    console.log('📋 Current products table columns:', columnNames);
    
    // Add missing columns that are referenced in the schema
    const missingColumns = [
      { name: 'alias', type: 'TEXT', defaultValue: '' },
      { name: 'item_product_type', type: 'TEXT', defaultValue: 'Standard' },
      { name: 'department', type: 'TEXT', defaultValue: 'General' },
      { name: 'brand', type: 'TEXT', defaultValue: 'Generic' },
      { name: 'buyer', type: 'TEXT', defaultValue: 'N/A' },
      { name: 'purchase_gst_calculated_on', type: 'TEXT', defaultValue: 'MRP' },
      { name: 'gst_uom', type: 'TEXT', defaultValue: 'PIECES' },
      { name: 'purchase_abatement', type: 'TEXT', defaultValue: '0' },
      { name: 'config_item_with_commodity', type: 'INTEGER', defaultValue: '0' },
      { name: 'senior_exempt_applicable', type: 'INTEGER', defaultValue: '0' },
      { name: 'ean_code_required', type: 'INTEGER', defaultValue: '0' },
      { name: 'weights_per_unit', type: 'TEXT', defaultValue: '1' },
      { name: 'batch_expiry_details', type: 'TEXT', defaultValue: '' },
      { name: 'item_preparations_status', type: 'TEXT', defaultValue: 'Ready' },
      { name: 'grinding_charge', type: 'TEXT', defaultValue: '0' },
      { name: 'weight_in_gms', type: 'TEXT', defaultValue: '0' },
      { name: 'bulk_item_name', type: 'TEXT', defaultValue: '' },
      { name: 'repackage_units', type: 'TEXT', defaultValue: '1' },
      { name: 'repackage_type', type: 'TEXT', defaultValue: 'Standard' },
      { name: 'packaging_material', type: 'TEXT', defaultValue: 'Standard' },
      { name: 'decimal_point', type: 'TEXT', defaultValue: '2' },
      { name: 'product_type', type: 'TEXT', defaultValue: 'Finished Goods' },
      { name: 'sell_by', type: 'TEXT', defaultValue: 'Unit' },
      { name: 'item_per_unit', type: 'TEXT', defaultValue: '1' },
      { name: 'maintain_selling_mrp_by', type: 'TEXT', defaultValue: 'MRP' },
      { name: 'batch_selection', type: 'TEXT', defaultValue: 'Not Applicable' },
      { name: 'is_weighable', type: 'INTEGER', defaultValue: '0' },
      { name: 'sku_type', type: 'TEXT', defaultValue: 'Standard' },
      { name: 'indent_type', type: 'TEXT', defaultValue: 'Standard' },
      { name: 'gate_keeper_margin', type: 'TEXT', defaultValue: '0' },
      { name: 'allow_item_free', type: 'INTEGER', defaultValue: '0' },
      { name: 'show_on_mobile_dashboard', type: 'INTEGER', defaultValue: '0' },
      { name: 'enable_mobile_notifications', type: 'INTEGER', defaultValue: '0' },
      { name: 'quick_add_to_cart', type: 'INTEGER', defaultValue: '0' },
      { name: 'perishable_item', type: 'INTEGER', defaultValue: '0' },
      { name: 'temperature_controlled', type: 'INTEGER', defaultValue: '0' },
      { name: 'fragile_item', type: 'INTEGER', defaultValue: '0' },
      { name: 'track_serial_numbers', type: 'INTEGER', defaultValue: '0' },
      { name: 'fda_approved', type: 'INTEGER', defaultValue: '0' },
      { name: 'bis_certified', type: 'INTEGER', defaultValue: '0' },
      { name: 'organic_certified', type: 'INTEGER', defaultValue: '0' },
      { name: 'item_ingredients', type: 'TEXT', defaultValue: '' }
    ];
    
    let columnsAdded = 0;
    
    for (const column of missingColumns) {
      if (!columnNames.includes(column.name)) {
        try {
          const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.type} DEFAULT '${column.defaultValue}'`;
          console.log(`📝 Adding column: ${column.name}`);
          db.exec(sql);
          columnsAdded++;
          console.log(`✅ Added column: ${column.name}`);
        } catch (error: any) {
          if (error.message.includes('duplicate column name')) {
            console.log(`⏭️ Column ${column.name} already exists`);
          } else {
            console.error(`❌ Error adding column ${column.name}:`, error.message);
          }
        }
      } else {
        console.log(`⏭️ Column ${column.name} already exists`);
      }
    }
    
    console.log(`✅ Added ${columnsAdded} missing columns to products table`);
    
    // Test the query that was failing
    console.log('🧪 Testing products query...');
    const testQuery = db.prepare('SELECT id, name, alias, department FROM products LIMIT 1');
    const testResult = testQuery.get();
    console.log('✅ Products query test successful:', testResult);
    
    db.close();
    console.log('🎉 Missing alias column fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing missing alias column:', error);
    throw error;
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMissingAliasColumn().catch(console.error);
}

export { fixMissingAliasColumn };
