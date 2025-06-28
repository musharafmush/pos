async function createSampleSales() {
  try {
    console.log('🛒 Creating sample sales data...');
    
    // Get available products and customers
    const productsRes = await fetch('http://localhost:5000/api/products');
    const products = await productsRes.json();
    
    const customersRes = await fetch('http://localhost:5000/api/customers');
    const customers = await customersRes.json();
    
    console.log(`Found ${products.length} products and ${customers.length} customers`);
    
    // Create 5 sample sales
    const sampleSales = [
      {
        customerType: 'existing',
        customerId: customers[0]?.id || 3,
        items: [
          { productId: products[0]?.id || 1, quantity: 2, price: products[0]?.price || 100 },
          { productId: products[1]?.id || 2, quantity: 1, price: products[1]?.price || 200 }
        ],
        paymentMethod: 'cash',
        discount: 0
      },
      {
        customerType: 'existing', 
        customerId: customers[1]?.id || 4,
        items: [
          { productId: products[2]?.id || 3, quantity: 3, price: products[2]?.price || 150 }
        ],
        paymentMethod: 'upi',
        discount: 5
      },
      {
        customerType: 'walk-in',
        items: [
          { productId: products[0]?.id || 1, quantity: 1, price: products[0]?.price || 100 }
        ],
        paymentMethod: 'card',
        discount: 0
      }
    ];
    
    // Create each sale
    for (let i = 0; i < sampleSales.length; i++) {
      const sale = sampleSales[i];
      
      try {
        const response = await fetch('http://localhost:5000/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sale)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Created sample sale ${i + 1}: ${result.orderNumber}`);
        } else {
          const error = await response.text();
          console.log(`⚠️ Failed to create sale ${i + 1}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error creating sale ${i + 1}:`, error.message);
      }
    }
    
    console.log('✅ Sample sales creation completed');
    
  } catch (error) {
    console.error('❌ Sample sales creation failed:', error);
  }
}

createSampleSales();