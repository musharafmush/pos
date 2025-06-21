import { sqlite } from './db/index.js';

async function createSimpleLoyaltyData() {
  console.log('Creating simplified loyalty data...');

  try {
    // Create basic loyalty records that match the existing schema
    const loyaltyData = [
      [1, 250, 450, 200], // customer_id, available_points, total_points, used_points
      [2, 780, 980, 200],
      [3, 1250, 1350, 100],
      [4, 45, 145, 100],
      [5, 2100, 2300, 200]
    ];

    for (const [customerId, available, total, used] of loyaltyData) {
      sqlite.prepare(`
        INSERT INTO customer_loyalty (
          customer_id, available_points, total_points, used_points, 
          created_at, last_updated
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(customerId, available, total, used);
    }

    console.log('Successfully created loyalty data for 5 customers');
    console.log('Tier distribution:');
    console.log('- Member (< 100 points): 1 customer');
    console.log('- Bronze (100-499 points): 1 customer');  
    console.log('- Silver (500-999 points): 1 customer');
    console.log('- Gold (1000+ points): 2 customers');

  } catch (error) {
    console.error('Error creating loyalty data:', error);
    throw error;
  }
}

createSimpleLoyaltyData();