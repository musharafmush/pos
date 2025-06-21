import { sqlite } from './db/index.js';

async function createSampleOffers() {
  console.log('Creating sample offers for demonstration...');

  try {
    // Sample Offer 1: Weekend Percentage Discount
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, min_purchase_amount, 
        max_discount_amount, usage_limit, per_customer_limit, priority, 
        active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "Weekend Special - 15% Off",
      "Get 15% discount on all purchases during weekends",
      "percentage",
      15.00,
      500.00,
      200.00,
      1000,
      5,
      1,
      1,
      1
    );

    // Sample Offer 2: Flat Discount for Large Orders
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, min_purchase_amount,
        usage_limit, per_customer_limit, priority, active, created_by, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "Big Order Bonus - ₹100 Off",
      "Flat ₹100 discount on orders above ₹2000",
      "flat_amount",
      100.00,
      2000.00,
      500,
      3,
      2,
      1,
      1
    );

    // Sample Offer 3: Buy 2 Get 1 Free
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, buy_quantity, 
        get_quantity, min_purchase_amount, usage_limit, per_customer_limit, 
        priority, active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "Buy 2 Get 1 Free Special",
      "Purchase any 2 items and get the cheapest one free",
      "buy_x_get_y",
      100.00,
      2,
      1,
      300.00,
      200,
      2,
      3,
      1,
      1
    );

    // Sample Offer 4: Happy Hour Time-based Discount
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, min_purchase_amount,
        max_discount_amount, time_start, time_end, usage_limit, 
        per_customer_limit, priority, active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "Happy Hour - 20% Off",
      "20% discount during happy hours (2 PM to 5 PM)",
      "time_based",
      20.00,
      200.00,
      300.00,
      "14:00",
      "17:00",
      100,
      1,
      4,
      1,
      1
    );

    // Sample Offer 5: Loyalty Points Program
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, points_threshold,
        points_reward, priority, active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "Loyalty Rewards Program",
      "Earn 10 points for every ₹1000 spent",
      "loyalty_points",
      1.00,
      1000.00,
      10.00,
      6,
      1,
      1
    );

    // Sample Offer 6: First-time Customer Special
    sqlite.prepare(`
      INSERT INTO offers (
        name, description, offer_type, discount_value, min_purchase_amount,
        usage_limit, per_customer_limit, priority, active, created_by, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      "New Customer Welcome - ₹50 Off",
      "Special ₹50 discount for first-time customers",
      "flat_amount",
      50.00,
      500.00,
      1000,
      1,
      7,
      1,
      1
    );

    console.log('Successfully created 6 sample offers demonstrating:');
    console.log('- Percentage discounts with caps');
    console.log('- Flat amount discounts');
    console.log('- Buy X Get Y free offers');
    console.log('- Time-based restrictions');
    console.log('- Loyalty points system');
    console.log('- New customer incentives');

  } catch (error) {
    console.error('Error creating sample offers:', error);
    throw error;
  }
}

async function createSampleCustomers() {
  console.log('Creating sample customers...');

  try {
    const customers = [
      ["Rajesh Kumar", "rajesh@email.com", "+91-9876543210", "123 MG Road, Bangalore"],
      ["Priya Sharma", "priya@email.com", "+91-9876543211", "456 Park Street, Mumbai"],
      ["Amit Patel", "amit@email.com", "+91-9876543212", "789 CP Road, Delhi"],
      ["Sunita Singh", "sunita@email.com", "+91-9876543213", "321 Main Street, Chennai"],
      ["Vikram Gupta", "vikram@email.com", "+91-9876543214", "654 Ring Road, Pune"]
    ];

    for (const [name, email, phone, address] of customers) {
      sqlite.prepare(`
        INSERT INTO customers (name, email, phone, address, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(name, email, phone, address);
    }

    console.log('Created 5 sample customers');

  } catch (error) {
    console.error('Error creating sample customers:', error);
    throw error;
  }
}

async function createSampleLoyaltyData() {
  console.log('Creating sample loyalty data...');

  try {
    const loyaltyData = [
      [1, 250, 450, 200, 4500.00],
      [2, 780, 980, 200, 9800.00],
      [3, 1250, 1350, 100, 13500.00],
      [4, 45, 145, 100, 1450.00],
      [5, 2100, 2300, 200, 23000.00]
    ];

    for (const [customerId, available, earned, redeemed, spent] of loyaltyData) {
      sqlite.prepare(`
        INSERT INTO customer_loyalty (
          customer_id, available_points, total_earned, total_redeemed, 
          total_spent, last_earned_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(customerId, available, earned, redeemed, spent);
    }

    console.log('Created loyalty data with different tier customers:');
    console.log('- Member tier: 45 points');
    console.log('- Bronze tier: 250 points');
    console.log('- Silver tier: 780 points');
    console.log('- Gold tier: 1250-2100 points');

  } catch (error) {
    console.error('Error creating sample loyalty data:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Quick Setup for Offer Management System');
  console.log('==========================================');

  try {
    await createSampleOffers();
    await createSampleCustomers();
    await createSampleLoyaltyData();

    console.log('\n✅ Quick Setup Complete!');
    console.log('\nYour offer management system now includes:');
    console.log('• 6 sample offers covering all major offer types');
    console.log('• 5 sample customers for testing');
    console.log('• Loyalty data with different customer tiers');
    console.log('\nAccess via: Offers & Promotions → Manage Offers');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();