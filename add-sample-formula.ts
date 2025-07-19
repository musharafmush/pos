import Database from 'better-sqlite3';

const db = new Database('./pos-data.db');

// First, let's check if we have products to link to
const products = db.prepare('SELECT * FROM products WHERE name LIKE ? LIMIT 5').all('%GLORY%');
console.log('Found products:', products);

// Get raw materials
const rawMaterials = db.prepare('SELECT * FROM raw_materials').all();
console.log(`Found ${rawMaterials.length} raw materials`);

// Create a sample GLORY Glass Cleaner formula
try {
  // Create the recipe first
  const insertRecipe = db.prepare(`
    INSERT INTO manufacturing_recipes (
      product_id, name, description, version, instructions, 
      preparation_time, cooking_time, difficulty, servings, 
      active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const recipeResult = insertRecipe.run(
    1, // Using product ID 1 as example
    'GLORY Glass Cleaner Formula',
    'Professional glass cleaner formula with shimmer effect and excellent cleaning power',
    '1.0',
    '1. Add DM Water to mixing tank\n2. Slowly add EDTA Powder while stirring\n3. Add Kathon CG preservative\n4. Add Miralan CAPB surfactant\n5. Add IPA for cleaning power\n6. Add SLES Liquid for foaming\n7. Add Tergitol 15 S-9 for wetting\n8. Add Perfume - Shimmer for fragrance\n9. Add Rhodasurf NP-9M for enhanced cleaning\n10. Mix thoroughly and check pH',
    30, // preparation time
    45, // cooking time
    'medium',
    100, // servings (batch size)
    1 // active
  );

  const recipeId = recipeResult.lastInsertRowid;
  console.log(`✅ Created recipe with ID: ${recipeId}`);

  // Create the ingredients based on the formula data from screenshots
  const ingredients = [
    { material: 'DM Water', quantity: 31.000, unit: 'liters', notes: 'Main solvent' },
    { material: 'EDTA Powder', quantity: 0.018, unit: 'kg', notes: 'Chelating agent' },
    { material: 'IPA', quantity: 3.500, unit: 'liters', notes: 'Cleaning agent' },
    { material: 'Kathon CG', quantity: 0.018, unit: 'kg', notes: 'Preservative' },
    { material: 'Perfume - Shimmer', quantity: 0.105, unit: 'liters', notes: 'Fragrance' },
    { material: 'SLES Liquid', quantity: 0.245, unit: 'liters', notes: 'Surfactant' },
    { material: 'Tergitol 15 S-9', quantity: 0.105, unit: 'kg', notes: 'Wetting agent' },
    { material: 'Rhodasurf NP-9M', quantity: 0.000, unit: 'kg', notes: 'Optional enhancer' },
    { material: 'Miralan CAPB', quantity: 0.000, unit: 'kg', notes: 'Optional foam booster' }
  ];

  const insertIngredient = db.prepare(`
    INSERT INTO recipe_ingredients (
      recipe_id, raw_material_id, quantity, unit, notes, 
      optional, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const ingredient of ingredients) {
    // Find the raw material ID
    const rawMaterial = rawMaterials.find(rm => rm.name === ingredient.material);
    if (rawMaterial) {
      insertIngredient.run(
        recipeId,
        rawMaterial.id,
        ingredient.quantity,
        ingredient.unit,
        ingredient.notes,
        ingredient.quantity === 0 ? 1 : 0 // Mark zero quantities as optional
      );
      console.log(`✓ Added ingredient: ${ingredient.material} - ${ingredient.quantity} ${ingredient.unit}`);
    } else {
      console.warn(`⚠️  Raw material not found: ${ingredient.material}`);
    }
  }

  console.log('✅ GLORY Glass Cleaner formula created successfully!');

} catch (error) {
  console.error('Error creating formula:', error);
}

db.close();