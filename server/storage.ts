import { db } from "../db/sqlite-index";
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
    mrp: number;
    cost: number;
    weight?: number;
    weightUnit?: string;
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
        name, description, sku, price, mrp, cost, weight, weight_unit, category_id, 
        stock_quantity, alert_threshold, barcode, image, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = insertProduct.run(
      product.name,
      product.description || null,
      product.sku,
      product.price.toString(),
      product.mrp?.toString() || product.price.toString(),
      product.cost?.toString() || '0',
      product.weight?.toString() || null,
      product.weightUnit || 'kg',
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
    // Transform the data to match the database schema
    const updateData: any = {};
    if (product.name !== undefined) updateData.name = product.name;
    if (product.description !== undefined) updateData.description = product.description;
    if (product.sku !== undefined) updateData.sku = product.sku;
    if (product.price !== undefined) updateData.price = product.price.toString();
    if (product.mrp !== undefined) updateData.mrp = product.mrp.toString();
    if (product.cost !== undefined) updateData.cost = product.cost.toString();
    if (product.stockQuantity !== undefined) updateData.stockQuantity = product.stockQuantity;
    if (product.alertThreshold !== undefined) updateData.alertThreshold = product.alertThreshold;
    if (product.barcode !== undefined) updateData.barcode = product.barcode;
    if (product.weight !== undefined) updateData.weight = product.weight;
    if (product.weightUnit !== undefined) updateData.weightUnit = product.weightUnit;
    if (product.categoryId !== undefined) updateData.categoryId = product.categoryId;
    if (product.active !== undefined) updateData.active = product.active ? 1 : 0;
    if (product.image !== undefined) updateData.image = product.image;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const [updatedProduct] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) return null;

    // Get the updated product with category
    return await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { category: true }
    }) || null;
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
    const query = `
          SELECT s.*, si.product_id, si.quantity, si.unit_price, si.price, si.total,
                 p.name as product_name
          FROM sales s
          LEFT JOIN sale_items si ON s.id = si.sale_id
          LEFT JOIN products p ON si.product_id = p.id
          WHERE s.id IS NOT NULL
          ORDER BY s.created_at DESC
          LIMIT ?
        `;
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
    // Use SQLite database directly for compatibility
    const { sqlite } = await import('@db');

    // Generate unique purchase number
    const purchaseNumber = `PO-${Date.now().toString().substring(7)}${Math.floor(Math.random() * 1000)}`;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitCost), 0);

    // Create purchase transaction with SQLite-compatible approach
    const insertPurchase = sqlite.prepare(`
      INSERT INTO purchases (
        supplier_id, user_id, purchase_number, order_date, total, 
        status, created_at, order_number, sub_total, freight_cost, 
        other_charges, discount_amount
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
    `);

    const result = insertPurchase.run(
      supplierId,
      userId,
      purchaseNumber,
      new Date().toISOString(),
      total.toString(),
      purchaseData.status || 'pending',
      purchaseNumber, // order_number (same as purchase_number)
      total.toString(), // sub_total
      "0", // freight_cost
      "0", // other_charges
      "0"  // discount_amount
    );

    // Fetch the created purchase
    const getPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?');
    const purchase = getPurchase.get(result.lastInsertRowid);

    // Add purchase items using SQLite directly with all required fields
    const insertPurchaseItem = sqlite.prepare(`
      INSERT INTO purchase_items (
        purchase_id, product_id, quantity, unit_cost, cost, total, amount, subtotal,
        received_qty, free_qty, expiry_date, hsn_code, tax_percentage,
        discount_amount, discount_percent, net_cost, selling_price, mrp,
        batch_number, location, unit, roi_percent, gross_profit_percent,
        net_amount, cash_percent, cash_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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

      insertPurchaseItem.run(
        purchase.id,
        productId,
        quantity,
        unitCost.toString(),
        unitCost.toString(), // cost
        subtotal.toString(), // total
        subtotal.toString(), // amount
        subtotal.toString(), // subtotal
        quantity, // received_qty
        0, // free_qty
        '', // expiry_date
        '', // hsn_code
        '0', // tax_percentage
        '0', // discount_amount
        '0', // discount_percent
        unitCost.toString(), // net_cost
        '0', // selling_price
        '0', // mrp
        '', // batch_number
        '', // location
        'PCS', // unit
        '0', // roi_percent
        '0', // gross_profit_percent
        subtotal.toString(), // net_amount
        '0', // cash_percent
        '0' // cash_amount
      );
    }

    return {
      ...purchase,
      createdAt: new Date(purchase.created_at)
    };
  },

  async getPurchaseById(id: number) {
    try {
      console.log('Fetching purchase by ID:', id);

      // First get the purchase details with supplier and user
      const purchaseQuery = `
        SELECT 
          p.id,
          p.order_number,
          p.supplier_id,
          p.user_id,
          p.total,
          p.status,
          p.draft,
          p.po_no,
          p.po_date,
          p.due_date,
          p.invoice_no,
          p.invoice_date,
          p.invoice_amount,
          p.payment_method,
          p.payment_type,
          p.remarks,
          p.order_date,
          p.received_date,
          p.created_at,
          s.name as supplier_name,
          s.email as supplier_email,
          s.phone as supplier_phone,
          s.address as supplier_address,
          u.name as user_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `;

      const { sqlite } = await import('@db');
      const purchase = sqlite.prepare(purchaseQuery).get(id);

      if (!purchase) {
        console.log('Purchase not found for ID:', id);
        return null;
      }

      console.log('Found purchase:', purchase);

      // Get purchase items with safe column access (handle missing columns)
      const itemsQuery = `
        SELECT 
          pi.id,
          pi.purchase_id,
          pi.product_id,
          pi.quantity,
          pi.unit_cost,
          pi.subtotal,
          COALESCE(pi.expiry_date, '') as expiry_date,
          COALESCE(pi.hsn_code, '') as hsn_code,
          COALESCE(pi.tax_percentage, '0') as tax_percentage,
          COALESCE(pi.discount_amount, '0') as discount_amount,
          COALESCE(pi.discount_percent, '0') as discount_percent,
          COALESCE(pi.net_cost, '0') as net_cost,
          COALESCE(pi.selling_price, '0') as selling_price,
          COALESCE(pi.mrp, '0') as mrp,
          COALESCE(pi.batch_number, '') as batch_number,
          COALESCE(pi.location, '') as location,
          COALESCE(pi.unit, 'PCS') as unit,
          COALESCE(pi.roi_percent, '0') as roi_percent,
          COALESCE(pi.gross_profit_percent, '0') as gross_profit_percent,
          COALESCE(pi.net_amount, '0') as net_amount,
          COALESCE(pi.cash_percent, '0') as cash_percent,
          COALESCE(pi.cash_amount, '0') as cash_amount,
          COALESCE(pi.received_qty, pi.quantity) as received_qty,
          COALESCE(pi.free_qty, 0) as free_qty,
          CURRENT_TIMESTAMP as created_at,
          p.name as product_name,
          p.sku as product_sku,
          p.description as product_description
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
      `;

      const items = sqlite.prepare(itemsQuery).all(id);
      console.log('Found purchase items:', items);

      // Map items to the expected format
      const mappedItems = items.map(item => ({
        id: item.id,
        productId: item.product_id,
        product_id: item.product_id,
        quantity: item.quantity,
        receivedQty: item.quantity,
        received_qty: item.quantity,
        unitCost: item.unit_cost,
        unit_cost: item.unit_cost,
        cost: item.unit_cost,
        subtotal: item.subtotal,
        expiryDate: item.expiry_date,
        expiry_date: item.expiry_date,
        hsnCode: item.hsn_code,
        hsn_code: item.hsn_code,
        taxPercentage: item.tax_percentage,
        tax_percentage: item.tax_percentage,
        taxPercent: item.tax_percentage,
        tax_percent: item.tax_percentage,
        discountAmount: item.discount_amount,
        discount_amount: item.discount_amount,
        discountPercent: item.discount_percent,
        discount_percent: item.discount_percent,
        netCost: item.net_cost,
        net_cost: item.net_cost,
        sellingPrice: item.selling_price,
        selling_price: item.selling_price,
        mrp: item.mrp,
        productName: item.product_name,
        product_name: item.product_name,
        code: item.product_sku,
        sku: item.product_sku,
        description: item.product_description,
        freeQty: 0,
        free_qty: 0,
        batchNumber: '',
        batch_number: '',
        location: '',
        unit: 'PCS',
        roiPercent: 0,
        roi_percent: 0,
        grossProfitPercent: 0,
        gross_profit_percent: 0,
        netAmount: item.subtotal,
        net_amount: item.subtotal,
        cashPercent: 0,
        cash_percent: 0,
        cashAmount: 0,
        cash_amount: 0
      }));

      // Structure the response with both camelCase and snake_case for compatibility
      const result = {
        id: purchase.id,
        supplierId: purchase.supplier_id,
        supplier_id: purchase.supplier_id,
        userId: purchase.user_id,
        user_id: purchase.user_id,
        orderNumber: purchase.order_number,
        order_number: purchase.order_number,
        poNo: purchase.po_no,
        po_no: purchase.po_no,
        poDate: purchase.po_date,
        po_date: purchase.po_date,
        orderDate: purchase.order_date,
        order_date: purchase.order_date,
        dueDate: purchase.due_date,
        due_date: purchase.due_date,
        expectedDate: purchase.due_date,
        expected_date: purchase.due_date,
        invoiceNo: purchase.invoice_no,
        invoice_no: purchase.invoice_no,
        invoiceDate: purchase.invoice_date,
        invoice_date: purchase.invoice_date,
        invoiceAmount: purchase.invoice_amount,
        invoice_amount: purchase.invoice_amount,
        paymentMethod: purchase.payment_method,
        payment_method: purchase.payment_method,
        paymentType: purchase.payment_type,
        payment_type: purchase.payment_type,
        remarks: purchase.remarks,
        status: purchase.status,
        draft: purchase.draft,
        total: purchase.total,
        totalAmount: purchase.total,
        total_amount: purchase.total,
        receivedDate: purchase.received_date,
        received_date: purchase.received_date,
        createdAt: purchase.created_at,
        created_at: purchase.created_at,
        supplier: {
          id: purchase.supplier_id,
          name: purchase.supplier_name,
          email: purchase.supplier_email,
          phone: purchase.supplier_phone,
          address: purchase.supplier_address
        },
        user: {
          id: purchase.user_id,
          name: purchase.user_name
        },        items: mappedItems
      };

      console.log('Returning structured purchase with', mappedItems.length, 'items');
      return result;
    } catch (error) {
      console.error('Error fetching purchase by ID:', error);
      throw error;
    }
  },

  async updatePurchase(
    id: number, 
    purchaseData: Partial<Purchase>,
    items?: any[]
  ): Promise<Purchase | null> {
    try {
      // Import SQLite database directly
      const { sqlite } = await import('@db');

      // Update the main purchase record
      const updateFields = [];
      const updateValues = [];

      if (purchaseData.orderNumber) {
        updateFields.push('order_number = ?', 'purchase_number = ?', 'po_no = ?');
        updateValues.push(purchaseData.orderNumber, purchaseData.orderNumber, purchaseData.orderNumber);
      }

      if (purchaseData.orderDate) {
        updateFields.push('order_date = ?', 'po_date = ?');
        updateValues.push(purchaseData.orderDate.toISOString(), purchaseData.orderDate.toISOString());
      }

      if (purchaseData.dueDate) {
        updateFields.push('due_date = ?', 'expected_date = ?');
        updateValues.push(purchaseData.dueDate.toISOString(), purchaseData.dueDate.toISOString());
      }

      if (purchaseData.supplierId) {
        updateFields.push('supplier_id = ?');
        updateValues.push(purchaseData.supplierId);
      }

      if (purchaseData.total) {
        updateFields.push('total = ?', 'sub_total = ?');
        updateValues.push(purchaseData.total, purchaseData.total);
      }

      if (purchaseData.notes) {
        updateFields.push('notes = ?', 'remarks = ?');
        updateValues.push(purchaseData.notes, purchaseData.notes);
      }

      // Add updated timestamp
      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());

      updateValues.push(id);

      if (updateFields.length > 1) { // More than just the timestamp
        const updatePurchaseStmt = sqlite.prepare(
          `UPDATE purchases SET ${updateFields.join(', ')} WHERE id = ?`
        );
        updatePurchaseStmt.run(...updateValues);
      }

      // Update purchase items if provided
      if (items && items.length > 0) {
        console.log('Updating purchase items for purchase ID:', id);
        console.log('Items to update:', items);
        
        // Delete existing items
        const deleteItemsStmt = sqlite.prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
        deleteItemsStmt.run(id);

        // Insert new items with all required fields
        const insertPurchaseItem = sqlite.prepare(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_cost, cost, total, amount, subtotal,
            received_qty, free_qty, expiry_date, hsn_code, tax_percentage,
            discount_amount, discount_percent, net_cost, selling_price, mrp,
            batch_number, location, unit, roi_percent, gross_profit_percent,
            net_amount, cash_percent, cash_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          const productId = Number(item.productId) || 0;
          const quantity = Number(item.receivedQty || item.quantity || 0);
          const unitCost = Number(item.cost || item.unitCost || 0);
          const subtotal = quantity * unitCost;
          
          console.log('Inserting item:', { productId, quantity, unitCost, subtotal });

          insertPurchaseItem.run(
            id,
            productId,
            quantity,
            unitCost.toString(),
            unitCost.toString(), // cost
            subtotal.toString(), // total
            subtotal.toString(), // amount
            subtotal.toString(), // subtotal
            quantity, // received_qty
            Number(item.freeQty || 0), // free_qty
            item.expiryDate || '', // expiry_date
            item.hsnCode || '', // hsn_code
            Number(item.taxPercentage || 0).toString(), // tax_percentage
            Number(item.discountAmount || 0).toString(), // discount_amount
            Number(item.discountPercent || 0).toString(), // discount_percent
            unitCost.toString(), // net_cost
            Number(item.sellingPrice || 0).toString(), // selling_price
            Number(item.mrp || 0).toString(), // mrp
            item.batchNumber || '', // batch_number
            item.location || '', // location
            item.unit || 'PCS', // unit
            Number(item.roiPercent || 0).toString(), // roi_percent
            Number(item.grossProfitPercent || 0).toString(), // gross_profit_percent
            Number(item.netAmount || subtotal).toString(), // net_amount
            Number(item.cashPercent || 0).toString(), // cash_percent
            Number(item.cashAmount || 0).toString() // cash_amount
          );
        }
        
        console.log(`Successfully updated ${items.length} items for purchase ${id}`);
      }

      // Return the updated purchase
      return await this.getPurchaseById(id);
    } catch (error) {
      console.error("Error in updatePurchase:", error);
      return null;
    }
  },

  async deletePurchase(id: number): Promise<boolean> {
    try {
      // Import SQLite database directly like other methods
      const { sqlite } = await import('@db');

      // First delete purchase items
      const deleteItemsStmt = sqlite.prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
      deleteItemsStmt.run(id);

      // Then delete the purchase
      const deletePurchaseStmt = sqlite.prepare('DELETE FROM purchases WHERE id = ?');
      const result = deletePurchaseStmt.run(id);

      return result.changes > 0;
    } catch (error) {
      console.error("Error in deletePurchase:", error);
      return false;
    }
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
          user: true,
          items: {
            with: {
              product: true
            }
          }
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