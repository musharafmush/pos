import { storage } from './server/storage';

async function testProductCreation() {
  console.log('Testing product creation...');
  
  try {
    const testProduct = {
      name: 'Test Product',
      description: 'Test Description',
      sku: 'TEST001',
      price: 100,
      cost: 80,
      categoryId: 1,
      stockQuantity: 50,
      alertThreshold: 10
    };

    const newProduct = await storage.createProduct(testProduct);
    console.log('✅ Product created successfully:', newProduct);
    
    // Clean up - remove test product
    await storage.deleteProduct(newProduct.id);
    console.log('✅ Test product cleaned up');
    
  } catch (error) {
    console.error('❌ Product creation failed:', error);
  }
}

testProductCreation();