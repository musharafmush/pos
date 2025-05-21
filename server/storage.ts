import { db } from "@db";
import {
  users,
  products,
  categories,
  customers,
  suppliers,
  sales,
  saleItems,
  purchases,
  purchaseItems,
  User,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem
} from "@shared/schema";
import { eq, and, desc, sql, gt, lt, lte, gte, or, like } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export const storage = {
  // User related operations
  async getUserByUsername(username: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return user || null;
  },
  
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    return user || null;
  },
  
  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: or(
        eq(users.username, usernameOrEmail),
        eq(users.email, usernameOrEmail)
      )
    });
    return user || null;
  },

  async getUserById(id: number): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return user || null;
  },

  async createUser(user: { username: string; password: string; name: string; email?: string; role?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [newUser] = await db.insert(users).values({
      ...user,
      password: hashedPassword
    }).returning();
    return newUser;
  },

  async updateUser(id: number, user: Partial<User>): Promise<User | null> {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    const [updatedUser] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || null;
  },

  async listUsers(): Promise<User[]> {
    return await db.query.users.findMany({
      orderBy: users.name
    });
  },

  // Category related operations
  async getCategoryById(id: number): Promise<Category | null> {
    return await db.query.categories.findFirst({
      where: eq(categories.id, id)
    });
  },

  async createCategory(category: { name: string; description?: string }): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  },

  async updateCategory(id: number, category: Partial<Category>): Promise<Category | null> {
    const [updatedCategory] = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory || null;
  },

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return result.length > 0;
  },

  async listCategories(): Promise<Category[]> {
    return await db.query.categories.findMany({
      orderBy: categories.name
    });
  },

  // Product related operations
  async getProductById(id: number): Promise<Product | null> {
    return await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { category: true }
    });
  },

  async getProductBySku(sku: string): Promise<Product | null> {
    return await db.query.products.findFirst({
      where: eq(products.sku, sku),
      with: { category: true }
    });
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    return await db.query.products.findFirst({
      where: eq(products.barcode, barcode),
      with: { category: true }
    });
  },

  async createProduct(product: {
    name: string;
    description?: string;
    sku: string;
    price: number;
    cost: number;
    categoryId: number;
    stockQuantity?: number;
    alertThreshold?: number;
    barcode?: string;
    image?: string;
    active?: boolean;
  }): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  },

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | null> {
    const [updatedProduct] = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || null;
  },

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return result.length > 0;
  },

  async listProducts(): Promise<Product[]> {
    return await db.query.products.findMany({
      with: { category: true },
      orderBy: products.name
    });
  },

  async searchProducts(term: string): Promise<Product[]> {
    return await db.query.products.findMany({
      where: or(
        like(products.name, `%${term}%`),
        like(products.sku, `%${term}%`),
        like(products.barcode, `%${term}%`)
      ),
      with: { category: true },
      orderBy: products.name
    });
  },

  async getLowStockProducts(limit: number = 10): Promise<Product[]> {
    return await db.query.products.findMany({
      where: sql`${products.stockQuantity} <= ${products.alertThreshold}`,
      with: { category: true },
      orderBy: products.stockQuantity,
      limit
    });
  },

  async updateProductStock(id: number, quantity: number): Promise<Product | null> {
    const [updatedProduct] = await db.update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || null;
  },

  // Customer related operations
  async getCustomerById(id: number): Promise<Customer | null> {
    return await db.query.customers.findFirst({
      where: eq(customers.id, id)
    });
  },

  async createCustomer(customer: { name: string; email?: string; phone?: string; address?: string }): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  },

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null> {
    const [updatedCustomer] = await db.update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer || null;
  },

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning({ id: customers.id });
    return result.length > 0;
  },

  async listCustomers(): Promise<Customer[]> {
    return await db.query.customers.findMany({
      orderBy: customers.name
    });
  },

  async searchCustomers(term: string): Promise<Customer[]> {
    return await db.query.customers.findMany({
      where: or(
        like(customers.name, `%${term}%`),
        like(customers.email, `%${term}%`),
        like(customers.phone, `%${term}%`)
      ),
      orderBy: customers.name
    });
  },

  // Supplier related operations
  async getSupplierById(id: number): Promise<Supplier | null> {
    return await db.query.suppliers.findFirst({
      where: eq(suppliers.id, id)
    });
  },

  async createSupplier(supplier: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
  }): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  },

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | null> {
    const [updatedSupplier] = await db.update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier || null;
  },

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
    return result.length > 0;
  },

  async listSuppliers(): Promise<Supplier[]> {
    return await db.query.suppliers.findMany({
      orderBy: suppliers.name
    });
  },

  // Sale related operations
  async createSale(
    userId: number,
    items: { productId: number; quantity: number; unitPrice: number }[],
    saleData: {
      customerId?: number;
      tax: number;
      discount: number;
      paymentMethod: string;
      status?: string;
    }
  ): Promise<Sale> {
    // Generate unique order number
    const orderNumber = `POS-${Date.now().toString().substring(7)}${Math.floor(Math.random() * 1000)}`;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0);
    const finalTotal = total + Number(saleData.tax) - Number(saleData.discount);

    // Create sale transaction
    const [sale] = await db.insert(sales).values({
      orderNumber,
      customerId: saleData.customerId,
      userId,
      total: finalTotal.toString(),
      tax: saleData.tax.toString(),
      discount: saleData.discount.toString(),
      paymentMethod: saleData.paymentMethod,
      status: saleData.status || 'completed'
    }).returning();

    // Add sale items
    for (const item of items) {
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.quantity * Number(item.unitPrice)).toString()
      });

      // Update stock quantity
      await this.updateProductStock(item.productId, -item.quantity);
    }

    return sale;
  },

  async getSaleById(id: number): Promise<Sale | null> {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, id),
      with: {
        customer: true,
        user: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
    return sale;
  },

  async getSaleByOrderNumber(orderNumber: string): Promise<Sale | null> {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.orderNumber, orderNumber),
      with: {
        customer: true,
        user: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
    return sale;
  },

  async listSales(
    limit: number = 20,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
    userId?: number,
    customerId?: number
  ): Promise<Sale[]> {
    let query = db.select().from(sales);

    if (startDate) {
      query = query.where(gte(sales.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(sales.createdAt, endDate));
    }
    
    if (userId) {
      query = query.where(eq(sales.userId, userId));
    }
    
    if (customerId) {
      query = query.where(eq(sales.customerId, customerId));
    }

    return await db.query.sales.findMany({
      where: query,
      limit: limit,
      offset: offset,
      orderBy: [desc(sales.createdAt)],
      with: {
        user: true,
        customer: true
      }
    });
  },

  async getRecentSales(limit: number = 5): Promise<Sale[]> {
    return await db.query.sales.findMany({
      with: {
        customer: true,
        user: true,
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(sales.createdAt),
      limit
    });
  },

  async getSaleStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalSales: number; totalAmount: string; averageOrder: string }> {
    let query = db.select({
      totalSales: sql`COUNT(*)`,
      totalAmount: sql`SUM(${sales.total})`,
      averageOrder: sql`AVG(${sales.total})`
    }).from(sales);

    if (startDate) {
      query = query.where(gte(sales.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(sales.createdAt, endDate));
    }

    const result = await query.execute();
    return {
      totalSales: Number(result[0]?.totalSales || 0),
      totalAmount: result[0]?.totalAmount?.toString() || "0",
      averageOrder: result[0]?.averageOrder?.toString() || "0"
    };
  },

  async getDailySalesData(days: number = 7): Promise<{ date: string; total: string }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await db.select({
      date: sql`DATE(${sales.createdAt})`,
      total: sql`SUM(${sales.total})`
    })
    .from(sales)
    .where(gte(sales.createdAt, startDate))
    .groupBy(sql`DATE(${sales.createdAt})`)
    .orderBy(sql`DATE(${sales.createdAt})`)
    .execute();
    
    return result.map(item => ({
      date: item.date?.toString() || "",
      total: item.total?.toString() || "0"
    }));
  },

  async getTopSellingProducts(
    limit: number = 5,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ product: Product; soldQuantity: number; revenue: string }[]> {
    let query = db.select({
      productId: saleItems.productId,
      soldQuantity: sql`SUM(${saleItems.quantity})`,
      revenue: sql`SUM(${saleItems.subtotal})`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id));

    if (startDate) {
      query = query.where(gte(sales.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(sales.createdAt, endDate));
    }

    const result = await query
      .groupBy(saleItems.productId)
      .orderBy(sql`SUM(${saleItems.quantity})`, "desc")
      .limit(limit)
      .execute();

    const topProducts = [];
    for (const item of result) {
      const product = await this.getProductById(Number(item.productId));
      if (product) {
        topProducts.push({
          product,
          soldQuantity: Number(item.soldQuantity),
          revenue: item.revenue?.toString() || "0"
        });
      }
    }
    
    return topProducts;
  },

  // Purchase related operations
  async createPurchase(
    userId: number,
    supplierId: number,
    items: { productId: number; quantity: number; unitCost: number }[],
    purchaseData: {
      status?: string;
    }
  ): Promise<Purchase> {
    // Generate unique order number
    const orderNumber = `PO-${Date.now().toString().substring(7)}${Math.floor(Math.random() * 1000)}`;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitCost), 0);

    // Create purchase transaction
    const [purchase] = await db.insert(purchases).values({
      orderNumber,
      supplierId,
      userId,
      total: total.toString(),
      status: purchaseData.status || 'pending'
    }).returning();

    // Add purchase items
    for (const item of items) {
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.toString(),
        subtotal: (item.quantity * Number(item.unitCost)).toString()
      });
    }

    return purchase;
  },

  async getPurchaseById(id: number): Promise<Purchase | null> {
    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.id, id),
      with: {
        supplier: true,
        user: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
    return purchase;
  },

  async updatePurchaseStatus(id: number, status: string, receivedDate?: Date): Promise<Purchase | null> {
    const [updatedPurchase] = await db.update(purchases)
      .set({
        status,
        receivedDate: status === 'received' ? receivedDate || new Date() : undefined
      })
      .where(eq(purchases.id, id))
      .returning();

    // If status is 'received', update product stock
    if (status === 'received') {
      const purchaseItems = await db.query.purchaseItems.findMany({
        where: eq(purchaseItems.purchaseId, id)
      });

      for (const item of purchaseItems) {
        await this.updateProductStock(item.productId, item.quantity);
      }
    }

    return updatedPurchase || null;
  },

  async listPurchases(
    limit: number = 20,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
    supplierId?: number,
    status?: string
  ): Promise<Purchase[]> {
    let query = db.select().from(purchases);

    if (startDate) {
      query = query.where(gte(purchases.orderDate, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(purchases.orderDate, endDate));
    }
    
    if (supplierId) {
      query = query.where(eq(purchases.supplierId, supplierId));
    }
    
    if (status) {
      query = query.where(eq(purchases.status, status));
    }

    return await db.query.purchases.findMany({
      where: query,
      limit: limit,
      offset: offset,
      orderBy: [desc(purchases.orderDate)],
      with: {
        supplier: true,
        user: true
      }
    });
  },

  // Dashboard stats
  async getDashboardStats(): Promise<{
    todaySales: string;
    totalOrders: number;
    inventoryValue: string;
    lowStockCount: number;
  }> {
    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySalesResult = await db.select({
      total: sql`SUM(${sales.total})`
    })
    .from(sales)
    .where(gte(sales.createdAt, today))
    .execute();
    
    const todaySales = todaySalesResult[0]?.total?.toString() || "0";
    
    // Total orders today
    const totalOrdersResult = await db.select({
      count: sql`COUNT(*)`
    })
    .from(sales)
    .where(gte(sales.createdAt, today))
    .execute();
    
    const totalOrders = Number(totalOrdersResult[0]?.count || 0);
    
    // Inventory value
    const inventoryValueResult = await db.select({
      value: sql`SUM(${products.cost} * ${products.stockQuantity})`
    })
    .from(products)
    .execute();
    
    const inventoryValue = inventoryValueResult[0]?.value?.toString() || "0";
    
    // Low stock count
    const lowStockResult = await db.select({
      count: sql`COUNT(*)`
    })
    .from(products)
    .where(sql`${products.stockQuantity} <= ${products.alertThreshold}`)
    .execute();
    
    const lowStockCount = Number(lowStockResult[0]?.count || 0);
    
    return {
      todaySales,
      totalOrders,
      inventoryValue,
      lowStockCount
    };
  }
};
