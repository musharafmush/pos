
import { pgTable, text, integer, timestamp, boolean, decimal, serial, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("cashier"),
  active: boolean("active").notNull().default(true),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  weightUnit: text("weight_unit").default("kg"),
  categoryId: integer("category_id").references(() => categories.id),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  alertThreshold: integer("alert_threshold").notNull().default(5),
  barcode: text("barcode"),
  image: text("image"),
  hsnCode: text("hsn_code"),
  gstCode: text("gst_code"),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }),
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }),
  cessRate: decimal("cess_rate", { precision: 5, scale: 2 }),
  taxCalculationMethod: text("tax_calculation_method"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  gstin: text("gstin"),
  contactPerson: text("contact_person"),
  supplierType: text("supplier_type").default("regular"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  gstin: text("gstin"),
  loyaltyPoints: integer("loyalty_points").default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Register Sessions table - NEW
export const registerSessions = pgTable("register_sessions", {
  id: serial("id").primaryKey(),
  openedBy: integer("opened_by").references(() => users.id).notNull(),
  openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).notNull().default("0"),
  currentCash: decimal("current_cash", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCashSales: decimal("total_cash_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalUpiSales: decimal("total_upi_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalOtherSales: decimal("total_other_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRefunds: decimal("total_refunds", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWithdrawals: decimal("total_withdrawals", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"), // open, closed
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by").references(() => users.id),
  notes: text("notes"),
});

// Cash Transactions table - NEW
export const cashTransactions = pgTable("cash_transactions", {
  id: serial("id").primaryKey(),
  registerSessionId: integer("register_session_id").references(() => registerSessions.id).notNull(),
  type: text("type").notNull(), // deposit, withdrawal, sale_cash, refund
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales table
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  registerSessionId: integer("register_session_id").references(() => registerSessions.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sale Items table
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

// Purchases table
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number"),
  userId: integer("user_id").references(() => users.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  orderDate: timestamp("order_date"),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  freight: decimal("freight", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  draft: boolean("draft").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Items table
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  receivedQuantity: integer("received_quantity").default(0),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  purchases: many(purchases),
  registerSessions: many(registerSessions),
  cashTransactions: many(cashTransactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const registerSessionsRelations = relations(registerSessions, ({ one, many }) => ({
  openedByUser: one(users, {
    fields: [registerSessions.openedBy],
    references: [users.id],
  }),
  closedByUser: one(users, {
    fields: [registerSessions.closedBy],
    references: [users.id],
  }),
  sales: many(sales),
  cashTransactions: many(cashTransactions),
}));

export const cashTransactionsRelations = relations(cashTransactions, ({ one }) => ({
  registerSession: one(registerSessions, {
    fields: [cashTransactions.registerSessionId],
    references: [registerSessions.id],
  }),
  performedByUser: one(users, {
    fields: [cashTransactions.performedBy],
    references: [users.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  registerSession: one(registerSessions, {
    fields: [sales.registerSessionId],
    references: [registerSessions.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));

// Schema exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type RegisterSession = typeof registerSessions.$inferSelect;
export type NewRegisterSession = typeof registerSessions.$inferInsert;
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;

// Validation schemas
import { z } from "zod";

export const userInsertSchema = z.object({
  username: z.string().optional(),
  password: z.string().min(6),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "cashier"]).default("cashier"),
  active: z.boolean().default(true),
  image: z.string().optional(),
});

export const categoryInsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const productInsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().min(0),
  mrp: z.number().min(0).optional(),
  cost: z.number().min(0).default(0),
  weight: z.number().min(0).optional(),
  weightUnit: z.string().default("kg"),
  categoryId: z.number().int().positive(),
  stockQuantity: z.number().int().min(0).default(0),
  alertThreshold: z.number().int().min(0).default(5),
  barcode: z.string().optional(),
  image: z.string().optional(),
  hsnCode: z.string().optional(),
  gstCode: z.string().optional(),
  cgstRate: z.number().min(0).max(100).optional(),
  sgstRate: z.number().min(0).max(100).optional(),
  igstRate: z.number().min(0).max(100).optional(),
  cessRate: z.number().min(0).max(100).optional(),
  taxCalculationMethod: z.string().optional(),
  active: z.boolean().default(true),
});

export const supplierInsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  contactPerson: z.string().optional(),
  supplierType: z.string().default("regular"),
  active: z.boolean().default(true),
});

export const customerInsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  loyaltyPoints: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const registerSessionInsertSchema = z.object({
  openingCash: z.number().min(0),
  notes: z.string().optional(),
});

export const cashTransactionInsertSchema = z.object({
  type: z.enum(["deposit", "withdrawal", "sale_cash", "refund"]),
  amount: z.number().min(0),
  reason: z.string().optional(),
});
