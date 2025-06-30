// Debug script to test print-labels functionality
const fetch = require('node-fetch');

async function testPrintLabelsEndpoints() {
  try {
    console.log('Testing /api/products endpoint...');
    const productsResponse = await fetch('http://localhost:5000/api/products');
    const products = await productsResponse.json();
    console.log(`Products found: ${products.length}`);
    console.log('Sample product:', JSON.stringify(products[0], null, 2));

    console.log('\nTesting /api/categories endpoint...');
    const categoriesResponse = await fetch('http://localhost:5000/api/categories');
    const categories = await categoriesResponse.json();
    console.log(`Categories found: ${categories.length}`);
    console.log('Sample category:', JSON.stringify(categories[0], null, 2));

    // Check data types
    console.log('\nData type analysis:');
    if (products.length > 0) {
      const product = products[0];
      console.log('Price type:', typeof product.price, 'Value:', product.price);
      console.log('MRP type:', typeof product.mrp, 'Value:', product.mrp);
      console.log('SKU type:', typeof product.sku, 'Value:', product.sku);
    }

  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
}

testPrintLabelsEndpoints();