import Database from 'better-sqlite3';

async function createLabelTemplatesTable() {
  console.log('🔧 Creating label templates table in SQLite...');
  
  const db = new Database('./pos-data.db');
  
  try {
    // Create label_templates table
    db.exec(`
      CREATE TABLE IF NOT EXISTS label_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        layout_style TEXT NOT NULL DEFAULT 'modern',
        paper_size TEXT NOT NULL DEFAULT 'A4',
        labels_per_row INTEGER NOT NULL DEFAULT 2,
        labels_per_column INTEGER NOT NULL DEFAULT 5,
        margin_top REAL NOT NULL DEFAULT 10,
        margin_bottom REAL NOT NULL DEFAULT 10,
        margin_left REAL NOT NULL DEFAULT 10,
        margin_right REAL NOT NULL DEFAULT 10,
        label_width REAL NOT NULL DEFAULT 85,
        label_height REAL NOT NULL DEFAULT 54,
        font_family TEXT NOT NULL DEFAULT 'Inter',
        font_size INTEGER NOT NULL DEFAULT 9,
        primary_color TEXT NOT NULL DEFAULT '#2563eb',
        secondary_color TEXT NOT NULL DEFAULT '#64748b',
        text_color TEXT NOT NULL DEFAULT '#000000',
        custom_css TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default professional templates
    const defaultTemplates = [
      {
        name: 'Modern Professional',
        description: 'Clean, modern design with subtle gradients and professional typography',
        layout_style: 'modern',
        primary_color: '#2563eb',
        secondary_color: '#64748b',
        is_default: 1
      },
      {
        name: 'Classic Business',
        description: 'Traditional business style with clean lines and structured layout',
        layout_style: 'classic',
        primary_color: '#1f2937',
        secondary_color: '#6b7280',
        is_default: 0
      },
      {
        name: 'Minimal Clean',
        description: 'Minimalist design focusing on essential information',
        layout_style: 'minimal',
        primary_color: '#374151',
        secondary_color: '#9ca3af',
        is_default: 0
      },
      {
        name: 'Premium Gold',
        description: 'Luxury design with premium colors and elegant styling',
        layout_style: 'premium',
        primary_color: '#d97706',
        secondary_color: '#92400e',
        is_default: 0
      },
      {
        name: 'Retail Focus',
        description: 'Retail-optimized with price emphasis and customer engagement',
        layout_style: 'retail',
        primary_color: '#dc2626',
        secondary_color: '#991b1b',
        is_default: 0
      },
      {
        name: 'Industrial Strong',
        description: 'Bold design for industrial and manufacturing environments',
        layout_style: 'industrial',
        primary_color: '#0f172a',
        secondary_color: '#475569',
        is_default: 0
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO label_templates (
        name, description, layout_style, primary_color, secondary_color, is_default
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const template of defaultTemplates) {
      insertStmt.run(
        template.name,
        template.description,
        template.layout_style,
        template.primary_color,
        template.secondary_color,
        template.is_default
      );
    }

    console.log('✅ Label templates table created successfully');
    console.log(`✅ Inserted ${defaultTemplates.length} default templates`);

    // Verify the data
    const count = db.prepare('SELECT COUNT(*) as count FROM label_templates').get();
    console.log(`📊 Total templates in database: ${count.count}`);

  } catch (error) {
    console.error('❌ Error creating label templates table:', error);
  } finally {
    db.close();
  }
}

// Run the migration
createLabelTemplatesTable().catch(console.error);