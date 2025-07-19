import Database from 'better-sqlite3';

const db = new Database('./pos-data.db');

console.log('🔄 Creating manufacturing database tables...');

try {
  // Create manufacturing_orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      batch_number TEXT,
      batch_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_user_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (assigned_user_id) REFERENCES users(id)
    )
  `);

  // Create manufacturing_batches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL UNIQUE,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES manufacturing_orders(id)
    )
  `);

  // Create quality_control_checks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quality_control_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      check_type TEXT NOT NULL,
      check_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      inspector_id INTEGER,
      results TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES manufacturing_batches(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    )
  `);

  // Create raw_materials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      unit TEXT NOT NULL,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock_level REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      supplier_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // Create manufacturing_recipes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0',
      instructions TEXT,
      preparation_time INTEGER DEFAULT 0,
      cooking_time INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT 'medium',
      servings INTEGER DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Create recipe_ingredients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      notes TEXT,
      optional INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipe_id) REFERENCES manufacturing_recipes(id),
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
    )
  `);

  console.log('✅ Manufacturing tables created successfully!');

  // Now add raw materials
  console.log('🔄 Adding raw materials...');
  
  const rawMaterials = [
    { name: "DM Water", description: "Demineralized Water", unit: "liters", stock: 1000, minStock: 50, cost: 0.01 },
    { name: "EDTA Powder", description: "Ethylenediaminetetraacetic Acid", unit: "kg", stock: 50, minStock: 5, cost: 15.50 },
    { name: "Kathon CG", description: "Preservative", unit: "kg", stock: 25, minStock: 2, cost: 125.00 },
    { name: "Miralan CAPB", description: "Cocamidopropyl Betaine", unit: "kg", stock: 100, minStock: 10, cost: 85.00 },
    { name: "IPA", description: "Isopropyl Alcohol", unit: "liters", stock: 75, minStock: 8, cost: 45.00 },
    { name: "SLES Liquid", description: "Sodium Laureth Sulfate", unit: "liters", stock: 200, minStock: 20, cost: 35.00 },
    { name: "Tergitol 15 S-9", description: "Surfactant", unit: "kg", stock: 80, minStock: 8, cost: 95.00 },
    { name: "Perfume - Shimmer", description: "Fragrance for glass cleaners", unit: "liters", stock: 30, minStock: 3, cost: 180.00 },
    { name: "Perfume - Rose Mod", description: "Rose Fragrance", unit: "liters", stock: 25, minStock: 3, cost: 175.00 },
    { name: "Rhodasurf NP-9M", description: "Non-ionic Surfactant", unit: "kg", stock: 60, minStock: 6, cost: 115.00 },
    { name: "Perfume - Lavender", description: "Lavender Fragrance", unit: "liters", stock: 25, minStock: 3, cost: 185.00 },
    { name: "Perfume - Jasmine", description: "Jasmine Fragrance", unit: "liters", stock: 20, minStock: 2, cost: 190.00 },
    { name: "Perfume - Herbal", description: "Herbal Fragrance", unit: "liters", stock: 22, minStock: 2, cost: 170.00 },
    { name: "Caustic Flakes", description: "Sodium Hydroxide", unit: "kg", stock: 150, minStock: 15, cost: 25.00 },
    { name: "HCl", description: "Hydrochloric Acid", unit: "liters", stock: 100, minStock: 10, cost: 18.00 },
    { name: "Colour - Purple", description: "Purple Dye", unit: "kg", stock: 20, minStock: 2, cost: 60.00 },
    { name: "Colour - Pink", description: "Pink Dye", unit: "kg", stock: 18, minStock: 2, cost: 58.00 },
    { name: "Colour - Green", description: "Green Dye", unit: "kg", stock: 22, minStock: 2, cost: 62.00 },
    { name: "BKC - 80%", description: "Benzalkonium Chloride", unit: "kg", stock: 40, minStock: 4, cost: 95.00 },
    { name: "BKC - 50%", description: "Benzalkonium Chloride 50%", unit: "kg", stock: 35, minStock: 4, cost: 75.00 }
  ];

  const insertMaterial = db.prepare(`
    INSERT OR IGNORE INTO raw_materials (
      name, description, unit, current_stock, min_stock_level, unit_cost, active
    ) VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  for (const material of rawMaterials) {
    insertMaterial.run(
      material.name,
      material.description,
      material.unit,
      material.stock,
      material.minStock,
      material.cost
    );
    console.log(`✓ Added: ${material.name}`);
  }

  console.log('✅ Raw materials added successfully!');

  // Create sample GLORY Glass Cleaner formula
  console.log('🔄 Creating sample formula...');

  // Get first product for demo
  const product = db.prepare('SELECT * FROM products LIMIT 1').get();
  
  if (product) {
    const insertRecipe = db.prepare(`
      INSERT INTO manufacturing_recipes (
        product_id, name, description, version, instructions, 
        preparation_time, cooking_time, difficulty, servings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const recipeResult = insertRecipe.run(
      product.id,
      'GLORY Glass Cleaner Formula',
      'Professional glass cleaner formula with shimmer effect and excellent cleaning power',
      '1.0',
      '1. Add DM Water to mixing tank\n2. Slowly add EDTA Powder while stirring\n3. Add Kathon CG preservative\n4. Add Miralan CAPB surfactant\n5. Add IPA for cleaning power\n6. Add SLES Liquid for foaming\n7. Add Tergitol 15 S-9 for wetting\n8. Add Perfume - Shimmer for fragrance\n9. Add Rhodasurf NP-9M for enhanced cleaning\n10. Mix thoroughly and check pH',
      30, // preparation time
      45, // cooking time
      'medium',
      100 // servings (batch size)
    );

    const recipeId = recipeResult.lastInsertRowid;

    // Add ingredients
    const ingredients = [
      { material: 'DM Water', quantity: 31.000, unit: 'liters', notes: 'Main solvent' },
      { material: 'EDTA Powder', quantity: 0.018, unit: 'kg', notes: 'Chelating agent' },
      { material: 'IPA', quantity: 3.500, unit: 'liters', notes: 'Cleaning agent' },
      { material: 'Kathon CG', quantity: 0.018, unit: 'kg', notes: 'Preservative' },
      { material: 'Perfume - Shimmer', quantity: 0.105, unit: 'liters', notes: 'Fragrance' },
      { material: 'SLES Liquid', quantity: 0.245, unit: 'liters', notes: 'Surfactant' },
      { material: 'Tergitol 15 S-9', quantity: 0.105, unit: 'kg', notes: 'Wetting agent' }
    ];

    const insertIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (
        recipe_id, raw_material_id, quantity, unit, notes, optional
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const rawMaterialsData = db.prepare('SELECT * FROM raw_materials').all();

    for (const ingredient of ingredients) {
      const rawMaterial = rawMaterialsData.find(rm => rm.name === ingredient.material);
      if (rawMaterial) {
        insertIngredient.run(
          recipeId,
          rawMaterial.id,
          ingredient.quantity,
          ingredient.unit,
          ingredient.notes,
          0
        );
        console.log(`✓ Added ingredient: ${ingredient.material}`);
      }
    }

    console.log('✅ Sample formula created successfully!');
  }

} catch (error) {
  console.error('Error setting up manufacturing system:', error);
}

db.close();
console.log('🎉 Manufacturing system setup complete!');