import { readFileSync } from 'fs';

async function restoreSalesData() {
  try {
    console.log('🔄 Loading backup to restore sales data...');
    const backupContent = readFileSync('./awesome-pos-backup-2025-06-28.json', 'utf8');
    const backupData = JSON.parse(backupContent);
    
    // Extract sales and sale_items data
    const salesData = backupData.data.sales || [];
    const saleItemsData = backupData.data.sale_items || [];
    
    console.log(`📊 Found ${salesData.length} sales and ${saleItemsData.length} sale items`);
    
    // Restore sales data first
    if (salesData.length > 0) {
      console.log('📤 Restoring sales data...');
      for (const sale of salesData) {
        try {
          const response = await fetch('http://localhost:5000/api/sales', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerType: sale.customer_id ? 'existing' : 'walk-in',
              customerId: sale.customer_id,
              items: [], // We'll add items separately
              total: sale.total,
              tax: sale.tax || 0,
              discount: sale.discount || 0,
              paymentMethod: sale.payment_method || 'cash',
              orderNumber: sale.order_number,
              createdAt: sale.created_at
            })
          });
          
          if (response.ok) {
            console.log(`✅ Restored sale ${sale.order_number}`);
          } else {
            console.log(`⚠️ Failed to restore sale ${sale.order_number}`);
          }
        } catch (error) {
          console.log(`❌ Error restoring sale ${sale.order_number}:`, error.message);
        }
      }
    }
    
    console.log('✅ Sales restoration process completed');
    
  } catch (error) {
    console.error('❌ Sales restoration failed:', error);
  }
}

restoreSalesData();