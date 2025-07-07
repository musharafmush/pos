import { db } from "./db";
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
  returns,
  returnItems,
  type User,
  type Product,
  type Category,
  type Customer,
  type Supplier,
  type Sale,
  type SaleItem,
  type Purchase,
  type PurchaseItem,
  type Return,
  type ReturnItem,
  type UserInsert,
  type ProductInsert,
  type CategoryInsert,
  type CustomerInsert,
  type SupplierInsert,
  type SaleInsert,
  type SaleItemInsert,
  type PurchaseInsert,
  type PurchaseItemInsert,
  type ReturnInsert,
  type ReturnItemInsert
} from "@shared/schema";
import { eq, and, desc, sql, gt, lt, lte, gte, or, like } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  createUser(user: UserInsert): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | null>;
  listUsers(): Promise<User[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | null>;
  createCategory(category: CategoryInsert): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | null>;
  deleteCategory(id: number): Promise<boolean>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | null>;
  getProductByBarcode(barcode: string): Promise<Product | null>;
  getProductsByCategoryId(categoryId: number): Promise<Product[]>;
  createProduct(product: ProductInsert): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | null>;
  deleteProduct(id: number): Promise<boolean>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | null>;
  createCustomer(customer: CustomerInsert): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null>;
  deleteCustomer(id: number): Promise<boolean>;
  searchCustomers(query: string): Promise<Customer[]>;

  // Supplier operations
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: number): Promise<Supplier | null>;
  createSupplier(supplier: SupplierInsert): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | null>;
  deleteSupplier(id: number): Promise<boolean>;

  // Sales operations
  getSales(): Promise<Sale[]>;
  getSaleById(id: number): Promise<Sale | null>;
  createSale(sale: SaleInsert, items: SaleItemInsert[]): Promise<Sale>;
  updateSale(id: number, sale: Partial<Sale>): Promise<Sale | null>;
  deleteSale(id: number): Promise<boolean>;
  getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
  getSalesByCustomerId(customerId: number): Promise<Sale[]>;

  // Purchase operations
  getPurchases(): Promise<Purchase[]>;
  getPurchaseById(id: number): Promise<Purchase | null>;
  createPurchase(purchase: PurchaseInsert, items: PurchaseItemInsert[]): Promise<Purchase>;
  updatePurchase(id: number, purchase: Partial<Purchase>): Promise<Purchase | null>;
  deletePurchase(id: number): Promise<boolean>;
  getPurchasesByDateRange(startDate: Date, endDate: Date): Promise<Purchase[]>;
  getPurchasesBySupplierId(supplierId: number): Promise<Purchase[]>;

  // Return operations
  getReturns(): Promise<Return[]>;
  getReturnById(id: number): Promise<Return | null>;
  createReturn(returnData: ReturnInsert, items: ReturnItemInsert[]): Promise<Return>;
  updateReturn(id: number, returnData: Partial<Return>): Promise<Return | null>;
  deleteReturn(id: number): Promise<boolean>;

  // Dashboard operations
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail))
    );
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async createUser(user: UserInsert): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const [newUser] = await db.insert(users).values({
      ...user,
      password: hashedPassword,
      username: user.username || user.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
      role: user.role || 'cashier',
      active: user.active !== undefined ? user.active : true
    }).returning();
    
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | null> {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    
    const [updatedUser] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || null;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategoryById(id: number): Promise<Category | null> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || null;
  }

  async createCategory(category: CategoryInsert): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category | null> {
    const [updatedCategory] = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory || null;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProductById(id: number): Promise<Product | null> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || null;
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product || null;
  }

  async getProductsByCategoryId(categoryId: number): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.categoryId, categoryId))
      .orderBy(products.name);
  }

  async createProduct(product: ProductInsert): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | null> {
    const [updatedProduct] = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    
    return updatedProduct || null;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(
        or(
          like(products.name, `%${query}%`),
          like(products.sku, `%${query}%`),
          like(products.barcode, `%${query}%`)
        )
      )
      .orderBy(products.name);
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    return await db.select().from(products)
      .where(lte(products.stockQuantity, threshold))
      .orderBy(products.stockQuantity);
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || null;
  }

  async createCustomer(customer: CustomerInsert): Promise<Customer> {
    const customerData = {
      ...customer,
      creditLimit: customer.creditLimit?.toString() || '0'
    };
    const [newCustomer] = await db.insert(customers).values(customerData).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null> {
    const [updatedCustomer] = await db.update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    
    return updatedCustomer || null;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(
        or(
          like(customers.name, `%${query}%`),
          like(customers.email, `%${query}%`),
          like(customers.phone, `%${query}%`)
        )
      )
      .orderBy(customers.name);
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || null;
  }

  async createSupplier(supplier: SupplierInsert): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | null> {
    const [updatedSupplier] = await db.update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    
    return updatedSupplier || null;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Sales operations
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSaleById(id: number): Promise<Sale | null> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || null;
  }

  async createSale(sale: SaleInsert, items: SaleItemInsert[]): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    
    // Insert sale items
    if (items.length > 0) {
      const saleItemsWithSaleId = items.map(item => ({
        ...item,
        saleId: newSale.id
      }));
      await db.insert(saleItems).values(saleItemsWithSaleId);
    }
    
    // Update stock quantities
    for (const item of items) {
      await db.update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`
        })
        .where(eq(products.id, item.productId));
    }
    
    return newSale;
  }

  async updateSale(id: number, sale: Partial<Sale>): Promise<Sale | null> {
    const [updatedSale] = await db.update(sales)
      .set(sale)
      .where(eq(sales.id, id))
      .returning();
    
    return updatedSale || null;
  }

  async deleteSale(id: number): Promise<boolean> {
    // First delete sale items
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    
    // Then delete sale
    const result = await db.delete(sales).where(eq(sales.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return await db.select().from(sales)
      .where(and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      ))
      .orderBy(desc(sales.createdAt));
  }

  async getSalesByCustomerId(customerId: number): Promise<Sale[]> {
    return await db.select().from(sales)
      .where(eq(sales.customerId, customerId))
      .orderBy(desc(sales.createdAt));
  }

  // Purchase operations
  async getPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async getPurchaseById(id: number): Promise<Purchase | null> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase || null;
  }

  async createPurchase(purchase: PurchaseInsert, items: PurchaseItemInsert[]): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    
    // Insert purchase items
    if (items.length > 0) {
      const purchaseItemsWithPurchaseId = items.map(item => ({
        ...item,
        purchaseId: newPurchase.id
      }));
      await db.insert(purchaseItems).values(purchaseItemsWithPurchaseId);
    }
    
    // Update stock quantities
    for (const item of items) {
      await db.update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`
        })
        .where(eq(products.id, item.productId));
    }
    
    return newPurchase;
  }

  async updatePurchase(id: number, purchase: Partial<Purchase>): Promise<Purchase | null> {
    const [updatedPurchase] = await db.update(purchases)
      .set(purchase)
      .where(eq(purchases.id, id))
      .returning();
    
    return updatedPurchase || null;
  }

  async deletePurchase(id: number): Promise<boolean> {
    // First delete purchase items
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
    
    // Then delete purchase
    const result = await db.delete(purchases).where(eq(purchases.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPurchasesByDateRange(startDate: Date, endDate: Date): Promise<Purchase[]> {
    return await db.select().from(purchases)
      .where(and(
        gte(purchases.createdAt, startDate),
        lte(purchases.createdAt, endDate)
      ))
      .orderBy(desc(purchases.createdAt));
  }

  async getPurchasesBySupplierId(supplierId: number): Promise<Purchase[]> {
    return await db.select().from(purchases)
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(desc(purchases.createdAt));
  }

  // Return operations
  async getReturns(): Promise<Return[]> {
    return await db.select().from(returns).orderBy(desc(returns.createdAt));
  }

  async getReturnById(id: number): Promise<Return | null> {
    const [returnRecord] = await db.select().from(returns).where(eq(returns.id, id));
    return returnRecord || null;
  }

  async createReturn(returnData: ReturnInsert, items: ReturnItemInsert[]): Promise<Return> {
    const [newReturn] = await db.insert(returns).values(returnData).returning();
    
    // Insert return items
    if (items.length > 0) {
      const returnItemsWithReturnId = items.map(item => ({
        ...item,
        returnId: newReturn.id
      }));
      await db.insert(returnItems).values(returnItemsWithReturnId);
    }
    
    // Update stock quantities (add back to stock)
    for (const item of items) {
      await db.update(products)
        .set({
          stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`
        })
        .where(eq(products.id, item.productId));
    }
    
    return newReturn;
  }

  async updateReturn(id: number, returnData: Partial<Return>): Promise<Return | null> {
    const [updatedReturn] = await db.update(returns)
      .set(returnData)
      .where(eq(returns.id, id))
      .returning();
    
    return updatedReturn || null;
  }

  async deleteReturn(id: number): Promise<boolean> {
    // First delete return items
    await db.delete(returnItems).where(eq(returnItems.returnId, id));
    
    // Then delete return
    const result = await db.delete(returns).where(eq(returns.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Dashboard operations
  async getDashboardStats(): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get today's sales
    const [todaySales] = await db.select({
      revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`,
      count: sql<number>`COUNT(*)`
    }).from(sales).where(
      and(
        gte(sales.createdAt, startOfDay),
        lt(sales.createdAt, endOfDay)
      )
    );

    // Get today's purchases
    const [todayPurchases] = await db.select({
      amount: sql<number>`COALESCE(SUM(${purchases.total}), 0)`,
      count: sql<number>`COUNT(*)`
    }).from(purchases).where(
      and(
        gte(purchases.createdAt, startOfDay),
        lt(purchases.createdAt, endOfDay)
      )
    );

    // Get total products
    const [productCount] = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(products);

    // Get low stock products
    const [lowStockCount] = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(products).where(lte(products.stockQuantity, 10));

    return {
      todaySales: {
        revenue: Number(todaySales.revenue) || 0,
        count: Number(todaySales.count) || 0
      },
      todayPurchases: {
        amount: Number(todayPurchases.amount) || 0,
        count: Number(todayPurchases.count) || 0
      },
      totalProducts: Number(productCount.count) || 0,
      lowStockProducts: Number(lowStockCount.count) || 0
    };
  }
}

export const storage = new DatabaseStorage();