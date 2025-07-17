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
  buyer: text('buyer'),
  purchaseGstCalculatedOn: text('purchase_gst_calculated_on'),
  gstUom: text('gst_uom'),
  purchaseAbatement: text('purchase_abatement'),
  
  // Configuration Options
  configItemWithCommodity: integer('config_item_with_commodity', { mode: 'boolean' }).default(false),
  seniorExemptApplicable: integer('senior_exempt_applicable', { mode: 'boolean' }).default(false),
  eanCodeRequired: integer('ean_code_required', { mode: 'boolean' }).default(false),
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
  
  // Mobile & eCommerce Features
  isWeighable: integer('is_weighable', { mode: 'boolean' }).default(false),
  skuType: text('sku_type'),
  indentType: text('indent_type'),
  gateKeeperMargin: text('gate_keeper_margin'),
  allowItemFree: integer('allow_item_free', { mode: 'boolean' }).default(false),
  showOnMobileDashboard: integer('show_on_mobile_dashboard', { mode: 'boolean' }).default(true),
  enableMobileNotifications: integer('enable_mobile_notifications', { mode: 'boolean' }).default(true),
  quickAddToCart: integer('quick_add_to_cart', { mode: 'boolean' }).default(false),
  
  // Item Properties
  perishableItem: integer('perishable_item', { mode: 'boolean' }).default(false),
  temperatureControlled: integer('temperature_controlled', { mode: 'boolean' }).default(false),
  fragileItem: integer('fragile_item', { mode: 'boolean' }).default(false),
  trackSerialNumbers: integer('track_serial_numbers', { mode: 'boolean' }).default(false),
  
  // Certification & Quality
  fdaApproved: integer('fda_approved', { mode: 'boolean' }).default(false),
  bisCertified: integer('bis_certified', { mode: 'boolean' }).default(false),
  organicCertified: integer('organic_certified', { mode: 'boolean' }).default(false),
  itemIngredients: text('item_ingredients'),
  
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
  cost: real('cost'),
  sellingPrice: real('selling_price'),
  mrp: real('mrp'),
  hsnCode: text('hsn_code'),
  taxPercentage: real('tax_percentage'),
  discountAmount: real('discount_amount'),
  discountPercent: real('discount_percent'),
  expiryDate: text('expiry_date'),
  batchNumber: text('batch_number'),
  netCost: real('net_cost'),
  roiPercent: real('roi_percent'),
  grossProfitPercent: real('gross_profit_percent'),
  netAmount: real('net_amount'),
  cashPercent: real('cash_percent'),
  cashAmount: real('cash_amount'),
  location: text('location'),
  unit: text('unit'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Sales Items table (updated)
export const salesItems = sqliteTable('sales_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  mrp: real('mrp')
});

// Cash Register table
export const cashRegister = sqliteTable('cash_register', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registerId: integer('register_id').notNull(),
  status: text('status').notNull().default('closed'),
  openingCash: real('opening_cash').notNull().default(0),
  currentCash: real('current_cash').notNull().default(0),
  cashReceived: real('cash_received').notNull().default(0),
  upiReceived: real('upi_received').notNull().default(0),
  cardReceived: real('card_received').notNull().default(0),
  bankReceived: real('bank_received').notNull().default(0),
  chequeReceived: real('cheque_received').notNull().default(0),
  otherReceived: real('other_received').notNull().default(0),
  totalWithdrawals: real('total_withdrawals').notNull().default(0),
  totalRefunds: real('total_refunds').notNull().default(0),
  totalSales: real('total_sales').notNull().default(0),
  notes: text('notes'),
  openedBy: integer('opened_by').references(() => users.id),
  closedBy: integer('closed_by').references(() => users.id),
  openedAt: text('opened_at'),
  closedAt: text('closed_at'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Cash Register Transactions table
export const cashRegisterTransactions = sqliteTable('cash_register_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registerId: integer('register_id').references(() => cashRegister.id).notNull(),
  type: text('type').notNull(), // 'sale', 'refund', 'withdrawal', 'deposit'
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  description: text('description'),
  referenceId: integer('reference_id'), // sale_id, return_id, etc.
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Inventory Adjustments table
export const inventoryAdjustments = sqliteTable('inventory_adjustments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  type: text('type').notNull(), // 'increase', 'decrease', 'correction'
  quantity: real('quantity').notNull(),
  previousQuantity: real('previous_quantity').notNull(),
  newQuantity: real('new_quantity').notNull(),
  reason: text('reason'),
  notes: text('notes'),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Offers table
export const offers = sqliteTable('offers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'discount', 'bogo', 'bundle'
  value: real('value').notNull(), // percentage or fixed amount
  minPurchase: real('min_purchase').default(0),
  maxDiscount: real('max_discount'),
  validFrom: text('valid_from').notNull(),
  validTo: text('valid_to').notNull(),
  applicableProducts: text('applicable_products'), // JSON array of product IDs
  maxUsage: integer('max_usage'),
  currentUsage: integer('current_usage').default(0),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Offer Usage table
export const offerUsage = sqliteTable('offer_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  offerId: integer('offer_id').references(() => offers.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id),
  saleId: integer('sale_id').references(() => sales.id),
  usedAt: text('used_at').default(new Date().toISOString()).notNull()
});

// Customer Loyalty table
export const customerLoyalty = sqliteTable('customer_loyalty', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  totalPoints: integer('total_points').default(0),
  usedPoints: integer('used_points').default(0),
  availablePoints: integer('available_points').default(0),
  tier: text('tier').default('Bronze'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  lastUpdated: text('last_updated').default(new Date().toISOString()).notNull()
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

// Additional schemas for the new tables
export const insertCashRegisterSchema = createInsertSchema(cashRegister).omit({ id: true, createdAt: true });
export const selectCashRegisterSchema = createSelectSchema(cashRegister);
export const insertCashRegisterTransactionSchema = createInsertSchema(cashRegisterTransactions).omit({ id: true, createdAt: true });
export const selectCashRegisterTransactionSchema = createSelectSchema(cashRegisterTransactions);
export const insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({ id: true, createdAt: true });
export const selectInventoryAdjustmentSchema = createSelectSchema(inventoryAdjustments);
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true, createdAt: true, updatedAt: true });
export const selectOfferSchema = createSelectSchema(offers);
export const insertOfferUsageSchema = createInsertSchema(offerUsage).omit({ id: true, usedAt: true });
export const selectOfferUsageSchema = createSelectSchema(offerUsage);
export const insertCustomerLoyaltySchema = createInsertSchema(customerLoyalty).omit({ id: true, createdAt: true, lastUpdated: true });
export const selectCustomerLoyaltySchema = createSelectSchema(customerLoyalty);
export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({ id: true, createdAt: true });
export const selectTaxCategorySchema = createSelectSchema(taxCategories);
export const insertTaxSettingsSchema = createInsertSchema(taxSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTaxSettingsSchema = createSelectSchema(taxSettings);
export const insertHsnCodeSchema = createInsertSchema(hsnCodes).omit({ id: true, createdAt: true });
export const selectHsnCodeSchema = createSelectSchema(hsnCodes);

// Types for the new tables
export type CashRegister = typeof cashRegister.$inferSelect;
export type CashRegisterInsert = z.infer<typeof insertCashRegisterSchema>;
export type CashRegisterTransaction = typeof cashRegisterTransactions.$inferSelect;
export type CashRegisterTransactionInsert = z.infer<typeof insertCashRegisterTransactionSchema>;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InventoryAdjustmentInsert = z.infer<typeof insertInventoryAdjustmentSchema>;
export type Offer = typeof offers.$inferSelect;
export type OfferInsert = z.infer<typeof insertOfferSchema>;
export type OfferUsage = typeof offerUsage.$inferSelect;
export type OfferUsageInsert = z.infer<typeof insertOfferUsageSchema>;
export type CustomerLoyalty = typeof customerLoyalty.$inferSelect;
export type CustomerLoyaltyInsert = z.infer<typeof insertCustomerLoyaltySchema>;
export type TaxCategory = typeof taxCategories.$inferSelect;
export type TaxCategoryInsert = z.infer<typeof insertTaxCategorySchema>;
export type TaxSettings = typeof taxSettings.$inferSelect;
export type TaxSettingsInsert = z.infer<typeof insertTaxSettingsSchema>;
export type TaxSettingsType = typeof taxSettings.$inferSelect;
export type HsnCode = typeof hsnCodes.$inferSelect;
export type HsnCodeInsert = z.infer<typeof insertHsnCodeSchema>;

// Manufacturing Orders table (converted from PostgreSQL)
export const manufacturingOrders = sqliteTable('manufacturing_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  requiredQuantity: integer('required_quantity').notNull(),
  producedQuantity: integer('produced_quantity').default(0),
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  priority: text('priority').default('medium'), // low, medium, high, urgent
  startDate: text('start_date'),
  expectedCompletionDate: text('expected_completion_date'),
  actualCompletionDate: text('actual_completion_date'),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdBy: integer('created_by').references(() => users.id),
  notes: text('notes'),
  estimatedCost: real('estimated_cost'),
  actualCost: real('actual_cost'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Manufacturing Batches table (converted from PostgreSQL)
export const manufacturingBatches = sqliteTable('manufacturing_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  manufacturingOrderId: integer('manufacturing_order_id').references(() => manufacturingOrders.id).notNull(),
  batchNumber: text('batch_number').notNull(),
  quantity: integer('quantity').notNull(),
  status: text('status').default('in_progress'), // in_progress, completed, failed
  startTime: text('start_time'),
  endTime: text('end_time'),
  qualityStatus: text('quality_status').default('pending'), // pending, passed, failed
  notes: text('notes'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Quality Control Checks table (converted from PostgreSQL)
export const qualityControlChecks = sqliteTable('quality_control_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  batchId: integer('batch_id').references(() => manufacturingBatches.id).notNull(),
  checkType: text('check_type').notNull(), // visual, weight, measurement, chemical, etc.
  checkParameter: text('check_parameter').notNull(),
  expectedValue: text('expected_value'),
  actualValue: text('actual_value'),
  status: text('status').default('pending'), // pending, passed, failed
  checkedBy: integer('checked_by').references(() => users.id),
  checkDate: text('check_date').default(new Date().toISOString()),
  notes: text('notes'),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Raw Materials table (converted from PostgreSQL)
export const rawMaterials = sqliteTable('raw_materials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull(),
  category: text('category'),
  unit: text('unit').notNull(), // kg, liters, pieces, etc.
  costPerUnit: real('cost_per_unit').notNull(),
  stockQuantity: integer('stock_quantity').default(0),
  minimumStock: integer('minimum_stock').default(0),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  storageLocation: text('storage_location'),
  expiryDate: text('expiry_date'),
  batchNumber: text('batch_number'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Manufacturing Recipes table (converted from PostgreSQL)
export const manufacturingRecipes = sqliteTable('manufacturing_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').default('1.0'),
  instructions: text('instructions'),
  preparationTime: integer('preparation_time'), // in minutes
  cookingTime: integer('cooking_time'), // in minutes
  totalTime: integer('total_time'), // in minutes
  difficulty: text('difficulty').default('medium'), // easy, medium, hard
  servings: integer('servings').default(1),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').default(new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').default(new Date().toISOString()).notNull()
});

// Recipe Ingredients table (converted from PostgreSQL)
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').references(() => manufacturingRecipes.id).notNull(),
  rawMaterialId: integer('raw_material_id').references(() => rawMaterials.id).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // kg, liters, pieces, etc.
  notes: text('notes'),
  optional: integer('optional', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(new Date().toISOString()).notNull()
});

// Manufacturing table schemas for validation
export const insertManufacturingOrderSchema = createInsertSchema(manufacturingOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const selectManufacturingOrderSchema = createSelectSchema(manufacturingOrders);
export const insertManufacturingBatchSchema = createInsertSchema(manufacturingBatches).omit({ id: true, createdAt: true, updatedAt: true });
export const selectManufacturingBatchSchema = createSelectSchema(manufacturingBatches);
export const insertQualityControlCheckSchema = createInsertSchema(qualityControlChecks).omit({ id: true, createdAt: true });
export const selectQualityControlCheckSchema = createSelectSchema(qualityControlChecks);
export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({ id: true, createdAt: true, updatedAt: true });
export const selectRawMaterialSchema = createSelectSchema(rawMaterials);
export const insertManufacturingRecipeSchema = createInsertSchema(manufacturingRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const selectManufacturingRecipeSchema = createSelectSchema(manufacturingRecipes);
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true, createdAt: true });
export const selectRecipeIngredientSchema = createSelectSchema(recipeIngredients);

// Manufacturing table types
export type ManufacturingOrder = typeof manufacturingOrders.$inferSelect;
export type ManufacturingOrderInsert = z.infer<typeof insertManufacturingOrderSchema>;
export type ManufacturingBatch = typeof manufacturingBatches.$inferSelect;
export type ManufacturingBatchInsert = z.infer<typeof insertManufacturingBatchSchema>;
export type QualityControlCheck = typeof qualityControlChecks.$inferSelect;
export type QualityControlCheckInsert = z.infer<typeof insertQualityControlCheckSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;
export type RawMaterialInsert = z.infer<typeof insertRawMaterialSchema>;
export type ManufacturingRecipe = typeof manufacturingRecipes.$inferSelect;
export type ManufacturingRecipeInsert = z.infer<typeof insertManufacturingRecipeSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type RecipeIngredientInsert = z.infer<typeof insertRecipeIngredientSchema>;



