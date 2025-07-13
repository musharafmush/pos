import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Settings table for storing application settings
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Tax Categories table for managing GST rates
export const taxCategories = sqliteTable('tax_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  rate: real('rate').notNull(),
  hsnCodeRange: text('hsn_code_range'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Tax Settings table for global tax configuration
export const taxSettings = sqliteTable('tax_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxCalculationMethod: text('tax_calculation_method').default('afterDiscount'),
  pricesIncludeTax: integer('prices_include_tax', { mode: 'boolean' }).default(false),
  enableMultipleTaxRates: integer('enable_multiple_tax_rates', { mode: 'boolean' }).default(true),
  companyGstin: text('company_gstin'),
  companyState: text('company_state'),
  companyStateCode: text('company_state_code'),
  defaultTaxCategoryId: integer('default_tax_category_id').references(() => taxCategories.id),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// HSN Code Master table for tax rate mapping
export const hsnCodes = sqliteTable('hsn_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hsnCode: text('hsn_code').notNull().unique(),
  description: text('description').notNull(),
  taxCategoryId: integer('tax_category_id').references(() => taxCategories.id).notNull(),
  cgstRate: real('cgst_rate').default(0),
  sgstRate: real('sgst_rate').default(0),
  igstRate: real('igst_rate').default(0),
  cessRate: real('cess_rate').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Categories table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Products table
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull().unique(),
  price: real('price').notNull(),
  mrp: real('mrp').notNull(),
  cost: real('cost').notNull(),
  weight: real('weight'),
  weightUnit: text('weight_unit').default('kg'),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  alertThreshold: integer('alert_threshold').notNull().default(10),
  barcode: text('barcode'),
  image: text('image'),

  // Tax Information - Indian GST Compliance
  hsnCode: text('hsn_code'),
  gstCode: text('gst_code'),
  cgstRate: text('cgst_rate').default('0'),
  sgstRate: text('sgst_rate').default('0'),
  igstRate: text('igst_rate').default('0'),
  cessRate: text('cess_rate').default('0'),
  taxCalculationMethod: text('tax_calculation_method'),

  // Supplier & Manufacturer Information
  manufacturerName: text('manufacturer_name'),
  supplierName: text('supplier_name'),
  manufacturerId: integer('manufacturer_id'),
  supplierId: integer('supplier_id'),

  // Product Classification
  alias: text('alias'),
  itemProductType: text('item_product_type'),
  department: text('department'),
  brand: text('brand'),
  model: text('model'),
  size: text('size'),
  color: text('color'),
  material: text('material'),

  // Additional Product Details
  minOrderQty: integer('min_order_qty').default(1),
  maxOrderQty: integer('max_order_qty'),
  reorderPoint: integer('reorder_point'),
  shelfLife: integer('shelf_life'),
  expiryDate: text('expiry_date'),
  batchNumber: text('batch_number'),
  serialNumber: text('serial_number'),
  warranty: text('warranty'),
  location: text('location'),
  rack: text('rack'),
  bin: text('bin'),

  // Status and Tracking
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Suppliers table
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  gstin: text('gstin'),
  contactPerson: text('contact_person'),
  paymentTerms: text('payment_terms'),
  businessType: text('business_type'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Customers table
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  creditLimit: real('credit_limit').default(0),
  businessName: text('business_name'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('cashier'), // admin, cashier, manager
  image: text('image'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Sales table
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  total: real('total').notNull(),
  tax: real('tax').notNull(),
  discount: real('discount').notNull().default(0),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('completed'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Sale items table
export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  mrp: real('mrp').default(0),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Purchases table
export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  total: real('total').notNull(),
  tax: real('tax').notNull().default(0),
  discount: real('discount').notNull().default(0),
  status: text('status').notNull().default('pending'),
  orderDate: text('order_date').notNull(),
  expectedDate: text('expected_date'),
  receivedDate: text('received_date'),
  notes: text('notes'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Purchase items table
export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').references(() => purchases.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  subtotal: real('subtotal').notNull(),
  receivedQty: integer('received_qty').default(0),
  freeQty: integer('free_qty').default(0),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  purchases: many(purchases)
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems)
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales)
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases)
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id]
  }),
  saleItems: many(saleItems)
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id]
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id]
  })
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id]
  }),
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id]
  }),
  purchaseItems: many(purchaseItems)
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id]
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id]
  })
}));

// Insert and select schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const selectUserSchema = createSelectSchema(users);
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const selectProductSchema = createSelectSchema(products);
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const selectCategorySchema = createSelectSchema(categories);
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const selectCustomerSchema = createSelectSchema(customers);
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const selectSupplierSchema = createSelectSchema(suppliers);
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const selectSaleSchema = createSelectSchema(sales);
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, createdAt: true });
export const selectSaleItemSchema = createSelectSchema(saleItems);
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const selectPurchaseSchema = createSelectSchema(purchases);
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true, createdAt: true });
export const selectPurchaseItemSchema = createSelectSchema(purchaseItems);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;

// Expense Categories table
export const expenseCategories = sqliteTable('expense_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Expenses table
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expenseNumber: text('expense_number').notNull(),
  categoryId: integer('category_id').references(() => expenseCategories.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  userId: integer('user_id').references(() => users.id),
  amount: real('amount').notNull(),
  description: text('description'),
  expenseDate: text('expense_date').notNull(),
  paymentMethod: text('payment_method').default('cash'),
  reference: text('reference'),
  notes: text('notes'),
  attachments: text('attachments'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurringInterval: text('recurring_interval'),
  tags: text('tags'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Expense relations
export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses)
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id]
  }),
  supplier: one(suppliers, {
    fields: [expenses.supplierId],
    references: [suppliers.id]
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id]
  })
}));

// Expense schemas
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true, createdAt: true, updatedAt: true });
export const selectExpenseCategorySchema = createSelectSchema(expenseCategories);
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const selectExpenseSchema = createSelectSchema(expenses);

// Expense types
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type ExpenseCategoryInsert = z.infer<typeof insertExpenseCategorySchema>;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseInsert = z.infer<typeof insertExpenseSchema>;