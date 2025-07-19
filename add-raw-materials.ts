import Database from 'better-sqlite3';

const db = new Database('./pos-data.db');

// Raw materials from the formula screenshots
const rawMaterials = [
  { name: "DM Water", unit: "liters", unitCost: 0.01, description: "Demineralized Water" },
  { name: "EDTA Powder", unit: "kg", unitCost: 15.50, description: "Ethylenediaminetetraacetic Acid" },
  { name: "Kathon CG", unit: "kg", unitCost: 125.00, description: "Preservative" },
  { name: "Miralan CAPB", unit: "kg", unitCost: 85.00, description: "Cocamidopropyl Betaine" },
  { name: "IPA", unit: "liters", unitCost: 45.00, description: "Isopropyl Alcohol" },
  { name: "SLES Liquid", unit: "liters", unitCost: 35.00, description: "Sodium Laureth Sulfate" },
  { name: "Tergitol 15 S-9", unit: "kg", unitCost: 95.00, description: "Surfactant" },
  { name: "Perfume - Shimmer", unit: "liters", unitCost: 180.00, description: "Fragrance" },
  { name: "Perfume - Rose Mod", unit: "liters", unitCost: 175.00, description: "Rose Fragrance" },
  { name: "Perfume - Lavender", unit: "liters", unitCost: 185.00, description: "Lavender Fragrance" },
  { name: "Perfume - Jasmine", unit: "liters", unitCost: 190.00, description: "Jasmine Fragrance" },
  { name: "Perfume - Herbal", unit: "liters", unitCost: 170.00, description: "Herbal Fragrance" },
  { name: "Rhodasurf NP-9M", unit: "kg", unitCost: 115.00, description: "Non-ionic Surfactant" },
  { name: "Caustic Flakes", unit: "kg", unitCost: 25.00, description: "Sodium Hydroxide" },
  { name: "HCl", unit: "liters", unitCost: 18.00, description: "Hydrochloric Acid" },
  { name: "Ferric Chloride", unit: "kg", unitCost: 45.00, description: "Iron Chloride" },
  { name: "Colour - Lavender Garima", unit: "kg", unitCost: 65.00, description: "Purple Color" },
  { name: "Colour - Purple", unit: "kg", unitCost: 60.00, description: "Purple Dye" },
  { name: "Colour - Pink", unit: "kg", unitCost: 58.00, description: "Pink Dye" },
  { name: "Colour - Green", unit: "kg", unitCost: 62.00, description: "Green Dye" },
  { name: "BKC - 80%", unit: "kg", unitCost: 95.00, description: "Benzalkonium Chloride" },
  { name: "BKC - 50%", unit: "kg", unitCost: 75.00, description: "Benzalkonium Chloride 50%" },
  { name: "Acid Slurry Mix", unit: "kg", unitCost: 35.00, description: "Acid Mixture" },
  { name: "Salt", unit: "kg", unitCost: 8.00, description: "Sodium Chloride" },
  { name: "Triclosan BMC", unit: "kg", unitCost: 185.00, description: "Antimicrobial Agent" },
  { name: "Triocol CRS-X", unit: "kg", unitCost: 125.00, description: "Surfactant" },
  { name: "Triocol Liquid", unit: "liters", unitCost: 115.00, description: "Liquid Surfactant" },
  { name: "Perfume - Lemon", unit: "liters", unitCost: 165.00, description: "Lemon Fragrance" },
  { name: "Perfume - Fresh Spring", unit: "liters", unitCost: 155.00, description: "Fresh Spring Fragrance" }
];

console.log('Adding raw materials to database...');

for (const material of rawMaterials) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO raw_materials (
        name, description, unit, current_stock, min_stock_level, 
        unit_cost, active, created_at, updated_at
      ) VALUES (?, ?, ?, 100, 10, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      material.name,
      material.description,
      material.unit,
      material.unitCost
    );
    
    console.log(`✓ Added: ${material.name}`);
  } catch (error) {
    console.error(`Error adding ${material.name}:`, error);
  }
}

console.log('✅ Raw materials added successfully!');
db.close();