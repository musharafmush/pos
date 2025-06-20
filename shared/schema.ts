import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'cashier', 'manager']);

// Settings table for storing application settings
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

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
  mrp: decimal('mrp', { precision: 10, scale: 2 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  weightUnit: text('weight_unit').default('kg'),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  alertThreshold: integer('alert_threshold').notNull().default(10),
  barcode: text('barcode'),
  image: text('image'),

  // Tax Information - Indian GST Compliance
  hsnCode: text('hsn_code'),
  gstCode: text('gst_code'),
  cgstRate: decimal('cgst_rate', { precision: 5, scale: 2 }),
  sgstRate: decimal('sgst_rate', { precision: 5, scale: 2 }),
  igstRate: decimal('igst_rate', { precision: 5, scale: 2 }),
  cessRate: decimal('cess_rate', { precision: 5, scale: 2 }),
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
  buyer: text('buyer'),
  purchaseGstCalculatedOn: text('purchase_gst_calculated_on'),
  gstUom: text('gst_uom'),
  purchaseAbatement: text('purchase_abatement'),

  // Configuration Options
  configItemWithCommodity: boolean('config_item_with_commodity').default(false),
  seniorExemptApplicable: boolean('senior_exempt_applicable').default(false),
  eanCodeRequired: boolean('ean_code_required').default(false),
  weightsPerUnit: text('weights_per_unit'),
  batchExpiryDetails: text('batch_expiry_details'),
  itemPreparationsStatus: text('item_preparations_status'),

  // Pricing & Charges
  grindingCharge: text('grinding_charge'),
  weightInGms: text('weight_in_gms'),
  bulkItemName: text('bulk_item_name'),
  repackageUnits: text('repackage_units'),
  repackageType: text('repackage_type'),
  packagingMaterial: text('packaging_material'),
  decimalPoint: text('decimal_point'),
  productType: text('product_type'),
  sellBy: text('sell_by'),
  itemPerUnit: text('item_per_unit'),
  maintainSellingMrpBy: text('maintain_selling_mrp_by'),
  batchSelection: text('batch_selection'),

  // Item Properties
  isWeighable: boolean('is_weighable').default(false),
  skuType: text('sku_type'),
  indentType: text('indent_type'),
  gateKeeperMargin: text('gate_keeper_margin'),
  allowItemFree: boolean('allow_item_free').default(false),
  showOnMobileDashboard: boolean('show_on_mobile_dashboard').default(false),
  enableMobileNotifications: boolean('enable_mobile_notifications').default(false),
  quickAddToCart: boolean('quick_add_to_cart').default(false),
  perishableItem: boolean('perishable_item').default(false),
  temperatureControlled: boolean('temperature_controlled').default(false),
  fragileItem: boolean('fragile_item').default(false),
  trackSerialNumbers: boolean('track_serial_numbers').default(false),
  fdaApproved: boolean('fda_approved').default(false),
  bisCertified: boolean('bis_certified').default(false),
  organicCertified: boolean('organic_certified').default(false),
  itemIngredients: text('item_ingredients'),

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
  taxId: text('tax_id'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).default('0'),
  businessName: text('business_name'),
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
  draft: text('draft').default('No'),
  poNo: text('po_no'),
  poDate: timestamp('po_date'),
  dueDate: timestamp('due_date'),
  invoiceNo: text('invoice_no'),
  invoiceDate: timestamp('invoice_date'),
  invoiceAmount: decimal('invoice_amount', { precision: 10, scale: 2 }),
  paymentMethod: text('payment_method').default('Cash'),
  paymentType: text('payment_type').default('Credit'),
  remarks: text('remarks'),
  orderDate: timestamp('order_date').defaultNow().notNull(),
  receivedDate: timestamp('received_date'),
  paymentStatus: text('payment_status').default('due'), // due, paid, partial, overdue
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0'),
  paymentDate: timestamp('payment_date'),
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
  expiryDate: timestamp('expiry_date'),
  hsnCode: text('hsn_code'),
  taxPercentage: decimal('tax_percentage', { precision: 5, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
  netCost: decimal('net_cost', { precision: 10, scale: 2 }),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }),
  mrp: decimal('mrp', { precision: 10, scale: 2 }),
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
  description: (schema) => schema.optional(),
  // Convert to string format as expected by database
  price: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  mrp: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  cost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  weight: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  weightUnit: (schema) => schema.optional(),
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
  address: (schema) => schema.optional(),
  taxId: (schema) => schema.optional(),
  creditLimit: (schema) => z.union([z.string(), z.number()]).transform(val => parseFloat(val.toString()) || 0).optional(),
  businessName: (schema) => schema.optional()
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

// Returns table
export const returns = pgTable('returns', {
  id: serial('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  refundMethod: text('refund_method').notNull().default('cash'),
  totalRefund: decimal('total_refund', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  notes: text('notes'),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Return items table
export const returnItems = pgTable('return_items', {
  id: serial('id').primaryKey(),
  returnId: integer('return_id').references(() => returns.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Return relations
export const returnsRelations = relations(returns, ({ one, many }) => ({
  sale: one(sales, { fields: [returns.saleId], references: [sales.id] }),
  user: one(users, { fields: [returns.userId], references: [users.id] }),
  items: many(returnItems)
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, { fields: [returnItems.returnId], references: [returns.id] }),
  product: one(products, { fields: [returnItems.productId], references: [products.id] })
}));

// Return validation schemas
export const returnInsertSchema = createInsertSchema(returns, {
  totalRefund: (schema) => schema.min(0, "Total refund must be at least 0"),
  refundMethod: (schema) => schema.min(2, "Refund method must be at least 2 characters"),
  status: (schema) => schema.optional()
});
export type ReturnInsert = z.infer<typeof returnInsertSchema>;
export const returnSelectSchema = createSelectSchema(returns);
export type Return = z.infer<typeof returnSelectSchema>;

export const returnItemInsertSchema = createInsertSchema(returnItems, {
  quantity: (schema) => schema.min(1, "Quantity must be at least 1"),
  unitPrice: (schema) => schema.min(0, "Unit price must be at least 0"),
  subtotal: (schema) => schema.min(0, "Subtotal must be at least 0")
});
export type ReturnItemInsert = z.infer<typeof returnItemInsertSchema>;
export const returnItemSelectSchema = createSelectSchema(returnItems);
export type ReturnItem = z.infer<typeof returnItemSelectSchema>;

export const settingsInsertSchema = createInsertSchema(settings, {
  key: (schema) => schema.min(1, "Key must not be empty"),
  value: (schema) => schema.min(1, "Value must not be empty")
});
export type SettingsInsert = z.infer<typeof settingsInsertSchema>;
export const settingsSelectSchema = createSelectSchema(settings);
export type Settings = z.infer<typeof settingsSelectSchema>;