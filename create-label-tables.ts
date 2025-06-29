import Database from 'better-sqlite3';

async function createLabelTables() {
  try {
    console.log('🔧 Creating label templates and print jobs tables...');
    
    const db = new Database('./pos-data.db');
    
    // Create label_templates table
    db.exec(`
      CREATE TABLE IF NOT EXISTS label_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        width REAL NOT NULL,
        height REAL NOT NULL,
        font_size INTEGER NOT NULL DEFAULT 12,
        include_barcode INTEGER NOT NULL DEFAULT 1,
        include_price INTEGER NOT NULL DEFAULT 1,
        include_description INTEGER NOT NULL DEFAULT 0,
        include_mrp INTEGER NOT NULL DEFAULT 1,
        include_weight INTEGER NOT NULL DEFAULT 0,
        include_hsn INTEGER NOT NULL DEFAULT 0,
        barcode_position TEXT NOT NULL DEFAULT 'bottom',
        border_style TEXT NOT NULL DEFAULT 'solid',
        border_width INTEGER NOT NULL DEFAULT 1,
        background_color TEXT NOT NULL DEFAULT '#ffffff',
        text_color TEXT NOT NULL DEFAULT '#000000',
        custom_css TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create print_jobs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        product_ids TEXT NOT NULL,
        copies INTEGER NOT NULL DEFAULT 1,
        labels_per_row INTEGER NOT NULL DEFAULT 2,
        paper_size TEXT NOT NULL DEFAULT 'A4',
        orientation TEXT NOT NULL DEFAULT 'portrait',
        status TEXT NOT NULL DEFAULT 'completed',
        total_labels INTEGER NOT NULL,
        custom_text TEXT,
        print_settings TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES label_templates(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    console.log('✅ Label tables created successfully');
    
    // Insert default label templates
    console.log('🔧 Creating default label templates...');
    
    const templates = [
      {
        name: 'Retail Standard',
        description: 'Standard retail label with barcode and price',
        width: 80,
        height: 50,
        font_size: 12,
        include_barcode: 1,
        include_price: 1,
        include_description: 0,
        include_mrp: 1,
        include_weight: 0,
        include_hsn: 0,
        barcode_position: 'bottom',
        border_style: 'solid',
        border_width: 1,
        background_color: '#ffffff',
        text_color: '#000000',
        is_default: 1,
        is_active: 1
      },
      {
        name: 'Grocery Compact',
        description: 'Compact label for grocery items',
        width: 60,
        height: 40,
        font_size: 10,
        include_barcode: 1,
        include_price: 1,
        include_description: 0,
        include_mrp: 1,
        include_weight: 1,
        include_hsn: 0,
        barcode_position: 'bottom',
        border_style: 'solid',
        border_width: 1,
        background_color: '#ffffff',
        text_color: '#000000',
        is_default: 0,
        is_active: 1
      },
      {
        name: 'Wholesale Detailed',
        description: 'Detailed label with HSN code for wholesale',
        width: 100,
        height: 70,
        font_size: 14,
        include_barcode: 1,
        include_price: 1,
        include_description: 1,
        include_mrp: 1,
        include_weight: 1,
        include_hsn: 1,
        barcode_position: 'bottom',
        border_style: 'solid',
        border_width: 2,
        background_color: '#ffffff',
        text_color: '#000000',
        is_default: 0,
        is_active: 1
      },
      {
        name: 'Pharmacy Label',
        description: 'Label for pharmaceutical products',
        width: 70,
        height: 45,
        font_size: 11,
        include_barcode: 1,
        include_price: 1,
        include_description: 1,
        include_mrp: 1,
        include_weight: 0,
        include_hsn: 1,
        barcode_position: 'bottom',
        border_style: 'solid',
        border_width: 1,
        background_color: '#f8f9fa',
        text_color: '#000000',
        is_default: 0,
        is_active: 1
      },
      {
        name: 'Electronics Tag',
        description: 'Large label for electronics with detailed info',
        width: 120,
        height: 80,
        font_size: 16,
        include_barcode: 1,
        include_price: 1,
        include_description: 1,
        include_mrp: 1,
        include_weight: 0,
        include_hsn: 1,
        barcode_position: 'bottom',
        border_style: 'solid',
        border_width: 2,
        background_color: '#ffffff',
        text_color: '#000000',
        is_default: 0,
        is_active: 1
      }
    ];
    
    const insertTemplate = db.prepare(`
      INSERT OR IGNORE INTO label_templates (
        name, description, width, height, font_size, include_barcode, include_price,
        include_description, include_mrp, include_weight, include_hsn, barcode_position,
        border_style, border_width, background_color, text_color, is_default, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    
    for (const template of templates) {
      insertTemplate.run(
        template.name,
        template.description,
        template.width,
        template.height,
        template.font_size,
        template.include_barcode,
        template.include_price,
        template.include_description,
        template.include_mrp,
        template.include_weight,
        template.include_hsn,
        template.barcode_position,
        template.border_style,
        template.border_width,
        template.background_color,
        template.text_color,
        template.is_default,
        template.is_active,
        now,
        now
      );
    }
    
    console.log('✅ Default label templates created successfully');
    
    // Verify tables were created
    const templates_count = db.prepare("SELECT COUNT(*) as count FROM label_templates").get();
    const jobs_count = db.prepare("SELECT COUNT(*) as count FROM print_jobs").get();
    
    console.log(`📊 Label templates table: ${templates_count.count} records`);
    console.log(`📊 Print jobs table: ${jobs_count.count} records`);
    
    db.close();
    console.log('🎉 Label printing system database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating label tables:', error);
    throw error;
  }
}

// Run the setup
createLabelTables().catch(console.error);