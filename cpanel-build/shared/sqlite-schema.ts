// Production SQLite Schema for cPanel deployment
import { sqliteTable, integer, text, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull().unique(),
  price: real('price').notNull(),
  cost: real('cost').notNull(),
  mrp: real('mrp').notNull(),
  weight: real('weight'),
  weightUnit: text('weight_unit'),
  categoryId: integer('category_id'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  alertThreshold: integer('alert_threshold').default(10),
  barcode: text('barcode'),
  hsnCode: text('hsn_code'),
  cgstRate: real('cgst_rate').default(9),
  sgstRate: real('sgst_rate').default(9),
  igstRate: real('igst_rate').default(18),
  cessRate: real('cess_rate').default(0),
  taxCalculationMethod: text('tax_calculation_method').default('exclusive'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('staff'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  creditLimit: real('credit_limit'),
  businessName: text('business_name'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id'),
  userId: integer('user_id').notNull(),
  total: real('total').notNull(),
  tax: real('tax').notNull().default(0),
  discount: real('discount').notNull().default(0),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('completed'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const salesItems = sqliteTable('sales_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull(),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  mrp: real('mrp'),
});

// Export types for compatibility
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof salesItems.$inferSelect;

// Export insert types
export type CategoryInsert = typeof categories.$inferInsert;
export type ProductInsert = typeof products.$inferInsert;
export type UserInsert = typeof users.$inferInsert;
export type CustomerInsert = typeof customers.$inferInsert;
export type SaleInsert = typeof sales.$inferInsert;
export type SaleItemInsert = typeof salesItems.$inferInsert;
