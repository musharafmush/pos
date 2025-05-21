import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'cashier', 'manager']);

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  alertThreshold: integer('alert_threshold').notNull().default(10),
  barcode: text('barcode'),
  image: text('image'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull().default('cashier'),
  image: text('image'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Sales table
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Sale items table
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Suppliers table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  contactPerson: text('contact_person'),
  taxId: text('tax_id'),
  registrationType: text('registration_type'),
  registrationNumber: text('registration_number'),
  mobileNo: text('mobile_no'),
  extensionNumber: text('extension_number'),
  faxNo: text('fax_no'),
  building: text('building'),
  street: text('street'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  pinCode: text('pin_code'),
  landmark: text('landmark'),
  supplierType: text('supplier_type'),
  creditDays: text('credit_days'),
  discountPercent: text('discount_percent'),
  notes: text('notes'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Purchases table
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  orderDate: timestamp('order_date').defaultNow().notNull(),
  receivedDate: timestamp('received_date'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Purchase items table
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').references(() => purchases.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Define relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems)
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales)
}));

export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  purchases: many(purchases)
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  items: many(saleItems)
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] })
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases)
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  items: many(purchaseItems)
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  product: one(products, { fields: [purchaseItems.productId], references: [products.id] })
}));

// Validation schemas
export const categoryInsertSchema = createInsertSchema(categories, {
  name: (schema) => schema.min(3, "Name must be at least 3 characters"),
  description: (schema) => schema.optional()
});
export type CategoryInsert = z.infer<typeof categoryInsertSchema>;
export const categorySelectSchema = createSelectSchema(categories);
export type Category = z.infer<typeof categorySelectSchema>;

export const productInsertSchema = createInsertSchema(products, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  sku: (schema) => schema.min(2, "SKU must be at least 2 characters"),
  // Use coerce to transform string values to numbers if needed
  price: (schema) => z.coerce.number().min(0, "Price must be at least 0"),
  cost: (schema) => z.coerce.number().min(0, "Cost must be at least 0"),
  stockQuantity: (schema) => schema.min(0, "Stock quantity must be at least 0"),
  alertThreshold: (schema) => schema.min(0, "Alert threshold must be at least 0"),
  barcode: (schema) => schema.optional(),
  image: (schema) => schema.optional(),
  active: (schema) => schema.optional()
});
export type ProductInsert = z.infer<typeof productInsertSchema>;
export const productSelectSchema = createSelectSchema(products);
export type Product = z.infer<typeof productSelectSchema>;

export const customerInsertSchema = createInsertSchema(customers, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email").optional().or(z.literal('')),
  phone: (schema) => schema.optional(),
  address: (schema) => schema.optional()
});
export type CustomerInsert = z.infer<typeof customerInsertSchema>;
export const customerSelectSchema = createSelectSchema(customers);
export type Customer = z.infer<typeof customerSelectSchema>;

export const userInsertSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters").optional(),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  role: (schema) => schema.optional(),
  image: (schema) => schema.optional(),
  active: (schema) => schema.optional()
});
export type UserInsert = z.infer<typeof userInsertSchema>;
export const userSelectSchema = createSelectSchema(users);
export type User = z.infer<typeof userSelectSchema>;

export const saleInsertSchema = createInsertSchema(sales, {
  orderNumber: (schema) => schema.min(3, "Order number must be at least 3 characters"),
  customerId: (schema) => schema.optional(),
  total: (schema) => schema.min(0, "Total must be at least 0"),
  tax: (schema) => schema.min(0, "Tax must be at least 0"),
  discount: (schema) => schema.optional(),
  paymentMethod: (schema) => schema.min(2, "Payment method must be at least 2 characters"),
  status: (schema) => schema.optional()
});
export type SaleInsert = z.infer<typeof saleInsertSchema>;
export const saleSelectSchema = createSelectSchema(sales);
export type Sale = z.infer<typeof saleSelectSchema>;

export const saleItemInsertSchema = createInsertSchema(saleItems, {
  quantity: (schema) => schema.min(1, "Quantity must be at least 1"),
  unitPrice: (schema) => schema.min(0, "Unit price must be at least 0"),
  subtotal: (schema) => schema.min(0, "Subtotal must be at least 0")
});
export type SaleItemInsert = z.infer<typeof saleItemInsertSchema>;
export const saleItemSelectSchema = createSelectSchema(saleItems);
export type SaleItem = z.infer<typeof saleItemSelectSchema>;

export const supplierInsertSchema = createInsertSchema(suppliers, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email").optional().or(z.literal('')),
  phone: (schema) => schema.optional(),
  address: (schema) => schema.optional(),
  contactPerson: (schema) => schema.optional(),
  taxId: (schema) => schema.optional(),
  registrationType: (schema) => schema.optional(),
  registrationNumber: (schema) => schema.optional(),
  mobileNo: (schema) => schema.optional(),
  extensionNumber: (schema) => schema.optional(),
  faxNo: (schema) => schema.optional(),
  building: (schema) => schema.optional(),
  street: (schema) => schema.optional(),
  city: (schema) => schema.optional(),
  state: (schema) => schema.optional(),
  country: (schema) => schema.optional(),
  pinCode: (schema) => schema.optional(),
  landmark: (schema) => schema.optional(),
  supplierType: (schema) => schema.optional(),
  creditDays: (schema) => schema.optional(),
  discountPercent: (schema) => schema.optional(),
  notes: (schema) => schema.optional(),
  status: (schema) => schema.optional()
});
export type SupplierInsert = z.infer<typeof supplierInsertSchema>;
export const supplierSelectSchema = createSelectSchema(suppliers);
export type Supplier = z.infer<typeof supplierSelectSchema>;

export const purchaseInsertSchema = createInsertSchema(purchases, {
  orderNumber: (schema) => schema.min(3, "Order number must be at least 3 characters"),
  total: (schema) => schema.min(0, "Total must be at least 0"),
  status: (schema) => schema.optional(),
  receivedDate: (schema) => schema.optional()
});
export type PurchaseInsert = z.infer<typeof purchaseInsertSchema>;
export const purchaseSelectSchema = createSelectSchema(purchases);
export type Purchase = z.infer<typeof purchaseSelectSchema>;

export const purchaseItemInsertSchema = createInsertSchema(purchaseItems, {
  quantity: (schema) => schema.min(1, "Quantity must be at least 1"),
  unitCost: (schema) => schema.min(0, "Unit cost must be at least 0"),
  subtotal: (schema) => schema.min(0, "Subtotal must be at least 0")
});
export type PurchaseItemInsert = z.infer<typeof purchaseItemInsertSchema>;
export const purchaseItemSelectSchema = createSelectSchema(purchaseItems);
export type PurchaseItem = z.infer<typeof purchaseItemSelectSchema>;
