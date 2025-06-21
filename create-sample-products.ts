import { storage } from './server/storage';

async function main() {
  console.log('Creating sample products...');
  
  // Sample products for testing
  const sampleProducts = [
    {
      name: 'Basmati Rice',
      description: 'Premium quality basmati rice',
      sku: 'RICE001', 
      price: '120',
      mrp: '150',
      cost: '100',
      categoryId: 1,
      stockQuantity: 50,
      alertThreshold: 10,
      barcode: '1234567890123',
      active: true,
      hsnCode: '1006',
      cgstRate: '2.5',
      sgstRate: '2.5',
      igstRate: '5',
      cessRate: '0'
    },
    {
      name: 'Wheat Flour',
      description: 'Fresh wheat flour 1kg pack',
      sku: 'FLOUR001',
      price: '45',
      mrp: '50', 
      cost: '35',
      categoryId: 1,
      stockQuantity: 75,
      alertThreshold: 15,
      barcode: '1234567890124',
      active: true,
      hsnCode: '1101',
      cgstRate: '2.5',
      sgstRate: '2.5',
      igstRate: '5',
      cessRate: '0'
    },
    {
      name: 'Sugar',
      description: 'Refined white sugar 1kg',
      sku: 'SUGAR001',
      price: '42',
      mrp: '45',
      cost: '38',
      categoryId: 1,
      stockQuantity: 30,
      alertThreshold: 8,
      barcode: '1234567890125',
      active: true,
      hsnCode: '1701',
      cgstRate: '2.5',
      sgstRate: '2.5', 
      igstRate: '5',
      cessRate: '0'
    },
    {
      name: 'Cooking Oil',
      description: 'Sunflower cooking oil 1 liter',
      sku: 'OIL001',
      price: '140',
      mrp: '160',
      cost: '120',
      categoryId: 1,
      stockQuantity: 25,
      alertThreshold: 5,
      barcode: '1234567890126',
      active: true,
      hsnCode: '1512',
      cgstRate: '2.5',
      sgstRate: '2.5',
      igstRate: '5',
      cessRate: '0'
    },
    {
      name: 'Tea Leaves',
      description: 'Premium black tea 250g pack',
      sku: 'TEA001',
      price: '85',
      mrp: '95',
      cost: '70',
      categoryId: 1,
      stockQuantity: 40,
      alertThreshold: 10,
      barcode: '1234567890127',
      active: true,
      hsnCode: '0902',
      cgstRate: '2.5',
      sgstRate: '2.5',
      igstRate: '5',
      cessRate: '0'
    }
  ];

  try {
    for (const product of sampleProducts) {
      const createdProduct = await storage.createProduct(product);
      console.log(`✅ Created product: ${createdProduct.name} (ID: ${createdProduct.id})`);
    }
    
    console.log('\n🎉 Sample products created successfully!');
    
    // Verify products were created
    const products = await storage.getProducts();
    console.log(`\n📦 Total products in database: ${products.length}`);
    
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
  }
}

main().catch(console.error);