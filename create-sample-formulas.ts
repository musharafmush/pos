// Sample script to create product formulas via API
import { apiRequest } from './client/src/lib/queryClient.js';

const sampleRawMaterials = [
  { name: "DM Water", unit: "liters", unitCost: 0.01, description: "Demineralized Water" },
  { name: "EDTA Powder", unit: "kg", unitCost: 15.50, description: "Ethylenediaminetetraacetic Acid" },
  { name: "Kathon CG", unit: "kg", unitCost: 125.00, description: "Preservative" },
  { name: "Miralan CAPB", unit: "kg", unitCost: 85.00, description: "Cocamidopropyl Betaine" },
  { name: "IPA", unit: "liters", unitCost: 45.00, description: "Isopropyl Alcohol" },
  { name: "SLES Liquid", unit: "liters", unitCost: 35.00, description: "Sodium Laureth Sulfate" },
  { name: "Tergitol 15 S-9", unit: "kg", unitCost: 95.00, description: "Surfactant" },
  { name: "Perfume - Shimmer", unit: "liters", unitCost: 180.00, description: "Fragrance" },
  { name: "Perfume - Rose Mod", unit: "liters", unitCost: 175.00, description: "Rose Fragrance" },
  { name: "Rhodasurf NP-9M", unit: "kg", unitCost: 115.00, description: "Non-ionic Surfactant" },
];

// GLORY Glass Cleaner Formula based on screenshots
const gloryGlassFormula = {
  name: "GLORY Glass Cleaner Formula",
  productId: 1, // This would need to be the actual product ID
  description: "Professional glass cleaner formula with shimmer effect",
  version: "1.0",
  instructions: "1. Add DM Water to mixing tank\n2. Slowly add EDTA Powder while stirring\n3. Add Kathon CG preservative\n4. Add Miralan CAPB surfactant\n5. Add IPA for cleaning power\n6. Add SLES Liquid for foaming\n7. Add Tergitol 15 S-9 for wetting\n8. Add Perfume - Shimmer for fragrance\n9. Add Rhodasurf NP-9M for enhanced cleaning\n10. Mix thoroughly and check pH",
  preparationTime: 30,
  cookingTime: 45,
  difficulty: "medium",
  servings: 100,
  ingredients: [
    { material: "DM Water", quantity: 31.000, unit: "liters" },
    { material: "EDTA Powder", quantity: 0.018, unit: "kg" },
    { material: "IPA", quantity: 3.500, unit: "liters" },
    { material: "Kathon CG", quantity: 0.018, unit: "kg" },
    { material: "Perfume - Shimmer", quantity: 0.105, unit: "liters" },
    { material: "SLES Liquid", quantity: 0.245, unit: "liters" },
    { material: "Tergitol 15 S-9", quantity: 0.105, unit: "kg" },
    { material: "Rhodasurf NP-9M", quantity: 0.000, unit: "kg" }, // As shown in screenshot
    { material: "Miralan CAPB", quantity: 0.000, unit: "kg" }
  ]
};

console.log('Formula data ready for creation:');
console.log(JSON.stringify(gloryGlassFormula, null, 2));