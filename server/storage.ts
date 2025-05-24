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

  async createUser(user: { username?: string; password: string; name: string; email: string; role?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // Generate username from email if not provided
    const username = user.username || user.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
    
    const [newUser] = await db.insert(users).values({
      ...user,
      username,
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
    // Import SQLite database directly
    const { sqlite } = await import('@db');
    
    const insertProduct = sqlite.prepare(`
      INSERT INTO products (
        name, description, sku, price, cost, category_id, 
        stock_quantity, alert_threshold, barcode, image, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = insertProduct.run(
      product.name,
      product.description || null,
      product.sku,
      product.price.toString(),
      product.cost.toString(),
      product.categoryId,
      product.stockQuantity || 0,
      product.alertThreshold || 5,
      product.barcode || null,
      product.image || null,
      product.active !== false ? 1 : 0
    );
    
    // Fetch the created product
    const getProduct = sqlite.prepare('SELECT * FROM products WHERE id = ?');
    const newProduct = getProduct.get(result.lastInsertRowid);
    
    return {
      ...newProduct,
      active: Boolean(newProduct.active),
      createdAt: new Date(newProduct.created_at),
      updatedAt: new Date(newProduct.updated_at)
    };
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
  
  async getRecommendedPurchaseItems(): Promise<{ 
    products: Product[]; 
    recommendedQuantity: number[];
    recommendedSuppliers: { id: number; name: string }[];
  }> {
    try {
      // Get all products that are below threshold
      const lowStockProducts = await db.query.products.findMany({
        where: sql`${products.stockQuantity} <= ${products.alertThreshold}`,
        with: { category: true },
        orderBy: products.stockQuantity
      });
      
      // Calculate recommended quantities (threshold + 20% buffer - current stock)
      const recommendedQuantities = lowStockProducts.map(product => {
        return Math.max(
          Math.ceil(product.alertThreshold * 1.2) - product.stockQuantity, 
          1
        );
      });
      
      // Get suppliers who have supplied these products in the past
      const supplierIds = new Set<number>();
      
      // Get previous purchases for these products to find the best suppliers
      for (const product of lowStockProducts) {
        const previousPurchaseItems = await db.query.purchaseItems.findMany({
          where: eq(purchaseItems.productId, product.id),
          with: {
            purchase: {
              with: {
                supplier: true
              }
            }
          },
          orderBy: (purchaseItems, { desc }) => [desc(purchaseItems.createdAt)],
          limit: 3
        });
        
        // Add supplier IDs from recent purchases
        for (const item of previousPurchaseItems) {
          if (item.purchase?.supplier) {
            supplierIds.add(item.purchase.supplier.id);
          }
        }
      }
      
      // If no suppliers found from purchase history, get any active suppliers
      let recommendedSuppliers = [];
      if (supplierIds.size > 0) {
        recommendedSuppliers = await db.query.suppliers.findMany({
          where: sql`${suppliers.id} IN (${Array.from(supplierIds).join(',')})`,
          columns: {
            id: true,
            name: true
          }
        });
      } else {
        // Get any active suppliers if no purchase history
        recommendedSuppliers = await db.query.suppliers.findMany({
          where: eq(suppliers.status, 'active'),
          columns: {
            id: true,
            name: true
          },
          limit: 3
        });
      }
      
      return { 
        products: lowStockProducts, 
        recommendedQuantity: recommendedQuantities,
        recommendedSuppliers: recommendedSuppliers
      };
    } catch (error) {
      console.error("Error generating purchase recommendations:", error);
      return { products: [], recommendedQuantity: [], recommendedSuppliers: [] };
    }
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
    // Use SQLite database directly for compatibility
    const { sqlite } = await import('@db');
    
    const insertCustomer = sqlite.prepare(`
      INSERT INTO customers (
        name, email, phone, address, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = insertCustomer.run(
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.address || null
    );
    
    // Fetch the created customer
    const getCustomer = sqlite.prepare('SELECT * FROM customers WHERE id = ?');
    const newCustomer = getCustomer.get(result.lastInsertRowid);
    
    return {
      ...newCustomer,
      createdAt: new Date(newCustomer.created_at)
    };
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
    // Use SQLite database directly for compatibility
    const { sqlite } = await import('@db');
    
    const insertSupplier = sqlite.prepare(`
      INSERT INTO suppliers (
        name, email, phone, address, contact_person, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = insertSupplier.run(
      supplier.name,
      supplier.email || null,
      supplier.phone || null,
      supplier.address || null,
      supplier.contactPerson || null
    );
    
    // Fetch the created supplier
    const getSupplier = sqlite.prepare('SELECT * FROM suppliers WHERE id = ?');
    const newSupplier = getSupplier.get(result.lastInsertRowid);
    
    return {
      ...newSupplier,
      createdAt: new Date(newSupplier.created_at)
    };
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
      // Convert all values to their appropriate types to avoid NaN issues
      const productId = typeof item.productId === 'number' ? item.productId : 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      const unitCost = typeof item.unitCost === 'number' ? item.unitCost : 0;
      const subtotal = quantity * unitCost;
      
      console.log("Inserting purchase item:", { 
        purchaseId: purchase.id, 
        productId, 
        quantity, 
        unitCost, 
        subtotal 
      });
      
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId,
        quantity,
        unitCost: unitCost.toString(),
        subtotal: subtotal.toString()
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
    try {
      // Directly use db.query instead of building a query and then switching
      const query = {
        limit,
        offset,
        orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
        with: {
          supplier: true,
          user: true
        }
      };
      
      // Add conditions if needed
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(purchases.orderDate, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(purchases.orderDate, endDate));
      }
      
      if (supplierId) {
        conditions.push(eq(purchases.supplierId, supplierId));
      }
      
      if (status) {
        conditions.push(eq(purchases.status, status));
      }
      
      // Apply conditions if any were provided
      if (conditions.length > 0) {
        return await db.query.purchases.findMany({
          ...query,
          where: and(...conditions)
        });
      }
      
      // Otherwise return without where clause
      return await db.query.purchases.findMany(query);
    } catch (error) {
      console.error("Error in listPurchases:", error);
      return [];
    }
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
  },

  // Smart Freight Distribution - Get total distributed freight across all purchase orders
  async getTotalFreightDistributed(): Promise<string> {
    try {
      const result = await db
        .select({
          totalFreight: sql`COALESCE(SUM(CAST(${purchases.freight} AS DECIMAL)), 0)`
        })
        .from(purchases)
        .where(sql`${purchases.freight} IS NOT NULL AND ${purchases.freight} != '0'`)
        .execute();
      
      return result[0]?.totalFreight?.toString() || "0";
    } catch (error) {
      console.error('Error calculating total freight distributed:', error);
      return "0";
    }
  },

  // Smart Product Cost Calculation with Freight Distribution
  async getProductTrueCost(productId: number): Promise<{ baseCost: string; allocatedFreight: string; trueCost: string }> {
    try {
      // Get product's base cost
      const product = await this.getProductById(productId);
      if (!product) {
        return { baseCost: "0", allocatedFreight: "0", trueCost: "0" };
      }

      // Calculate allocated freight based on purchase history
      const freightAllocation = await db
        .select({
          totalFreight: sql`COALESCE(SUM(
            CAST(${purchases.freight} AS DECIMAL) * 
            (CAST(${purchaseItems.amount} AS DECIMAL) / CAST(${purchases.subTotal} AS DECIMAL))
          ), 0)`
        })
        .from(purchaseItems)
        .innerJoin(purchases, sql`${purchases.id} = ${purchaseItems.purchaseId}`)
        .where(sql`${purchaseItems.productId} = ${productId}`)
        .execute();

      const allocatedFreight = freightAllocation[0]?.totalFreight?.toString() || "0";
      const baseCost = product.cost || "0";
      const trueCost = (Number(baseCost) + Number(allocatedFreight)).toString();

      return {
        baseCost,
        allocatedFreight,
        trueCost
      };
    } catch (error) {
      console.error('Error calculating product true cost:', error);
      return { baseCost: "0", allocatedFreight: "0", trueCost: "0" };
    }
  }
};
