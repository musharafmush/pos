import { db } from "./index";
import * as schema from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    console.log('Starting database seed...');

    // Create categories
    const categories = [
      { name: 'Fruits', description: 'Fresh fruits and berries' },
      { name: 'Vegetables', description: 'Fresh vegetables and herbs' },
      { name: 'Dairy', description: 'Milk, cheese, and other dairy products' },
      { name: 'Bakery', description: 'Bread, pastries, and baked goods' },
      { name: 'Meat', description: 'Fresh meat and poultry' },
      { name: 'Beverages', description: 'Drinks and liquid refreshments' },
      { name: 'Snacks', description: 'Chips, nuts, and other snack foods' },
      { name: 'Canned Goods', description: 'Preserved foods in cans or jars' }
    ];

    for (const category of categories) {
      const existingCategory = await db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.name, category.name)
      });

      if (!existingCategory) {
        const validatedCategory = schema.categoryInsertSchema.parse(category);
        await db.insert(schema.categories).values(validatedCategory);
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }

    // Fetch created categories for foreign key references
    const createdCategories = await db.query.categories.findMany();
    const categoryMap = new Map(createdCategories.map(cat => [cat.name, cat.id]));

    // Create products
    const products = [
      { 
        name: 'Organic Banana', 
        sku: 'BA-1001', 
        description: 'Organic bananas, grown without pesticides', 
        price: '2.99', 
        cost: '1.25', 
        categoryId: categoryMap.get('Fruits')!, 
        stockQuantity: 3,
        alertThreshold: 10,
        barcode: '1234567890123',
        image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24'
      },
      { 
        name: 'White Bread', 
        sku: 'BR-2033', 
        description: 'Freshly baked white bread', 
        price: '2.29', 
        cost: '0.75', 
        categoryId: categoryMap.get('Bakery')!, 
        stockQuantity: 5,
        alertThreshold: 10,
        barcode: '1234567890124',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff'
      },
      { 
        name: 'Almond Milk', 
        sku: 'AM-5077', 
        description: 'Unsweetened almond milk', 
        price: '3.99', 
        cost: '2.25', 
        categoryId: categoryMap.get('Dairy')!, 
        stockQuantity: 8,
        alertThreshold: 10,
        barcode: '1234567890125',
        image: 'https://images.unsplash.com/photo-1576186726183-9bd221925275'
      },
      { 
        name: 'Organic Eggs', 
        sku: 'EG-1201', 
        description: 'Farm fresh organic eggs', 
        price: '4.99', 
        cost: '2.85', 
        categoryId: categoryMap.get('Dairy')!, 
        stockQuantity: 2,
        alertThreshold: 10,
        barcode: '1234567890126',
        image: 'https://images.unsplash.com/photo-1598965402089-897c69523bc8'
      },
      { 
        name: 'Organic Avocado', 
        sku: 'AV-1003', 
        description: 'Ripe and ready organic avocados', 
        price: '2.99', 
        cost: '1.50', 
        categoryId: categoryMap.get('Fruits')!, 
        stockQuantity: 15,
        alertThreshold: 10,
        barcode: '1234567890127',
        image: 'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad'
      },
      { 
        name: 'Whole Milk', 
        sku: 'ML-5011', 
        description: 'Fresh whole milk', 
        price: '3.49', 
        cost: '1.85', 
        categoryId: categoryMap.get('Dairy')!, 
        stockQuantity: 12,
        alertThreshold: 10,
        barcode: '1234567890128',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150'
      },
      { 
        name: 'Sliced Bread', 
        sku: 'BR-2044', 
        description: 'Sliced whole wheat bread', 
        price: '2.29', 
        cost: '0.85', 
        categoryId: categoryMap.get('Bakery')!, 
        stockQuantity: 18,
        alertThreshold: 10,
        barcode: '1234567890129',
        image: 'https://images.unsplash.com/photo-1586765501019-cbe3973ef8fa'
      },
      { 
        name: 'Free Range Eggs', 
        sku: 'EG-1205', 
        description: 'Farm fresh free range eggs', 
        price: '4.99', 
        cost: '2.65', 
        categoryId: categoryMap.get('Dairy')!, 
        stockQuantity: 9,
        alertThreshold: 10,
        barcode: '1234567890130',
        image: 'https://images.unsplash.com/photo-1598965402089-897c69523bc8'
      },
      { 
        name: 'Apple Juice', 
        sku: 'JC-3001', 
        description: '100% pure apple juice', 
        price: '3.29', 
        cost: '1.45', 
        categoryId: categoryMap.get('Beverages')!, 
        stockQuantity: 24,
        alertThreshold: 15,
        barcode: '1234567890131',
        image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba'
      },
      { 
        name: 'Potato Chips', 
        sku: 'SN-4001', 
        description: 'Original flavor potato chips', 
        price: '1.99', 
        cost: '0.65', 
        categoryId: categoryMap.get('Snacks')!, 
        stockQuantity: 30,
        alertThreshold: 20,
        barcode: '1234567890132',
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b'
      }
    ];

    for (const product of products) {
      const existingProduct = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.sku, product.sku)
      });

      if (!existingProduct) {
        // The schema will now handle the string-to-number conversion for price and cost
        const validatedProduct = schema.productInsertSchema.parse(product);
        await db.insert(schema.products).values(validatedProduct);
        console.log(`Created product: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name}`);
      }
    }

    // Create an admin user
    const adminUser = {
      username: 'admin',
      password: 'admin123',
      name: 'John Doe',
      email: 'admin@example.com',
      role: 'admin' as const,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
    };

    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, adminUser.username)
    });

    if (!existingAdmin) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      const validatedUser = schema.userInsertSchema.parse({
        ...adminUser,
        password: hashedPassword
      });
      await db.insert(schema.users).values(validatedUser);
      console.log(`Created admin user: ${adminUser.username}`);
    } else {
      console.log(`Admin user already exists: ${adminUser.username}`);
    }

    // Create a cashier user
    const cashierUser = {
      username: 'cashier',
      password: 'cashier123',
      name: 'Jane Smith',
      email: 'cashier@example.com',
      role: 'cashier' as const,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'
    };

    const existingCashier = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, cashierUser.username)
    });

    if (!existingCashier) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(cashierUser.password, 10);
      const validatedUser = schema.userInsertSchema.parse({
        ...cashierUser,
        password: hashedPassword
      });
      await db.insert(schema.users).values(validatedUser);
      console.log(`Created cashier user: ${cashierUser.username}`);
    } else {
      console.log(`Cashier user already exists: ${cashierUser.username}`);
    }

    // Create customers
    const customers = [
      { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-123-4567', address: '123 Main St' },
      { name: 'Robert Davis', email: 'robert@example.com', phone: '555-987-6543', address: '456 Oak Ave' },
      { name: 'Emily Wilson', email: 'emily@example.com', phone: '555-456-7890', address: '789 Pine Rd' }
    ];

    for (const customer of customers) {
      const existingCustomer = await db.query.customers.findFirst({
        where: (customers, { eq }) => eq(customers.email, customer.email)
      });

      if (!existingCustomer) {
        const validatedCustomer = schema.customerInsertSchema.parse(customer);
        await db.insert(schema.customers).values(validatedCustomer);
        console.log(`Created customer: ${customer.name}`);
      } else {
        console.log(`Customer already exists: ${customer.name}`);
      }
    }

    // Create suppliers
    const suppliers = [
      { name: 'Fresh Farms Inc.', email: 'contact@freshfarms.com', phone: '555-111-2222', contactPerson: 'Mark Wilson', address: '100 Farm Lane' },
      { name: 'Baker\'s Dozen Supply', email: 'orders@bakersdsupply.com', phone: '555-333-4444', contactPerson: 'Lisa Baker', address: '200 Flour St' },
      { name: 'Dairy Delights', email: 'info@dairydelights.com', phone: '555-555-6666', contactPerson: 'David Milkins', address: '300 Milk Road' }
    ];

    for (const supplier of suppliers) {
      const existingSupplier = await db.query.suppliers.findFirst({
        where: (suppliers, { eq }) => eq(suppliers.email, supplier.email)
      });

      if (!existingSupplier) {
        const validatedSupplier = schema.supplierInsertSchema.parse(supplier);
        await db.insert(schema.suppliers).values(validatedSupplier);
        console.log(`Created supplier: ${supplier.name}`);
      } else {
        console.log(`Supplier already exists: ${supplier.name}`);
      }
    }

    // Create sample sales - add more realistic sales data
    const admin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });

    if (admin) {
      // Get customers
      const allCustomers = await db.query.customers.findMany();
      
      // Create sales from the last few days
      const today = new Date();
      
      // Create sample sales for each of the last 7 days
      for (let day = 0; day < 7; day++) {
        const saleDate = new Date();
        saleDate.setDate(today.getDate() - day);
        
        // Create 2-4 sales per day
        const salesPerDay = Math.floor(Math.random() * 3) + 2;
        
        for (let s = 0; s < salesPerDay; s++) {
          // Generate a random order number
          const orderNumber = `POS-${Date.now().toString().substring(7)}${Math.floor(Math.random() * 1000)}`;
          
          // Randomly select a customer (or null for walk-in)
          const customerId = Math.random() > 0.3 
            ? allCustomers[Math.floor(Math.random() * allCustomers.length)].id 
            : null;
          
          // Get 1-5 random products
          const productCount = Math.floor(Math.random() * 5) + 1;
          const allProducts = await db.query.products.findMany({
            limit: 20 // Get a good sample to choose from
          });
          
          // Shuffle and take the first 'productCount' products
          const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
          const selectedProducts = shuffled.slice(0, productCount);
          
          // Calculate sale totals
          let subtotal = 0;
          for (const product of selectedProducts) {
            const quantity = Math.floor(Math.random() * 3) + 1;
            const unitPrice = parseFloat(product.price.toString());
            subtotal += quantity * unitPrice;
            
            // Create the sale item record
            await db.insert(schema.saleItems).values({
              saleId: 0, // Will update after sale is created
              productId: product.id,
              quantity,
              unitPrice: unitPrice.toString(),
              subtotal: (quantity * unitPrice).toString()
            });
          }
          
          // Apply random tax (5-10%) and discount (0-10%)
          const taxRate = (Math.floor(Math.random() * 6) + 5) / 100;
          const discountRate = (Math.floor(Math.random() * 11)) / 100;
          
          const tax = subtotal * taxRate;
          const discount = subtotal * discountRate;
          const total = subtotal + tax - discount;
          
          // Create the sale record
          const [sale] = await db.insert(schema.sales).values({
            orderNumber,
            customerId,
            userId: admin.id,
            total: total.toFixed(2),
            tax: tax.toFixed(2),
            discount: discount.toFixed(2),
            paymentMethod: Math.random() > 0.7 ? 'Credit Card' : 'Cash',
            status: 'completed',
            createdAt: saleDate // Set the date for this sale
          }).returning();
          
          // Update the sale items with the correct sale ID
          await db.update(schema.saleItems)
            .set({ saleId: sale.id })
            .where((saleItems, { eq }) => eq(saleItems.saleId, 0))
            .execute();
          
          console.log(`Created sale: ${orderNumber} for ${new Date(saleDate).toLocaleDateString()}`);
        }
      }
    }

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
