import { db } from "../db/index.js";
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
} from "../shared/schema.js";
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
      // Try ORM method first
      try {
        const product = await db.query.products.findFirst({
          where: eq(products.sku, sku),
          with: {
            category: true
          }
        });
        return product || null;
      } catch (ormError) {
        console.log('ORM method failed, trying direct SQLite query:', ormError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('../db/index.js');
      const product = sqlite.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
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
      const { sqlite } = await import('../db/index.js');

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

  async updateProduct(id: number, productData: any): Promise<Product | null> {
    try {
      console.log('Updating product with ID:', id, 'Data:', productData);

      // First check if product exists
      const existingProduct = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existingProduct) {
        console.log('Product not found with ID:', id);
        return null;
      }

      // Prepare update data with proper type conversion and validation
      const updateData = {
        name: productData.name?.toString().trim() || existingProduct.name,
        description: productData.description?.toString().trim() || existingProduct.description || '',
        sku: productData.sku?.toString().trim() || existingProduct.sku,
        price: productData.price ? parseFloat(productData.price.toString()) : parseFloat(existingProduct.price || 0),
        cost: productData.cost ? parseFloat(productData.cost.toString()) : parseFloat(existingProduct.cost || 0),
        mrp: productData.mrp ? parseFloat(productData.mrp.toString()) : existingProduct.mrp,
        weight: productData.weight ? parseFloat(productData.weight.toString()) : existingProduct.weight,
        weightUnit: productData.weightUnit?.toString() || existingProduct.weightUnit || 'kg',
        categoryId: productData.categoryId ? parseInt(productData.categoryId.toString()) : existingProduct.categoryId,
        stockQuantity: productData.stockQuantity !== undefined ? parseInt(productData.stockQuantity.toString()) : existingProduct.stockQuantity,
        alertThreshold: productData.alertThreshold !== undefined ? parseInt(productData.alertThreshold.toString()) : existingProduct.alertThreshold || 5,
        barcode: productData.barcode?.toString().trim() || existingProduct.barcode || '',
        hsnCode: productData.hsnCode?.toString().trim() || existingProduct.hsnCode || '',
        cgstRate: productData.cgstRate !== undefined ? productData.cgstRate?.toString() : existingProduct.cgstRate || '0',
        sgstRate: productData.sgstRate !== undefined ? productData.sgstRate?.toString() : existingProduct.sgstRate || '0',
        igstRate: productData.igstRate !== undefined ? productData.igstRate?.toString() : existingProduct.igstRate || '0',
        cessRate: productData.cessRate !== undefined ? productData.cessRate?.toString() : existingProduct.cessRate || '0',
        taxCalculationMethod: productData.taxCalculationMethod?.toString() || existingProduct.taxCalculationMethod || 'exclusive',
        active: productData.active !== undefined ? (productData.active ? 1 : 0) : existingProduct.active,
        updatedAt: new Date().toISOString()
      };

      // Validate required fields
      if (!updateData.name || !updateData.sku) {
        throw new Error('Invalid product data: name and sku are required');
      }

      if (isNaN(updateData.price) || updateData.price < 0) {
        throw new Error('Invalid price: must be a valid positive number');
      }

      // Check for duplicate SKU (excluding current product)
      const duplicateSku = this.db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?').get(updateData.sku, id);
      if (duplicateSku) {
        throw new Error('Product with this SKU already exists');
      }

      console.log('Formatted update data:', updateData);

      // Perform the update
      const updateStmt = this.db.prepare(`
        UPDATE products SET 
          name = ?,
          description = ?,
          sku = ?,
          price = ?,
          cost = ?,
          mrp = ?,
          weight = ?,
          weightUnit = ?,
          categoryId = ?,
          stockQuantity = ?,
          alertThreshold = ?,
          barcode = ?,
          hsnCode = ?,
          cgstRate = ?,
          sgstRate = ?,
          igstRate = ?,
          cessRate = ?,
          taxCalculationMethod = ?,
          active = ?,
          updatedAt = ?
        WHERE id = ?
      `);

      const result = updateStmt.run(
        updateData.name,
        updateData.description,
        updateData.sku,
        updateData.price,
        updateData.cost,
        updateData.mrp,
        updateData.weight,
        updateData.weightUnit,
        updateData.categoryId,
        updateData.stockQuantity,
        updateData.alertThreshold,
        updateData.barcode,
        updateData.hsnCode,
        updateData.cgstRate,
        updateData.sgstRate,
        updateData.igstRate,
        updateData.cessRate,
        updateData.taxCalculationMethod,
        updateData.active,
        updateData.updatedAt,
        id
      );

      if (result.changes === 0) {
        console.log('No changes made to product:', id);
        // Still return the existing product instead of null
      }

      console.log('Product updated successfully:', result);

      // Fetch and return the updated product with category
      const updatedProduct = this.db.prepare(`
        SELECT p.*, c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON p.categoryId = c.id 
        WHERE p.id = ?
      `).get(id);

      return this.formatProduct(updatedProduct);
    } catch (error) {
      console.error('Error in updateProduct:', error);
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
    email?: string;
    phone?: string;
    mobileNo?: string;
    extensionNumber?: string;
    faxNo?: string;
    contactPerson?: string;
    address?: string;
    building?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    landmark?: string;
    taxId?: string;
    registrationType?: string;
    registrationNumber?: string;
    supplierType?: string;
    creditDays?: string;
    discountPercent?: string;
    notes?: string;
    status?: string;
  }): Promise<Supplier> {
    try {
      console.log('Storage: Creating supplier with data:', supplier);

      // Import SQLite database directly for reliable creation
      const { sqlite } = await import('../db/index.js');

      // Insert supplier using raw SQL
      const insertSupplier = sqlite.prepare(`
        INSERT INTO suppliers (
          name, email, phone, mobile_no, extension_number, fax_no, contact_person,
          address, building, street, city, state, country, pin_code, landmark,
          tax_id, registration_type, registration_number, supplier_type,
          credit_days, discount_percent, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = insertSupplier.run(
        supplier.name,
        supplier.email || null,
        supplier.phone || null,
        supplier.mobileNo || null,
        supplier.extensionNumber || null,
        supplier.faxNo || null,
        supplier.contactPerson || null,
        supplier.address || null,
        supplier.building || null,
        supplier.street || null,
        supplier.city || null,
        supplier.state || null,
        supplier.country || null,
        supplier.pinCode || null,
        supplier.landmark || null,
        supplier.taxId || null,
        supplier.registrationType || null,
        supplier.registrationNumber || null,
        supplier.supplierType || null,
        supplier.creditDays || null,
        supplier.discountPercent || null,
        supplier.notes || null,
        supplier.status || 'active'
      );

      // Get the created supplier
      const getSupplier = sqlite.prepare('SELECT * FROM suppliers WHERE id = ?');
      const newSupplier = getSupplier.get(result.lastInsertRowid);

      console.log('Storage: Supplier created successfully:', newSupplier);
      return {
        ...newSupplier,
        createdAt: new Date(newSupplier.created_at)
      };
    } catch (error) {
      console.error('Storage: Error creating supplier:', error);
      throw new Error(`Failed to create supplier: ${error.message}`);
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
      console.log('Storage: Attempting to delete supplier with ID:', id);

      // Check if supplier exists first
      const existingSupplier = await this.getSupplierById(id);
      if (!existingSupplier) {
        console.log('Storage: Supplier not found with ID:', id);
        return false;
      }

      // Use direct SQLite for reliable deletion
      const { sqlite } = await import('../db/index.js');

      // Check for references (purchases) before deletion
      const purchaseCheck = sqlite.prepare(`
        SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?
      `).get(id);

      if (purchaseCheck.count > 0) {
        throw new Error(`Cannot delete supplier. This supplier has ${purchaseCheck.count} associated purchase records. Please remove or reassign these purchases first.`);
      }

      // Delete the supplier
      const deleteSupplier = sqlite.prepare('DELETE FROM suppliers WHERE id = ?');
      const result = deleteSupplier.run(id);

      console.log('Storage: Supplier deletion result:', result);
      return result.changes > 0;
    } catch (error) {
      console.error('Storage: Error deleting supplier:', error);
      throw new Error(`Failed to delete supplier: ${error.message}`);
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
    taxId?: string;
    creditLimit?: number;
    businessName?: string;
  }): Promise<Customer> {
    try {
      console.log('Storage: Creating customer with data:', customer);

      // Import SQLite database directly for reliable creation
      const { sqlite } = await import('../db/index.js');

      // Insert customer using raw SQL
      const insertCustomer = sqlite.prepare(`
        INSERT INTO customers (
          name, email, phone, address, tax_id, credit_limit, business_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = insertCustomer.run(
        customer.name,
        customer.email || null,
        customer.phone || null,
        customer.address || null,
        customer.taxId || null,
        customer.creditLimit || 0,
        customer.businessName || null
      );

      // Get the created customer
      const getCustomer = sqlite.prepare('SELECT * FROM customers WHERE id = ?');
      const newCustomer = getCustomer.get(result.lastInsertRowid);

      console.log('Storage: Customer created successfully:', newCustomer);
      return {
        ...newCustomer,
        createdAt: new Date(newCustomer.created_at)
      };
    } catch (error) {
      console.error('Storage: Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
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
      const { sqlite } = await import('../db/index.js');

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

  async listSales(limit?: number, offset?: number, startDate?: Date, endDate?: Date, userId?: number, customerId?: number): Promise<Sale[]> {
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
      const { sqlite } = await import('../db/index.js');

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
      const { sqlite } = await import('../db/index.js');
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
    const { sqlite } = await import('../db/index.js');
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
      const { sqlite } = await import('../db/index.js');

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
      const { sqlite } = await import('../db/index.js');
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
      const { sqlite } = await import('../db/index.js');

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
      const { sqlite } = await import('../db/index.js');

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
      const { sqlite } = await import('../db/index.js');

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

  // Return management operations
  async createReturn(returnData: any, items: any[]): Promise<any> {
    try {
      const { sqlite } = await import('../db/index.js');

      // Ensure returns table exists with return_number column
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS returns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_number TEXT NOT NULL UNIQUE,
          sale_id INTEGER NOT NULL,
          user_id INTEGER DEFAULT 1,
          refund_method TEXT NOT NULL DEFAULT 'cash',
          total_refund TEXT NOT NULL,
          reason TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'completed',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales (id)
        )
      `);

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS return_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          return_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price TEXT NOT NULL,
          subtotal TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (return_id) REFERENCES returns (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Start transaction
      const result = sqlite.transaction(() => {
        // Generate return number
        const returnNumber = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Insert the return record
        const insertReturn = sqlite.prepare(`
          INSERT INTO returns (
            return_number, sale_id, user_id, refund_method, total_refund, reason, notes, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const returnResult = insertReturn.run(
          returnNumber,
          returnData.saleId,
          returnData.userId,
          returnData.refundMethod || 'cash',
          returnData.totalRefund ? returnData.totalRefund.toString() : '0',
          returnData.reason || '',
          returnData.notes || '',
          returnData.status || 'completed'
        );

        const returnId = returnResult.lastInsertRowid;

        // Insert return items and restore stock
        const insertReturnItem = sqlite.prepare(`
          INSERT INTO return_items (
            return_id, product_id, quantity, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `);

        const updateStock = sqlite.prepare(`
          UPDATE products 
          SET stock_quantity = COALESCE(stock_quantity, 0) + ?
          WHERE id = ?
        `);

        for (const item of items) {
          // Insert return item
          insertReturnItem.run(
            returnId,
            item.productId,
            item.quantity,
            (item.unitPrice || 0).toString(),
            (item.subtotal || 0).toString()
          );

          // Restore stock
          updateStock.run(item.quantity, item.productId);
          console.log(`📦 Restored stock for return - Product ${item.productId}: +${item.quantity}`);
        }

        // Get the created return
        const getReturn = sqlite.prepare('SELECT * FROM returns WHERE id = ?');
        const newReturn = getReturn.get(returnId);

        return {
          ...newReturn,
          return_number: returnNumber,
          createdAt: new Date(newReturn.created_at)
        };
      })();

      return result;
    } catch (error) {
      console.error('Error creating return:', error);
      throw error;
    }
  },

  async getReturnById(id: number): Promise<any> {
    try {
      const { sqlite } = await import('../db/index.js');

      const getReturn = sqlite.prepare(`
        SELECT r.*, s.order_number as sale_order_number
        FROM returns r
        LEFT JOIN sales s ON r.sale_id = s.id
        WHERE r.id = ?
      `);

      const returnRecord = getReturn.get(id);

      if (!returnRecord) {
        return null;
      }

      // Get return items
      const getReturnItems = sqlite.prepare(`
        SELECT ri.*, p.name as product_name, p.sku as product_sku
        FROM return_items ri
        LEFT JOIN products p ON ri.product_id = p.id
        WHERE ri.return_id = ?
      `);

      const items = getReturnItems.all(id);

      return {
        ...returnRecord,
        items,
        createdAt: new Date(returnRecord.created_at)
      };
    } catch (error) {
      console.error('Error fetching return by ID:', error);
      throw error;
    }
  },

  async listReturns(limit: number = 50, offset: number = 0, filters?: { search?: string, days?: number, status?: string }): Promise<any[]> {
    try {
      console.log('📦 Storage: Listing returns with limit', limit, 'offset', offset, 'filters', filters);

      const { sqlite } = await import('../db/index.js');

      let query = `
        SELECT 
          r.*,
          s.order_number,
          c.name as customer_name,
          u.name as user_name
        FROM returns r
        LEFT JOIN sales s ON r.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON r.user_id = u.id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      // Add search filter
      if (filters?.search) {
        conditions.push(`(
          LOWER(r.return_number) LIKE LOWER(?) OR
          LOWER(s.order_number) LIKE LOWER(?) OR
          LOWER(c.name) LIKE LOWER(?) OR
          CAST(r.id AS TEXT) LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Add date filter
      if (filters?.days && filters.days > 0) {
        conditions.push(`r.created_at >= datetime('now', '-${filters.days} days')`);
      }

      // Add status filter
      if (filters?.status && filters.status !== 'all') {
        conditions.push(`r.status = ?`);
        params.push(filters.status);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const returns = sqlite.prepare(query).all(...params);

      // Get return items for each return
      const returnsWithItems = returns.map(returnRecord => {
        const itemsQuery = `
          SELECT 
            ri.*,
            p.name as product_name
          FROM return_items ri
          LEFT JOIN products p ON ri.product_id = p.id
          WHERE ri.return_id = ?
        `;

        const items = sqlite.prepare(itemsQuery).all(returnRecord.id);

        return {
          id: returnRecord.id,
          returnNumber: returnRecord.return_number,
          saleId: returnRecord.sale_id,
          orderNumber: returnRecord.order_number || `ORDER-${returnRecord.sale_id}`,
          customerId: returnRecord.customer_id,
          customerName: returnRecord.customer_name,
          userId: returnRecord.user_id,
          userName: returnRecord.user_name || 'System User',
          refundMethod: returnRecord.refund_method,
          totalRefund: returnRecord.total_refund,
          reason: returnRecord.reason,
          notes: returnRecord.notes,
          status: returnRecord.status,
          createdAt: returnRecord.created_at,
          items: items.map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name || `Product #${item.product_id}`,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price || '0'),
            subtotal: parseFloat(item.subtotal || '0')
          }))
        };
      });

      console.log(`📦 Storage: Found ${returnsWithItems.length} returns`);
      return returnsWithItems;

    } catch (error) {
      console.error('❌ Storage: Error listing returns:', error);
      throw error;
    }
  },

  async getCustomerBillingData(startDate: Date): Promise<any[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const query = sqlite.prepare(`
        SELECT
          c.id as customer_id,
          c.name as customer_name,
          c.phone as phone,
          c.email as email,
          c.address as address,
          COALESCE(SUM(CAST(s.total AS REAL)), 0) as total_billed,
          COUNT(s.id) as order_count,
          COALESCE(AVG(CAST(s.total AS REAL)), 0) as average_order_value,
          MAX(s.created_at) as last_purchase_date,
          MIN(s.created_at) as first_purchase_date,
          COUNT(DISTINCT DATE(s.created_at)) as active_days,
          MAX(CAST(s.total AS REAL)) as highest_order,
          MIN(CAST(s.total AS REAL)) as lowest_order
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE s.created_at >= ? OR s.created_at IS NULL
        GROUP BY c.id, c.name, c.phone, c.email, c.address
        ORDER BY total_billed DESC
      `);

      const results = query.all(startDate.toISOString());

      return results.map((row: any) => ({
        customerId: row.customer_id,
        customerName: row.customer_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        totalBilled: row.total_billed.toString(),
        orderCount: row.order_count,
        averageOrderValue: row.average_order_value.toString(),
        lastPurchaseDate: row.last_purchase_date ? new Date(row.last_purchase_date) : null,
        firstPurchaseDate: row.first_purchase_date ? new Date(row.first_purchase_date) : null,
        activeDays: row.active_days,
        highestOrder: row.highest_order?.toString() || '0',
        lowestOrder: row.lowest_order?.toString() || '0'
      }));
    } catch (error) {
      console.error('Error in getCustomerBillingData:', error);
      return [];
    }
  },

  async getCustomerTransactionHistory(startDate: Date): Promise<any[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const query = sqlite.prepare(`
        SELECT
          s.id as sale_id,
          s.order_number,
          s.created_at,
          s.total,
          s.payment_method,
          s.status,
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          COUNT(si.id) as item_count,
          GROUP_CONCAT(p.name) as product_names
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.created_at >= ?
        GROUP BY s.id, s.order_number, s.created_at, s.total, s.payment_method, s.status, c.id, c.name, c.phone
        ORDER BY s.created_at DESC
      `);

      const results = query.all(startDate.toISOString());

      return results.map((row: any) => ({
        saleId: row.sale_id,
        orderNumber: row.order_number,
        createdAt: new Date(row.created_at),
        total: row.total.toString(),
        paymentMethod: row.payment_method,
        status: row.status,
        customerId: row.customer_id,
        customerName: row.customer_name || 'Walk-in Customer',
        customerPhone: row.customer_phone,
        itemCount: row.item_count,
        productNames: row.product_names ? row.product_names.split(',') : []
      }));
    } catch (error) {
      console.error('Error in getCustomerTransactionHistory:', error);
      return [];
    }
  },

  async getCustomerDemographics(startDate: Date): Promise<any[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const query = sqlite.prepare(`
        SELECT
          CASE 
            WHEN SUM(CAST(s.total AS REAL)) > 5000 THEN 'VIP'
            WHEN COUNT(s.id) > 5 THEN 'Frequent'
            WHEN COUNT(s.id) > 1 THEN 'Regular'
            ELSE 'New'
          END as customer_segment,
          COUNT(DISTINCT c.id) as customer_count,
          SUM(CAST(s.total AS REAL)) as total_revenue,
          AVG(CAST(s.total AS REAL)) as avg_order_value,
          COUNT(s.id) as total_orders
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE s.created_at >= ? OR s.created_at IS NULL
        GROUP BY c.id
        ORDER BY total_revenue DESC
      `);

      const customerSegments = sqlite.prepare(`
        SELECT
          customer_segment,
          COUNT(*) as count,
          SUM(total_revenue) as revenue,
          AVG(avg_order_value) as avg_order,
          SUM(total_orders) as orders
        FROM (
          SELECT
            CASE 
              WHEN SUM(CAST(s.total AS REAL)) > 5000 THEN 'VIP'
              WHEN COUNT(s.id) > 5 THEN 'Frequent'
              WHEN COUNT(s.id) > 1 THEN 'Regular'
              ELSE 'New'
            END as customer_segment,
            SUM(CAST(s.total AS REAL)) as total_revenue,
            AVG(CAST(s.total AS REAL)) as avg_order_value,
            COUNT(s.id) as total_orders
          FROM customers c
          LEFT JOIN sales s ON c.id = s.customer_id
          WHERE s.created_at >= ? OR s.created_at IS NULL
          GROUP BY c.id
        ) 
        GROUP BY customer_segment
        ORDER BY revenue DESC
      `);

      const results = customerSegments.all(startDate.toISOString());

      return results.map((row: any) => ({
        segment: row.customer_segment,
        customerCount: row.count,
        totalRevenue: row.revenue?.toString() || '0',
        averageOrderValue: row.avg_order?.toString() || '0',
        totalOrders: row.orders || 0
      }));
    } catch (error) {
      console.error('Error in getCustomerDemographics:', error);
      return [];
    }
  },

  async getPaymentAnalytics(startDate: Date): Promise<any[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const query = sqlite.prepare(`
        SELECT
          payment_method,
          SUM(CAST(total AS REAL)) as amount,
          COUNT(id) as transaction_count
        FROM sales
        WHERE created_at >= ?
        GROUP BY payment_method
        ORDER BY amount DESC
      `);

      const results = query.all(startDate.toISOString());

      return results.map((row: any) => ({
        paymentMethod: row.payment_method,
        amount: row.amount.toString(),
        transactionCount: row.transaction_count
      }));
    } catch (error) {
      console.error('Error in getPaymentAnalytics:', error);
      return [];
    }
  }
};