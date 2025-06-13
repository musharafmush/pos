import { db } from "../db/index.js";
import { eq, desc, sql, and, gte, lte, like, asc } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import bcrypt from "bcryptjs";

export class Storage {
  // User management
  async createUser(userData: any) {
    const [user] = await db.insert(schema.users).values(userData).returning();
    return user;
  }

  async getUserById(id: number) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async updateUser(id: number, userData: any) {
    const [user] = await db.update(schema.users).set(userData).where(eq(schema.users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number) {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async getUsers() {
    return await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string) {
    try {
      const { sqlite } = await import('@db');

      // Try to find user by either email or username
      const query = `
        SELECT * FROM users 
        WHERE email = ? OR username = ?
        LIMIT 1
      `;

      const user = sqlite.prepare(query).get(usernameOrEmail, usernameOrEmail);

      if (user) {
        console.log('Found user in database:', user.id, user.email);
        return user;
      }

      console.log('No user found for:', usernameOrEmail);
      return null;
    } catch (error) {
      console.error('Error in getUserByUsernameOrEmail:', error);
      // Don't throw error, return null to allow fallback
      return null;
    }
  }

  // Product management
  async createProduct(productData: any) {
    const [product] = await db.insert(schema.products).values(productData).returning();
    return product;
  }

  async getProducts(page: number = 1, limit: number = 50, search?: string) {
    const offset = (page - 1) * limit;
    let query = db.select().from(schema.products);

    if (search) {
      query = query.where(
        sql`${schema.products.name} LIKE ${'%' + search + '%'} OR ${schema.products.sku} LIKE ${'%' + search + '%'}`
      );
    }

    const products = await query.limit(limit).offset(offset).orderBy(desc(schema.products.createdAt));
    return products;
  }

  async getProductById(id: number) {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return product;
  }

  async updateProduct(id: number, productData: any) {
    const [product] = await db.update(schema.products).set(productData).where(eq(schema.products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number) {
    await db.delete(schema.products).where(eq(schema.products.id, id));
  }

  // Supplier management
  async createSupplier(supplierData: any) {
    try {
      console.log('Creating supplier with data:', supplierData);

      // Validate required fields
      if (!supplierData.name) {
        throw new Error('Supplier name is required');
      }

      // Process the supplier data
      const processedData = {
        name: supplierData.name,
        email: supplierData.email || null,
        phone: supplierData.phone || null,
        address: supplierData.address || null,
        gstNumber: supplierData.gstNumber || null,
        contactPerson: supplierData.contactPerson || null,
        status: supplierData.status || 'active',
        registrationType: supplierData.registrationType || null,
        registrationNumber: supplierData.registrationNumber || null,
        supplierType: supplierData.supplierType || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Processed supplier data:', processedData);

      const [supplier] = await db.insert(schema.suppliers).values(processedData).returning();
      console.log('Supplier created successfully:', supplier);

      return supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async getSuppliers() {
    return await db.select().from(schema.suppliers).orderBy(desc(schema.suppliers.createdAt));
  }

  async listSuppliers() {
    try {
      console.log('📋 Fetching suppliers list');

      // Try ORM method first
      try {
        const suppliers = await db.select().from(schema.suppliers).orderBy(desc(schema.suppliers.createdAt));
        console.log(`✅ Found ${suppliers.length} suppliers via ORM`);
        return suppliers;
      } catch (ormError) {
        console.log('ORM method failed, trying direct SQLite:', ormError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('@db');

      // Check if suppliers table exists
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='suppliers'
      `).get();

      if (!tableCheck) {
        console.log('⚠️ Suppliers table does not exist');
        return [];
      }

      // Get table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(suppliers)").all();
      const columnNames = tableInfo.map(col => col.name);
      console.log("Available columns in suppliers table:", columnNames);

      // Build query based on available columns
      const selectFields = [
        'id',
        'name',
        'email',
        'phone',
        'address',
        columnNames.includes('contact_person') ? 'contact_person as contactPerson' : 
        columnNames.includes('contactPerson') ? 'contactPerson' : 'NULL as contactPerson',
        columnNames.includes('tax_id') ? 'tax_id as taxId' : 
        columnNames.includes('taxId') ? 'taxId' : 
        columnNames.includes('gst_number') ? 'gst_number as taxId' : 'NULL as taxId',
        columnNames.includes('status') ? 'status' : "'active' as status",
        columnNames.includes('supplier_type') ? 'supplier_type as supplierType' : 
        columnNames.includes('supplierType') ? 'supplierType' : 'NULL as supplierType',
        columnNames.includes('registration_type') ? 'registration_type as registrationType' : 
        columnNames.includes('registrationType') ? 'registrationType' : 'NULL as registrationType',
        columnNames.includes('registration_number') ? 'registration_number as registrationNumber' : 
        columnNames.includes('registrationNumber') ? 'registrationNumber' : 'NULL as registrationNumber',
        columnNames.includes('credit_days') ? 'credit_days as creditDays' : 
        columnNames.includes('creditDays') ? 'creditDays' : 'NULL as creditDays',
        columnNames.includes('discount_percent') ? 'discount_percent as discountPercent' : 
        columnNames.includes('discountPercent') ? 'discountPercent' : 'NULL as discountPercent',
        columnNames.includes('notes') ? 'notes' : 'NULL as notes',
        columnNames.includes('created_at') ? 'created_at as createdAt' : 
        columnNames.includes('createdAt') ? 'createdAt' : 'NULL as createdAt'
      ];

      const query = `
        SELECT ${selectFields.join(', ')}
        FROM suppliers 
        ORDER BY ${columnNames.includes('created_at') ? 'created_at' : columnNames.includes('createdAt') ? 'createdAt' : 'id'} DESC
      `;

      console.log('🔍 Executing suppliers query:', query);
      const suppliers = sqlite.prepare(query).all();

      console.log(`📋 Found ${suppliers.length} suppliers via direct query`);
      return suppliers;

    } catch (error) {
      console.error('❌ Error in listSuppliers:', error);
      return [];
    }
  }

  async getSupplierById(id: number) {
    const [supplier] = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));
    return supplier;
  }

  async updateSupplier(id: number, supplierData: any) {
    const [supplier] = await db.update(schema.suppliers).set({
      ...supplierData,
      updatedAt: new Date()
    }).where(eq(schema.suppliers.id, id)).returning();
    return supplier;
  }

  async deleteSupplier(id: number) {
    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
  }

  // Customer management
  async createCustomer(customerData: any) {
    const [customer] = await db.insert(schema.customers).values(customerData).returning();
    return customer;
  }

  async getCustomers() {
    return await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
  }

  async getCustomerById(id: number) {
    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
    return customer;
  }

  async updateCustomer(id: number, customerData: any) {
    const [customer] = await db.update(schema.customers).set(customerData).where(eq(schema.customers.id, id)).returning();
    return customer;
  }

  async deleteCustomer(id: number) {
    await db.delete(schema.customers).where(eq(schema.customers.id, id));
  }

  // Sales management
  async createSale(saleData: any) {
    const [sale] = await db.insert(schema.sales).values(saleData).returning();
    return sale;
  }

  async getSales(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(schema.sales)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.sales.createdAt));
  }

  async getSaleById(id: number) {
    const [sale] = await db.select().from(schema.sales).where(eq(schema.sales.id, id));
    return sale;
  }

  // Purchase management
  async createPurchase(purchaseData: any) {
    const [purchase] = await db.insert(schema.purchases).values(purchaseData).returning();
    return purchase;
  }

  async getPurchases(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(schema.purchases)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.purchases.createdAt));
  }

  async getPurchaseById(id: number) {
    const [purchase] = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id));
    return purchase;
  }

  // Dashboard analytics
  async getDashboardStats() {
    const totalProducts = await db.select({ count: sql`count(*)` }).from(schema.products);
    const totalCustomers = await db.select({ count: sql`count(*)` }).from(schema.customers);
    const totalSales = await db.select({ count: sql`count(*)` }).from(schema.sales);

    return {
      totalProducts: totalProducts[0]?.count || 0,
      totalCustomers: totalCustomers[0]?.count || 0,
      totalSales: totalSales[0]?.count || 0
    };
  }

  async getDailySalesData(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db.select({
      date: sql`DATE(${schema.sales.createdAt})`,
      total: sql`SUM(${schema.sales.total})`
    })
    .from(schema.sales)
    .where(gte(schema.sales.createdAt, startDate))
    .groupBy(sql`DATE(${schema.sales.createdAt})`)
    .orderBy(sql`DATE(${schema.sales.createdAt})`);
  }

  async getTopSellingProducts(limit: number = 5, startDate?: Date) {
    let query = db.select({
      productId: schema.saleItems.productId,
      productName: schema.products.name,
      totalQuantity: sql`SUM(${schema.saleItems.quantity})`,
      totalRevenue: sql`SUM(${schema.saleItems.subtotal})`
    })
    .from(schema.saleItems)
    .leftJoin(schema.products, eq(schema.saleItems.productId, schema.products.id))
    .leftJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id));

    if (startDate) {
      query = query.where(gte(schema.sales.createdAt, startDate));
    }

    return await query
      .groupBy(schema.saleItems.productId, schema.products.name)
      .orderBy(desc(sql`SUM(${schema.saleItems.quantity})`))
      .limit(limit);
  }

  async getLowStockProducts(threshold: number = 10) {
    return await db.select()
      .from(schema.products)
      .where(sql`${schema.products.stock} <= ${threshold}`)
      .orderBy(asc(schema.products.stock));
  }

  async getProductBySku(sku: string) {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.sku, sku));
    return product;
  }
}

export const storage = new Storage();