import { db } from './db/index.js';
import { offers, categories, products, customers, customerLoyalty } from './shared/schema.js';

async function createSampleOffers() {
  console.log('🎁 Creating sample offers for quick setup demonstration...');

  try {
    // Sample Offer 1: Weekend Percentage Discount
    await db.insert(offers).values({
      name: "Weekend Special - 15% Off",
      description: "Get 15% discount on all purchases during weekends",
      offerType: "percentage",
      discountValue: 15.00,
      minPurchaseAmount: 500.00,
      maxDiscountAmount: 200.00,
      validFrom: new Date('2025-06-21T00:00:00'),
      validTo: new Date('2025-12-31T23:59:59'),
      timeStart: '10:00',
      timeEnd: '22:00',
      usageLimit: 1000,
      perCustomerLimit: 5,
      priority: 1,
      active: true,
      createdBy: 1
    });

    // Sample Offer 2: Flat Discount for Large Orders
    await db.insert(offers).values({
      name: "Big Order Bonus - ₹100 Off",
      description: "Flat ₹100 discount on orders above ₹2000",
      offerType: "flat_amount",
      discountValue: 100.00,
      minPurchaseAmount: 2000.00,
      usageLimit: 500,
      perCustomerLimit: 3,
      priority: 2,
      active: true,
      createdBy: 1
    });

    // Sample Offer 3: Buy 2 Get 1 Free
    await db.insert(offers).values({
      name: "Buy 2 Get 1 Free Special",
      description: "Purchase any 2 items and get the cheapest one free",
      offerType: "buy_x_get_y",
      discountValue: 100.00, // 100% discount on the free item
      buyQuantity: 2,
      getQuantity: 1,
      minPurchaseAmount: 300.00,
      usageLimit: 200,
      perCustomerLimit: 2,
      priority: 3,
      active: true,
      createdBy: 1
    });

    // Sample Offer 4: Happy Hour Time-based Discount
    await db.insert(offers).values({
      name: "Happy Hour - 20% Off",
      description: "20% discount during happy hours (2 PM to 5 PM)",
      offerType: "time_based",
      discountValue: 20.00,
      minPurchaseAmount: 200.00,
      maxDiscountAmount: 300.00,
      timeStart: '14:00',
      timeEnd: '17:00',
      usageLimit: 100,
      perCustomerLimit: 1,
      priority: 4,
      active: true,
      createdBy: 1
    });

    // Sample Offer 5: Category-based Discount
    await db.insert(offers).values({
      name: "Electronics Mega Sale - 25% Off",
      description: "25% discount on all electronics and gadgets",
      offerType: "category_based",
      discountValue: 25.00,
      minPurchaseAmount: 1000.00,
      maxDiscountAmount: 500.00,
      applicableCategories: "1,2", // Electronics and Gadgets categories
      usageLimit: 300,
      perCustomerLimit: 2,
      priority: 5,
      active: true,
      createdBy: 1
    });

    // Sample Offer 6: Loyalty Points Program
    await db.insert(offers).values({
      name: "Loyalty Rewards Program",
      description: "Earn 10 points for every ₹1000 spent",
      offerType: "loyalty_points",
      discountValue: 1.00, // 1% value per point
      pointsThreshold: 1000.00,
      pointsReward: 10.00,
      usageLimit: null, // Unlimited
      perCustomerLimit: null, // Unlimited
      priority: 6,
      active: true,
      createdBy: 1
    });

    // Sample Offer 7: First-time Customer Special
    await db.insert(offers).values({
      name: "New Customer Welcome - ₹50 Off",
      description: "Special ₹50 discount for first-time customers",
      offerType: "flat_amount",
      discountValue: 50.00,
      minPurchaseAmount: 500.00,
      usageLimit: 1000,
      perCustomerLimit: 1,
      priority: 7,
      active: true,
      createdBy: 1
    });

    // Sample Offer 8: Bulk Purchase Discount
    await db.insert(offers).values({
      name: "Bulk Purchase - 30% Off",
      description: "30% discount on purchases above ₹5000",
      offerType: "percentage",
      discountValue: 30.00,
      minPurchaseAmount: 5000.00,
      maxDiscountAmount: 1000.00,
      usageLimit: 50,
      perCustomerLimit: 1,
      priority: 8,
      active: true,
      createdBy: 1
    });

    // Sample Offer 9: Seasonal Flash Sale
    await db.insert(offers).values({
      name: "Flash Sale - Limited Time 40% Off",
      description: "Limited time flash sale with massive discounts",
      offerType: "percentage",
      discountValue: 40.00,
      minPurchaseAmount: 1500.00,
      maxDiscountAmount: 800.00,
      validFrom: new Date('2025-06-21T00:00:00'),
      validTo: new Date('2025-06-28T23:59:59'),
      usageLimit: 100,
      perCustomerLimit: 1,
      priority: 9,
      active: true,
      createdBy: 1
    });

    // Sample Offer 10: Student Discount
    await db.insert(offers).values({
      name: "Student Discount - 15% Off",
      description: "Special discount for students with valid ID",
      offerType: "percentage",
      discountValue: 15.00,
      minPurchaseAmount: 200.00,
      maxDiscountAmount: 150.00,
      usageLimit: 500,
      perCustomerLimit: 3,
      priority: 10,
      active: true,
      createdBy: 1
    });

    console.log('✅ Successfully created 10 sample offers covering all offer types:');
    console.log('1. Weekend Special - Percentage discount with time restrictions');
    console.log('2. Big Order Bonus - Flat amount discount for large orders');
    console.log('3. Buy 2 Get 1 Free - BOGO offer');
    console.log('4. Happy Hour - Time-based discount');
    console.log('5. Electronics Sale - Category-based discount');
    console.log('6. Loyalty Program - Points-based rewards');
    console.log('7. New Customer Welcome - First-time buyer incentive');
    console.log('8. Bulk Purchase - High-value order discount');
    console.log('9. Flash Sale - Limited time offer');
    console.log('10. Student Discount - Demographic-based offer');

    console.log('\n🎯 These offers demonstrate:');
    console.log('- Percentage and flat amount discounts');
    console.log('- Time-based and date-range restrictions');
    console.log('- Usage limits and per-customer limits');
    console.log('- Category-specific and loyalty point offers');
    console.log('- Priority-based offer selection');
    console.log('- Minimum purchase requirements');
    console.log('- Maximum discount caps');

  } catch (error) {
    console.error('❌ Error creating sample offers:', error);
    throw error;
  }
}

// Create sample customers for loyalty demonstration
async function createSampleCustomers() {
  console.log('👥 Creating sample customers for loyalty demonstration...');

  try {
    // Sample customers
    const sampleCustomers = [
      {
        name: "Rajesh Kumar",
        email: "rajesh.kumar@email.com",
        phone: "+91-9876543210",
        address: "123 MG Road, Bangalore, Karnataka"
      },
      {
        name: "Priya Sharma",
        email: "priya.sharma@email.com",
        phone: "+91-9876543211",
        address: "456 Park Street, Mumbai, Maharashtra"
      },
      {
        name: "Amit Patel",
        email: "amit.patel@email.com",
        phone: "+91-9876543212",
        address: "789 CP Road, Delhi, NCR"
      },
      {
        name: "Sunita Singh",
        email: "sunita.singh@email.com",
        phone: "+91-9876543213",
        address: "321 Main Street, Chennai, Tamil Nadu"
      },
      {
        name: "Vikram Gupta",
        email: "vikram.gupta@email.com",
        phone: "+91-9876543214",
        address: "654 Ring Road, Pune, Maharashtra"
      }
    ];

    for (const customer of sampleCustomers) {
      await db.insert(customers).values(customer);
    }

    console.log('✅ Created 5 sample customers for testing loyalty features');

  } catch (error) {
    console.error('❌ Error creating sample customers:', error);
    throw error;
  }
}

// Create sample loyalty data
async function createSampleLoyaltyData() {
  console.log('⭐ Creating sample loyalty data...');

  try {
    // Sample loyalty data for demonstration
    const loyaltyData = [
      { customerId: 1, availablePoints: 250, totalEarned: 450, totalRedeemed: 200, totalSpent: 4500.00 },
      { customerId: 2, availablePoints: 780, totalEarned: 980, totalRedeemed: 200, totalSpent: 9800.00 },
      { customerId: 3, availablePoints: 1250, totalEarned: 1350, totalRedeemed: 100, totalSpent: 13500.00 },
      { customerId: 4, availablePoints: 45, totalEarned: 145, totalRedeemed: 100, totalSpent: 1450.00 },
      { customerId: 5, availablePoints: 2100, totalEarned: 2300, totalRedeemed: 200, totalSpent: 23000.00 }
    ];

    for (const loyalty of loyaltyData) {
      await db.insert(customerLoyalty).values({
        ...loyalty,
        lastEarnedDate: new Date(),
        lastRedeemedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });
    }

    console.log('✅ Created sample loyalty data showing different tier customers:');
    console.log('- Bronze tier: 45-250 points');
    console.log('- Silver tier: 780 points');
    console.log('- Gold tier: 1250-2100 points');

  } catch (error) {
    console.error('❌ Error creating sample loyalty data:', error);
    throw error;
  }
}

// Main setup function
export async function setupSampleData() {
  console.log('🚀 Starting Quick Setup for Offer Management System...\n');

  try {
    await createSampleOffers();
    await createSampleCustomers();
    await createSampleLoyaltyData();

    console.log('\n🎉 Quick Setup Complete!');
    console.log('\n📍 Next Steps:');
    console.log('1. Navigate to "Offers & Promotions" → "Manage Offers" to view all sample offers');
    console.log('2. Visit "Customer Loyalty" to see sample loyalty data with different tiers');
    console.log('3. Test offers in the POS system by adding products to cart');
    console.log('4. Create new offers using the "Create Offer" button');
    console.log('5. Redeem customer points using the loyalty management interface');

    console.log('\n💡 Sample Offer Examples:');
    console.log('- Apply "Weekend Special" for 15% off on orders above ₹500');
    console.log('- Use "Big Order Bonus" for ₹100 off on orders above ₹2000');
    console.log('- Try "Buy 2 Get 1 Free" for multi-item purchases');
    console.log('- Test "Happy Hour" discount between 2 PM - 5 PM');

  } catch (error) {
    console.error('❌ Quick Setup failed:', error);
    throw error;
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSampleData().catch(console.error);
}