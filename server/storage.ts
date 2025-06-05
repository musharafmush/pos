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
    try {
      const product = await db.query.products.findFirst({
        where: eq(products.id, id),
        with: {
          category: true
        }
      });
      return product || null;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }
  },

  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const product = await db.query.products.findFirst({
        where: eq(products.sku, sku),
        with: {
          category: true
        }
      });
      return product || null;
    } catch (error) {
      console.error('Error fetching product by SKU:', error);
      throw error;
    }
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
    try {
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
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  async updateProduct(id: number, data: Partial<any>): Promise<Product> {
    try {
      const [updatedProduct] = await db.update(products)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async deleteProduct(id: number): Promise<boolean> {
    try {
      const result = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async listProducts(limit?: number, offset?: number): Promise<Product[]> {
    try {
      return await db.query.products.findMany({
        limit: limit || 50,
        offset: offset || 0,
        orderBy: desc(products.createdAt),
        with: {
          category: true
        }
      });
    } catch (error) {
      console.error('Error listing products:', error);
      throw error;
    }
  },

  async searchProducts(query: string): Promise<Product[]> {
    try {
      return await db.query.products.findMany({
        where: or(
          like(products.name, `%${query}%`),
          like(products.sku, `%${query}%`),
          like(products.barcode, `%${query}%`)
        ),
        with: {
          category: true
        }
      });
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  },

  async getLowStockProducts(limit: number = 10): Promise<Product[]> {
    try {
      return await db.query.products.findMany({
        where: sql`${products.stockQuantity} <= ${products.alertThreshold}`,
        with: { category: true },
        orderBy: products.stockQuantity,
        limit
      });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  },

  // Supplier related operations
  async getSupplierById(id: number): Promise<Supplier | null> {
    try {
      return await db.query.suppliers.findFirst({
        where: eq(suppliers.id, id)
      });
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw error;
    }
  },

  async createSupplier(supplier: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    registrationNumber?: string;
    taxId?: string;
    website?: string;
  }): Promise<Supplier> {
    try {
      const [newSupplier] = await db.insert(suppliers).values({
        ...supplier,
        status: 'active'
      }).returning();
      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | null> {
    try {
      const [updatedSupplier] = await db.update(suppliers)
        .set(supplier)
        .where(eq(suppliers.id, id))
        .returning();
      return updatedSupplier || null;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  async deleteSupplier(id: number): Promise<boolean> {
    try {
      const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  },

  async listSuppliers(): Promise<Supplier[]> {
    try {
      return await db.query.suppliers.findMany({
        orderBy: suppliers.name
      });
    } catch (error) {
      console.error('Error listing suppliers:', error);
      throw error;
    }
  },

  // Customer related operations
  async getCustomerById(id: number): Promise<Customer | null> {
    try {
      return await db.query.customers.findFirst({
        where: eq(customers.id, id)
      });
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      throw error;
    }
  },

  async createCustomer(customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<Customer> {
    try {
      const [newCustomer] = await db.insert(customers).values(customer).returning();
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null> {
    try {
      const [updatedCustomer] = await db.update(customers)
        .set(customer)
        .where(eq(customers.id, id))
        .returning();
      return updatedCustomer || null;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      const result = await db.delete(customers).where(eq(customers.id, id)).returning({ id: customers.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  async listCustomers(): Promise<Customer[]> {
    try {
      return await db.query.customers.findMany({
        orderBy: customers.name
      });
    } catch (error) {
      console.error('Error listing customers:', error);
      throw error;
    }
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      return await db.query.customers.findMany({
        where: or(
          like(customers.name, `%${query}%`),
          like(customers.email, `%${query}%`),
          like(customers.phone, `%${query}%`)
        )
      });
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  },

  // Sales related operations
  async createSale(
    saleData: {
      orderNumber?: string;
      customerId?: number;
      userId: number;
      total: number;
      tax?: number;
      discount?: number;
      paymentMethod?: string;
      status?: string;
    },
    items: Array<{ productId: number; quantity: number; unitPrice: number; subtotal: number }>
  ): Promise<Sale> {
    try {
      console.log('Creating sale with data:', saleData);
      console.log('Sale items:', items);

      // Import SQLite database directly for raw SQL operations
      const { sqlite } = await import('@db');

      // Start a transaction using SQLite directly
      const result = sqlite.transaction(() => {
        // Insert the sale using raw SQL to avoid timestamp issues
        const insertSale = sqlite.prepare(`
          INSERT INTO sales (
            order_number, customer_id, user_id, total, tax, discount, 
            payment_method, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const saleResult = insertSale.run(
          saleData.orderNumber || `SALE-${Date.now()}`,
          saleData.customerId || null,
          saleData.userId,
          saleData.total.toString(),
          (saleData.tax || 0).toString(),
          (saleData.discount || 0).toString(),
          saleData.paymentMethod || 'cash',
          saleData.status || 'completed'
        );

        const saleId = saleResult.lastInsertRowid;
        console.log('Created sale with ID:', saleId);

        // Insert sale items and update stock
        const insertSaleItem = sqlite.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `);

        const updateStock = sqlite.prepare(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) - ?
          WHERE id = ?
        `);

        for (const item of items) {
          // Insert sale item
          insertSaleItem.run(
            saleId,
            item.productId,
            item.quantity,
            item.unitPrice.toString(),
            item.subtotal.toString()
          );

          // Update product stock
          updateStock.run(item.quantity, item.productId);
        }

        // Get the created sale
        const getSale = sqlite.prepare('SELECT * FROM sales WHERE id = ?');
        const newSale = getSale.get(saleId);

        return {
          ...newSale,
          createdAt: new Date(newSale.created_at)
        };
      })();

      return result;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  async getSaleById(id: number): Promise<Sale | null> {
    try {
      return await db.query.sales.findFirst({
        where: eq(sales.id, id),
        with: {
          items: {
            with: {
              product: true
            }
          },
          customer: true,
          user: true
        }
      });
    } catch (error) {
      console.error('Error fetching sale by ID:', error);
      throw error;
    }
  },

  async listSales(startDate?: Date, endDate?: Date, limit?: number, offset?: number, userId?: number, customerId?: number): Promise<Sale[]> {
    try {
      const conditions = [];

      if (startDate) {
        conditions.push(gte(sales.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(sales.createdAt, endDate));
      }
      if (userId) {
        conditions.push(eq(sales.userId, userId));
      }
      if (customerId) {
        conditions.push(eq(sales.customerId, customerId));
      }

      return await db.query.sales.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          items: {
            with: {
              product: true
            }
          },
          customer: true,
          user: true
        },
        orderBy: desc(sales.createdAt),
        limit: limit || 20,
        offset: offset || 0
      });
    } catch (error) {
      console.error('Error listing sales:', error);
      throw error;
    }
  },

  async getRecentSales(limit: number = 5): Promise<Sale[]> {
    try {
      return await db.query.sales.findMany({
        with: {
          items: {
            with: {
              product: true
            }
          },
          customer: true,
          user: true
        },
        orderBy: desc(sales.createdAt),
        limit
      });
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      return [];
    }
  },

  async updatePurchaseStatus(id: number, status: string, receivedDate?: Date): Promise<any> {
    const purchaseData: any = { status };
    if (receivedDate) {
      purchaseData.receivedDate = receivedDate;
    }

    const [updated] = await db.update(purchases)
      .set(purchaseData)
      .where(eq(purchases.id, id))
      .returning();

    if (!updated) return null;

    return this.getPurchaseById(id);
  },

  // Purchase related operations
  async createPurchase(
    userId: number,
    supplierId: number,
    items: Array<{ productId: number; quantity: number; unitCost: number, receivedQty?: number }>,
    purchaseData: any
  ): Promise<Purchase> {
    try {
      // Import SQLite database directly for raw SQL operations
      const { sqlite } = await import('@db');

      // Calculate total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

      // Generate unique order number
      const orderNumber = `PO-${Date.now()}`;

      // Insert purchase using raw SQL to avoid timestamp issues
      const insertPurchase = sqlite.prepare(`
        INSERT INTO purchases (
          purchase_number, order_number, supplier_id, user_id, total, status, 
          order_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const result = insertPurchase.run(
        orderNumber,
        orderNumber,
        supplierId,
        userId,
        total.toString(),
        purchaseData.status || 'pending'
      );

      const purchaseId = result.lastInsertRowid;

      // Insert purchase items and update stock
      if (items && items.length > 0) {
        const insertItem = sqlite.prepare(`
          INSERT INTO purchase_items (
            purchase_id, product_id, quantity, received_qty, free_qty, unit_cost, cost,
            selling_price, mrp, hsn_code, tax_percentage, discount_amount, discount_percent,
            expiry_date, batch_number, net_cost, roi_percent, gross_profit_percent,
            net_amount, cash_percent, cash_amount, location, unit, subtotal, total, amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Prepare statement to update product stock
        const updateStock = sqlite.prepare(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) + ? 
          WHERE id = ?
        `);

        for (const item of items) {
          // Get the received quantity - this is what should be added to stock
          const receivedQty = Number(item.receivedQty) || Number(item.quantity) || 0;
          const quantity = Number(item.quantity) || receivedQty || 1;
          const unitCost = Number(item.unitCost) || 0;

          console.log(`Processing item: Product ID ${item.productId}, Received Qty: ${receivedQty}, Unit Cost: ${unitCost}`);

          // Insert purchase item
          insertItem.run(
            purchaseId,
            item.productId,
            quantity,
            receivedQty,
            Number(item.freeQty) || 0,
            unitCost,
            Number(item.cost) || unitCost,
            Number(item.sellingPrice) || 0,
            Number(item.mrp) || 0,
            item.hsnCode || "",
            Number(item.taxPercentage) || 0,
            Number(item.discountAmount) || 0,
            Number(item.discountPercent) || 0,
            item.expiryDate || "",
            item.batchNumber || "",
            Number(item.netCost) || unitCost,
            Number(item.roiPercent) || 0,
            Number(item.grossProfitPercent) || 0,
            Number(item.netAmount) || total,
            Number(item.cashPercent) || 0,
            Number(item.cashAmount) || 0,
            item.location || "",
            item.unit || "PCS",
            total,
            total,
            total
          );

          // Update product stock with received quantity
          if (receivedQty > 0 && item.productId) {
            try {
              const result = updateStock.run(receivedQty, item.productId);
              console.log(`📦 Stock update result for product ${item.productId}: Added ${receivedQty} units (Changes: ${result.changes})`);

              // Verify the stock update
              const checkStock = sqlite.prepare('SELECT stock_quantity FROM products WHERE id = ?');
              const currentStock = checkStock.get(item.productId);
              console.log(`📊 Current stock for product ${item.productId}: ${currentStock?.stock_quantity}`);
            } catch (error) {
              console.error(`❌ Error updating stock for product ${item.productId}:`, error);
            }
          } else {
            console.log(`⚠️ Skipping stock update for product ${item.productId}: receivedQty = ${receivedQty}`);
          }
        }
      }

      // Fetch and return the created purchase
      const getPurchase = sqlite.prepare(`
        SELECT * FROM purchases WHERE id = ?
      `);

      const newPurchase = getPurchase.get(purchaseId);

      return {
        ...newPurchase,
        createdAt: new Date(newPurchase.created_at || newPurchase.createdAt),
        orderDate: new Date(newPurchase.order_date || newPurchase.orderDate)
      };
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  },

  async getPurchaseById(id: number): Promise<any> {
    try {
      const { sqlite } = await import('@db');
      const purchase = sqlite.prepare(`
        SELECT * FROM purchases WHERE id = ?
      `).get(id);

      if (!purchase) {
        return null;
      }

      // Get purchase items with product details - using correct table name
      const items = sqlite.prepare(`
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
        ORDER BY pi.id
      `).all(id);

      return {
        ...purchase,
        items
      };
    } catch (error) {
      console.error('Error fetching purchase by ID:', error);
      throw error;
    }
  },

  async updatePurchase(id: number, data: any): Promise<any> {
    const { sqlite } = await import('@db');
    return new Promise((resolve, reject) => {
      const transaction = sqlite.transaction(() => {
        try {
          // Get existing items to calculate stock differences
          const existingItems = sqlite.prepare(`
            SELECT product_id, received_qty FROM purchase_items WHERE purchase_id = ?
          `).all(id);

          // Create a map of existing received quantities
          const existingReceivedMap = new Map();
          existingItems.forEach((item: any) => {
            existingReceivedMap.set(item.product_id, item.received_qty || 0);
          });

          // Update purchase record
          const updatePurchase = sqlite.prepare(`
            UPDATE purchases SET
              supplier_id = ?,
              purchase_number = ?,
              order_number = ?,
              order_date = ?,
              expected_date = ?,
              due_date = ?,
              total = ?,
              status = ?,
              payment_method = ?,
              payment_type = ?,
              freight_amount = ?,
              surcharge_amount = ?,
              packing_charge = ?,
              other_charge = ?,
              manual_discount_amount = ?,
              invoice_no = ?,
              invoice_date = ?,
              invoice_amount = ?,
              lr_number = ?,
              remarks = ?
            WHERE id = ?
          `);

          updatePurchase.run(
            data.supplierId,
            data.orderNumber,
            data.orderNumber, // using orderNumber for both fields
            data.orderDate,
            data.expectedDate || data.orderDate,
            data.expectedDate || data.orderDate,
            data.items?.reduce((total: number, item: any) => total + ((item.receivedQty || 0) * (item.unitCost || 0)), 0) || 0,
            data.status || 'Pending',
            data.paymentMethod || 'Credit',
            data.paymentMethod || 'Credit',
            data.freightAmount || 0,
            data.surchargeAmount || 0,
            data.packingCharges || 0,
            data.otherCharges || 0,
            data.additionalDiscount || 0,
            data.invoiceNumber || '',
            data.invoiceDate || '',
            data.invoiceAmount || 0,
            data.lrNumber || '',
            data.remarks || '',
            id
          );

          // Delete existing items
          sqlite.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id);

          // Prepare statement to update product stock
          const updateStock = sqlite.prepare(`
            UPDATE products 
            SET stock_quantity = stock_quantity + ? 
            WHERE id = ?
          `);

          // Insert updated items and adjust stock
          if (data.items && data.items.length > 0) {
            const insertItem = sqlite.prepare(`
              INSERT INTO purchase_items (
                purchase_id, product_id, quantity, received_qty, free_qty, unit_cost, cost,
                selling_price, mrp, hsn_code, tax_percentage, discount_amount, discount_percent,
                expiry_date, batch_number, net_cost, roi_percent, gross_profit_percent,
                net_amount, cash_percent, cash_amount, location, unit, subtotal
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const item of data.items) {
              // Insert updated item
              insertItem.run(
                id,
                item.productId,
                item.quantity || 0,
                item.receivedQty || 0,
                item.freeQty || 0,
                item.unitCost || 0,
                item.cost || item.unitCost || 0,
                item.sellingPrice || 0,
                item.mrp || 0,
                item.hsnCode || "",
                item.taxPercentage || 0,
                item.discountAmount || 0,
                item.discountPercent || 0,
                item.expiryDate || "",
                item.batchNumber || "",
                item.netCost || 0,
                item.roiPercent || 0,
                item.grossProfitPercent || 0,
                item.netAmount || 0,
                item.cashPercent || 0,
                item.cashAmount || 0,
                item.location || "",
                item.unit || "PCS",
                (item.receivedQty || 0) * (item.unitCost || 0)
              );

              // Calculate stock difference and update
              const newReceivedQty = item.receivedQty || 0;
              const oldReceivedQty = existingReceivedMap.get(item.productId) || 0;
              const stockDifference = newReceivedQty - oldReceivedQty;

              if (stockDifference !== 0 && item.productId) {
                updateStock.run(stockDifference, item.productId);
                console.log(`📦 Stock adjustment for product ${item.productId}: ${stockDifference > 0 ? '+' : ''}${stockDifference}`);
              }
            }
          }

          // Reverse stock for any items that were completely removed
          existingItems.forEach((existingItem: any) => {
            const stillExists = data.items?.some((newItem: any) => newItem.productId === existingItem.product_id);
            if (!stillExists && existingItem.received_qty > 0) {
              updateStock.run(-existingItem.received_qty, existingItem.product_id);
              console.log(`📦 Reversed stock for removed product ${existingItem.product_id}: -${existingItem.received_qty}`);
            }
          });

          return { id, ...data };
        } catch (error) {
          console.error('Error in update transaction:', error);
          throw error;
        }
      });

      try {
        const result = transaction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Create sale with items
  async createSaleWithItems(saleData: any, items: any[]): Promise<any> {
    try {
      console.log('Creating sale with data:', saleData);
      console.log('Sale items:', items);

      // Import SQLite database directly for raw SQL operations
      const { sqlite } = await import('@db');

      // Start a transaction using SQLite directly
      const result = sqlite.transaction(() => {
        // Insert the sale using raw SQL to avoid timestamp issues
        const insertSale = sqlite.prepare(`
          INSERT INTO sales (
            order_number, customer_id, user_id, total, tax, discount, 
            payment_method, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const saleResult = insertSale.run(
          saleData.orderNumber || `SALE-${Date.now()}`,
          saleData.customerId || null,
          saleData.userId,
          saleData.total.toString(),
          (saleData.tax || 0).toString(),
          (saleData.discount || 0).toString(),
          saleData.paymentMethod || 'cash',
          saleData.status || 'completed'
        );

        const saleId = saleResult.lastInsertRowid;
        console.log('Created sale with ID:', saleId);

        // Insert sale items and update stock
        const insertSaleItem = sqlite.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, price, subtotal, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStock = sqlite.prepare(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) - ?
          WHERE id = ?
        `);

        for (const item of items) {
          // Insert sale item
          insertSaleItem.run(
            saleId,
            item.productId,
            item.quantity,
            item.unitPrice.toString(),
            (item.price || item.unitPrice).toString(),
            item.subtotal.toString(),
            (item.total || item.subtotal).toString()
          );

          // Update product stock
          updateStock.run(item.quantity, item.productId);
          console.log(`📦 Updated stock for product ${item.productId}: -${item.quantity}`);
        }

        //        // Get the created sale
        const sqlite = sqlite.prepare('SELECT * FROM sales WHERE id = ?');
        const newSale = getSale.get(saleId);

        return {
...newSale,
          createdAt: new Date(newSale.created_at)
        };
      })();

      return result;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  // Dashboard related operations
  async getDashboardStats(): Promise<any> {
    try {
      // Get total products
      const totalProducts = await db.query.products.findMany();

      // Get total sales for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = await db.query.sales.findMany({
        where: gte(sales.createdAt, today)
      });

      // Get low stock products
      const lowStockProducts = await db.query.products.findMany({
        where: sql`${products.stockQuantity} <= ${products.alertThreshold}`,
        limit: 10
      });

      const todayRevenue = todaySales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0);

      return {
        totalProducts: totalProducts.length,
        todaysSales: todaySales.length,
        todaysRevenue: todayRevenue,
        lowStockItems: lowStockProducts.length
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalProducts: 0,
        todaysSales: 0,
        todaysRevenue: 0,
        lowStockItems: 0
      };
    }
  },

  async getDailySalesData(days: number = 7): Promise<{ date: string; total: string; sales: number }[]> {
    try {
      const { sqlite } = await import('@db');
      const salesData = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        // Get sales for this day using raw SQL
        const daySalesQuery = sqlite.prepare(`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(CAST(total AS REAL)), 0) as revenue
          FROM sales 
          WHERE created_at >= ? AND created_at < ?
        `);

        const result = daySalesQuery.get(
          date.toISOString(),
          nextDate.toISOString()
        );

        salesData.push({
          date: date.toISOString().split('T')[0],
          total: (result?.revenue || 0).toString(),
          sales: result?.count || 0
        });
      }

      return salesData;
    } catch (error) {
      console.error('Error fetching daily sales data:', error);
      return [];
    }
  },

  async getTopSellingProducts(limit: number = 5, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const { sqlite } = await import('@db');

      let dateFilter = '';
      const params = [];

      if (startDate) {
        dateFilter += ' AND s.created_at >= ?';
        params.push(startDate.toISOString());
      }

      if (endDate) {
        dateFilter += ' AND s.created_at <= ?';
        params.push(endDate.toISOString());
      }

      params.push(limit);

      const query = sqlite.prepare(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          c.name as category_name,
          SUM(CAST(si.quantity AS INTEGER)) as sold_quantity,
          SUM(CAST(si.subtotal AS REAL)) as revenue
        FROM sale_items si
        INNER JOIN sales s ON si.sale_id = s.id
        INNER JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name, p.sku, c.name
        ORDER BY sold_quantity DESC
        LIMIT ?
      `);

      const results = query.all(...params);

      return results.map((row: any) => ({
        product: {
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: {
            name: row.category_name || 'Uncategorized'
          }
        },
        soldQuantity: row.sold_quantity || 0,
        revenue: (row.revenue || 0).toString()
      }));
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      return [];
    }
  },

  // Update sale
  async updateSale(id: number, saleData: any): Promise<any> {
    try {
      const { sqlite } = await import('@db');

      // Update the sale record
      const updateSale = sqlite.prepare(`
        UPDATE sales SET
          order_number = COALESCE(?, order_number),
          customer_id = ?,
          total = COALESCE(?, total),
          tax = COALESCE(?, tax),
          discount = COALESCE(?, discount),
          payment_method = COALESCE(?, payment_method),
          status = COALESCE(?, status)
        WHERE id = ?
      `);

      const result = updateSale.run(
        saleData.orderNumber || null,
        saleData.customerId || null,
        saleData.total ? saleData.total.toString() : null,
        saleData.tax ? saleData.tax.toString() : null,
        saleData.discount ? saleData.discount.toString() : null,
        saleData.paymentMethod || null,
        saleData.status || null,
        id
      );

      if (result.changes === 0) {
        throw new Error('Sale not found or no changes made');
      }

      // Fetch and return the updated sale
      const getSale = sqlite.prepare('SELECT * FROM sales WHERE id = ?');
      const updatedSale = getSale.get(id);

      return {
        ...updatedSale,
        createdAt: new Date(updatedSale.created_at)
      };
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  },

  // Delete sale
  async deleteSale(id: number): Promise<boolean> {
    try {
      const { sqlite } = await import('@db');

      // Start a transaction to delete sale and its items
      const result = sqlite.transaction(() => {
        // First, get the sale items to restore stock
        const getSaleItems = sqlite.prepare(`
          SELECT product_id, quantity FROM sale_items WHERE sale_id = ?
        `);
        const saleItems = getSaleItems.all(id);

        // Restore stock for each item
        const updateStock = sqlite.prepare(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) + ?
          WHERE id = ?
        `);

        for (const item of saleItems) {
          updateStock.run(item.quantity, item.product_id);
          console.log(`📦 Restored stock for product ${item.product_id}: +${item.quantity}`);
        }

        // Delete sale items first (foreign key constraint)
        const deleteSaleItems = sqlite.prepare('DELETE FROM sale_items WHERE sale_id = ?');
        deleteSaleItems.run(id);

        // Delete the sale
        const deleteSale = sqlite.prepare('DELETE FROM sales WHERE id = ?');
        const deleteResult = deleteSale.run(id);

        return deleteResult.changes > 0;
      })();

      return result;
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },

  // Cash Register Management Methods
  async openCashRegister(registerData: any) {
    try {
      const { sqlite } = await import('@db');
      const registerId = `REG-${Date.now()}`;

      // Store register data in the register table
      const insertRegister = sqlite.prepare(`
        INSERT INTO registers (
          id, user_id, opening_cash, current_cash, status, opened_at, opened_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertRegister.run(
        registerId,
        registerData.userId,
        registerData.openingCash.toString(),
        registerData.openingCash.toString(),
        'open',
        registerData.openedAt.toISOString(),
        registerData.userId
      );

      // Fetch the created register
      const getRegister = sqlite.prepare('SELECT * FROM registers WHERE id = ?');
      const newRegister = getRegister.get(registerId);

      return {
        ...newRegister,
        openedAt: new Date(newRegister.opened_at)
      };

    } catch (error) {
      console.error('Error opening cash register:', error);
      throw error;
    }
  }

  async getCurrentOpenRegister(userId: number) {
    try {
      const { sqlite } = await import('@db');

      // Fetch the latest open register for the user
      const getRegister = sqlite.prepare(`
        SELECT * FROM registers WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1
      `);

      const currentRegister = getRegister.get(userId);

      if (!currentRegister) {
        return null;
      }

      return {
        ...currentRegister,
        openedAt: new Date(currentRegister.opened_at)
      };
    } catch (error) {
      console.error('Error getting current register:', error);
      return null;
    }
  }

  async getTodaysOpenRegister(userId: number) {
    try {
      const { sqlite } = await import('@db');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for existing open register for today
      const getRegister = sqlite.prepare(`
        SELECT * FROM registers 
        WHERE user_id = ? AND status = 'open' 
        AND opened_at >= ? AND opened_at < ?
      `);

      const register = getRegister.get(userId, today.toISOString(), tomorrow.toISOString());

      if (!register) {
        return null; // No existing register
      }

      return {
        ...register,
        openedAt: new Date(register.opened_at)
      };
    } catch (error) {
      console.error('Error checking for open register:', error);
      return null;
    }
  }

  async getTodaySalesData(registerId: string) {
    try {
      const { sqlite } = await import('@db');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's sales linked to the register
      const todaySalesQuery = sqlite.prepare(`
        SELECT * FROM sales 
        WHERE created_at >= ? AND created_at < ? AND register_id = ?
      `);

      const todaySales = todaySalesQuery.all(today.toISOString(), tomorrow.toISOString(), registerId);

      // Calculate totals by payment method
      const totals = {
        totalSales: 0,
        cashSales: 0,
        upiSales: 0,
        cardSales: 0,
        bankSales: 0,
        chequeSales: 0,
        otherSales: 0,
        totalRefunds: 0,
        totalTransactions: todaySales.length
      };

      todaySales.forEach(sale => {
        const amount = parseFloat(sale.total.toString());
        totals.totalSales += amount;

        switch (sale.payment_method?.toLowerCase()) {
          case 'cash':
            totals.cashSales += amount;
            break;
          case 'upi':
            totals.upiSales += amount;
            break;
          case 'card':
          case 'credit_card':
          case 'debit_card':
            totals.cardSales += amount;
            break;
          case 'bank':
          case 'bank_transfer':
            totals.bankSales += amount;
            break;
          case 'cheque':
            totals.chequeSales += amount;
            break;
          default:
            totals.otherSales += amount;
        }
      });

      return {
        ...totals,
        sales: todaySales
      };
    } catch (error) {
      console.error('Error getting today\'s sales data:', error);
      return {
        totalSales: 0,
        cashSales: 0,
        upiSales: 0,
        cardSales: 0,
        bankSales: 0,
        chequeSales: 0,
        otherSales: 0,
        totalRefunds: 0,
        totalTransactions: 0,
        sales: []
      };
    }
  }

  async closeCashRegister(registerId: string, closeData: any) {
    try {
      const { sqlite } = await import('@db');

      // Update the register in the registers table
      const updateRegister = sqlite.prepare(`
        UPDATE registers SET
          status = 'closed',
          closed_at = ?,
          closed_by = ?,
          withdrawal_amount = ?,
          notes = ?
        WHERE id = ?
      `);

      updateRegister.run(
        closeData.closedAt.toISOString(),
        closeData.closedBy,
        closeData.withdrawalAmount || 0,
        closeData.notes || '',
        registerId
      );

      // Fetch the updated register
      const getRegister = sqlite.prepare('SELECT * FROM registers WHERE id = ?');
      const updatedRegister = getRegister.get(registerId);

      return {
        ...updatedRegister,
        openedAt: new Date(updatedRegister.opened_at),
        closedAt: new Date(updatedRegister.closed_at)
      };
    } catch (error) {
      console.error('Error closing cash register:', error);
      throw error;
    }
  },
  async addCashTransaction(transactionData: any) {
    try {
      const { sqlite } = await import('@db');

      // Insert into cash_transactions table
      const insertTransaction = sqlite.prepare(`
        INSERT INTO cash_transactions (
          register_id, type, amount, description, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const transactionId = `TXN-${Date.now()}`;
      insertTransaction.run(
        transactionData.registerId,
        transactionData.type,
        transactionData.amount.toString(),
        transactionData.description || '',
        new Date().toISOString()
      );

      // Fetch the created transaction
      const getTransaction = sqlite.prepare('SELECT * FROM cash_transactions WHERE id = ?');
      const newTransaction = getTransaction.get(transactionId);

      return {
        ...newTransaction,
        createdAt: new Date(newTransaction.created_at)
      };
    } catch (error) {
      console.error('Error adding cash transaction:', error);
      throw error;
    }
  }
};