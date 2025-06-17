import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');

async function addMissingProductColumns() {
  const db = new Database(dbPath);
  
  console.log('🔄 Adding missing product columns...');
  
  try {
    // Get existing columns
    const pragma = db.pragma('table_info(products)');
    const existingColumns = pragma.map((col: any) => col.name);
    
    console.log('📋 Existing columns:', existingColumns);
    
    // Define all missing columns that need to be added
    const columnsToAdd = [
      // Tax Information - Indian GST Compliance
      { name: 'hsn_code', definition: 'TEXT' },
      { name: 'gst_code', definition: 'TEXT' },
      { name: 'cgst_rate', definition: 'TEXT DEFAULT \'0\'' },
      { name: 'sgst_rate', definition: 'TEXT DEFAULT \'0\'' },
      { name: 'igst_rate', definition: 'TEXT DEFAULT \'0\'' },
      { name: 'cess_rate', definition: 'TEXT DEFAULT \'0\'' },
      { name: 'tax_calculation_method', definition: 'TEXT' },
      
      // Supplier & Manufacturer Information
      { name: 'manufacturer_name', definition: 'TEXT' },
      { name: 'supplier_name', definition: 'TEXT' },
      { name: 'manufacturer_id', definition: 'INTEGER' },
      { name: 'supplier_id', definition: 'INTEGER' },
      
      // Product Classification
      { name: 'alias', definition: 'TEXT' },
      { name: 'item_product_type', definition: 'TEXT' },
      { name: 'department', definition: 'TEXT' },
      { name: 'brand', definition: 'TEXT' },
      { name: 'buyer', definition: 'TEXT' },
      { name: 'purchase_gst_calculated_on', definition: 'TEXT' },
      { name: 'gst_uom', definition: 'TEXT' },
      { name: 'purchase_abatement', definition: 'TEXT' },
      
      // Configuration Options
      { name: 'config_item_with_commodity', definition: 'INTEGER DEFAULT 0' },
      { name: 'senior_exempt_applicable', definition: 'INTEGER DEFAULT 0' },
      { name: 'ean_code_required', definition: 'INTEGER DEFAULT 0' },
      { name: 'weights_per_unit', definition: 'TEXT' },
      { name: 'batch_expiry_details', definition: 'TEXT' },
      { name: 'item_preparations_status', definition: 'TEXT' },
      
      // Pricing & Charges
      { name: 'grinding_charge', definition: 'TEXT' },
      { name: 'weight_in_gms', definition: 'TEXT' },
      { name: 'bulk_item_name', definition: 'TEXT' },
      { name: 'repackage_units', definition: 'TEXT' },
      { name: 'repackage_type', definition: 'TEXT' },
      { name: 'packaging_material', definition: 'TEXT' },
      { name: 'decimal_point', definition: 'TEXT' },
      { name: 'product_type', definition: 'TEXT' },
      { name: 'sell_by', definition: 'TEXT' },
      { name: 'item_per_unit', definition: 'TEXT' },
      { name: 'maintain_selling_mrp_by', definition: 'TEXT' },
      { name: 'batch_selection', definition: 'TEXT' },
      
      // Item Properties
      { name: 'is_weighable', definition: 'INTEGER DEFAULT 0' },
      { name: 'sku_type', definition: 'TEXT' },
      { name: 'indent_type', definition: 'TEXT' },
      { name: 'gate_keeper_margin', definition: 'TEXT' },
      { name: 'allow_item_free', definition: 'INTEGER DEFAULT 0' },
      { name: 'show_on_mobile_dashboard', definition: 'INTEGER DEFAULT 0' },
      { name: 'enable_mobile_notifications', definition: 'INTEGER DEFAULT 0' },
      { name: 'quick_add_to_cart', definition: 'INTEGER DEFAULT 0' },
      { name: 'perishable_item', definition: 'INTEGER DEFAULT 0' },
      { name: 'temperature_controlled', definition: 'INTEGER DEFAULT 0' },
      { name: 'fragile_item', definition: 'INTEGER DEFAULT 0' }
    ];
    
    // Add missing columns
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        const sql = `ALTER TABLE products ADD COLUMN ${column.name} ${column.definition}`;
        console.log(`➕ Adding column: ${column.name}`);
        db.exec(sql);
      } else {
        console.log(`✅ Column already exists: ${column.name}`);
      }
    }
    
    // Verify the columns were added
    const updatedPragma = db.pragma('table_info(products)');
    const updatedColumns = updatedPragma.map((col: any) => col.name);
    
    console.log('✅ Updated columns count:', updatedColumns.length);
    console.log('🎉 Successfully added missing product columns!');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  addMissingProductColumns()
    .then(() => console.log('Migration completed successfully'))
    .catch(console.error);
}

export { addMissingProductColumns };